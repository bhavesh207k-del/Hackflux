// routes/session.js — Focus session management
const express = require('express');
const router = express.Router();
const { db } = require('../db');

// ──────────────────────────────────────────────
// POST /api/session/start
// Body: { userId }
// Starts a new focus session
// ──────────────────────────────────────────────
router.post('/start', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Check if there's already an active session
  const active = db.prepare(`
    SELECT id FROM sessions WHERE user_id = ? AND status = 'active'
  `).get(userId);

  if (active) {
    return res.status(409).json({
      error: 'A session is already active',
      sessionId: active.id
    });
  }

  const startTime = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO sessions (user_id, start_time, status)
    VALUES (?, ?, 'active')
  `).run(userId, startTime);

  res.status(201).json({
    success: true,
    message: 'Session started',
    data: { sessionId: result.lastInsertRowid, startTime }
  });
});

// ──────────────────────────────────────────────
// POST /api/session/end
// Body: { sessionId, userId }
// Ends the session and updates eco stats
// ──────────────────────────────────────────────
router.post('/end', (req, res) => {
  const { sessionId, userId } = req.body;

  if (!sessionId || !userId) {
    return res.status(400).json({ error: 'sessionId and userId are required' });
  }

  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ? AND user_id = ? AND status = 'active'
  `).get(sessionId, userId);

  if (!session) {
    return res.status(404).json({ error: 'Active session not found' });
  }

  const endTime    = new Date().toISOString();
  const startMs    = new Date(session.start_time).getTime();
  const endMs      = new Date(endTime).getTime();
  const durationMin = Math.round((endMs - startMs) / 60000);

  // Mark session complete
  db.prepare(`
    UPDATE sessions
    SET end_time = ?, duration_min = ?, status = 'completed'
    WHERE id = ?
  `).run(endTime, durationMin, sessionId);

  // Trigger eco stats update via internal logic (same as /api/eco/update)
  const TREES_PER_MIN = 0.005;
  const WATER_PER_MIN = 2.5;
  const CO2_PER_MIN   = 0.15;
  const today         = endTime.split('T')[0];

  const existing = db.prepare('SELECT * FROM eco_stats WHERE user_id = ?').get(userId);
  if (existing) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = existing.last_active === yesterday ? existing.day_streak + 1
                    : existing.last_active === today     ? existing.day_streak
                    : 1;

    db.prepare(`
      UPDATE eco_stats
      SET trees_saved = trees_saved + ?,
          water_saved = water_saved + ?,
          co2_saved   = co2_saved   + ?,
          day_streak  = ?,
          last_active = ?
      WHERE user_id = ?
    `).run(
      durationMin * TREES_PER_MIN,
      durationMin * WATER_PER_MIN,
      durationMin * CO2_PER_MIN,
      newStreak, today, userId
    );
  }

  // Update daily activity log
  const todayLog = db.prepare(
    'SELECT id FROM activity_log WHERE user_id = ? AND log_date = ?'
  ).get(userId, today);

  if (todayLog) {
    db.prepare('UPDATE activity_log SET minutes = minutes + ? WHERE id = ?')
      .run(durationMin, todayLog.id);
  } else {
    db.prepare('INSERT INTO activity_log (user_id, log_date, minutes) VALUES (?, ?, ?)')
      .run(userId, today, durationMin);
  }

  res.json({
    success: true,
    message: 'Session ended',
    data: { sessionId, durationMin, endTime }
  });
});

// ──────────────────────────────────────────────
// GET /api/session/history/:userId
// Returns the last 10 sessions for a user
// ──────────────────────────────────────────────
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;

  const sessions = db.prepare(`
    SELECT id, start_time, end_time, duration_min, status
    FROM sessions
    WHERE user_id = ?
    ORDER BY start_time DESC
    LIMIT 10
  `).all(userId);

  res.json({ success: true, data: sessions });
});

// ──────────────────────────────────────────────
// GET /api/session/active/:userId
// Returns the active session (if any)
// ──────────────────────────────────────────────
router.get('/active/:userId', (req, res) => {
  const { userId } = req.params;

  const session = db.prepare(`
    SELECT id, start_time FROM sessions
    WHERE user_id = ? AND status = 'active'
  `).get(userId);

  if (!session) {
    return res.json({ success: true, data: null });
  }

  // Calculate elapsed minutes
  const elapsedMin = Math.floor(
    (Date.now() - new Date(session.start_time).getTime()) / 60000
  );

  res.json({ success: true, data: { ...session, elapsedMin } });
});

module.exports = router;
