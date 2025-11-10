const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
});

// Get all categories
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT category_id, name, created_at FROM categories_master ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create category (admin only)
router.post('/', async (req, res, next) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT role FROM users WHERE email = $1',
      [req.user.email]
    );

    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await db.query(
      'INSERT INTO categories_master (name) VALUES ($1) RETURNING *',
      [value.name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(error);
  }
});

// Delete category (admin only)
router.delete('/:categoryId', async (req, res, next) => {
  try {
    const userResult = await db.query(
      'SELECT role FROM users WHERE email = $1',
      [req.user.email]
    );

    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM categories_master WHERE category_id = $1 RETURNING *',
      [req.params.categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
