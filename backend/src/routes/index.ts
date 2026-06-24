import { Router, Request, Response } from 'express';
import qualificationsRouter from './qualifications.js';
import calendarRouter from './calendar.js';
import adminRouter from './admin.js';
import authRouter from './auth.js';
import heldRouter from './held.js';
import wishlistRouter from './wishlist.js';
import scoresRouter from './scores.js';
import plansRouter from './plans.js';
import { requireAdmin } from '../middleware/auth.js';
import stripeRouter from './stripe.js';
import pushRouter from './push.js';
import subscriptionRouter from './subscription.js';
import exportRouter from './export.js';
import analyticsRouter from './analytics.js';
import { logger } from '../utils/logger.js';

const router = Router();

// フロントエンドエラーをバックエンドログに記録
router.post('/client-log', (req: Request, res: Response) => {
  const { level = 'error', message, stack, url, userAgent } = req.body as {
    level?: string; message?: string; stack?: string; url?: string; userAgent?: string;
  };
  if (message) {
    const meta: Record<string, unknown> = {};
    if (stack) meta.stack = stack;
    if (url) meta.url = url;
    if (userAgent) meta.userAgent = userAgent;
    if (level === 'error') {
      logger.error(`[FRONTEND] ${message}`, Object.keys(meta).length ? meta : undefined);
    } else {
      logger.warn(`[FRONTEND] ${message}`, Object.keys(meta).length ? meta : undefined);
    }
  }
  res.json({ success: true });
});

router.use('/auth', authRouter);
router.use('/qualifications', qualificationsRouter);
router.use('/calendar', calendarRouter);
router.use('/held', heldRouter);
router.use('/wishlist', wishlistRouter);
router.use('/scores', scoresRouter);
router.use('/plans', plansRouter);
router.use('/stripe', stripeRouter);
router.use('/push', pushRouter);
router.use('/subscription', subscriptionRouter);
router.use('/export', exportRouter);
router.use('/analytics', analyticsRouter);
router.use('/admin', requireAdmin, adminRouter);

export default router;
