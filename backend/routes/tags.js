const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation
const tagSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
});

// Get user's tags
router.get('/', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'SELECT tag_id, name, created_at FROM tags_master WHERE user_id = $1 ORDER BY name',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create tag
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = tagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'INSERT INTO tags_master (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, value.name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    next(error);
  }
});

// Delete tag
router.delete('/:tagId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'DELETE FROM tags_master WHERE tag_id = $1 AND user_id = $2 RETURNING *',
      [req.params.tagId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found or unauthorized' });
    }

    res.json({ message: 'Tag deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
