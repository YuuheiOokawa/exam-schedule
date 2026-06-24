import { Router, Request, Response } from 'express';
import { query } from '../database/db.js';
import { CALENDAR_EVENT_COLORS } from '../constants/index.js';
import { QualificationWithSchedule, CalendarEvent } from '../types/index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getUserTier } from '../middleware/entitlements.js';

const router = Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isDate(val: string | null | undefined): val is string {
  return typeof val === 'string' && DATE_REGEX.test(val);
}

router.get('/events', async (_req: Request, res: Response) => {
  const rows = await query<QualificationWithSchedule>(
    `SELECT q.id, q.name, q.main_category, q.sub_category,
       s.exam_date, s.application_start_date, s.application_end_date,
       s.result_announcement_date, s.exam_fee, s.note
     FROM qualifications q
     INNER JOIN qualification_schedules s ON q.id = s.qualification_id
     WHERE s.exam_date IS NOT NULL
        OR s.application_start_date IS NOT NULL
        OR s.application_end_date IS NOT NULL
        OR s.result_announcement_date IS NOT NULL`
  );

  const events: CalendarEvent[] = [];

  for (const row of rows) {
    const base = {
      qualification_id: row.id,
      qualification_name: row.name,
      exam_fee: row.exam_fee,
      note: row.note,
    };

    if (isDate(row.exam_date)) {
      events.push({
        id: `exam-${row.id}`,
        title: `📝 ${row.name}`,
        start: row.exam_date,
        backgroundColor: CALENDAR_EVENT_COLORS.exam.bg,
        borderColor: CALENDAR_EVENT_COLORS.exam.border,
        type: 'exam',
        extendedProps: { ...base, event_type: '試験日' },
      });
    }
    if (isDate(row.application_start_date)) {
      events.push({
        id: `app-start-${row.id}`,
        title: `🟢 ${row.name}`,
        start: row.application_start_date,
        backgroundColor: CALENDAR_EVENT_COLORS.application_start.bg,
        borderColor: CALENDAR_EVENT_COLORS.application_start.border,
        type: 'application_start',
        extendedProps: { ...base, event_type: '申込開始' },
      });
    }
    if (isDate(row.application_end_date)) {
      events.push({
        id: `app-end-${row.id}`,
        title: `🔴 ${row.name}`,
        start: row.application_end_date,
        backgroundColor: CALENDAR_EVENT_COLORS.application_end.bg,
        borderColor: CALENDAR_EVENT_COLORS.application_end.border,
        type: 'application_end',
        extendedProps: { ...base, event_type: '申込締切' },
      });
    }
    if (isDate(row.result_announcement_date)) {
      events.push({
        id: `result-${row.id}`,
        title: `🏆 ${row.name}`,
        start: row.result_announcement_date,
        backgroundColor: CALENDAR_EVENT_COLORS.result.bg,
        borderColor: CALENDAR_EVENT_COLORS.result.border,
        type: 'result',
        extendedProps: { ...base, event_type: '合格発表' },
      });
    }
  }

  res.json({ success: true, data: events });
});

// ─── iCal エクスポート（プレミアム限定）────────────────────────
// GET /api/calendar/ical
router.get('/ical', requireAuth, async (req: AuthRequest, res: Response) => {
  const tier = await getUserTier(req.user!.id);
  if (tier !== 'premium') {
    res.status(403).json({
      success: false,
      error: { code: 'PREMIUM_REQUIRED', message: 'カレンダー連携はプレミアムプランでご利用いただけます' },
    });
    return;
  }

  const rows = await query<QualificationWithSchedule>(
    `SELECT q.id, q.name,
       s.exam_date, s.application_end_date, s.result_announcement_date
     FROM qualifications q
     INNER JOIN qualification_schedules s ON q.id = s.qualification_id
     WHERE s.exam_date IS NOT NULL
        OR s.application_end_date IS NOT NULL
        OR s.result_announcement_date IS NOT NULL`
  );

  // ユーザー個人の受験予定
  interface PersonalPlanRow { id: number; planned_date: string; name: string; notes: string | null }
  const personalPlans = await query<PersonalPlanRow>(
    `SELECT uep.id, uep.planned_date, q.name, uep.notes
     FROM user_exam_plans uep
     JOIN qualifications q ON q.id = uep.qualification_id
     WHERE uep.user_id = $1 AND uep.result IS NULL
     ORDER BY uep.planned_date ASC`,
    [req.user!.id]
  );

  function icalDate(dateStr: string): string {
    return dateStr.replace(/-/g, '');
  }

  function icalEscape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const vevents: string[] = [];

  for (const row of rows) {
    if (isDate(row.exam_date)) {
      vevents.push([
        'BEGIN:VEVENT',
        `UID:exam-${row.id}@exam-schedule-app`,
        `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${icalDate(row.exam_date)}`,
        `DTEND;VALUE=DATE:${icalDate(row.exam_date)}`,
        `SUMMARY:📝 ${icalEscape(row.name)}（試験日）`,
        'END:VEVENT',
      ].join('\r\n'));
    }
    if (isDate(row.application_end_date)) {
      vevents.push([
        'BEGIN:VEVENT',
        `UID:deadline-${row.id}@exam-schedule-app`,
        `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${icalDate(row.application_end_date)}`,
        `DTEND;VALUE=DATE:${icalDate(row.application_end_date)}`,
        `SUMMARY:🔴 ${icalEscape(row.name)}（申込締切）`,
        'END:VEVENT',
      ].join('\r\n'));
    }
    if (isDate(row.result_announcement_date)) {
      vevents.push([
        'BEGIN:VEVENT',
        `UID:result-${row.id}@exam-schedule-app`,
        `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${icalDate(row.result_announcement_date)}`,
        `DTEND;VALUE=DATE:${icalDate(row.result_announcement_date)}`,
        `SUMMARY:🏆 ${icalEscape(row.name)}（合格発表）`,
        'END:VEVENT',
      ].join('\r\n'));
    }
  }

  // 個人受験予定を追加
  for (const plan of personalPlans) {
    if (isDate(plan.planned_date)) {
      const lines = [
        'BEGIN:VEVENT',
        `UID:myplan-${plan.id}@exam-schedule-app`,
        `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${icalDate(plan.planned_date)}`,
        `DTEND;VALUE=DATE:${icalDate(plan.planned_date)}`,
        `SUMMARY:📌 ${icalEscape(plan.name)}（受験予定）`,
      ];
      if (plan.notes) lines.push(`DESCRIPTION:${icalEscape(plan.notes)}`);
      lines.push('END:VEVENT');
      vevents.push(lines.join('\r\n'));
    }
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//資格スケジュール//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:資格試験スケジュール',
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="exam-schedule.ics"');
  res.send(ical);
});

export default router;
