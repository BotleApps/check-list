const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation
const bucketSchema = Joi.object({
  bucket_name: Joi.string().min(1).max(255).required()
});

// Get user's buckets
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT user_id FROM users WHERE email = $1',
      [req.user.email]
    );
    const userId = result.rows[0]?.user_id;

    const buckets = await db.query(
      'SELECT bucket_id, bucket_name, created_at FROM buckets WHERE user_id = $1 OR user_id IS NULL ORDER BY bucket_name',
      [userId]
    );

    res.json(buckets.rows);
  } catch (error) {
    next(error);
  }
});

// Create bucket
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = bucketSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'INSERT INTO buckets (user_id, bucket_name) VALUES ($1, $2) RETURNING *',
      [userId, value.bucket_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Bucket name already exists' });
    }
    next(error);
  }
});

// Delete bucket
router.delete('/:bucketId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'DELETE FROM buckets WHERE bucket_id = $1 AND user_id = $2 RETURNING *',
      [req.params.bucketId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bucket not found or unauthorized' });
    }

    res.json({ message: 'Bucket deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
