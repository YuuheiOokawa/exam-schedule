import { Router, Request, Response } from 'express';
import { query, queryOne, queryRun } from '../database/db.js';
import { QualificationWithSchedule } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/qualifications', async (_req: Request, res: Response) => {
  const rows = await query<QualificationWithSchedule>(
    `SELECT q.*, s.id as schedule_id,
       s.exam_date, s.application_start_date, s.application_end_date,
       s.result_announcement_date, s.exam_fee, s.source_url, s.fetched_at, s.note
     FROM qualifications q
     LEFT JOIN LATERAL (
       SELECT * FROM qualification_schedules
       WHERE qualification_id = q.id
       ORDER BY exam_date DESC NULLS LAST
       LIMIT 1
     ) s ON true
     ORDER BY q.main_category, q.sub_category, q.name`
  );
  res.json({ success: true, data: rows });
});

router.post('/qualifications', async (req: Request, res: Response) => {
  const { name, main_category, sub_category, official_url, description,
          is_scrapable, exam_format, requires_renewal, renewal_period_years } = req.body as {
    name?: string; main_category?: string; sub_category?: string;
    official_url?: string; description?: string; is_scrapable?: boolean;
    exam_format?: string; requires_renewal?: boolean; renewal_period_years?: number | null;
  };

  if (!name || !main_category || !sub_category) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '資格名・大カテゴリ・小カテゴリは必須です' } });
    return;
  }

  const result = await queryRun(
    `INSERT INTO qualifications
       (name, main_category, sub_category, official_url, description,
        is_scrapable, exam_format, requires_renewal, renewal_period_years)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [name, main_category, sub_category, official_url ?? null, description ?? null,
     is_scrapable ? 1 : 0, exam_format ?? 'fixed_date',
     requires_renewal ? 1 : 0, renewal_period_years ?? null]
  );

  await queryRun(
    `INSERT INTO qualification_schedules (qualification_id, note) VALUES ($1, $2)`,
    [result.id, '新規追加。管理画面から日程を手動登録してください。']
  );

  const inserted = await queryOne(`SELECT * FROM qualifications WHERE id = $1`, [result.id]);
  logger.info('Qualification created', { id: result.id, name });
  res.status(201).json({ success: true, data: inserted });
});

router.put('/qualifications/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, main_category, sub_category, official_url, description,
          is_scrapable, exam_format, requires_renewal, renewal_period_years,
          score_enabled, score_unit, score_max } = req.body as {
    name?: string; main_category?: string; sub_category?: string;
    official_url?: string; description?: string; is_scrapable?: boolean;
    exam_format?: string; requires_renewal?: boolean; renewal_period_years?: number | null;
    score_enabled?: boolean; score_unit?: string | null; score_max?: string | null;
  };

  const existing = await queryOne(`SELECT id FROM qualifications WHERE id = $1`, [id]);
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '資格が見つかりません' } });
    return;
  }

  await queryRun(
    `UPDATE qualifications SET
       name = COALESCE($1, name),
       main_category = COALESCE($2, main_category),
       sub_category = COALESCE($3, sub_category),
       official_url = $4,
       description = $5,
       is_scrapable = COALESCE($6, is_scrapable),
       exam_format = COALESCE($7, exam_format),
       requires_renewal = COALESCE($8, requires_renewal),
       renewal_period_years = $9,
       score_enabled = COALESCE($10, score_enabled),
       score_unit = $11,
       score_max = $12,
       updated_at = NOW()
     WHERE id = $13`,
    [name, main_category, sub_category, official_url ?? null, description ?? null,
     is_scrapable !== undefined ? (is_scrapable ? 1 : 0) : null,
     exam_format, requires_renewal !== undefined ? (requires_renewal ? 1 : 0) : null,
     renewal_period_years ?? null,
     score_enabled !== undefined ? (score_enabled ? 1 : 0) : null,
     score_unit ?? null, score_max ?? null, id]
  );

  const updated = await queryOne(`SELECT * FROM qualifications WHERE id = $1`, [id]);
  res.json({ success: true, data: updated });
});

router.delete('/qualifications/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await queryOne(`SELECT id FROM qualifications WHERE id = $1`, [id]);
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '資格が見つかりません' } });
    return;
  }
  await queryRun(`DELETE FROM qualifications WHERE id = $1`, [id]);
  logger.info('Qualification deleted', { id });
  res.json({ success: true, data: { id: Number(id) } });
});

// 既存スケジュール更新（後方互換: 最初の1件を更新）
router.put('/schedules/:qualificationId', async (req: Request, res: Response) => {
  const { qualificationId } = req.params;
  const { exam_date, application_start_date, application_end_date,
          result_announcement_date, exam_fee, source_url, note } = req.body as {
    exam_date?: string; application_start_date?: string; application_end_date?: string;
    result_announcement_date?: string; exam_fee?: string; source_url?: string; note?: string;
  };

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM qualification_schedules WHERE qualification_id = $1
     ORDER BY created_at ASC LIMIT 1`, [qualificationId]
  );

  if (existing) {
    await queryRun(
      `UPDATE qualification_schedules SET
         exam_date = $1, application_start_date = $2, application_end_date = $3,
         result_announcement_date = $4, exam_fee = $5, source_url = $6, note = $7,
         updated_at = NOW()
       WHERE id = $8`,
      [exam_date ?? null, application_start_date ?? null, application_end_date ?? null,
       result_announcement_date ?? null, exam_fee ?? null, source_url ?? null,
       note ?? null, existing.id]
    );
  } else {
    await queryRun(
      `INSERT INTO qualification_schedules
         (qualification_id, exam_date, application_start_date, application_end_date,
          result_announcement_date, exam_fee, source_url, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [qualificationId, exam_date ?? null, application_start_date ?? null,
       application_end_date ?? null, result_announcement_date ?? null,
       exam_fee ?? null, source_url ?? null, note ?? null]
    );
  }

  const updated = await query(`SELECT * FROM qualification_schedules WHERE qualification_id = $1 ORDER BY exam_date DESC NULLS LAST`, [qualificationId]);
  res.json({ success: true, data: updated });
});

// スケジュールの追加（複数日程対応）
router.post('/schedules/:qualificationId', async (req: Request, res: Response) => {
  const { qualificationId } = req.params;
  const { exam_date, application_start_date, application_end_date,
          result_announcement_date, exam_fee, source_url, note } = req.body as {
    exam_date?: string; application_start_date?: string; application_end_date?: string;
    result_announcement_date?: string; exam_fee?: string; source_url?: string; note?: string;
  };

  const qual = await queryOne(`SELECT id FROM qualifications WHERE id = $1`, [qualificationId]);
  if (!qual) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '資格が見つかりません' } });
    return;
  }

  const result = await queryRun(
    `INSERT INTO qualification_schedules
       (qualification_id, exam_date, application_start_date, application_end_date,
        result_announcement_date, exam_fee, source_url, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [qualificationId, exam_date ?? null, application_start_date ?? null,
     application_end_date ?? null, result_announcement_date ?? null,
     exam_fee ?? null, source_url ?? null, note ?? null]
  );

  const inserted = await queryOne(`SELECT * FROM qualification_schedules WHERE id = $1`, [result.id]);
  logger.info('Schedule added', { qualificationId, scheduleId: result.id });
  res.status(201).json({ success: true, data: inserted });
});

// スケジュール個別更新
router.put('/schedules/record/:scheduleId', async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  const { exam_date, application_start_date, application_end_date,
          result_announcement_date, exam_fee, source_url, note } = req.body as {
    exam_date?: string; application_start_date?: string; application_end_date?: string;
    result_announcement_date?: string; exam_fee?: string; source_url?: string; note?: string;
  };

  const existing = await queryOne(`SELECT id FROM qualification_schedules WHERE id = $1`, [scheduleId]);
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'スケジュールが見つかりません' } });
    return;
  }

  await queryRun(
    `UPDATE qualification_schedules SET
       exam_date = $1, application_start_date = $2, application_end_date = $3,
       result_announcement_date = $4, exam_fee = $5, source_url = $6, note = $7,
       updated_at = NOW()
     WHERE id = $8`,
    [exam_date ?? null, application_start_date ?? null, application_end_date ?? null,
     result_announcement_date ?? null, exam_fee ?? null, source_url ?? null,
     note ?? null, scheduleId]
  );

  const updated = await queryOne(`SELECT * FROM qualification_schedules WHERE id = $1`, [scheduleId]);
  res.json({ success: true, data: updated });
});

// スケジュール個別削除
router.delete('/schedules/record/:scheduleId', async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  const existing = await queryOne(`SELECT id, qualification_id FROM qualification_schedules WHERE id = $1`, [scheduleId]);
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'スケジュールが見つかりません' } });
    return;
  }
  await queryRun(`DELETE FROM qualification_schedules WHERE id = $1`, [scheduleId]);
  logger.info('Schedule deleted', { scheduleId });
  res.json({ success: true, data: { id: Number(scheduleId) } });
});

// ─── CSV一括アップロード ────────────────────────────────────────
// 列: 資格名称, 試験日（直近）, 申込開始日, 申込締切日, 合格発表日, 受験料, 公式URL(省略可), 情報状態(無視)
// 日付形式: YYYY-MM-DD または空欄（テキスト形式の日程は備考に保存）

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(val: string): string | null {
  const s = val.trim();
  return DATE_PATTERN.test(s) ? s : null;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

router.post('/upload-schedule', async (req: Request, res: Response) => {
  const { csv } = req.body as { csv?: string };
  if (!csv || typeof csv !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_CSV', message: 'CSVデータが必要です' } });
    return;
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    res.status(400).json({ success: false, error: { code: 'EMPTY_CSV', message: 'データ行がありません' } });
    return;
  }

  // BOM除去 & ヘッダースキップ
  lines[0] = lines[0].replace(/^﻿/, '');
  const dataLines = lines.slice(1).filter((l) => l.trim());

  // ── 事前一括取得（DB クエリ数を 4N→2 回に削減）────────────────
  const allQuals = await query<{ id: number; name: string }>(
    `SELECT id, name FROM qualifications`
  );
  const qualMap = new Map(allQuals.map((q) => [q.name, q.id]));

  // 各資格の最古スケジュール1件だけ取得
  const allSchedules = await query<{ id: number; qualification_id: number }>(
    `SELECT DISTINCT ON (qualification_id) id, qualification_id
       FROM qualification_schedules
       ORDER BY qualification_id, created_at ASC`
  );
  const scheduleMap = new Map(allSchedules.map((s) => [s.qualification_id, s.id]));

  let updated = 0;
  let inserted = 0;
  let urlUpdated = 0;
  const errors: string[] = [];

  for (const line of dataLines) {
    const cols = parseCsvRow(line);
    if (cols.length < 1) continue;

    const [rawName = '', examDateRaw = '', appStartRaw = '', appEndRaw = '', resultDateRaw = '', examFeeRaw = ''] = cols;
    const officialUrl = cols.length > 6 ? (cols[6] ?? '').trim() || null : null;

    const name = rawName.trim();
    if (!name) continue;

    try {
      let qualId = qualMap.get(name);
      if (qualId === undefined) {
        // DB に存在しない場合は新規追加
        const newQual = await queryRun(
          `INSERT INTO qualifications
             (name, main_category, sub_category, official_url, exam_format)
           VALUES ($1, '民間資格', 'その他', $2, 'fixed_date') RETURNING id`,
          [name, officialUrl]
        );
        if (!newQual.id) {
          errors.push(`「${name}」の資格追加に失敗しました`);
          continue;
        }
        qualId = newQual.id;
        qualMap.set(name, qualId);
        if (officialUrl) urlUpdated++;
        inserted++;

        const ed2   = parseDate(examDateRaw);
        const as2   = parseDate(appStartRaw);
        const ae2   = parseDate(appEndRaw);
        const rd2   = parseDate(resultDateRaw);
        const fee2  = examFeeRaw.trim() || null;
        const note2 = (ed2 === null && examDateRaw.trim().length > 0) ? examDateRaw.trim() : null;
        const schedResult = await queryRun(
          `INSERT INTO qualification_schedules
             (qualification_id, exam_date, application_start_date, application_end_date,
              result_announcement_date, exam_fee, note, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id`,
          [qualId, ed2, as2, ae2, rd2, fee2, note2]
        );
        if (schedResult.id) scheduleMap.set(qualId, schedResult.id);
        continue;
      }

      const ed  = parseDate(examDateRaw);
      const as_ = parseDate(appStartRaw);
      const ae  = parseDate(appEndRaw);
      const rd  = parseDate(resultDateRaw);
      const fee = examFeeRaw.trim() || null;
      const scheduleNote = (ed === null && examDateRaw.trim().length > 0) ? examDateRaw.trim() : null;

      if (officialUrl) {
        await queryRun(
          `UPDATE qualifications SET official_url = $1, updated_at = NOW() WHERE id = $2`,
          [officialUrl, qualId]
        );
        urlUpdated++;
      }

      const existingScheduleId = scheduleMap.get(qualId);

      if (existingScheduleId !== undefined) {
        await queryRun(
          `UPDATE qualification_schedules SET
             exam_date = COALESCE($1, exam_date),
             application_start_date = COALESCE($2, application_start_date),
             application_end_date = COALESCE($3, application_end_date),
             result_announcement_date = COALESCE($4, result_announcement_date),
             exam_fee = COALESCE($5, exam_fee),
             note = COALESCE($6, note),
             fetched_at = NOW(),
             updated_at = NOW()
           WHERE id = $7`,
          [ed, as_, ae, rd, fee, scheduleNote, existingScheduleId]
        );
        updated++;
      } else {
        const result = await queryRun(
          `INSERT INTO qualification_schedules
             (qualification_id, exam_date, application_start_date, application_end_date,
              result_announcement_date, exam_fee, note, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id`,
          [qualId, ed, as_, ae, rd, fee, scheduleNote]
        );
        if (result.id) scheduleMap.set(qualId, result.id);
        inserted++;
      }
    } catch (rowErr) {
      const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
      errors.push(`「${name}」の処理中にエラーが発生しました: ${msg}`);
      logger.warn('CSV row processing failed', { name, error: msg });
    }
  }

  logger.info('CSV schedule upload completed', { updated, inserted, urlUpdated, errors: errors.length });
  res.json({ success: true, data: { updated, inserted, skipped: errors.length, urlUpdated, errors } });
});

export default router;
