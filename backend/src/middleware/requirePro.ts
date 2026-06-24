import { Response, NextFunction } from 'express';
import { type AuthRequest } from './auth.js';
import { getUserTier } from './entitlements.js';

// subscription_status ベースで判定（entitlements.ts と統一）
// trial / premium / canceled / grace_period はすべて premium 扱い
export async function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } });
    return;
  }

  const tier = await getUserTier(req.user.id);
  if (tier === 'premium' || req.user.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'PRO_REQUIRED',
      message: 'この機能はプレミアムプランが必要です',
    },
  });
}
