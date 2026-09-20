import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

const app = express();
const PORT = 3000;

// VTU Proxy to bypass X-Frame-Options
app.use('/vtu-proxy', createProxyMiddleware({
  target: 'https://results.vtu.ac.in',
  changeOrigin: true,
  pathRewrite: {
    '^/vtu-proxy': '/', // rewrite path
  },
  on: {
    proxyRes: (proxyRes) => {
      // Remove headers that prevent iframe embedding
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    }
  },
  secure: false // ignore SSL cert errors from VTU site
}));

app.use(express.json());

// Initialize SQLite Database
const db = new Database('attendance.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    image_path TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME,
    date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY(student_id) REFERENCES students(student_id)
  );

  CREATE TABLE IF NOT EXISTS unknown_persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Alert'
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confidence_threshold REAL DEFAULT 0.85,
    blink_threshold REAL DEFAULT 0.5,
    auto_logout_minutes INTEGER DEFAULT 10
  );
`);

// Insert default settings if empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare('INSERT INTO settings (confidence_threshold, blink_threshold, auto_logout_minutes) VALUES (?, ?, ?)').run(0.85, 0.5, 10);
}

// API Routes
app.get('/api/stats', (req, res) => {
  const totalStudents = (db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number }).count;
  const presentToday = (db.prepare('SELECT COUNT(DISTINCT student_id) as count FROM attendance WHERE date = CURRENT_DATE').get() as { count: number }).count;
  const unknownDetected = (db.prepare('SELECT COUNT(*) as count FROM unknown_persons WHERE date(time) = CURRENT_DATE').get() as { count: number }).count;
  // Mock inside room count
  const insideRoom = Math.floor(presentToday * 0.8);

  res.json({
    totalStudents,
    presentToday,
    insideRoom,
    unknownDetected
  });
});

app.get('/api/students', (req, res) => {
  const students = db.prepare('SELECT * FROM students').all();
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const { name, department, student_id } = req.body;
  try {
    const info = db.prepare('INSERT INTO students (name, department, student_id) VALUES (?, ?, ?)').run(name, department, student_id);
    res.json({ id: info.lastInsertRowid, name, department, student_id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/attendance', (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, s.name, s.department 
    FROM attendance a 
    JOIN students s ON a.student_id = s.student_id 
    ORDER BY a.login_time DESC
  `).all();
  res.json(logs);
});

app.get('/api/unknown', (req, res) => {
  const logs = db.prepare('SELECT * FROM unknown_persons ORDER BY time DESC').all();
  res.json(logs);
});

app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings LIMIT 1').get();
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const { confidence_threshold, blink_threshold, auto_logout_minutes } = req.body;
  db.prepare(`
    UPDATE settings 
    SET confidence_threshold = ?, blink_threshold = ?, auto_logout_minutes = ?
  `).run(confidence_threshold, blink_threshold, auto_logout_minutes);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
