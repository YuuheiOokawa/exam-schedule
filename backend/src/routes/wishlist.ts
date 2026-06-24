import { Router, Response } from 'express';
import { query, queryOne, queryRun } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { checkCountLimit } from '../middleware/entitlements.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ qualification_id: number }>(
    `SELECT qualification_id FROM user_wishlist WHERE user_id = $1`,
    [req.user!.id]
  );
  res.json({ success: true, data: rows.map((r) => r.qualification_id) });
});

router.post('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.id);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }

  const existing = await queryOne(
    `SELECT id FROM user_wishlist WHERE user_id = $1 AND qualification_id = $2`,
    [req.user!.id, qualId]
  );

  if (existing) {
    await queryRun(
      `DELETE FROM user_wishlist WHERE user_id = $1 AND qualification_id = $2`,
      [req.user!.id, qualId]
    );
    res.json({ success: true, data: { added: false } });
  } else {
    const countRow = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM user_wishlist WHERE user_id = $1`,
      [req.user!.id]
    );
    const { allowed, max } = await checkCountLimit(req.user!.id, 'max_wishlist', Number(countRow?.cnt ?? 0));
    if (!allowed) {
      res.status(403).json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          feature: 'max_wishlist',
          max,
          message: `ウィッシュリストは${max}件が上限です。プレミアムプランで無制限にご利用いただけます。`,
        },
      });
      return;
    }
    await queryRun(
      `INSERT INTO user_wishlist (user_id, qualification_id) VALUES ($1, $2)`,
      [req.user!.id, qualId]
    );
    res.json({ success: true, data: { added: true } });
  }
});

export default router;
