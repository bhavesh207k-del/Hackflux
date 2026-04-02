// routes/eco.js — Eco stats endpoints
const express = require('express');
const router = express.Router();
const { db } = require('../db');

// ──────────────────────────────────────────────
// GET /api/eco/stats/:userId
// Returns trees saved, water saved, CO2 saved, day streak
// ──────────────────────────────────────────────
router.get('/stats/:userId', (req, res) => {
  const { userId } = req.params;

  const stats = db.prepare(`
    SELECT trees_saved, water_saved, co2_saved, day_streak, last_active
    FROM eco_stats
    WHERE user_id = ?
  `).get(userId);

  if (!stats) {
    return res.status(404).json({ error: 'User eco stats not found' });
  }

  res.json({ success: true, data: stats });
});

// ──────────────────────────────────────────────
// GET /api/eco/activity/:userId
// Returns last 7 days of activity (for bar chart)
// ──────────────────────────────────────────────
router.get('/activity/:userId', (req, res) => {
  const { userId } = req.params;

  const rows = db.prepare(`
    SELECT log_date, minutes
    FROM activity_log
    WHERE user_id = ?
    ORDER BY log_date ASC
    LIMIT 7
  `).all(userId);

  res.json({ success: true, data: rows });
});

// ──────────────────────────────────────────────
// GET /api/eco/achievements/:userId
// Returns all achievements for the user
// ──────────────────────────────────────────────
router.get('/achievements/:userId', (req, res) => {
  const { userId } = req.params;

  const rows = db.prepare(`
    SELECT name, description, icon, unlocked_at
    FROM achievements
    WHERE user_id = ?
    ORDER BY unlocked_at ASC
  `).all(userId);

  res.json({ success: true, data: rows });
});

// ──────────────────────────────────────────────
// POST /api/eco/update
// Called internally when a session completes
// Body: { userId, duration_min }
// Updates eco stats based on focus minutes
// ──────────────────────────────────────────────
router.post('/update', (req, res) => {
  const { userId, duration_min } = req.body;

  if (!userId || !duration_min) {
    return res.status(400).json({ error: 'userId and duration_min are required' });
  }

  // Eco conversion rates per focus minute
  const TREES_PER_MIN  = 0.005;   // 1 tree per 200 mins
  const WATER_PER_MIN  = 2.5;     // litres
  const CO2_PER_MIN    = 0.15;    // kg

  const treesAdd = duration_min * TREES_PER_MIN;
  const waterAdd = duration_min * WATER_PER_MIN;
  const co2Add   = duration_min * CO2_PER_MIN;
  const today    = new Date().toISOString().split('T')[0];

  // Upsert eco_stats
  const existing = db.prepare('SELECT * FROM eco_stats WHERE user_id = ?').get(userId);

  if (existing) {
    // Calculate streak
    const lastActive = existing.last_active;
    const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak  = lastActive === yesterday ? existing.day_streak + 1
                     : lastActive === today     ? existing.day_streak
                     : 1;

    db.prepare(`
      UPDATE eco_stats
      SET trees_saved = trees_saved + ?,
          water_saved = water_saved + ?,
          co2_saved   = co2_saved   + ?,
          day_streak  = ?,
          last_active = ?
      WHERE user_id = ?
    `).run(treesAdd, waterAdd, co2Add, newStreak, today, userId);
  } else {
    db.prepare(`
      INSERT INTO eco_stats (user_id, trees_saved, water_saved, co2_saved, day_streak, last_active)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(userId, treesAdd, waterAdd, co2Add, today);
  }

  // Upsert today's activity log
  const todayLog = db.prepare(
    'SELECT id FROM activity_log WHERE user_id = ? AND log_date = ?'
  ).get(userId, today);

  if (todayLog) {
    db.prepare(
      'UPDATE activity_log SET minutes = minutes + ? WHERE id = ?'
    ).run(duration_min, todayLog.id);
  } else {
    db.prepare(
      'INSERT INTO activity_log (user_id, log_date, minutes) VALUES (?, ?, ?)'
    ).run(userId, today, duration_min);
  }

  // Check and unlock achievements
  const stats = db.prepare('SELECT * FROM eco_stats WHERE user_id = ?').get(userId);
  checkAchievements(userId, stats);

  res.json({ success: true, message: 'Eco stats updated', data: stats });
});

// ──────────────────────────────────────────────
// Achievement unlock logic
// ──────────────────────────────────────────────
function checkAchievements(userId, stats) {
  const unlockIfMissing = (name, description, icon, condition) => {
    if (!condition) return;
    const exists = db.prepare(
      'SELECT id FROM achievements WHERE user_id = ? AND name = ?'
    ).get(userId, name);
    if (!exists) {
      db.prepare(
        'INSERT INTO achievements (user_id, name, description, icon) VALUES (?, ?, ?, ?)'
      ).run(userId, name, description, icon);
    }
  };

  unlockIfMissing('Seedling',    'First focus session completed',  '🌱', true);
  unlockIfMissing('Eco Warrior', 'Saved 10 equivalent trees',      '🏆', stats.trees_saved >= 10);
  unlockIfMissing('Hydro Hero',  'Saved 1000 litres of water',     '💧', stats.water_saved >= 1000);
  unlockIfMissing('Carbon Zero', 'Offset 50 kg of CO₂',           '🌍', stats.co2_saved >= 50);
  unlockIfMissing('Power Hour',  '60 consecutive minutes focused', '⚡', stats.day_streak >= 3);
  unlockIfMissing('Week Streak', 'Maintained a 7-day streak',     '🔥', stats.day_streak >= 7);
}

module.exports = router;
