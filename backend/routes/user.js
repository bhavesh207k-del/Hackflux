// routes/user.js — User registration & login
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

// Simple password hash (use bcrypt in production)
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

// ──────────────────────────────────────────────
// POST /api/user/register
// Body: { username, email, password }
// ──────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db.prepare(
    'SELECT id, username, email FROM users WHERE username = ? AND password = ?'
  ).get(username, hashed);

  if (existing) {
    return res.status(409).json({ error: 'Username or email already taken' });
  }

  const hashed = hashPassword(password);
  const result = db.prepare(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
  ).run(username, email, hashed);

  const userId = result.lastInsertRowid;

  // Create empty eco_stats row for new user
  db.prepare(
    'INSERT INTO eco_stats (user_id) VALUES (?)'
  ).run(userId);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { id: userId, username, email }
  });
});

// ──────────────────────────────────────────────
// POST /api/user/login
// Body: { email, password }
// ──────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const hashed = hashPassword(password);
  const user = db.prepare(
    'SELECT id, username, email FROM users WHERE email = ? AND password = ?'
  ).get(email, hashed);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: { id: user.id, username: user.username, email: user.email }
  });
});

// ──────────────────────────────────────────────
// GET /api/user/:userId
// Returns user profile info
// ──────────────────────────────────────────────
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const user = db.prepare(
    'SELECT id, username, email, created_at FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, data: user });
});

module.exports = router;
