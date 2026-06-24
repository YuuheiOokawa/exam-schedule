import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

function buildHtml(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">📚 資格スケジュール</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">${name} さん、こんにちは！</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              ご登録ありがとうございます。<br>
              以下のボタンをクリックしてメールアドレスを確認し、パスワードを設定してください。
            </p>
            <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 32px;">
              <a href="${verifyUrl}"
                 style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                メールアドレスを確認する
              </a>
            </td></tr></table>
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">ボタンが機能しない場合は以下のURLをブラウザに貼り付けてください：</p>
            <p style="margin:0 0 24px;font-size:12px;color:#3b82f6;word-break:break-all;">${verifyUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              このリンクは<strong>24時間</strong>有効です。<br>
              このメールに心当たりがない場合は、無視してください。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Resend (推奨: 本番環境) ─────────────────────────────
async function sendViaResend(email: string, name: string, verifyUrl: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: '【資格スケジュール】メールアドレスの確認',
    html: buildHtml(name, verifyUrl),
  });

  if (error) throw new Error(error.message);
  logger.info(`確認メール送信完了 (Resend): ${email}`);
}

// ─── Gmail SMTP (フォールバック) ──────────────────────────
async function sendViaSmtp(email: string, name: string, verifyUrl: string): Promise<void> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM } = process.env;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: '【資格スケジュール】メールアドレスの確認',
    html: buildHtml(name, verifyUrl),
  });
  logger.info(`確認メール送信完了 (SMTP): ${email}`);
}

function buildPasswordResetHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">📚 資格スケジュール</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">${name} さん</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              パスワードリセットのリクエストを受け付けました。<br>
              以下のボタンをクリックして新しいパスワードを設定してください。
            </p>
            <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 32px;">
              <a href="${resetUrl}"
                 style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                パスワードをリセットする
              </a>
            </td></tr></table>
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">ボタンが機能しない場合は以下のURLをブラウザに貼り付けてください：</p>
            <p style="margin:0 0 24px;font-size:12px;color:#ef4444;word-break:break-all;">${resetUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              このリンクは<strong>1時間</strong>有効です。<br>
              このメールに心当たりがない場合は無視してください。パスワードは変更されません。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendPasswordResetViaResend(email: string, name: string, resetUrl: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
  const { error } = await resend.emails.send({
    from, to: email,
    subject: '【資格スケジュール】パスワードリセット',
    html: buildPasswordResetHtml(name, resetUrl),
  });
  if (error) throw new Error(error.message);
}

async function sendPasswordResetViaSmtp(email: string, name: string, resetUrl: string): Promise<void> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM } = process.env;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER, to: email,
    subject: '【資格スケジュール】パスワードリセット',
    html: buildPasswordResetHtml(name, resetUrl),
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    await sendPasswordResetViaResend(email, name, resetUrl);
    return;
  }
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_PASS !== 'your-app-password-here') {
    await sendPasswordResetViaSmtp(email, name, resetUrl);
    return;
  }
  logger.warn('========== パスワードリセットメール (開発モード) ==========');
  logger.warn(`宛先: ${email}`);
  logger.warn(`リセットURL: ${resetUrl}`);
  logger.warn('============================================================');
}

// ─── 課金関連メールテンプレート ────────────────────────────

function buildSubscriptionHtml(
  name: string,
  title: string,
  body: string,
  headerColor: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const cta = ctaText && ctaUrl
    ? `<table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 32px;">
         <a href="${ctaUrl}"
            style="display:inline-block;padding:14px 36px;background:${headerColor};color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
           ${ctaText}
         </a>
       </td></tr></table>`
    : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;">
        <tr>
          <td style="background:${headerColor};padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">📚 資格スケジュール</p>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1e293b;">${name} さん</p>
            ${body}
            ${cta}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              このメールは資格スケジュールアプリからお送りしています。<br>
              心当たりがない場合はこのメールを無視してください。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// 共通送信ラッパー
async function sendSystemEmail(
  email: string,
  subject: string,
  html: string,
): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
      to: email, subject, html,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_PASS !== 'your-app-password-here') {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({ from: SMTP_FROM || SMTP_USER, to: email, subject, html });
    return;
  }

  // 開発モード: コンソール出力のみ
  logger.warn(`========== System Email (dev mode) ==========`);
  logger.warn(`To: ${email} | Subject: ${subject}`);
  logger.warn(`=============================================`);
}

// 決済失敗通知
export async function sendPaymentFailedEmail(email: string, name: string): Promise<void> {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      プレミアムプランの決済処理に問題が発生しました。<br>
      決済方法を確認し、<strong>3日以内</strong>に更新していただくと、引き続きプレミアム機能をご利用いただけます。
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#c2410c;font-weight:600;">⚠️ 3日以内に更新しないと、プレミアム機能が一時停止されます</p>
      <p style="margin:6px 0 0;font-size:12px;color:#78350f;">データはすべて保持されます。再開すればすぐに元通りです。</p>
    </div>`;
  const html = buildSubscriptionHtml(
    name, '決済エラーのお知らせ', body,
    'linear-gradient(135deg,#f97316,#ef4444)',
    '支払い方法を確認する', `${APP_URL}/me`,
  );
  await sendSystemEmail(email, '【資格スケジュール】プレミアムの決済に問題が発生しました', html);
  logger.info(`Payment failed email sent: ${email}`);
}

// 解約後の確認通知
export async function sendSubscriptionCanceledEmail(
  email: string, name: string, expiresAt: Date,
): Promise<void> {
  const expireStr = expiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      プレミアムプランの解約を受け付けました。<br>
      <strong>${expireStr}</strong>までは引き続きプレミアム機能をご利用いただけます。
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">✓ データはすべて保持されます</p>
      <p style="margin:6px 0 0;font-size:12px;color:#166534;">再加入すればいつでもすぐに元通りご利用いただけます。</p>
    </div>`;
  const html = buildSubscriptionHtml(
    name, '解約のお知らせ', body,
    'linear-gradient(135deg,#64748b,#475569)',
  );
  await sendSystemEmail(email, '【資格スケジュール】プレミアムプランを解約しました', html);
  logger.info(`Subscription canceled email sent: ${email}`);
}

// プレミアム期限切れ通知（grace_period 終了後）
export async function sendSubscriptionExpiredEmail(email: string, name: string): Promise<void> {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      プレミアムプランの有効期限が終了し、フリープランに移行しました。<br>
      これまでご利用いただきありがとうございました。
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#334155;font-weight:600;">✓ 登録データはすべて保持されています</p>
      <p style="margin:6px 0 0;font-size:12px;color:#64748b;">再加入すればすぐに全機能をご利用いただけます。</p>
    </div>`;
  const html = buildSubscriptionHtml(
    name, 'プレミアムプランが終了しました', body,
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'プレミアムを再開する', `${APP_URL}/pricing`,
  );
  await sendSystemEmail(email, '【資格スケジュール】プレミアムプランが終了しました', html);
  logger.info(`Subscription expired email sent: ${email}`);
}

// 更新成功通知
export async function sendRenewalSucceededEmail(
  email: string, name: string, nextBillingAt: Date,
): Promise<void> {
  const nextStr = nextBillingAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      プレミアムプランが正常に更新されました。<br>
      引き続きすべての機能をご利用いただけます。
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">✓ 次回更新日: ${nextStr}</p>
    </div>`;
  const html = buildSubscriptionHtml(
    name, 'プレミアム更新完了', body,
    'linear-gradient(135deg,#10b981,#059669)',
  );
  await sendSystemEmail(email, '【資格スケジュール】プレミアムプランが更新されました', html);
  logger.info(`Renewal succeeded email sent: ${email}`);
}

// ウェルカム・トライアル開始通知
export async function sendWelcomeTrialEmail(
  email: string, name: string, trialEndsAt: Date,
): Promise<void> {
  const endStr = trialEndsAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      ご登録ありがとうございます！<br>
      <strong style="color:#1e293b;">7日間の無料トライアル</strong>が始まりました。<br>
      プレミアムのすべての機能を期間中は無料でお試しいただけます。
    </p>
    <div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">🎁 トライアル期間: 〜${endStr}まで</p>
      <p style="margin:8px 0 0;font-size:12px;color:#78350f;">
        ・保有資格・ウィッシュリスト・受験予定を無制限登録<br>
        ・申込期限アラート・合格発表リマインド<br>
        ・スコア履歴グラフ・学習計画自動作成
      </p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
      トライアル終了後は無料プランに自動移行します。<br>
      継続してご利用いただく場合は、プレミアムプランにご登録ください（¥480/月〜）。
    </p>`;
  const html = buildSubscriptionHtml(
    name, '7日間の無料トライアルが始まりました！', body,
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'さっそく使ってみる', `${APP_URL}/`,
  );
  await sendSystemEmail(email, '【資格スケジュール】7日間の無料トライアルが始まりました', html);
  logger.info(`Welcome trial email sent: ${email}`);
}

// トライアル終了3日前リマインダー
export async function sendTrialEndingSoonEmail(
  email: string, name: string, trialEndsAt: Date,
): Promise<void> {
  const endStr = trialEndsAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(trialEndsAt); end.setHours(0,0,0,0);
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);

  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7;">
      無料トライアルの終了まで<strong style="color:#c2410c;">あと${daysLeft}日</strong>となりました。<br>
      トライアル期間（〜${endStr}）終了後は、フリープランに自動移行します。
    </p>
    <div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">🎁 プレミアム継続でできること</p>
      <p style="margin:8px 0 0;font-size:12px;color:#78350f;line-height:1.8;">
        ✓ 保有資格・ウィッシュリスト・受験予定を無制限登録<br>
        ✓ 申込期限アラート・合格発表リマインド<br>
        ✓ スコア履歴グラフ・学習計画自動作成
      </p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
      継続してご利用いただく場合は、プレミアムプランへのご登録をお願いします（¥480/月〜）。<br>
      登録データはすべて保持されます。
    </p>`;
  const html = buildSubscriptionHtml(
    name, `トライアル終了まであと${daysLeft}日です`, body,
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'プレミアムを続ける', `${APP_URL}/pricing`,
  );
  await sendSystemEmail(email, `【資格スケジュール】トライアル終了まであと${daysLeft}日です`, html);
  logger.info(`Trial ending soon email sent (${daysLeft}d): ${email}`);
}

// ─── メイン送信関数 ───────────────────────────────────────
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/set-password?token=${token}`;

  // 1) Resend APIキーがあればResendを使う
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(email, name, verifyUrl);
    return;
  }

  // 2) SMTP設定が完全に揃っていればGmail SMTPを使う
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_PASS !== 'your-app-password-here') {
    await sendViaSmtp(email, name, verifyUrl);
    return;
  }

  // 3) どちらも未設定 → 開発用コンソール出力
  logger.warn('========== 確認メール (メール未設定 - 開発モード) ==========');
  logger.warn(`宛先: ${email}`);
  logger.warn(`確認URL: ${verifyUrl}`);
  logger.warn('============================================================');
}
