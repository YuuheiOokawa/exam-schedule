import { Router, Response } from 'express';
import { query, queryOne, queryRun, transaction } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { checkCountLimit } from '../middleware/entitlements.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ qualification_id: number }>(
    `SELECT qualification_id FROM user_held_qualifications WHERE user_id = $1`,
    [req.user!.id]
  );
  res.json({ success: true, data: rows.map((r) => r.qualification_id) });
});

router.get('/details', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ qualification_id: number; score: string | null; acquired_at: string | null }>(
    `SELECT qualification_id, score, acquired_at FROM user_held_qualifications WHERE user_id = $1`,
    [req.user!.id]
  );
  res.json({ success: true, data: rows });
});

router.post('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.id);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }

  const existing = await queryOne(
    `SELECT id FROM user_held_qualifications WHERE user_id = $1 AND qualification_id = $2`,
    [req.user!.id, qualId]
  );

  if (existing) {
    await queryRun(
      `DELETE FROM user_held_qualifications WHERE user_id = $1 AND qualification_id = $2`,
      [req.user!.id, qualId]
    );
    res.json({ success: true, data: { held: false } });
  } else {
    const countRow = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM user_held_qualifications WHERE user_id = $1`,
      [req.user!.id]
    );
    const { allowed, max } = await checkCountLimit(req.user!.id, 'max_held_qualifications', Number(countRow?.cnt ?? 0));
    if (!allowed) {
      res.status(403).json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          feature: 'max_held_qualifications',
          max,
          message: `保有資格の登録は${max}件が上限です。プレミアムプランで無制限にご利用いただけます。`,
        },
      });
      return;
    }
    await queryRun(
      `INSERT INTO user_held_qualifications (user_id, qualification_id) VALUES ($1, $2)`,
      [req.user!.id, qualId]
    );
    res.json({ success: true, data: { held: true } });
  }
});

router.patch('/:id/score', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.id);
  const { score } = req.body as { score?: string };

  const existing = await queryOne(
    `SELECT id FROM user_held_qualifications WHERE user_id = $1 AND qualification_id = $2`,
    [req.user!.id, qualId]
  );
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '保有資格が見つかりません' } });
    return;
  }

  await queryRun(
    `UPDATE user_held_qualifications SET score = $1 WHERE user_id = $2 AND qualification_id = $3`,
    [score ?? null, req.user!.id, qualId]
  );
  res.json({ success: true, data: { score: score ?? null } });
});

router.patch('/:id/acquired-at', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.id);
  const { acquired_at } = req.body as { acquired_at?: string };

  const existing = await queryOne(
    `SELECT id FROM user_held_qualifications WHERE user_id = $1 AND qualification_id = $2`,
    [req.user!.id, qualId]
  );
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '保有資格が見つかりません' } });
    return;
  }

  await queryRun(
    `UPDATE user_held_qualifications SET acquired_at = $1 WHERE user_id = $2 AND qualification_id = $3`,
    [acquired_at ?? null, req.user!.id, qualId]
  );
  res.json({ success: true, data: { acquired_at: acquired_at ?? null } });
});

router.put('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  const { ids } = req.body as { ids?: number[] };
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: { code: 'MISSING_IDS', message: 'IDリストが必要です' } });
    return;
  }

  await transaction(async (client) => {
    for (const id of ids) {
      if (typeof id === 'number' && id > 0) {
        await client.query(
          `INSERT INTO user_held_qualifications (user_id, qualification_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.user!.id, id]
        );
      }
    }
  });

  res.json({ success: true, data: null });
});

export default router;
