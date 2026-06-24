const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// カレンダー用イベント一覧取得
// start/end クエリパラメータで期間絞り込み可能
router.get('/events', (req, res) => {
  try {
    const schedules = db.prepare(`
      SELECT q.id as qualification_id, q.name, q.category,
        s.exam_date, s.application_start_date, s.application_end_date,
        s.result_announcement_date, s.exam_fee, s.note
      FROM qualifications q
      JOIN qualification_schedules s ON q.id = s.qualification_id
    `).all();

    const events = [];

    for (const s of schedules) {
      const color = getCategoryColor(s.category);

      if (s.exam_date && s.exam_date !== '公式ページ上で確認できません') {
        events.push({
          id: `exam-${s.qualification_id}`,
          title: `【試験】${s.name}`,
          start: parseDate(s.exam_date),
          type: 'exam',
          color: color.exam,
          extendedProps: {
            qualification_id: s.qualification_id,
            qualification_name: s.name,
            category: s.category,
            event_type: '試験日',
            exam_fee: s.exam_fee,
            note: s.note,
          }
        });
      }

      if (s.application_start_date && s.application_start_date !== '公式ページ上で確認できません' && s.application_start_date !== '随時受付' && s.application_start_date !== '随時申込可能') {
        events.push({
          id: `app-start-${s.qualification_id}`,
          title: `【申込開始】${s.name}`,
          start: parseDate(s.application_start_date),
          type: 'application_start',
          color: color.appStart,
          extendedProps: {
            qualification_id: s.qualification_id,
            qualification_name: s.name,
            category: s.category,
            event_type: '申込開始日',
          }
        });
      }

      if (s.application_end_date && s.application_end_date !== '公式ページ上で確認できません' && s.application_end_date !== '随時受付' && s.application_end_date !== '随時申込可能') {
        events.push({
          id: `app-end-${s.qualification_id}`,
          title: `【申込締切】${s.name}`,
          start: parseDate(s.application_end_date),
          type: 'application_end',
          color: color.appEnd,
          extendedProps: {
            qualification_id: s.qualification_id,
            qualification_name: s.name,
            category: s.category,
            event_type: '申込締切日',
          }
        });
      }

      if (s.result_announcement_date && s.result_announcement_date !== '公式ページ上で確認できません' && !s.result_announcement_date.includes('直後')) {
        events.push({
          id: `result-${s.qualification_id}`,
          title: `【合格発表】${s.name}`,
          start: parseDate(s.result_announcement_date),
          type: 'result',
          color: color.result,
          extendedProps: {
            qualification_id: s.qualification_id,
            qualification_name: s.name,
            category: s.category,
            event_type: '合格発表日',
          }
        });
      }
    }

    res.json({ success: true, data: events.filter(e => e.start) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getCategoryColor(category) {
  const colors = {
    '国家資格': { exam: '#2563EB', appStart: '#60A5FA', appEnd: '#1D4ED8', result: '#93C5FD' },
    'クラウド': { exam: '#D97706', appStart: '#FCD34D', appEnd: '#B45309', result: '#FDE68A' },
    'データベース': { exam: '#059669', appStart: '#6EE7B7', appEnd: '#047857', result: '#A7F3D0' },
    'Java': { exam: '#7C3AED', appStart: '#C4B5FD', appEnd: '#5B21B6', result: '#DDD6FE' },
    'IT': { exam: '#DC2626', appStart: '#FCA5A5', appEnd: '#B91C1C', result: '#FEE2E2' },
  };
  return colors[category] || { exam: '#6B7280', appStart: '#D1D5DB', appEnd: '#4B5563', result: '#F3F4F6' };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // YYYY-MM-DD 形式なら返す
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // YYYY/MM/DD 形式を変換
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return dateStr.replace(/\//g, '-');
  // それ以外は null（テキスト記述の日程はカレンダーに表示不可）
  return null;
}

module.exports = router;
