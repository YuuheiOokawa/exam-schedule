import { Router, Response } from 'express';
import webpush from 'web-push';
import { queryOne, queryRun, query } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

function getVapidConfig() {
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub  = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
  return { pub, priv, sub };
}

function setupWebPush() {
  const { pub, priv, sub } = getVapidConfig();
  if (!pub || !priv) return false;
  webpush.setVapidDetails(sub, pub, priv);
  return true;
}

// ─── VAPID公開鍵を返す ──────────────────────────────────
router.get('/vapid-public-key', (_req, res: Response) => {
  const { pub } = getVapidConfig();
  if (!pub) {
    res.status(503).json({ success: false, error: { code: 'VAPID_NOT_CONFIGURED', message: 'Push通知は設定されていません' } });
    return;
  }
  res.json({ success: true, data: { publicKey: pub } });
});

// ─── 購読を登録 ─────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, error: { code: 'INVALID_SUBSCRIPTION', message: '購読情報が不正です' } });
    return;
  }

  await queryRun(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [req.user!.id, endpoint, keys.p256dh, keys.auth]
  );

  res.json({ success: true, data: { subscribed: true } });
});

// ─── 購読を解除 ─────────────────────────────────────────
router.delete('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };

  if (endpoint) {
    await queryRun(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [req.user!.id, endpoint]
    );
  } else {
    await queryRun(`DELETE FROM push_subscriptions WHERE user_id = $1`, [req.user!.id]);
  }

  res.json({ success: true, data: { unsubscribed: true } });
});

// ─── 購読状態確認 ────────────────────────────────────────
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const sub = await queryOne(
    `SELECT id FROM push_subscriptions WHERE user_id = $1 LIMIT 1`, [req.user!.id]
  );
  res.json({ success: true, data: { subscribed: !!sub } });
});

// ─── テスト通知送信（開発用）────────────────────────────
router.post('/test', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!setupWebPush()) {
    res.status(503).json({ success: false, error: { code: 'VAPID_NOT_CONFIGURED', message: 'VAPIDキーが設定されていません' } });
    return;
  }

  const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [req.user!.id]
  );

  if (subs.length === 0) {
    res.status(404).json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'Push購読が登録されていません' } });
    return;
  }

  const payload = JSON.stringify({
    title: '資格スケジュール',
    body:  'テスト通知です',
    url:   '/',
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const sent   = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  logger.info(`Test push: sent=${sent}, failed=${failed}, user_id=${req.user!.id}`);
  res.json({ success: true, data: { sent, failed } });
});

export default router;
