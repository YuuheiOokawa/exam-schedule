const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// 資格追加
router.post('/qualifications', (req, res) => {
  const { name, category, official_url, description } = req.body;
  if (!name || !category) {
    return res.status(400).json({ success: false, error: '資格名とカテゴリは必須です' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO qualifications (name, category, official_url, description)
      VALUES (?, ?, ?, ?)
    `).run(name, category, official_url || null, description || null);

    db.prepare(`
      INSERT INTO qualification_schedules (qualification_id, source_url, note)
      VALUES (?, ?, ?)
    `).run(result.lastInsertRowid, official_url || null, '手動登録。最新情報を取得ボタンで情報を更新してください。');

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 資格編集
router.put('/qualifications/:id', (req, res) => {
  const { name, category, official_url, description } = req.body;
  try {
    db.prepare(`
      UPDATE qualifications SET name = ?, category = ?, official_url = ?, description = ?
      WHERE id = ?
    `).run(name, category, official_url || null, description || null, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 資格削除
router.delete('/qualifications/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM qualifications WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// スケジュール手動登録・更新
router.put('/schedules/:qualificationId', (req, res) => {
  const qualId = parseInt(req.params.qualificationId);
  const {
    exam_date, application_start_date, application_end_date,
    result_announcement_date, exam_fee, source_url, note
  } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM qualification_schedules WHERE qualification_id = ?').get(qualId);
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE qualification_schedules SET
          exam_date = ?, application_start_date = ?, application_end_date = ?,
          result_announcement_date = ?, exam_fee = ?, source_url = ?,
          fetched_at = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE qualification_id = ?
      `).run(
        exam_date || null, application_start_date || null, application_end_date || null,
        result_announcement_date || null, exam_fee || null, source_url || null,
        now, note || null, qualId
      );
    } else {
      db.prepare(`
        INSERT INTO qualification_schedules
          (qualification_id, exam_date, application_start_date, application_end_date,
           result_announcement_date, exam_fee, source_url, fetched_at, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        qualId, exam_date || null, application_start_date || null, application_end_date || null,
        result_announcement_date || null, exam_fee || null, source_url || null, now, note || null
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取得ログ一覧
router.get('/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT fl.*, q.name as qualification_name
      FROM fetch_logs fl
      JOIN qualifications q ON fl.qualification_id = q.id
      ORDER BY fl.fetched_at DESC
      LIMIT 100
    `).all();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 全資格一括取得
router.post('/fetch-all', async (req, res) => {
  const { runScraper } = require('../scrapers');
  try {
    const quals = db.prepare('SELECT * FROM qualifications').all();
    const results = [];

    for (const qual of quals) {
      try {
        const result = await runScraper(qual.name, qual.id, qual.official_url);
        const now = new Date().toISOString();

        if (result.success && result.data) {
          const existing = db.prepare('SELECT id FROM qualification_schedules WHERE qualification_id = ?').get(qual.id);
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
              result.data.exam_fee, result.data.source_url, now, result.data.note, qual.id
            );
          }
          db.prepare(`INSERT INTO fetch_logs (qualification_id, status, message, fetched_at) VALUES (?, 'success', ?, ?)`).run(qual.id, '取得成功', now);
          results.push({ name: qual.name, success: true });
        } else {
          db.prepare(`INSERT INTO fetch_logs (qualification_id, status, message, fetched_at) VALUES (?, 'error', ?, ?)`).run(qual.id, result.error || '取得失敗', now);
          results.push({ name: qual.name, success: false, error: result.error });
        }
      } catch (err) {
        results.push({ name: qual.name, success: false, error: err.message });
      }

      // アクセス間隔（3秒）
      await new Promise(r => setTimeout(r, 3000));
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
