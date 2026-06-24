import cron from 'node-cron';
import webpush from 'web-push';
import { query, queryOne, queryRun } from '../database/db.js';
import { logger } from '../utils/logger.js';
import {
  sendSubscriptionExpiredEmail,
  sendTrialEndingSoonEmail,
} from '../services/emailService.js';


// ─── サブスク期限切れ自動処理 ────────────────────────────────

export async function checkExpiredSubscriptions(): Promise<void> {
  const now = new Date();

  // 1. 猶予期間（grace_period）が終了したユーザーを expired に移行
  const graceExpired = await query<{ user_id: number; id: number; plan_code: string }>(
    `SELECT user_id, id, plan_code FROM subscriptions
     WHERE grace_period_ends_at IS NOT NULL
       AND grace_period_ends_at < $1
       AND status != 'expired'`,
    [now]
  );

  for (const sub of graceExpired) {
    await queryRun(
      `UPDATE subscriptions
       SET plan = 'free', plan_code = 'free', status = 'expired',
           expires_at = NOW(), grace_period_ends_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );
    await queryRun(
      `UPDATE users SET subscription_status = 'expired', subscription_tier = 'free' WHERE id = $1`,
      [sub.user_id]
    );
    await queryRun(
      `INSERT INTO subscription_events (user_id, subscription_id, event_type, plan_code, platform)
       VALUES ($1, $2, 'grace_period_expired', $3, 'web')`,
      [sub.user_id, sub.id, sub.plan_code]
    );

    const user = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE id = $1`, [sub.user_id]
    );
    if (user) {
      await sendSubscriptionExpiredEmail(user.email, user.name).catch(() => {});
    }
    logger.info(`Grace period expired → free: user_id=${sub.user_id}`);
  }

  // 2. trial が期限切れのユーザーを expired に移行（trial_ends_at が過去）
  const trialExpired = await query<{ user_id: number; id: number }>(
    `SELECT user_id, id FROM subscriptions
     WHERE status = 'trial'
       AND trial_ends_at IS NOT NULL
       AND trial_ends_at < $1`,
    [now]
  );

  for (const sub of trialExpired) {
    await queryRun(
      `UPDATE subscriptions
       SET plan = 'free', plan_code = 'free', status = 'expired',
           expires_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );
    await queryRun(
      `UPDATE users SET subscription_status = 'expired', subscription_tier = 'free' WHERE id = $1`,
      [sub.user_id]
    );
    await queryRun(
      `INSERT INTO subscription_events (user_id, subscription_id, event_type, plan_code, platform)
       VALUES ($1, $2, 'trial_expired', 'free', 'web')`,
      [sub.user_id, sub.id]
    );

    const trialUser = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE id = $1`, [sub.user_id]
    );
    if (trialUser) {
      await sendSubscriptionExpiredEmail(trialUser.email, trialUser.name).catch(() => {});
    }
    logger.info(`Trial expired → free: user_id=${sub.user_id}`);
  }

  // 3. canceled 状態で expires_at が過去のユーザーを expired に移行
  const canceledExpired = await query<{ user_id: number; id: number; plan_code: string }>(
    `SELECT user_id, id, plan_code FROM subscriptions
     WHERE status IN ('canceled', 'active')
       AND expires_at IS NOT NULL
       AND expires_at < $1`,
    [now]
  );

  for (const sub of canceledExpired) {
    await queryRun(
      `UPDATE subscriptions
       SET plan = 'free', plan_code = 'free', status = 'expired', updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );
    await queryRun(
      `UPDATE users SET subscription_status = 'expired', subscription_tier = 'free' WHERE id = $1`,
      [sub.user_id]
    );
    await queryRun(
      `INSERT INTO subscription_events (user_id, subscription_id, event_type, plan_code, platform)
       VALUES ($1, $2, 'subscription_expired', $3, 'web')`,
      [sub.user_id, sub.id, sub.plan_code]
    );

    const user = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE id = $1`, [sub.user_id]
    );
    if (user) {
      await sendSubscriptionExpiredEmail(user.email, user.name).catch(() => {});
    }
    logger.info(`Subscription expired → free: user_id=${sub.user_id}`);
  }

  const total = graceExpired.length + trialExpired.length + canceledExpired.length;
  if (total > 0) {
    logger.info(`checkExpiredSubscriptions completed: ${total} users moved to expired`);
  }
}

// ─── トライアル終了3日前リマインダー ──────────────────────────

export async function sendTrialEndingReminderEmails(): Promise<void> {
  const now = new Date();

  // 3日後の日付範囲（当日 00:00 〜 23:59:59）
  const targetStart = new Date(now);
  targetStart.setDate(targetStart.getDate() + 3);
  targetStart.setHours(0, 0, 0, 0);

  const targetEnd = new Date(targetStart);
  targetEnd.setHours(23, 59, 59, 999);

  const subs = await query<{ user_id: number; trial_ends_at: string }>(
    `SELECT user_id, trial_ends_at FROM subscriptions
     WHERE status = 'trial'
       AND trial_ends_at BETWEEN $1 AND $2`,
    [targetStart, targetEnd]
  );

  for (const sub of subs) {
    const user = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE id = $1`, [sub.user_id]
    );
    if (user) {
      await sendTrialEndingSoonEmail(
        user.email,
        user.name,
        new Date(sub.trial_ends_at),
      ).catch(() => {});
      logger.info(`Trial ending soon email sent: user_id=${sub.user_id}`);
    }
  }

  if (subs.length > 0) {
    logger.info(`sendTrialEndingReminderEmails: sent to ${subs.length} users`);
  }
}

// ─── Push通知 自動送信 ──────────────────────────────────────

// プレミアム扱いのサブスクステータス
const PREMIUM_STATUSES = `('trial', 'premium', 'canceled', 'grace_period')`;

interface PushRow {
  user_id: number;
  qualification_name: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface ExamPlanRow extends PushRow {
  planned_date: string;
}

interface DeadlineRow extends PushRow {
  target_date: string;
}

function setupWebPushIfNeeded(): boolean {
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub  = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(sub, pub, priv);
    return true;
  } catch {
    return false;
  }
}

export async function sendExamReminderPushNotifications(): Promise<void> {
  if (!setupWebPushIfNeeded()) {
    logger.warn('Push notifications skipped: VAPID keys not configured');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 前日・7日前・30日前の日付文字列を生成（YYYY-MM-DD形式）
  // 前日は全ユーザー、7日前/30日前はプレミアムユーザーのみ
  const targets: Array<{ daysAhead: number; label: string; premiumOnly: boolean }> = [
    { daysAhead: 1,  label: '明日',    premiumOnly: false },
    { daysAhead: 7,  label: '1週間後', premiumOnly: true  },
    { daysAhead: 30, label: '1ヶ月後', premiumOnly: true  },
  ];

  let totalSent = 0;
  let totalFailed = 0;

  for (const { daysAhead, label, premiumOnly } of targets) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().split('T')[0];

    const premiumFilter = premiumOnly
      ? `AND u.subscription_status IN ${PREMIUM_STATUSES}` : '';

    const plans = await query<ExamPlanRow>(
      `SELECT uep.user_id, q.name AS qualification_name, uep.planned_date,
              ps.endpoint, ps.p256dh, ps.auth
       FROM user_exam_plans uep
       JOIN qualifications q ON q.id = uep.qualification_id
       JOIN push_subscriptions ps ON ps.user_id = uep.user_id
       JOIN users u ON u.id = uep.user_id
       WHERE uep.planned_date = $1 ${premiumFilter}`,
      [dateStr]
    );

    for (const plan of plans) {
      const payload = JSON.stringify({
        title: `試験リマインダー（${label}）`,
        body:  `「${plan.qualification_name}」の受験日が${label}（${plan.planned_date}）です`,
        url:   '/calendar',
      });

      try {
        await webpush.sendNotification(
          { endpoint: plan.endpoint, keys: { p256dh: plan.p256dh, auth: plan.auth } },
          payload
        );
        totalSent++;
      } catch (err: unknown) {
        // 購読が無効（410）の場合は削除
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await queryRun(
            `DELETE FROM push_subscriptions WHERE endpoint = $1`,
            [plan.endpoint]
          ).catch(() => {});
        }
        totalFailed++;
        logger.warn(`Push notification failed: user_id=${plan.user_id}`, { status });
      }
    }

    if (plans.length > 0) {
      logger.info(`Exam reminder push (${label}/${dateStr}): ${plans.length} plans targeted`);
    }
  }

  if (totalSent + totalFailed > 0) {
    logger.info(`sendExamReminderPushNotifications completed: sent=${totalSent}, failed=${totalFailed}`);
  }
}

// ─── 申込期限アラート（プレミアムのみ・7日前と1日前）────────────

export async function sendApplicationDeadlineAlerts(): Promise<void> {
  if (!setupWebPushIfNeeded()) {
    logger.warn('Application deadline alerts skipped: VAPID keys not configured');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targets = [
    { daysAhead: 7, label: '7日後' },
    { daysAhead: 1, label: '明日' },
  ];

  let totalSent = 0;
  let totalFailed = 0;

  for (const { daysAhead, label } of targets) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().split('T')[0];

    // ウィッシュリスト or 受験予定に登録済みのプレミアムユーザーに通知
    const rows = await query<DeadlineRow>(
      `SELECT DISTINCT q.name AS qualification_name,
              qs.application_end_date::text AS target_date,
              ps.endpoint, ps.p256dh, ps.auth,
              interest.user_id
       FROM qualification_schedules qs
       JOIN qualifications q ON q.id = qs.qualification_id
       JOIN (
         SELECT qualification_id, user_id FROM user_wishlist
         UNION
         SELECT qualification_id, user_id FROM user_exam_plans
       ) interest ON interest.qualification_id = q.id
       JOIN push_subscriptions ps ON ps.user_id = interest.user_id
       JOIN users u ON u.id = interest.user_id
       WHERE DATE(qs.application_end_date) = $1
         AND u.subscription_status IN ${PREMIUM_STATUSES}`,
      [dateStr]
    );

    for (const row of rows) {
      const payload = JSON.stringify({
        title: `申込締切アラート（${label}）`,
        body:  `「${row.qualification_name}」の申込締切が${label}（${dateStr}）です`,
        url:   '/calendar',
      });
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload
        );
        totalSent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await queryRun(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [row.endpoint]).catch(() => {});
        }
        totalFailed++;
      }
    }

    if (rows.length > 0) {
      logger.info(`Application deadline alert (${label}/${dateStr}): ${rows.length} users notified`);
    }
  }

  if (totalSent + totalFailed > 0) {
    logger.info(`sendApplicationDeadlineAlerts completed: sent=${totalSent}, failed=${totalFailed}`);
  }
}

// ─── 合格発表リマインダー（プレミアムのみ・1日前）────────────

export async function sendResultAnnouncementAlerts(): Promise<void> {
  if (!setupWebPushIfNeeded()) {
    logger.warn('Result announcement alerts skipped: VAPID keys not configured');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // 受験予定があり、まだ結果未記録のプレミアムユーザーに通知
  const rows = await query<DeadlineRow>(
    `SELECT DISTINCT uep.user_id, q.name AS qualification_name,
            qs.result_announcement_date::text AS target_date,
            ps.endpoint, ps.p256dh, ps.auth
     FROM qualification_schedules qs
     JOIN qualifications q ON q.id = qs.qualification_id
     JOIN user_exam_plans uep ON uep.qualification_id = q.id
     JOIN push_subscriptions ps ON ps.user_id = uep.user_id
     JOIN users u ON u.id = uep.user_id
     WHERE DATE(qs.result_announcement_date) = $1
       AND u.subscription_status IN ${PREMIUM_STATUSES}
       AND uep.result IS NULL`,
    [dateStr]
  );

  let totalSent = 0;
  let totalFailed = 0;

  for (const row of rows) {
    const payload = JSON.stringify({
      title: '合格発表リマインダー',
      body:  `「${row.qualification_name}」の合格発表は明日（${dateStr}）です`,
      url:   '/calendar',
    });
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      );
      totalSent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await queryRun(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [row.endpoint]).catch(() => {});
      }
      totalFailed++;
    }
  }

  if (rows.length > 0) {
    logger.info(`Result announcement alerts (${dateStr}): sent=${totalSent}, failed=${totalFailed}`);
  }
}

// ─── Cron スケジューラー初期化 ───────────────────────────────

export function setupCronScheduler(): void {
  // サブスク期限チェック: 毎時 00分
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron: subscription expiry check started');
    await checkExpiredSubscriptions().catch(err => {
      logger.error('checkExpiredSubscriptions failed', { error: err });
    });
  });

  // 試験リマインダーPush通知: 毎日 09:00（前日=全員 / 7日前・30日前=プレミアムのみ）
  cron.schedule('0 9 * * *', async () => {
    logger.info('Cron: exam reminder push notifications started');
    await sendExamReminderPushNotifications().catch(err => {
      logger.error('sendExamReminderPushNotifications failed', { error: err });
    });
  });

  // 申込締切アラート: 毎日 09:05（プレミアムのみ・7日前/1日前）
  cron.schedule('5 9 * * *', async () => {
    logger.info('Cron: application deadline alerts started');
    await sendApplicationDeadlineAlerts().catch(err => {
      logger.error('sendApplicationDeadlineAlerts failed', { error: err });
    });
  });

  // 合格発表リマインダー: 毎日 09:10（プレミアムのみ・1日前）
  cron.schedule('10 9 * * *', async () => {
    logger.info('Cron: result announcement alerts started');
    await sendResultAnnouncementAlerts().catch(err => {
      logger.error('sendResultAnnouncementAlerts failed', { error: err });
    });
  });

  // トライアル終了3日前リマインダーメール: 毎日 10:00
  cron.schedule('0 10 * * *', async () => {
    logger.info('Cron: trial ending reminder emails started');
    await sendTrialEndingReminderEmails().catch(err => {
      logger.error('sendTrialEndingReminderEmails failed', { error: err });
    });
  });

  logger.info('Cron scheduler initialized (expiry: hourly / exam-push: 09:00 / deadline: 09:05 / result: 09:10 / trial: 10:00)');
}
