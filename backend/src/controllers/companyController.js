const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { sendWelcomeEmail } = require('../services/emailService');

const generateToken = (user) =>
  jwt.sign({ userId: user.id, companyId: user.company_id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const registerCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { company_name, admin_email, admin_password, admin_name } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [admin_email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(admin_password, 12);

    // Create company
    const companyResult = await query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      [company_name]
    );
    const companyId = companyResult.rows[0].id;

    // Create company_admin user
    const userResult = await query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, email, full_name, role, created_at`,
      [companyId, admin_email.toLowerCase(), password_hash, admin_name, 'company_admin']
    );

    const user = userResult.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, company_id: companyId, token });
  } catch (err) {
    next(err);
  }
};

const getCompanyUsers = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const result = await query(
      `SELECT id, email, full_name, role, department, is_active, created_at 
       FROM users 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};

const inviteUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const { email, password, full_name, role = 'candidate', department } = req.body;

    // Prevent arbitrary role assignment
    if (!['candidate', 'supervisor', 'admin'].includes(role)) {
       return res.status(400).json({ error: 'Invalid role assignment' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let finalPassword = password;
    if (!finalPassword) {
      finalPassword = Array(8).fill("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*").map(x => x[Math.floor(Math.random() * x.length)]).join('');
    }

    const password_hash = await bcrypt.hash(finalPassword, 12);

    const result = await query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, department, temp_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_id, email, full_name, role, department, temp_password, created_at`,
      [companyId, email.toLowerCase(), password_hash, full_name, role, department || null, finalPassword]
    );

    // Asynchronously dispatch welcome email
    sendWelcomeEmail(email.toLowerCase(), full_name, finalPassword);

    res.status(201).json({ user: result.rows[0], tempPassword: finalPassword });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.params.userId;
    const { is_active } = req.body;

    const result = await query(
      `UPDATE users 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 AND company_id = $3 AND id != $4
       RETURNING id, is_active`,
      [is_active, userId, companyId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or cannot modify yourself' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerCompany, getCompanyUsers, inviteUser, toggleUserStatus };
