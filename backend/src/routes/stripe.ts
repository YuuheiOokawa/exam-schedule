import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { query, queryOne, queryRun } from '../database/db.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import {
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendSubscriptionExpiredEmail,
  sendRenewalSucceededEmail,
} from '../services/emailService.js';

const router = Router();

// ─── Stripe インスタンス取得 ──────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// ─── planCode → stripe_price_id 解決 ─────────────────────

const PLAN_CODE_ENV_MAP: Record<string, string> = {
  monthly:   'STRIPE_PRICE_MONTHLY',
  quarterly: 'STRIPE_PRICE_QUARTERLY',
  biannual:  'STRIPE_PRICE_BIANNUAL',
  annual:    'STRIPE_PRICE_ANNUAL',
};

async function resolvePriceId(planCode: string): Promise<string | null> {
  // 1. plans テーブルから取得
  const plan = await queryOne<{ stripe_price_id: string | null }>(
    `SELECT stripe_price_id FROM plans WHERE plan_code = $1 AND is_active = true`,
    [planCode]
  );
  if (plan?.stripe_price_id) return plan.stripe_price_id;

  // 2. 環境変数フォールバック（planCode別）
  const envKey = PLAN_CODE_ENV_MAP[planCode];
  if (envKey && process.env[envKey]) return process.env[envKey]!;

  // 3. 旧来の STRIPE_PRICE_PRO（後方互換）
  if (planCode === 'monthly' && process.env.STRIPE_PRICE_PRO) {
    return process.env.STRIPE_PRICE_PRO;
  }

  return null;
}

// ─── イベントログ・支払い記録ヘルパー ─────────────────────

async function logSubscriptionEvent(
  userId: number,
  subscriptionId: number | null,
  eventType: string,
  planCode?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await queryRun(
    `INSERT INTO subscription_events
       (user_id, subscription_id, event_type, plan_code, platform, metadata)
     VALUES ($1, $2, $3, $4, 'web', $5::jsonb)`,
    [userId, subscriptionId, eventType, planCode ?? null, JSON.stringify(metadata ?? {})]
  );
}

async function recordPayment(
  userId: number,
  subscriptionId: number | null,
  planCode: string,
  invoice: Stripe.Invoice
): Promise<void> {
  const paymentIntentId = typeof invoice.payment_intent === 'string'
    ? invoice.payment_intent
    : (invoice.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  await queryRun(
    `INSERT INTO payments
       (user_id, subscription_id, plan_code, platform, amount_jpy, currency,
        status, stripe_payment_intent_id, stripe_invoice_id, paid_at, period_start, period_end)
     VALUES ($1, $2, $3, 'web', $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL
     DO UPDATE SET
       status = EXCLUDED.status,
       paid_at = COALESCE(EXCLUDED.paid_at, payments.paid_at),
       amount_jpy = EXCLUDED.amount_jpy`,
    [
      userId, subscriptionId, planCode,
      invoice.amount_paid,
      invoice.currency,
      invoice.status,
      paymentIntentId,
      invoice.id,
      invoice.status === 'paid' ? new Date() : null,
      invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      invoice.period_end   ? new Date(invoice.period_end   * 1000) : null,
    ]
  );
}

// ─── サブスクリプション情報を取得 ────────────────────────
// 後方互換エンドポイント（旧コードが /stripe/subscription を参照している場合）
router.get('/subscription', requireAuth, async (req: AuthRequest, res: Response) => {
  const sub = await queryOne(
    `SELECT plan, plan_code, status, current_period_end, expires_at FROM subscriptions WHERE user_id = $1`,
    [req.user!.id]
  );
  res.json({ success: true, data: sub ?? { plan: 'free', plan_code: 'free', status: 'active', current_period_end: null } });
});

// ─── Checkout セッション作成 ─────────────────────────────
router.post('/create-checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { planCode = 'monthly', priceId: legacyPriceId } = req.body as {
    planCode?: string;
    priceId?: string;
  };

  // 後方互換: priceId 直接指定がある場合はそちらを優先
  const price = legacyPriceId ?? await resolvePriceId(planCode);

  if (!price) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PRICE',
        message: `プラン「${planCode}」のStripe Price IDが設定されていません。管理者にお問い合わせください。`,
      },
    });
    return;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.APP_URL}/me?checkout=success`,
      cancel_url:  `${process.env.APP_URL}/pricing?checkout=cancel`,
      metadata: {
        user_id:   String(req.user!.id),
        plan_code: planCode,
      },
      subscription_data: {
        metadata: {
          user_id:   String(req.user!.id),
          plan_code: planCode,
        },
      },
      locale: 'ja',
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe error';
    logger.error('Stripe checkout error', { error: msg });
    res.status(500).json({ success: false, error: { code: 'STRIPE_ERROR', message: msg } });
  }
});

// ─── カスタマーポータル ────────────────────────────────────
router.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  const sub = await queryOne<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1`,
    [req.user!.id]
  );

  if (!sub?.stripe_customer_id) {
    res.status(404).json({
      success: false,
      error: { code: 'NO_SUBSCRIPTION', message: '有効なサブスクリプションがありません' },
    });
    return;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.APP_URL}/me`,
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe error';
    res.status(500).json({ success: false, error: { code: 'STRIPE_ERROR', message: msg } });
  }
});

// ─── Stripe Webhook ──────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  const sig    = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    res.status(400).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (e) {
    logger.error('Stripe webhook signature error', { error: e });
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    switch (event.type) {

      // ── 初回購入完了 ──────────────────────────────────────
      case 'checkout.session.completed': {
        const session  = event.data.object as Stripe.Checkout.Session;
        const userId   = Number(session.metadata?.user_id);
        const planCode = session.metadata?.plan_code ?? 'monthly';

        if (!userId || !session.subscription || !session.customer) break;

        // Stripe からサブスクリプション詳細を取得して expires_at を確定
        const stripe    = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        const expiresAt = new Date(stripeSub.current_period_end * 1000);

        // subscriptions テーブルを upsert
        await queryRun(
          `INSERT INTO subscriptions
             (user_id, stripe_customer_id, stripe_sub_id, plan, plan_code, status, current_period_end, expires_at, updated_at)
           VALUES ($1, $2, $3, 'pro', $4, 'active', to_timestamp($5), $6, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             stripe_customer_id = $2, stripe_sub_id = $3,
             plan = 'pro', plan_code = $4, status = 'active',
             current_period_end = to_timestamp($5), expires_at = $6,
             canceled_at = NULL, grace_period_ends_at = NULL, trial_ends_at = NULL,
             updated_at = NOW()`,
          [userId, session.customer, session.subscription, planCode, stripeSub.current_period_end, expiresAt]
        );

        // users の subscription_status・subscription_tier を更新
        await queryRun(
          `UPDATE users SET subscription_status = 'premium', subscription_tier = 'pro' WHERE id = $1`,
          [userId]
        );

        // subscriptions レコードの id を取得してイベントログへ
        const subRow = await queryOne<{ id: number }>(
          `SELECT id FROM subscriptions WHERE user_id = $1`, [userId]
        );
        await logSubscriptionEvent(userId, subRow?.id ?? null, 'purchase_completed', planCode, {
          stripe_session_id:  session.id,
          stripe_customer_id: session.customer,
          stripe_sub_id:      session.subscription,
        });

        logger.info(`Subscription activated: user_id=${userId}, plan=${planCode}`);
        break;
      }

      // ── 請求成功（更新） ──────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object as Stripe.Invoice;
        const subId      = typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (!subId) break;
        // 初回 checkout 完了直後にも発火するため、billing_reason で判定
        if (invoice.billing_reason === 'subscription_create') break;

        const existing = await queryOne<{ user_id: number; id: number; plan_code: string }>(
          `SELECT user_id, id, plan_code FROM subscriptions WHERE stripe_sub_id = $1`, [subId]
        );
        if (!existing) break;

        // 次回更新日を延長
        const stripe    = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const expiresAt = new Date(stripeSub.current_period_end * 1000);

        await queryRun(
          `UPDATE subscriptions
           SET status = 'active', current_period_end = to_timestamp($1), expires_at = $2,
               grace_period_ends_at = NULL, updated_at = NOW()
           WHERE stripe_sub_id = $3`,
          [stripeSub.current_period_end, expiresAt, subId]
        );
        await queryRun(
          `UPDATE users SET subscription_status = 'premium', subscription_tier = 'pro'
           WHERE id = $1`, [existing.user_id]
        );

        await recordPayment(existing.user_id, existing.id, existing.plan_code, invoice);
        await logSubscriptionEvent(existing.user_id, existing.id, 'renewal_succeeded', existing.plan_code, {
          invoice_id: invoice.id, amount: invoice.amount_paid,
        });

        // 更新成功メール（ユーザー情報取得）
        const user = await queryOne<{ email: string; name: string }>(
          `SELECT email, name FROM users WHERE id = $1`, [existing.user_id]
        );
        if (user) {
          await sendRenewalSucceededEmail(user.email, user.name, expiresAt).catch(() => {});
        }

        logger.info(`Renewal succeeded: user_id=${existing.user_id}`);
        break;
      }

      // ── 決済失敗 → 猶予期間開始 ──────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (!subId) break;

        const existing = await queryOne<{ user_id: number; id: number; plan_code: string }>(
          `SELECT user_id, id, plan_code FROM subscriptions WHERE stripe_sub_id = $1`, [subId]
        );
        if (!existing) break;

        // 3日間の猶予期間を設定
        const gracePeriodEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        await queryRun(
          `UPDATE subscriptions
           SET status = 'past_due', grace_period_ends_at = $1, updated_at = NOW()
           WHERE stripe_sub_id = $2`,
          [gracePeriodEnds, subId]
        );
        await queryRun(
          `UPDATE users SET subscription_status = 'grace_period' WHERE id = $1`,
          [existing.user_id]
        );

        await recordPayment(existing.user_id, existing.id, existing.plan_code, invoice);
        await logSubscriptionEvent(existing.user_id, existing.id, 'renewal_failed', existing.plan_code, {
          invoice_id: invoice.id, grace_period_ends: gracePeriodEnds.toISOString(),
        });

        // 決済失敗メール送信
        const user = await queryOne<{ email: string; name: string }>(
          `SELECT email, name FROM users WHERE id = $1`, [existing.user_id]
        );
        if (user) {
          await sendPaymentFailedEmail(user.email, user.name).catch(() => {});
        }

        logger.warn(`Payment failed → grace_period: user_id=${existing.user_id}`);
        break;
      }

      // ── サブスク更新（解約申請・再開含む） ────────────────
      case 'customer.subscription.updated': {
        const sub      = event.data.object as Stripe.Subscription;
        const existing = await queryOne<{ user_id: number; id: number; plan_code: string }>(
          `SELECT user_id, id, plan_code FROM subscriptions WHERE stripe_sub_id = $1`, [sub.id]
        );
        if (!existing) break;

        const expiresAt = new Date(sub.current_period_end * 1000);

        if (sub.cancel_at_period_end) {
          // 解約申請（期間終了まで利用可能）
          await queryRun(
            `UPDATE subscriptions
             SET status = 'canceled', canceled_at = NOW(), expires_at = $1,
                 current_period_end = to_timestamp($2), updated_at = NOW()
             WHERE stripe_sub_id = $3`,
            [expiresAt, sub.current_period_end, sub.id]
          );
          await queryRun(
            `UPDATE users SET subscription_status = 'canceled' WHERE id = $1`,
            [existing.user_id]
          );

          await logSubscriptionEvent(existing.user_id, existing.id, 'canceled', existing.plan_code, {
            expires_at: expiresAt.toISOString(),
          });

          const user = await queryOne<{ email: string; name: string }>(
            `SELECT email, name FROM users WHERE id = $1`, [existing.user_id]
          );
          if (user) {
            await sendSubscriptionCanceledEmail(user.email, user.name, expiresAt).catch(() => {});
          }

          logger.info(`Subscription canceled (period end): user_id=${existing.user_id}`);
        } else if (sub.status === 'active') {
          // 解約取り消し or プラン変更
          await queryRun(
            `UPDATE subscriptions
             SET status = 'active', canceled_at = NULL, expires_at = $1,
                 current_period_end = to_timestamp($2), updated_at = NOW()
             WHERE stripe_sub_id = $3`,
            [expiresAt, sub.current_period_end, sub.id]
          );
          await queryRun(
            `UPDATE users SET subscription_status = 'premium', subscription_tier = 'pro'
             WHERE id = $1`, [existing.user_id]
          );
          await logSubscriptionEvent(existing.user_id, existing.id, 'reactivated', existing.plan_code);
          logger.info(`Subscription reactivated: user_id=${existing.user_id}`);
        }
        break;
      }

      // ── サブスク完全削除（期間終了後） ────────────────────
      case 'customer.subscription.deleted': {
        const sub      = event.data.object as Stripe.Subscription;
        const existing = await queryOne<{ user_id: number; id: number; plan_code: string }>(
          `SELECT user_id, id, plan_code FROM subscriptions WHERE stripe_sub_id = $1`, [sub.id]
        );
        if (!existing) break;

        await queryRun(
          `UPDATE subscriptions
           SET plan = 'free', plan_code = 'free', status = 'expired',
               expires_at = NOW(), updated_at = NOW()
           WHERE stripe_sub_id = $1`, [sub.id]
        );
        await queryRun(
          `UPDATE users SET subscription_status = 'expired', subscription_tier = 'free'
           WHERE id = $1`, [existing.user_id]
        );

        await logSubscriptionEvent(existing.user_id, existing.id, 'expired', existing.plan_code);

        const user = await queryOne<{ email: string; name: string }>(
          `SELECT email, name FROM users WHERE id = $1`, [existing.user_id]
        );
        if (user) {
          await sendSubscriptionExpiredEmail(user.email, user.name).catch(() => {});
        }

        logger.info(`Subscription deleted/expired: user_id=${existing.user_id}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (e) {
    logger.error('Webhook handler error', { error: e });
    res.status(500).json({ success: false });
  }
});

// ─── plans テーブルの stripe_price_id を更新（管理用） ─────
router.post('/sync-price', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { plan_code, stripe_price_id } = req.body as { plan_code?: string; stripe_price_id?: string };

  if (!plan_code || !stripe_price_id) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'plan_code と stripe_price_id は必須です' } });
    return;
  }

  await queryRun(
    `UPDATE plans SET stripe_price_id = $1 WHERE plan_code = $2`,
    [stripe_price_id, plan_code]
  );

  logger.info(`Stripe price synced: plan_code=${plan_code}, price_id=${stripe_price_id}`);
  res.json({ success: true, data: null });
});

export default router;
