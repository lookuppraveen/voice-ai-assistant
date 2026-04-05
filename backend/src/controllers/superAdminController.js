const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const getGlobalDashboard = async (req, res, next) => {
  try {
    // Auto-migrate: Add is_active if it doesn't exist
    await query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);

    const companiesRes = await query(`
      SELECT 
        c.id, c.name, c.created_at, c.is_active,
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
    
    // Ensure column exists
    await query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);

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

    const topicsRes = await query(`
      SELECT id, name, description, category, created_at
      FROM topics
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      company: companyRes.rows[0],
      users: usersRes.rows,
      topics: topicsRes.rows,
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

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });

    const result = await query(
      'UPDATE companies SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ company: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const toggleCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE companies SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ company: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createCompanyTopic = async (req, res, next) => {
  try {
    const { id: companyId } = req.params;
    const { name, description, category = 'General', system_prompt } = req.body;
    
    if (!name || !system_prompt) {
      return res.status(400).json({ error: 'Topic name and AI system prompt are required' });
    }

    const result = await query(
      `INSERT INTO topics (company_id, name, description, category, system_prompt)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, category, created_at`,
      [companyId, name, description || null, category, system_prompt]
    );

    res.status(201).json({ topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/super-admin/login
 * Separate login that only accepts system_admin accounts.
 * Returns the same JWT as /api/auth/login but rejects non-super-admin roles.
 */
const superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.role !== 'system_admin') {
      return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, company_id: user.company_id },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/super-admin/companies
 * Create a new company + its first admin user in one atomic operation.
 */
const createCompany = async (req, res, next) => {
  try {
    const { company_name, admin_email, admin_password, admin_name } = req.body;

    if (!company_name || !admin_email || !admin_password || !admin_name) {
      return res.status(400).json({
        error: 'company_name, admin_email, admin_password, and admin_name are all required',
      });
    }
    if (admin_password.length < 8) {
      return res.status(400).json({ error: 'Admin password must be at least 8 characters' });
    }

    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [admin_email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Create company
    const companyRes = await query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id, name, created_at`,
      [company_name.trim()]
    );
    const company = companyRes.rows[0];

    // Create admin user for this company
    const passwordHash = await bcrypt.hash(admin_password, 12);
    const userRes = await query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, email, full_name, role, created_at`,
      [company.id, admin_email.toLowerCase().trim(), passwordHash, admin_name.trim()]
    );
    const adminUser = userRes.rows[0];

    res.status(201).json({
      company: { ...company, candidate_count: '0', session_count: '0', is_active: true },
      admin: adminUser,
      message: `Company "${company.name}" created with admin account ${adminUser.email}`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGlobalDashboard,
  getCompanyAudits,
  getSettings,
  updateSetting,
  updateCompany,
  toggleCompanyStatus,
  createCompanyTopic,
  createCompany,
  superAdminLogin,
};
