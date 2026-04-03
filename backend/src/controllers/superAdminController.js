const { query } = require('../config/database');

const getGlobalDashboard = async (req, res, next) => {
  try {
    const companiesRes = await query(`
      SELECT 
        c.id, c.name, c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role = 'candidate') as candidate_count,
        (SELECT COUNT(*) FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.company_id = c.id) as session_count
      FROM companies c
      ORDER BY c.created_at DESC
    `);
    
    // Calculate global aggregates
    let totalCandidates = 0;
    let totalSessions = 0;
    
    if (companiesRes.rows.length) {
      totalCandidates = companiesRes.rows.reduce((sum, row) => sum + parseInt(row.candidate_count || 0), 0);
      totalSessions = companiesRes.rows.reduce((sum, row) => sum + parseInt(row.session_count || 0), 0);
    }
    
    res.json({
      total_companies: companiesRes.rows.length,
      total_candidates: totalCandidates,
      total_sessions: totalSessions,
      companies: companiesRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

const getCompanyAudits = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const companyRes = await query('SELECT name, created_at FROM companies WHERE id = $1', [id]);
    if (companyRes.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const usersRes = await query(`
      SELECT id, email, full_name, role, department, is_active, created_at
      FROM users
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [id]);

    const sessionsRes = await query(`
      SELECT COUNT(*) as session_count
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE u.company_id = $1
    `, [id]);

    res.json({
      company: companyRes.rows[0],
      users: usersRes.rows,
      total_sessions: parseInt(sessionsRes.rows[0].session_count)
    });
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const settingsRes = await query('SELECT setting_key, setting_value FROM system_settings');
    const settings = settingsRes.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
    
    // Ensure default exists even if DB seed failed temporarily
    if (!settings.tts_provider) {
      settings.tts_provider = 'elevenlabs';
    }
    
    res.json({ settings });
  } catch (err) {
    next(err);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) {
      return res.status(400).json({ error: 'Missing key or value' });
    }
    
    await query(`
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `, [key, value]);
    
    res.json({ success: true, key, value });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGlobalDashboard,
  getCompanyAudits,
  getSettings,
  updateSetting
};
