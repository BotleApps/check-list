const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation schemas
const checklistSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  target_date: Joi.date().iso().allow(null),
  bucket_id: Joi.string().uuid().allow(null),
  tags: Joi.array().items(Joi.string().uuid()).default([])
});

const checklistItemSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  due_date: Joi.date().iso().allow(null),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'canceled').default('pending'),
  due_days: Joi.number().integer().min(0).allow(null),
  notes: Joi.string().allow(null, '')
});

// Get user's checklists
router.get('/', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      SELECT 
        ch.checklist_id,
        ch.name,
        ch.target_date,
        ch.bucket_id,
        ch.tags,
        ch.created_at,
        ch.updated_at,
        b.bucket_name,
        COUNT(ci.item_id) as total_items,
        COUNT(ci.item_id) FILTER (WHERE ci.status = 'completed') as completed_items
      FROM checklist_headers ch
      LEFT JOIN buckets b ON ch.bucket_id = b.bucket_id
      LEFT JOIN checklist_items ci ON ch.checklist_id = ci.checklist_id
      WHERE ch.user_id = $1
      GROUP BY ch.checklist_id, b.bucket_name
      ORDER BY ch.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single checklist with items
router.get('/:checklistId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const headerResult = await db.query(`
      SELECT 
        ch.checklist_id,
        ch.name,
        ch.target_date,
        ch.bucket_id,
        ch.tags,
        ch.created_at,
        ch.updated_at,
        b.bucket_name
      FROM checklist_headers ch
      LEFT JOIN buckets b ON ch.bucket_id = b.bucket_id
      WHERE ch.checklist_id = $1 AND ch.user_id = $2
    `, [req.params.checklistId, userId]);

    if (headerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const itemsResult = await db.query(`
      SELECT item_id, text, due_date, status, due_days, notes, created_at, updated_at
      FROM checklist_items
      WHERE checklist_id = $1
      ORDER BY created_at ASC
    `, [req.params.checklistId]);

    res.json({
      ...headerResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create checklist
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = checklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      INSERT INTO checklist_headers (user_id, name, target_date, bucket_id, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, value.name, value.target_date, value.bucket_id, value.tags]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update checklist
router.put('/:checklistId', async (req, res, next) => {
  try {
    const { error, value } = checklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      UPDATE checklist_headers
      SET name = $1, target_date = $2, bucket_id = $3, tags = $4
      WHERE checklist_id = $5 AND user_id = $6
      RETURNING *
    `, [value.name, value.target_date, value.bucket_id, value.tags, req.params.checklistId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete checklist
router.delete('/:checklistId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'DELETE FROM checklist_headers WHERE checklist_id = $1 AND user_id = $2 RETURNING *',
      [req.params.checklistId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json({ message: 'Checklist deleted' });
  } catch (error) {
    next(error);
  }
});

// Add item to checklist
router.post('/:checklistId/items', async (req, res, next) => {
  try {
    const { error, value } = checklistItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify checklist ownership
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const checklistResult = await db.query(
      'SELECT checklist_id FROM checklist_headers WHERE checklist_id = $1 AND user_id = $2',
      [req.params.checklistId, userId]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const result = await db.query(`
      INSERT INTO checklist_items (checklist_id, text, due_date, status, due_days, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.params.checklistId, value.text, value.due_date, value.status, value.due_days, value.notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update checklist item
router.put('/:checklistId/items/:itemId', async (req, res, next) => {
  try {
    const { error, value } = checklistItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    // Verify ownership through checklist
    const result = await db.query(`
      UPDATE checklist_items ci
      SET text = $1, due_date = $2, status = $3, due_days = $4, notes = $5
      FROM checklist_headers ch
      WHERE ci.item_id = $6 
        AND ci.checklist_id = $7
        AND ci.checklist_id = ch.checklist_id 
        AND ch.user_id = $8
      RETURNING ci.*
    `, [value.text, value.due_date, value.status, value.due_days, value.notes, req.params.itemId, req.params.checklistId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete checklist item
router.delete('/:checklistId/items/:itemId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      DELETE FROM checklist_items ci
      USING checklist_headers ch
      WHERE ci.item_id = $1 
        AND ci.checklist_id = $2
        AND ci.checklist_id = ch.checklist_id 
        AND ch.user_id = $3
      RETURNING ci.*
    `, [req.params.itemId, req.params.checklistId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
