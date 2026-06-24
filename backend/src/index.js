const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/db');

const qualificationsRouter = require('./routes/qualifications');
const calendarRouter = require('./routes/calendar');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DBを初期化
initializeDatabase();

// ルート設定
app.use('/api/qualifications', qualificationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`バックエンドサーバー起動: http://localhost:${PORT}`);
});
