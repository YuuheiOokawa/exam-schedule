import { Router, Response } from 'express';
import { query, queryOne, queryRun, transaction } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { checkCountLimit } from '../middleware/entitlements.js';

const router = Router();

// ─── セクション定義取得 ───────────────────────────────────────────
// GET /api/scores/defs/:qualId
router.get('/defs/:qualId', async (req, res: Response) => {
  const qualId = Number(req.params.qualId);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  const rows = await query(
    `SELECT section_key, section_label, max_score, sort_order
     FROM qualification_score_section_defs
     WHERE qualification_id = $1
     ORDER BY sort_order ASC`,
    [qualId]
  );
  res.json({ success: true, data: rows });
});

// ─── スコア履歴取得（セクション値を含む） ───────────────────────────
// GET /api/scores/:qualId
router.get('/:qualId', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.qualId);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }

  const rows = await query<{
    id: number; score: string; taken_at: string; notes: string | null; created_at: string;
  }>(
    `SELECT id, score, taken_at, notes, created_at
     FROM qualification_score_history
     WHERE user_id = $1 AND qualification_id = $2
     ORDER BY taken_at ASC`,
    [req.user!.id, qualId]
  );

  if (rows.length === 0) {
    res.json({ success: true, data: [] });
    return;
  }

  // セクション値を一括取得
  const ids = rows.map((r) => r.id);
  const sectionVals = await query<{ score_history_id: number; section_key: string; score: string }>(
    `SELECT score_history_id, section_key, score::text
     FROM score_section_values
     WHERE score_history_id = ANY($1::int[])`,
    [ids]
  );

  // セクション値をhistory_idでグルーピング
  const sectionMap = new Map<number, Record<string, string>>();
  for (const sv of sectionVals) {
    if (!sectionMap.has(sv.score_history_id)) sectionMap.set(sv.score_history_id, {});
    sectionMap.get(sv.score_history_id)![sv.section_key] = sv.score;
  }

  const data = rows.map((r) => ({
    ...r,
    section_values: sectionMap.get(r.id) ?? null,
  }));

  res.json({ success: true, data });
});

// ─── スコア記録（セクション値含む） ────────────────────────────────
// POST /api/scores/:qualId
router.post('/:qualId', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.qualId);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }

  const { score, taken_at, notes, section_values } = req.body as {
    score?: string;
    taken_at?: string;
    notes?: string;
    section_values?: Record<string, string>;
  };
  if (!score || !taken_at) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'score と taken_at は必須です' } });
    return;
  }

  const countRow = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM qualification_score_history WHERE user_id = $1 AND qualification_id = $2`,
    [req.user!.id, qualId]
  );
  const { allowed, max } = await checkCountLimit(
    req.user!.id,
    'max_score_history_per_qual',
    Number(countRow?.cnt ?? 0)
  );
  if (!allowed) {
    res.status(403).json({
      success: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        feature: 'max_score_history_per_qual',
        max,
        message: `スコア履歴は資格ごとに${max}件が上限です。プレミアムプランで無制限にご利用いただけます。`,
      },
    });
    return;
  }

  const newId = await transaction(async (client) => {
    const res = await client.query<{ id: number }>(
      `INSERT INTO qualification_score_history (user_id, qualification_id, score, taken_at, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user!.id, qualId, String(score), taken_at, notes ?? null]
    );
    const historyId = res.rows[0].id;

    if (section_values && typeof section_values === 'object') {
      for (const [key, val] of Object.entries(section_values)) {
        if (val === '' || val === null || val === undefined) continue;
        const num = parseFloat(val);
        if (isNaN(num)) continue;
        await client.query(
          `INSERT INTO score_section_values (score_history_id, section_key, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (score_history_id, section_key) DO UPDATE SET score = EXCLUDED.score`,
          [historyId, key, num]
        );
      }
    }
    return historyId;
  });

  res.status(201).json({ success: true, data: { id: newId } });
});

// ─── スコア削除 ────────────────────────────────────────────────────
// DELETE /api/scores/:scoreId
router.delete('/:scoreId', requireAuth, async (req: AuthRequest, res: Response) => {
  const scoreId = Number(req.params.scoreId);
  if (!scoreId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }

  await queryRun(
    `DELETE FROM qualification_score_history WHERE id = $1 AND user_id = $2`,
    [scoreId, req.user!.id]
  );
  res.json({ success: true, data: null });
});

export default router;
