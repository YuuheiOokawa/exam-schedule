import { Router, Response } from 'express';
import { query } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getUserTier } from '../middleware/entitlements.js';

const router = Router();

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(cols: unknown[]): string {
  return cols.map(escapeCsv).join(',');
}

// ─── CSV エクスポート（プレミアム限定）────────────────────────
// GET /api/export/csv?type=held|wishlist|plans
router.get('/csv', requireAuth, async (req: AuthRequest, res: Response) => {
  const tier = await getUserTier(req.user!.id);
  if (tier !== 'premium') {
    res.status(403).json({
      success: false,
      error: { code: 'PREMIUM_REQUIRED', message: 'CSVエクスポートはプレミアムプランでご利用いただけます' },
    });
    return;
  }

  const { type = 'all' } = req.query as { type?: string };
  const userId = req.user!.id;
  const lines: string[] = ['﻿']; // UTF-8 BOM for Excel
  let filename = 'exam-schedule-export.csv';

  // ─── 保有資格 ─────────────────────────────────────────────
  if (type === 'held' || type === 'all') {
    filename = type === 'held' ? 'held-qualifications.csv' : filename;
    lines.push('=== 保有資格 ===');
    lines.push(toRow(['資格名', 'カテゴリ', 'レベル', 'スコア', '取得日']));

    const rows = await query<{
      name: string; main_category: string; level: string | null;
      score: string | null; acquired_at: string | null;
    }>(
      `SELECT q.name, q.main_category, q.level,
              uhq.score, uhq.acquired_at
       FROM user_held_qualifications uhq
       JOIN qualifications q ON q.id = uhq.qualification_id
       WHERE uhq.user_id = $1
       ORDER BY uhq.acquired_at DESC NULLS LAST, q.name`,
      [userId]
    );

    for (const r of rows) {
      lines.push(toRow([r.name, r.main_category, r.level ?? '', r.score ?? '', r.acquired_at ?? '']));
    }
    lines.push('');
  }

  // ─── ウィッシュリスト ────────────────────────────────────
  if (type === 'wishlist' || type === 'all') {
    filename = type === 'wishlist' ? 'wishlist.csv' : filename;
    lines.push('=== ウィッシュリスト ===');
    lines.push(toRow(['資格名', 'カテゴリ', 'レベル', '登録日']));

    const rows = await query<{
      name: string; main_category: string; level: string | null; created_at: string;
    }>(
      `SELECT q.name, q.main_category, q.level, uw.created_at
       FROM user_wishlist uw
       JOIN qualifications q ON q.id = uw.qualification_id
       WHERE uw.user_id = $1
       ORDER BY uw.created_at DESC`,
      [userId]
    );

    for (const r of rows) {
      lines.push(toRow([r.name, r.main_category, r.level ?? '', r.created_at.slice(0, 10)]));
    }
    lines.push('');
  }

  // ─── 受験計画 ────────────────────────────────────────────
  if (type === 'plans' || type === 'all') {
    filename = type === 'plans' ? 'exam-plans.csv' : filename;
    lines.push('=== 受験計画 ===');
    lines.push(toRow(['資格名', '受験予定日', '結果', '備考']));

    const rows = await query<{
      name: string; planned_date: string; result: string | null; notes: string | null;
    }>(
      `SELECT q.name, uep.planned_date, uep.result, uep.notes
       FROM user_exam_plans uep
       JOIN qualifications q ON q.id = uep.qualification_id
       WHERE uep.user_id = $1
       ORDER BY uep.planned_date DESC`,
      [userId]
    );

    for (const r of rows) {
      const resultLabel = r.result === 'passed' ? '合格' : r.result === 'failed' ? '不合格' : '未受験';
      lines.push(toRow([r.name, r.planned_date, resultLabel, r.notes ?? '']));
    }
    lines.push('');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(lines.join('\r\n'));
});

export default router;
