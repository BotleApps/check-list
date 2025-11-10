const express = require('express');
const router = express.Router();
const db = require('../db');

// Verify Google token and get/create user
router.post('/google', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Token is already verified by middleware, get user from req.user
    const { id: externalId, email, name, picture } = req.user;

    // Upsert user in database
    const result = await db.query(`
      INSERT INTO users (email, name, avatar_url, external_id, provider, last_login)
      VALUES ($1, $2, $3, $4, 'google', NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        last_login = NOW(),
        avatar_url = EXCLUDED.avatar_url,
        external_id = EXCLUDED.external_id,
        provider = EXCLUDED.provider
      RETURNING user_id, email, name, avatar_url, preferences, role, created_at
    `, [email, name, picture, externalId]);

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get current user info
router.get('/me', async (req, res, next) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      'SELECT user_id, email, name, avatar_url, preferences, role, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
