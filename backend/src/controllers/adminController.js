const { query } = require('../config/database');

// GET /api/admin/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalCandidates, totalSessions, avgScore, recentSessions] = await Promise.all([
      query(`SELECT COUNT(*) FROM users WHERE role = 'candidate'`),
      query(`SELECT COUNT(*) FROM sessions WHERE status = 'completed'`),
      query(`SELECT ROUND(AVG(score)) as avg FROM sessions WHERE status = 'completed'`),
      query(`
        SELECT s.id, s.score, s.scenario_type, s.completed_at,
               u.full_name, u.email
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.status = 'completed'
        ORDER BY s.completed_at DESC
        LIMIT 5
      `),
    ]);

    const scoreDistribution = await query(`
      SELECT
        CASE
          WHEN score >= 80 THEN 'excellent'
          WHEN score >= 60 THEN 'good'
          WHEN score >= 40 THEN 'average'
          ELSE 'needs_improvement'
        END as band,
        COUNT(*) as count
      FROM sessions WHERE status = 'completed'
      GROUP BY band
    `);

    res.json({
      stats: {
        total_candidates: parseInt(totalCandidates.rows[0].count),
        total_sessions: parseInt(totalSessions.rows[0].count),
        average_score: parseFloat(avgScore.rows[0].avg) || 0,
      },
      score_distribution: scoreDistribution.rows,
      recent_sessions: recentSessions.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/candidates
const listCandidates = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const searchParam = `%${search}%`;

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.department, u.is_active, u.created_at,
              COUNT(s.id) as total_sessions,
              ROUND(AVG(s.score)) as avg_score,
              MAX(s.completed_at) as last_session
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id AND s.status = 'completed'
       WHERE u.role = 'candidate'
         AND (u.full_name ILIKE $3 OR u.email ILIKE $3)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset, searchParam]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE role = 'candidate' AND (full_name ILIKE $1 OR email ILIKE $1)`,
      [searchParam]
    );

    res.json({
      candidates: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/candidates/:id/sessions
const getCandidateSessions = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;

    const candidateResult = await query(
      `SELECT id, email, full_name, department FROM users WHERE id = $1 AND role = 'candidate'`,
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const sessions = await query(
      `SELECT s.id, s.scenario_type, s.status, s.score, s.duration_seconds,
              s.ai_feedback, s.improvement_suggestions, s.strengths, s.weaknesses,
              s.started_at, s.completed_at,
              sb.confidence_score, sb.clarity_score, sb.objection_handling_score,
              sb.closing_technique_score, sb.product_knowledge_score, sb.rapport_score
       FROM sessions s
       LEFT JOIN score_breakdowns sb ON sb.session_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [candidateId]
    );

    res.json({
      candidate: candidateResult.rows[0],
      sessions: sessions.rows,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/candidates/:id/status
const toggleCandidateStatus = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;

    const result = await query(
      `UPDATE users SET is_active = NOT is_active
       WHERE id = $1 AND role = 'candidate'
       RETURNING id, email, full_name, is_active`,
      [candidateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ candidate: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/sessions
const listAllSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, scenario = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [parseInt(limit), offset];
    let idx = 3;

    if (scenario) { conditions.push(`s.scenario_type = $${idx++}`); params.push(scenario); }
    if (status)   { conditions.push(`s.status = $${idx++}`);         params.push(status);   }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT s.id, s.scenario_type, s.status, s.score, s.duration_seconds,
              s.started_at, s.completed_at,
              u.id as candidate_id, u.full_name, u.email, u.department
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       ${where}
       ORDER BY s.started_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM sessions s ${where}`,
      params.slice(2)
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

module.exports = {
  getDashboardStats,
  listCandidates,
  getCandidateSessions,
  toggleCandidateStatus,
  listAllSessions,
};
