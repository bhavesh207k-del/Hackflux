const express = require("express");
const router = express.Router();
const { db } = require("../db");

// ➤ Add Task
router.post("/add", (req, res) => {
  const { userId, title, xp } = req.body;

  const stmt = db.prepare(
    "INSERT INTO tasks (userId, title, xp) VALUES (?, ?, ?)"
  );

  const result = stmt.run(userId, title, xp);

  res.json({ success: true, taskId: result.lastInsertRowid });
});

// ➤ Get Tasks
router.get("/:userId", (req, res) => {
  const userId = req.params.userId;

  const tasks = db.prepare(
    "SELECT * FROM tasks WHERE userId = ?"
  ).all(userId);

  res.json({ success: true, tasks });
});

// ➤ Mark Done
router.post("/done", (req, res) => {
  const { taskId } = req.body;

  db.prepare(
    "UPDATE tasks SET completed = 1 WHERE id = ?"
  ).run(taskId);

  const task = db.prepare(
    "SELECT xp FROM tasks WHERE id = ?"
  ).get(taskId);

  res.json({ success: true, xpGained: task.xp });
});

module.exports = router;