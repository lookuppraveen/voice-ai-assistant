const { query } = require('../config/database');
const { getAIResponse, evaluateSession } = require('../services/claudeService');
const { transcribeAudio } = require('../services/whisperService');
const elevenLabs = require('../services/elevenLabsService');
const openaiTts = require('../services/openaiTtsService');

// GET /api/scenarios
const listScenarios = (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.json({ scenarios: getScenarios() });
};

// POST /api/sessions — Start new session
const startSession = async (req, res, next) => {
  try {
    const { topic_id } = req.body;

    const topicResult = await query('SELECT * FROM topics WHERE id = $1', [topic_id]);
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const topic = topicResult.rows[0];

    const result = await query(
      `INSERT INTO sessions (user_id, topic_id, scenario_type, status)
       VALUES ($1, $2, $3, 'in_progress')
       RETURNING id, user_id, topic_id, scenario_type, status, started_at`,
      [req.user.id, topic.id, topic.name]
    );

    const session = result.rows[0];

    // Insert opening AI message
    const openingText = "Hello? How can I help you today?";

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
      `SELECT s.*, t.system_prompt, t.name as topic_name 
       FROM sessions s 
       JOIN topics t ON s.topic_id = t.id 
       WHERE s.id = $1 AND s.user_id = $2 AND s.status = 'in_progress'`,
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

    const aiText = await getAIResponse(historyResult.rows, session.system_prompt);

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
      `SELECT s.*, t.system_prompt, t.name as topic_name 
       FROM sessions s 
       JOIN topics t ON s.topic_id = t.id 
       WHERE s.id = $1 AND s.user_id = $2 AND s.status = 'in_progress'`,
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

    const aiText = await getAIResponse(historyResult.rows, session.system_prompt);

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
      `SELECT s.*, t.name as topic_name 
       FROM sessions s 
       JOIN topics t ON s.topic_id = t.id 
       WHERE s.id = $1 AND s.user_id = $2 AND s.status = 'in_progress'`,
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

    const evaluation = await evaluateSession(historyResult.rows, session.topic_name);

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
       LEFT JOIN (
         SELECT DISTINCT ON (session_id) * FROM score_breakdowns ORDER BY session_id, created_at DESC
       ) sb ON sb.session_id = s.id
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

// POST /api/sessions/tts — Generate speech using selected provider
const generateTTS = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text required for TTS' });
    }
    
    // Check provider setting
    const settingRes = await query(`SELECT setting_value FROM system_settings WHERE setting_key = 'tts_provider'`);
    const provider = settingRes.rows.length > 0 ? settingRes.rows[0].setting_value : 'elevenlabs';

    let audioBuffer;
    if (provider === 'openai') {
      audioBuffer = await openaiTts.generateAudio(text);
    } else {
      audioBuffer = await elevenLabs.generateAudio(text);
    }

    if (!audioBuffer) {
      return res.status(500).json({ error: 'Audio generation failed' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (err) {
    if (err.message.includes('API Key is invalid')) {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
};

module.exports = {
  startSession,
  processTurn,
  processTextTurn,
  completeSession,
  listSessions,
  getSession,
  generateTTS,
};
