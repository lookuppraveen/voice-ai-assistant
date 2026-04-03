const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// GET /api/topics - List all topics for the company
const listTopics = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    // Auto-migration
    await query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'`);
    
    const result = await query(
      `SELECT id, name, description, category, created_at, updated_at 
       FROM topics 
       WHERE company_id = $1 
       ORDER BY category ASC, created_at DESC`,
      [companyId]
    );
    res.json({ topics: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/topics/:id - Get a specific topic including system_prompt
const getTopic = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id: topicId } = req.params;

    const result = await query(
      `SELECT * FROM topics WHERE id = $1 AND company_id = $2`,
      [topicId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json({ topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/topics - Create a new topic
const createTopic = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const { name, description, category = 'General', system_prompt } = req.body;

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

// PUT /api/topics/:id - Update an existing topic
const updateTopic = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const { id: topicId } = req.params;
    const { name, description, category, system_prompt } = req.body;

    const result = await query(
      `UPDATE topics 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           system_prompt = COALESCE($4, system_prompt),
           updated_at = NOW()
       WHERE id = $5 AND company_id = $6
       RETURNING id, name, description, category, updated_at`,
      [name, description, category, system_prompt, topicId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json({ topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/topics/:id - Delete a topic
const deleteTopic = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id: topicId } = req.params;

    const result = await query(
      `DELETE FROM topics WHERE id = $1 AND company_id = $2 RETURNING id`,
      [topicId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json({ success: true, message: 'Topic deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
};
