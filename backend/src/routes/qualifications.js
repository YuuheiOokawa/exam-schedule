const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { runScraper } = require('../scrapers');

// 資格一覧取得
router.get('/', (req, res) => {
  const { search, category } = req.query;
  let query = `
    SELECT q.*,
      s.exam_date, s.application_start_date, s.application_end_date,
      s.result_announcement_date, s.exam_fee, s.fetched_at, s.note, s.source_url
    FROM qualifications q
    LEFT JOIN qualification_schedules s ON q.id = s.qualification_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND q.name LIKE ?';
    params.push(`%${search}%`);
  }
  if (category) {
    query += ' AND q.category = ?';
    params.push(category);
  }

  query += ' ORDER BY q.category, q.name';

  try {
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 資格詳細取得
router.get('/:id', (req, res) => {
  try {
    const qual = db.prepare(`
      SELECT q.*,
        s.id as schedule_id, s.exam_date, s.application_start_date,
        s.application_end_date, s.result_announcement_date,
        s.exam_fee, s.fetched_at, s.note, s.source_url, s.updated_at as schedule_updated_at
      FROM qualifications q
      LEFT JOIN qualification_schedules s ON q.id = s.qualification_id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!qual) {
      return res.status(404).json({ success: false, error: '資格が見つかりません' });
    }

    const logs = db.prepare(`
      SELECT * FROM fetch_logs WHERE qualification_id = ? ORDER BY fetched_at DESC LIMIT 5
    `).all(req.params.id);

    res.json({ success: true, data: { ...qual, fetch_logs: logs } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 最新情報を取得（スクレイピング実行）
router.post('/:id/fetch', async (req, res) => {
  const qualId = parseInt(req.params.id);
  try {
    const qual = db.prepare('SELECT * FROM qualifications WHERE id = ?').get(qualId);
    if (!qual) {
      return res.status(404).json({ success: false, error: '資格が見つかりません' });
    }

    const result = await runScraper(qual.name, qual.id, qual.official_url);
    const now = new Date().toISOString();

    if (result.success && result.data) {
      const existing = db.prepare('SELECT id FROM qualification_schedules WHERE qualification_id = ?').get(qualId);

      if (existing) {
        db.prepare(`
          UPDATE qualification_schedules SET
            exam_date = ?, application_start_date = ?, application_end_date = ?,
            result_announcement_date = ?, exam_fee = ?, source_url = ?,
            fetched_at = ?, note = ?, updated_at = CURRENT_TIMESTAMP
          WHERE qualification_id = ?
        `).run(
          result.data.exam_date, result.data.application_start_date,
          result.data.application_end_date, result.data.result_announcement_date,
          result.data.exam_fee, result.data.source_url, now,
          result.data.note, qualId
        );
      } else {
        db.prepare(`
          INSERT INTO qualification_schedules
            (qualification_id, exam_date, application_start_date, application_end_date,
             result_announcement_date, exam_fee, source_url, fetched_at, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          qualId, result.data.exam_date, result.data.application_start_date,
          result.data.application_end_date, result.data.result_announcement_date,
          result.data.exam_fee, result.data.source_url, now, result.data.note
        );
      }

      db.prepare(`
        INSERT INTO fetch_logs (qualification_id, status, message, fetched_at)
        VALUES (?, 'success', ?, ?)
      `).run(qualId, '取得成功', now);

      res.json({ success: true, message: '情報を更新しました', data: result.data });
    } else {
      const errorMsg = result.error || '取得失敗';
      db.prepare(`
        INSERT INTO fetch_logs (qualification_id, status, message, fetched_at)
        VALUES (?, 'error', ?, ?)
      `).run(qualId, errorMsg, now);

      res.json({ success: false, message: errorMsg, data: result.data });
    }
  } catch (error) {
    db.prepare(`
      INSERT INTO fetch_logs (qualification_id, status, message, fetched_at)
      VALUES (?, 'error', ?, ?)
    `).run(qualId, error.message, new Date().toISOString());

    res.status(500).json({ success: false, error: error.message });
  }
});

// カテゴリ一覧取得
router.get('/meta/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT category FROM qualifications ORDER BY category').all();
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
