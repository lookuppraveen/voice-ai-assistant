const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const env = require('../config/env');

const generateToken = (user) =>
  jwt.sign({ userId: user.id, companyId: user.company_id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, role = 'candidate', department } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Ensure they fall into test company if no company ID provided
    const defaultCompanyId = '00000000-0000-0000-0000-000000000000';
    const companyId = req.body.company_id || defaultCompanyId;

    const result = await query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, email, full_name, role, department, created_at`,
      [companyId, email.toLowerCase(), password_hash, full_name, role, department || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await query(
      'SELECT id, company_id, email, password_hash, full_name, role, department, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated by the administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash, ...safeUser } = user;
    const token = generateToken(user);

    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, department, phone, bio, avatar } = req.body;
    const userId = req.user.id;

    // Ensure extra columns exist (safe to run repeatedly)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);

    const result = await query(
      `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           department = COALESCE($2, department),
           phone      = COALESCE($3, phone),
           bio        = COALESCE($4, bio),
           avatar     = COALESCE($5, avatar),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, company_id, email, full_name, role, department, phone, bio, avatar, is_active, created_at`,
      [full_name || null, department || null, phone || null, bio || null, avatar || null, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
