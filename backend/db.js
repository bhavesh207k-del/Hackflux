// db.js — SQLite database setup using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'focusxp.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize all tables on first run
 */
function init() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );

   

    -- Eco stats table (one row per user, updated on session complete)
    CREATE TABLE IF NOT EXISTS eco_stats (
      user_id      INTEGER PRIMARY KEY,
      trees_saved  REAL    DEFAULT 0,
      water_saved  REAL    DEFAULT 0,
      co2_saved    REAL    DEFAULT 0,
      day_streak   INTEGER DEFAULT 0,
      last_active  TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Daily activity log (for the bar chart)
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      log_date    TEXT    NOT NULL,
      minutes     INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Achievements table
    CREATE TABLE IF NOT EXISTS achievements (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      icon        TEXT,
      unlocked_at TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    -- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  description TEXT,
  icon        TEXT,
  unlocked_at TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
-- Tasks table (NEW 🔥)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  title TEXT,
  xp INTEGER,
  completed INTEGER DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id)
);

    -- Seed a demo user if not exists
    INSERT OR IGNORE INTO users (id, username, email, password)
    VALUES (1, 'demo', 'demo@focusxp.com', 'demo123');

    INSERT OR IGNORE INTO eco_stats (user_id, trees_saved, water_saved, co2_saved, day_streak, last_active)
    VALUES (1, 24, 1340, 87, 12, date('now'));

    INSERT OR IGNORE INTO activity_log (user_id, log_date, minutes) VALUES
      (1, date('now', '-6 days'), 45),
      (1, date('now', '-5 days'), 70),
      (1, date('now', '-4 days'), 55),
      (1, date('now', '-3 days'), 90),
      (1, date('now', '-2 days'), 65),
      (1, date('now', '-1 days'), 40),
      (1, date('now'),            80);

    INSERT OR IGNORE INTO achievements (id, user_id, name, description, icon)
    VALUES
      (1, 1, 'Seedling',    'Completed your first focus session', '🌱'),
      (2, 1, 'Power Hour',  '60 minutes deep work streak',         '⚡'),
      (3, 1, 'Eco Warrior', 'Save 10 trees equivalent',            '🏆');
  `);

  console.log('📦 Database initialized at', DB_PATH);
}

module.exports = { db, init };

