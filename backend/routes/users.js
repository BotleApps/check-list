const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  avatar_url: Joi.string().uri().allow(null, ''),
  preferences: Joi.object()
});

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const email = req.user?.email;
    const result = await db.query(
      'SELECT user_id, email, name, avatar_url, preferences, role, created_at, last_login FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const email = req.user?.email;
    const { name, avatar_url, preferences } = value;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatar_url);
    }
    if (preferences !== undefined) {
      updates.push(`preferences = $${paramCount++}`);
      values.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(email);
    const result = await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE email = $${paramCount}
      RETURNING user_id, email, name, avatar_url, preferences, role, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
