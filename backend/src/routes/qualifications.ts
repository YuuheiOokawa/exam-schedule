import { Router, Request, Response } from 'express';
import { query, queryOne } from '../database/db.js';
import { QualificationWithSchedule } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { search, main_category, sub_category } = req.query;

  // LATERAL JOIN で資格ごとに最も直近の試験日程を1件取得
  let sql = `
    SELECT q.*, s.id as schedule_id,
      s.exam_date, s.application_start_date, s.application_end_date,
      s.result_announcement_date, s.exam_fee, s.source_url, s.fetched_at, s.note
    FROM qualifications q
    LEFT JOIN LATERAL (
      SELECT * FROM qualification_schedules
      WHERE qualification_id = q.id
      ORDER BY exam_date DESC NULLS LAST
      LIMIT 1
    ) s ON true
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (search && typeof search === 'string') {
    sql += ` AND (q.name LIKE $${idx} OR q.description LIKE $${idx + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    idx += 2;
  }
  if (main_category && typeof main_category === 'string') {
    sql += ` AND q.main_category = $${idx}`;
    params.push(main_category);
    idx += 1;
  }
  if (sub_category && typeof sub_category === 'string') {
    sql += ` AND q.sub_category = $${idx}`;
    params.push(sub_category);
  }

  sql += ` ORDER BY q.main_category, q.sub_category, q.name`;

  const rows = await query<QualificationWithSchedule>(sql, params);
  res.json({ success: true, data: rows });
});

router.get('/categories', async (_req: Request, res: Response) => {
  const mainCatRows = await query<{ main_category: string }>(
    `SELECT DISTINCT main_category FROM qualifications ORDER BY main_category`
  );
  const subCatRows = await query<{ main_category: string; sub_category: string }>(
    `SELECT DISTINCT main_category, sub_category FROM qualifications ORDER BY main_category, sub_category`
  );
  res.json({
    success: true,
    data: {
      mainCategories: mainCatRows.map((r) => r.main_category),
      subCategories: subCatRows,
    },
  });
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const qual = await queryOne(
    `SELECT * FROM qualifications WHERE id = $1`, [id]
  );
  if (!qual) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '資格が見つかりません' } });
    return;
  }

  const schedules = await query(
    `SELECT * FROM qualification_schedules WHERE qualification_id = $1
     ORDER BY exam_date DESC NULLS LAST, created_at DESC`,
    [id]
  );

  res.json({ success: true, data: { ...qual, schedules } });
});


export default router;
