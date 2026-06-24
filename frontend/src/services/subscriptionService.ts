import { apiClient } from './api';

// ─── 型定義 ────────────────────────────────────────────────────────

export type PlanCode = 'free' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export type SubscriptionStatus =
  | 'free'
  | 'trial'
  | 'premium'
  | 'canceled'
  | 'grace_period'
  | 'expired';

export interface SubscriptionStatusData {
  status: SubscriptionStatus;
  plan_code: PlanCode;
  plan: string;
  is_premium: boolean;
  expires_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  canceled_at: string | null;
  platform: 'web' | 'ios' | 'android';
  has_stripe: boolean;
}

export interface Entitlements {
  tier: 'free' | 'premium';
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

export interface Plan {
  plan_code: PlanCode;
  name: string;
  interval_months: number;
  price_jpy: number;
  price_monthly: number;
  discount_pct: number;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
}

// 後方互換：既存コードが使っている Subscription 型
export interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
}

export interface PaymentHistory {
  plan_code: string;
  plan_name: string | null;
  amount_jpy: number;
  status: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  platform: string;
}

// ─── サービス ─────────────────────────────────────────────────────

export const subscriptionService = {
  // 後方互換 (ProfilePage・PricingPageの旧コードが使用)
  get: async (): Promise<Subscription> => {
    const res = await apiClient.get<{ success: boolean; data: SubscriptionStatusData }>('/subscription/status');
    const d = res.data.data;
    return {
      plan:               d.is_premium ? 'pro' : 'free',
      status:             d.status === 'premium' ? 'active' : d.status,
      current_period_end: d.expires_at,
    };
  },

  // 詳細な契約状態取得
  getStatus: async (): Promise<SubscriptionStatusData> => {
    const res = await apiClient.get<{ success: boolean; data: SubscriptionStatusData }>('/subscription/status');
    return res.data.data;
  },

  // エンタイトルメント取得（機能制限一覧）
  getEntitlements: async (): Promise<Entitlements> => {
    const res = await apiClient.get<{ success: boolean; data: Entitlements }>('/subscription/entitlements');
    return res.data.data;
  },

  // プラン一覧取得（公開エンドポイント）
  getPlans: async (): Promise<Plan[]> => {
    const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/subscription/plans');
    return res.data.data;
  },

  // Stripe Checkout セッション作成（プランコード指定）
  createCheckout: async (planCode: PlanCode = 'monthly'): Promise<{ url: string }> => {
    const res = await apiClient.post<{ success: boolean; data: { url: string } }>(
      '/stripe/create-checkout', { planCode }
    );
    return res.data.data;
  },

  // Stripe カスタマーポータル
  openPortal: async (): Promise<{ url: string }> => {
    const res = await apiClient.post<{ success: boolean; data: { url: string } }>(
      '/stripe/portal', {}
    );
    return res.data.data;
  },

  // 決済履歴
  getHistory: async (): Promise<PaymentHistory[]> => {
    const res = await apiClient.get<{ success: boolean; data: PaymentHistory[] }>('/subscription/history');
    return res.data.data;
  },
};
