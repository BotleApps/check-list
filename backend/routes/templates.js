const express = require('express');
const router = express.Router();
const db = require('../db');
const Joi = require('joi');

// Validation schemas
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  category_id: Joi.string().uuid().allow(null)
});

const templateItemSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'canceled').default('pending'),
  due_days: Joi.number().integer().min(0).allow(null),
  notes: Joi.string().allow(null, '')
});

// Get all templates (public)
router.get('/', async (req, res, next) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT 
        th.template_id,
        th.name,
        th.category_id,
        th.user_id,
        th.created_at,
        th.updated_at,
        c.name as category_name,
        u.name as author_name,
        COUNT(ti.item_id) as item_count
      FROM checklist_template_headers th
      LEFT JOIN categories_master c ON th.category_id = c.category_id
      LEFT JOIN users u ON th.user_id = u.user_id
      LEFT JOIN checklist_template_items ti ON th.template_id = ti.template_id
    `;

    const params = [];
    if (category_id) {
      query += ' WHERE th.category_id = $1';
      params.push(category_id);
    }

    query += `
      GROUP BY th.template_id, c.name, u.name
      ORDER BY th.created_at DESC
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single template with items
router.get('/:templateId', async (req, res, next) => {
  try {
    const headerResult = await db.query(`
      SELECT 
        th.template_id,
        th.name,
        th.category_id,
        th.user_id,
        th.created_at,
        th.updated_at,
        c.name as category_name,
        u.name as author_name
      FROM checklist_template_headers th
      LEFT JOIN categories_master c ON th.category_id = c.category_id
      LEFT JOIN users u ON th.user_id = u.user_id
      WHERE th.template_id = $1
    `, [req.params.templateId]);

    if (headerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const itemsResult = await db.query(`
      SELECT item_id, text, status, due_days, notes, created_at, updated_at
      FROM checklist_template_items
      WHERE template_id = $1
      ORDER BY created_at ASC
    `, [req.params.templateId]);

    res.json({
      ...headerResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create template
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      INSERT INTO checklist_template_headers (user_id, name, category_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, value.name, value.category_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update template
router.put('/:templateId', async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      UPDATE checklist_template_headers
      SET name = $1, category_id = $2
      WHERE template_id = $3 AND user_id = $4
      RETURNING *
    `, [value.name, value.category_id, req.params.templateId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete template
router.delete('/:templateId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(
      'DELETE FROM checklist_template_headers WHERE template_id = $1 AND user_id = $2 RETURNING *',
      [req.params.templateId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json({ message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

// Add item to template
router.post('/:templateId/items', async (req, res, next) => {
  try {
    const { error, value } = templateItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify template ownership
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const templateResult = await db.query(
      'SELECT template_id FROM checklist_template_headers WHERE template_id = $1 AND user_id = $2',
      [req.params.templateId, userId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    const result = await db.query(`
      INSERT INTO checklist_template_items (template_id, text, status, due_days, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.params.templateId, value.text, value.status, value.due_days, value.notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update template item
router.put('/:templateId/items/:itemId', async (req, res, next) => {
  try {
    const { error, value } = templateItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      UPDATE checklist_template_items ti
      SET text = $1, status = $2, due_days = $3, notes = $4
      FROM checklist_template_headers th
      WHERE ti.item_id = $5 
        AND ti.template_id = $6
        AND ti.template_id = th.template_id 
        AND th.user_id = $7
      RETURNING ti.*
    `, [value.text, value.status, value.due_days, value.notes, req.params.itemId, req.params.templateId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete template item
router.delete('/:templateId/items/:itemId', async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    const result = await db.query(`
      DELETE FROM checklist_template_items ti
      USING checklist_template_headers th
      WHERE ti.item_id = $1 
        AND ti.template_id = $2
        AND ti.template_id = th.template_id 
        AND th.user_id = $3
      RETURNING ti.*
    `, [req.params.itemId, req.params.templateId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    res.json({ message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
});

// Create checklist from template
router.post('/:templateId/instantiate', async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT user_id FROM users WHERE email = $1', [req.user.email]);
    const userId = userResult.rows[0]?.user_id;

    // Get template
    const templateResult = await client.query(
      'SELECT * FROM checklist_template_headers WHERE template_id = $1',
      [req.params.templateId]
    );

    if (templateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Create checklist
    const checklistResult = await client.query(`
      INSERT INTO checklist_headers (user_id, name)
      VALUES ($1, $2)
      RETURNING *
    `, [userId, template.name]);

    const checklistId = checklistResult.rows[0].checklist_id;

    // Get template items
    const itemsResult = await client.query(
      'SELECT * FROM checklist_template_items WHERE template_id = $1 ORDER BY created_at',
      [req.params.templateId]
    );

    // Insert items
    for (const item of itemsResult.rows) {
      await client.query(`
        INSERT INTO checklist_items (checklist_id, text, status, due_days, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [checklistId, item.text, item.status, item.due_days, item.notes]);
    }

    await client.query('COMMIT');

    // Return full checklist
    const fullChecklist = await db.query(`
      SELECT ch.*, 
        (SELECT json_agg(ci.*) FROM checklist_items ci WHERE ci.checklist_id = ch.checklist_id) as items
      FROM checklist_headers ch
      WHERE ch.checklist_id = $1
    `, [checklistId]);

    res.status(201).json(fullChecklist.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
