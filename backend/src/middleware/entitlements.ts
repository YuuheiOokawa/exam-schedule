import { queryOne } from '../database/db.js';

// ─── プラン定義（ハードコード + DB上書き対応） ──────────────────────

export type Tier = 'free' | 'premium';

export type SubscriptionStatus =
  | 'free'
  | 'trial'
  | 'premium'
  | 'canceled'
  | 'grace_period'
  | 'expired';

const PREMIUM_STATUSES: SubscriptionStatus[] = ['trial', 'premium', 'canceled', 'grace_period'];

export function isTierFromStatus(status: string): Tier {
  return (PREMIUM_STATUSES as string[]).includes(status) ? 'premium' : 'free';
}

// 無料上限はハードコード（DBのfeature_limitsが最優先だが、未存在の場合のフォールバック）
const FREE_LIMITS = {
  max_held_qualifications:    5,
  max_wishlist:               10,
  max_exam_plans:             3,
  max_score_history_per_qual: 5,
  push_notification_types:    1,
} as const;

export type CountFeatureKey = keyof typeof FREE_LIMITS;

// ─── ユーザーのサブスク状態取得 ───────────────────────────────────

export async function getUserSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
  const row = await queryOne<{ subscription_status: string }>(
    `SELECT subscription_status FROM users WHERE id = $1`,
    [userId]
  );
  return (row?.subscription_status ?? 'free') as SubscriptionStatus;
}

export async function getUserTier(userId: number): Promise<Tier> {
  const status = await getUserSubscriptionStatus(userId);
  return isTierFromStatus(status);
}

export function isPremiumActive(status: SubscriptionStatus): boolean {
  return (PREMIUM_STATUSES as string[]).includes(status);
}

// ─── 使用量上限チェック ───────────────────────────────────────────

export async function checkCountLimit(
  userId: number,
  featureKey: CountFeatureKey,
  currentCount: number
): Promise<{ allowed: boolean; max: number | null }> {
  const tier = await getUserTier(userId);
  if (tier === 'premium') return { allowed: true, max: null };

  // DBから取得（存在すればDB優先、なければハードコード値）
  const dbLimit = await queryOne<{ limit_value: number | null }>(
    `SELECT limit_value FROM feature_limits WHERE plan_tier = 'free' AND feature_key = $1`,
    [featureKey]
  );
  const max = dbLimit !== undefined ? dbLimit.limit_value : FREE_LIMITS[featureKey];
  if (max === null) return { allowed: true, max: null };
  return { allowed: currentCount < max, max };
}

// ─── 機能ON/OFFチェック ───────────────────────────────────────────

export async function isFeatureEnabled(userId: number, featureKey: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  if (tier === 'premium') return true;

  const dbLimit = await queryOne<{ is_enabled: boolean }>(
    `SELECT is_enabled FROM feature_limits WHERE plan_tier = 'free' AND feature_key = $1`,
    [featureKey]
  );
  return dbLimit?.is_enabled ?? false;
}

// ─── エンタイトルメント一覧（フロント表示用） ────────────────────

export interface Entitlements {
  tier: Tier;
  status: SubscriptionStatus;
  max_held_qualifications:    number | null;
  max_wishlist:               number | null;
  max_exam_plans:             number | null;
  max_score_history_per_qual: number | null;
  push_notification_types:    number | null;
  calendar_export:            boolean;
  study_planner:              boolean;
  ai_advice:                  boolean;
  data_export:                boolean;
  usage: {
    held_qualifications: number;
    wishlist:            number;
    exam_plans:          number;
  };
}

export async function getEntitlements(userId: number): Promise<Entitlements> {
  const status = await getUserSubscriptionStatus(userId);
  const tier   = isTierFromStatus(status);

  const [heldRow, wishlistRow, planRow] = await Promise.all([
    queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM user_held_qualifications WHERE user_id = $1`, [userId]),
    queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM user_wishlist WHERE user_id = $1`, [userId]),
    queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM user_exam_plans WHERE user_id = $1`, [userId]),
  ]);

  if (tier === 'premium') {
    return {
      tier, status,
      max_held_qualifications:    null,
      max_wishlist:               null,
      max_exam_plans:             null,
      max_score_history_per_qual: null,
      push_notification_types:    null,
      calendar_export:  true,
      study_planner:    true,
      ai_advice:        true,
      data_export:      true,
      usage: {
        held_qualifications: Number(heldRow?.cnt ?? 0),
        wishlist:            Number(wishlistRow?.cnt ?? 0),
        exam_plans:          Number(planRow?.cnt ?? 0),
      },
    };
  }

  return {
    tier, status,
    max_held_qualifications:    FREE_LIMITS.max_held_qualifications,
    max_wishlist:               FREE_LIMITS.max_wishlist,
    max_exam_plans:             FREE_LIMITS.max_exam_plans,
    max_score_history_per_qual: FREE_LIMITS.max_score_history_per_qual,
    push_notification_types:    FREE_LIMITS.push_notification_types,
    calendar_export:  false,
    study_planner:    false,
    ai_advice:        false,
    data_export:      false,
    usage: {
      held_qualifications: Number(heldRow?.cnt ?? 0),
      wishlist:            Number(wishlistRow?.cnt ?? 0),
      exam_plans:          Number(planRow?.cnt ?? 0),
    },
  };
}
