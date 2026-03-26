const { query } = require('../config/database');
const { getAIResponse, evaluateSession, getScenarios } = require('../services/claudeService');
const { transcribeAudio } = require('../services/whisperService');
// TTS is handled by the browser (Web Speech API) — no server-side TTS needed

// GET /api/scenarios
const listScenarios = (req, res) => {
  res.json({ scenarios: getScenarios() });
};

// POST /api/sessions — Start new session
const startSession = async (req, res, next) => {
  try {
    const { scenario_type = 'cold_call' } = req.body;

    const result = await query(
      `INSERT INTO sessions (user_id, scenario_type, status)
       VALUES ($1, $2, 'in_progress')
       RETURNING id, user_id, scenario_type, status, started_at`,
      [req.user.id, scenario_type]
    );

    const session = result.rows[0];

    // Insert opening AI message
    const openingMessages = {
      cold_call: "Hello?",
      product_demo: "Hi, thanks for calling. I was just reviewing the demo notes. Go ahead.",
      objection_handling: "Yes, I have a few minutes. What's this about?",
    };

    const openingText = openingMessages[scenario_type] || "Hello?";

    await query(
      `INSERT INTO messages (session_id, role, content, turn_number)
       VALUES ($1, 'assistant', $2, 1)`,
      [session.id, openingText]
    );

    res.status(201).json({
      session,
      opening: { text: openingText },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/turn — Send audio, get AI response
const processTurn = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;

    // Validate session belongs to user
    const sessionResult = await query(
      `SELECT * FROM sessions WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const session = sessionResult.rows[0];

    // Get turn count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
      [sessionId]
    );
    const turnNumber = parseInt(countResult.rows[0].count) + 1;

    // Transcribe user audio
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }

    const userText = await transcribeAudio(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Save user message
    await query(
      `INSERT INTO messages (session_id, role, content, turn_number)
       VALUES ($1, 'user', $2, $3)`,
      [sessionId, userText, turnNumber]
    );

    // Fetch full conversation history
    const historyResult = await query(
      `SELECT role, content FROM messages WHERE session_id = $1 ORDER BY turn_number ASC`,
      [sessionId]
    );

    // Get AI response
    const aiText = await getAIResponse(historyResult.rows, session.scenario_type);

    // Save AI message
    await query(
      `INSERT INTO messages (session_id, role, content, turn_number)
       VALUES ($1, 'assistant', $2, $3)`,
      [sessionId, aiText, turnNumber + 1]
    );

    res.json({
      user_message: userText,
      ai_response: { text: aiText },
      turn: turnNumber,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/text-turn — Send transcribed text directly (browser STT)
const processTextTurn = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text field is required' });
    }

    const sessionResult = await query(
      `SELECT * FROM sessions WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const session = sessionResult.rows[0];

    const countResult = await query(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
      [sessionId]
    );
    const turnNumber = parseInt(countResult.rows[0].count) + 1;

    // Save user message (already transcribed by browser)
    await query(
      `INSERT INTO messages (session_id, role, content, turn_number) VALUES ($1, 'user', $2, $3)`,
      [sessionId, text.trim(), turnNumber]
    );

    const historyResult = await query(
      `SELECT role, content FROM messages WHERE session_id = $1 ORDER BY turn_number ASC`,
      [sessionId]
    );

    const aiText = await getAIResponse(historyResult.rows, session.scenario_type);

    await query(
      `INSERT INTO messages (session_id, role, content, turn_number) VALUES ($1, 'assistant', $2, $3)`,
      [sessionId, aiText, turnNumber + 1]
    );

    res.json({
      user_message: text.trim(),
      ai_response: { text: aiText },
      turn: turnNumber,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/complete — End session & evaluate
const completeSession = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;

    const sessionResult = await query(
      `SELECT * FROM sessions WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const session = sessionResult.rows[0];

    // Get all messages
    const historyResult = await query(
      `SELECT role, content FROM messages WHERE session_id = $1 ORDER BY turn_number ASC`,
      [sessionId]
    );

    if (historyResult.rows.length < 3) {
      return res.status(400).json({ error: 'Session too short to evaluate (minimum 3 turns)' });
    }

    // Evaluate with Claude
    const evaluation = await evaluateSession(historyResult.rows, session.scenario_type);

    // Calculate duration
    const durationResult = await query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - started_at))::int as seconds FROM sessions WHERE id = $1`,
      [sessionId]
    );
    const duration = durationResult.rows[0].seconds;

    // Update session
    await query(
      `UPDATE sessions SET
        status = 'completed',
        score = $1,
        ai_feedback = $2,
        improvement_suggestions = $3,
        strengths = $4,
        weaknesses = $5,
        duration_seconds = $6,
        completed_at = NOW()
       WHERE id = $7`,
      [
        evaluation.overall_score,
        evaluation.summary,
        JSON.stringify(evaluation.improvement_suggestions),
        JSON.stringify(evaluation.strengths),
        JSON.stringify(evaluation.weaknesses),
        duration,
        sessionId,
      ]
    );

    // Save score breakdown
    await query(
      `INSERT INTO score_breakdowns
        (session_id, confidence_score, clarity_score, objection_handling_score,
         closing_technique_score, product_knowledge_score, rapport_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sessionId,
        evaluation.breakdown.confidence,
        evaluation.breakdown.clarity,
        evaluation.breakdown.objection_handling,
        evaluation.breakdown.closing_technique,
        evaluation.breakdown.product_knowledge,
        evaluation.breakdown.rapport_building,
      ]
    );

    res.json({ evaluation, duration_seconds: duration });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions — List user sessions
const listSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT s.id, s.scenario_type, s.status, s.score, s.duration_seconds,
              s.started_at, s.completed_at,
              sb.confidence_score, sb.clarity_score, sb.objection_handling_score,
              sb.closing_technique_score, sb.product_knowledge_score, sb.rapport_score
       FROM sessions s
       LEFT JOIN score_breakdowns sb ON sb.session_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:id — Get session detail
const getSession = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const isAdmin = ['admin', 'supervisor'].includes(req.user.role);

    const sessionResult = await query(
      `SELECT s.*, sb.confidence_score, sb.clarity_score, sb.objection_handling_score,
              sb.closing_technique_score, sb.product_knowledge_score, sb.rapport_score,
              u.full_name as candidate_name, u.email as candidate_email
       FROM sessions s
       LEFT JOIN score_breakdowns sb ON sb.session_id = s.id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 ${isAdmin ? '' : 'AND s.user_id = $2'}`,
      isAdmin ? [sessionId] : [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messagesResult = await query(
      `SELECT id, role, content, turn_number, created_at
       FROM messages WHERE session_id = $1 ORDER BY turn_number ASC`,
      [sessionId]
    );

    res.json({
      session: sessionResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listScenarios,
  startSession,
  processTurn,
  processTextTurn,
  completeSession,
  listSessions,
  getSession,
};
