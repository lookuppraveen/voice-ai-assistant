const { query } = require('../config/database');
const { generateRecommendations } = require('../services/recommendationService');

// GET /api/admin/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const [totalCandidates, totalSessions, avgScore, totalTopics, recentSessions] = await Promise.all([
      query(`SELECT COUNT(*) FROM users WHERE role = 'candidate' AND company_id = $1`, [companyId]),
      query(`
        SELECT COUNT(*) FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.status = 'completed' AND u.company_id = $1
      `, [companyId]),
      query(`
        SELECT ROUND(AVG(score)) as avg FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.status = 'completed' AND u.company_id = $1
      `, [companyId]),
      query(`SELECT COUNT(*) FROM topics WHERE company_id = $1`, [companyId]),
      query(`
        SELECT s.id, s.score, t.name as scenario_type, s.completed_at,
               u.full_name, u.email
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN topics t ON t.id = s.topic_id
        WHERE s.status = 'completed' AND u.company_id = $1
        ORDER BY s.completed_at DESC
        LIMIT 5
      `, [companyId]),
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
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'completed' AND u.company_id = $1
      GROUP BY band
    `, [companyId]);

    res.json({
      stats: {
        total_candidates: parseInt(totalCandidates.rows[0].count),
        total_sessions: parseInt(totalSessions.rows[0].count),
        average_score: parseFloat(avgScore.rows[0].avg) || 0,
        total_topics: parseInt(totalTopics.rows[0].count),
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

    const companyId = req.user.company_id;
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.department, u.is_active, u.created_at,
              COUNT(s.id) as total_sessions,
              ROUND(AVG(s.score)) as avg_score,
              MAX(s.completed_at) as last_session
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id AND s.status = 'completed'
       WHERE u.role = 'candidate' AND u.company_id = $3
         AND (u.full_name ILIKE $4 OR u.email ILIKE $4)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset, companyId, searchParam]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE role = 'candidate' AND company_id = $1 AND (full_name ILIKE $2 OR email ILIKE $2)`,
      [companyId, searchParam]
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

    const isAdmin = req.user.role === 'system_admin';
    const companyId = req.user.company_id;
    
    let candidateResult;
    if (isAdmin) {
      candidateResult = await query(
        `SELECT id, email, full_name, department, company_id FROM users WHERE id = $1 AND role = 'candidate'`,
        [candidateId]
      );
    } else {
      candidateResult = await query(
        `SELECT id, email, full_name, department, company_id FROM users WHERE id = $1 AND role = 'candidate' AND company_id = $2`,
        [candidateId, companyId]
      );
    }

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const sessions = await query(
      `SELECT s.id, t.name as scenario_type, s.status, s.score, s.duration_seconds,
              s.ai_feedback, s.improvement_suggestions, s.strengths, s.weaknesses,
              s.started_at, s.completed_at,
              sb.confidence_score, sb.clarity_score, sb.objection_handling_score,
              sb.closing_technique_score, sb.product_knowledge_score, sb.rapport_score
       FROM sessions s
       LEFT JOIN topics t ON t.id = s.topic_id
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

    const companyId = req.user.company_id;
    const result = await query(
      `UPDATE users SET is_active = NOT is_active
       WHERE id = $1 AND role = 'candidate' AND company_id = $2
       RETURNING id, email, full_name, is_active`,
      [candidateId, companyId]
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

    const companyId = req.user.company_id;
    let conditions = [`u.company_id = $1`];
    let countParams = [companyId];
    let idx = 2;

    if (scenario) { conditions.push(`t.id = $${idx++}`); countParams.push(scenario); }
    if (status)   { conditions.push(`s.status = $${idx++}`); countParams.push(status); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const mainParams = [...countParams, parseInt(limit), offset];

    const result = await query(
      `SELECT s.id, t.name as scenario_type, s.status, s.score, s.duration_seconds,
              s.started_at, s.completed_at,
              u.id as candidate_id, u.full_name, u.email, u.department
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN topics t ON t.id = s.topic_id
       ${where}
       ORDER BY s.started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      mainParams
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN topics t ON t.id = s.topic_id ${where}`,
      countParams
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

// GET /api/admin/users  — list all users (any role)
const listUsers = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { search = '' } = req.query;
    const searchParam = `%${search}%`;
    const result = await query(
      `SELECT id, email, full_name, department, role, is_active, temp_password, created_at
       FROM users
       WHERE company_id = $1 AND (full_name ILIKE $2 OR email ILIKE $2)
       ORDER BY created_at DESC`,
      [companyId, searchParam]
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const allowed = ['candidate', 'supervisor', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be candidate, supervisor, or admin.' });
    }
    const companyId = req.user.company_id;
    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 AND company_id = $3 RETURNING id, email, full_name, role`,
      [role, id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getSkillsReport = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const result = await query(`
      SELECT 
        AVG(sb.confidence_score) as confidence,
        AVG(sb.clarity_score) as clarity,
        AVG(sb.objection_handling_score) as objection_handling,
        AVG(sb.closing_technique_score) as closing,
        AVG(sb.product_knowledge_score) as product_knowledge,
        AVG(sb.rapport_score) as rapport
      FROM score_breakdowns sb
      JOIN sessions s ON s.id = sb.session_id
      JOIN users u ON u.id = s.user_id
      WHERE u.company_id = $1 AND s.status = 'completed'
    `, [companyId]);

    res.json({ skills: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getTrendsReport = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    // Get average score by day for last 30 days
    const result = await query(`
      SELECT 
        TO_CHAR(s.completed_at, 'YYYY-MM-DD') as date,
        ROUND(AVG(s.score)) as avg_score,
        COUNT(*) as session_count
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE u.company_id = $1 
        AND s.status = 'completed'
        AND s.completed_at > NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `, [companyId]);

    res.json({ trends: result.rows });
  } catch (err) {
    next(err);
  }
};

const getComparisonReport = async (req, res, next) => {
  try {
    const { ids } = req.query; // Expecting comma-separated IDs
    if (!ids) return res.status(400).json({ error: 'At least one candidate ID is required' });
    
    const candidateIds = ids.split(',');
    const companyId = req.user.company_id;

    const result = await query(`
      SELECT 
        u.id, u.full_name, u.email,
        AVG(s.score) as avg_score,
        COUNT(s.id) as session_count,
        AVG(sb.confidence_score) as confidence,
        AVG(sb.clarity_score) as clarity,
        AVG(sb.objection_handling_score) as objection_handling,
        AVG(sb.closing_technique_score) as closing,
        AVG(sb.product_knowledge_score) as product_knowledge,
        AVG(sb.rapport_score) as rapport
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id AND s.status = 'completed'
      LEFT JOIN score_breakdowns sb ON sb.session_id = s.id
      WHERE u.id = ANY($1) AND u.company_id = $2
      GROUP BY u.id
    `, [candidateIds, companyId]);

    res.json({ comparison: result.rows });
  } catch (err) {
    next(err);
  }
};

const getCandidateRecommendations = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const companyId = req.user.company_id;

    // 1. Fetch Candidate Stats
    const statsResult = await query(`
      SELECT 
        AVG(sb.confidence_score) as confidence,
        AVG(sb.clarity_score) as clarity,
        AVG(sb.objection_handling_score) as objection_handling,
        AVG(sb.closing_technique_score) as closing_technique,
        AVG(sb.product_knowledge_score) as product_knowledge,
        AVG(sb.rapport_score) as rapport
      FROM score_breakdowns sb
      JOIN sessions s ON s.id = sb.session_id
      WHERE s.user_id = $1 AND s.status = 'completed'
    `, [candidateId]);

    const stats = statsResult.rows[0];
    if (!stats || stats.confidence === null) {
      return res.json({ recommendations: [], summary: "Not enough session data yet to generate recommendations." });
    }

    // 2. Fetch Available Topics
    const topicsResult = await query(`
      SELECT name, description, category FROM topics WHERE company_id = $1
    `, [companyId]);

    // 3. Fetch Candidate Name
    const userResult = await query(`SELECT full_name FROM users WHERE id = $1`, [candidateId]);
    const candidateName = userResult.rows[0]?.full_name || 'Candidate';

    // 4. Generate via AI
    const recommendations = await generateRecommendations(stats, topicsResult.rows, candidateName);

    res.json(recommendations);
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
  listUsers,
  updateUserRole,
  getSkillsReport,
  getTrendsReport,
  getComparisonReport,
  getCandidateRecommendations,
};
