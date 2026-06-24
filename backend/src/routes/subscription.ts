import { Router, Response } from 'express';
import { query, queryOne } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  getUserSubscriptionStatus,
  getEntitlements,
  isPremiumActive,
} from '../middleware/entitlements.js';

const router = Router();

// GET /api/subscription/status
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const status = await getUserSubscriptionStatus(userId);

  const sub = await queryOne<{
    plan_code: string | null;
    plan: string;
    expires_at: string | null;
    trial_ends_at: string | null;
    grace_period_ends_at: string | null;
    canceled_at: string | null;
    platform: string | null;
    current_period_end: string | null;
    stripe_sub_id: string | null;
  }>(
    `SELECT plan_code, plan, expires_at, trial_ends_at, grace_period_ends_at,
            canceled_at, platform, current_period_end, stripe_sub_id
     FROM subscriptions WHERE user_id = $1`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      status,
      plan_code:             sub?.plan_code ?? 'free',
      plan:                  sub?.plan ?? 'free',
      is_premium:            isPremiumActive(status),
      expires_at:            sub?.expires_at ?? sub?.current_period_end ?? null,
      trial_ends_at:         sub?.trial_ends_at ?? null,
      grace_period_ends_at:  sub?.grace_period_ends_at ?? null,
      canceled_at:           sub?.canceled_at ?? null,
      platform:              sub?.platform ?? 'web',
      has_stripe:            !!sub?.stripe_sub_id,
    },
  });
});

// GET /api/subscription/entitlements
router.get('/entitlements', requireAuth, async (req: AuthRequest, res: Response) => {
  const entitlements = await getEntitlements(req.user!.id);
  res.json({ success: true, data: entitlements });
});

// GET /api/subscription/plans (公開エンドポイント)
router.get('/plans', async (_req, res: Response) => {
  const plans = await query(
    `SELECT plan_code, name, interval_months, price_jpy, price_monthly,
            discount_pct, stripe_price_id, apple_product_id, google_product_id,
            is_active, sort_order
     FROM plans WHERE is_active = true ORDER BY sort_order ASC`
  );
  res.json({ success: true, data: plans });
});

// GET /api/subscription/history (決済履歴)
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT p.plan_code, pl.name AS plan_name, p.amount_jpy, p.status,
            p.paid_at, p.period_start, p.period_end, p.platform
     FROM payments p
     LEFT JOIN plans pl ON pl.plan_code = p.plan_code
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT 24`,
    [req.user!.id]
  );
  res.json({ success: true, data: rows });
});

export default router;
