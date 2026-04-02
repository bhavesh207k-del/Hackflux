
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const ecoRoutes = require('./routes/eco');
const userRoutes = require('./routes/user');
const sessionRoutes = require('./routes/session');
const taskRoutes = require('./routes/task');

const app = express();
const PORT = process.env.PORT || 5501;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/eco', ecoRoutes);
app.use('/api/user', userRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/task', taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ FocusXP server running at http://127.0.0.1:${PORT}`);
  db.init(); // initialize DB tables
});
