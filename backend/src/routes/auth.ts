import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, queryOne, queryRun, transaction, JWT_SECRET } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeTrialEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import type { UserPublic, UserRole } from '../types/index.js';

interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  subscription_tier: string;
}

interface PendingRegistration {
  id: number;
  email: string;
  name: string;
  token: string;
  expires_at: number;
}

const router = Router();

// ─── ログイン ────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'メールアドレスとパスワードを入力してください' } });
    return;
  }

  const user = await queryOne<User>(`SELECT * FROM users WHERE email = $1`, [email]);
  if (!user) {
    logger.warn('ログイン失敗: ユーザーが存在しない', { email });
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' } });
    return;
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    logger.warn('ログイン失敗: パスワード不一致', { email, userId: user.id });
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' } });
    return;
  }

  const payload: UserPublic = { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  logger.info('ログイン成功', { email, userId: user.id, role: user.role });
  res.json({ success: true, data: { token, user: payload } });
});

// ─── 会員登録（メール認証なし・一発登録）────────────────────
router.post('/signup-direct', async (req: Request, res: Response) => {
  const { email, name, password } = req.body as { email?: string; name?: string; password?: string };

  if (!email || !name || !password) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'すべての項目を入力してください' } });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'パスワードは8文字以上にしてください' } });
    return;
  }

  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に登録されています' } });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newUserId = await transaction(async (client) => {
    const rows = await client.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, name, role, subscription_status)
       VALUES ($1, $2, $3, 'viewer', 'trial') RETURNING id`,
      [email, hash, name.trim()]
    );
    const userId = rows.rows[0].id;
    await client.query(
      `INSERT INTO subscriptions
         (user_id, plan, plan_code, status, trial_starts_at, trial_ends_at, expires_at)
       VALUES ($1, 'free', 'free', 'trial', NOW(), $2, $2)`,
      [userId, trialEndsAt]
    );
    return userId;
  });

  const user: UserPublic = { id: newUserId, email, name: name.trim(), role: 'viewer' };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  sendWelcomeTrialEmail(email, name.trim(), trialEndsAt).catch(() => {});
  logger.info(`新規ユーザー登録（直接登録・トライアル開始）: ${email}`);

  res.status(201).json({ success: true, data: { token, user } });
});

// ─── 会員登録 Step1: メールアドレス送信 ──────────────
router.post('/signup', async (req: Request, res: Response) => {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email || !name) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'メールアドレスと名前を入力してください' } });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' } });
    return;
  }

  const existingUser = await queryOne(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existingUser) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に登録されています' } });
    return;
  }

  await queryRun(`DELETE FROM pending_registrations WHERE email = $1`, [email]);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  await queryRun(
    `INSERT INTO pending_registrations (email, name, token, expires_at) VALUES ($1, $2, $3, $4)`,
    [email, name.trim(), token, expiresAt]
  );

  try {
    await sendVerificationEmail(email, name.trim(), token);
  } catch (err) {
    logger.error('メール送信エラー', { error: err });
  }

  res.json({ success: true, data: { message: '確認メールを送信しました' } });
});

// ─── 会員登録 Step2: トークン検証 ────────────────────
router.post('/verify-token', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'トークンが必要です' } });
    return;
  }

  const pending = await queryOne<PendingRegistration>(
    `SELECT * FROM pending_registrations WHERE token = $1`, [token]
  );
  if (!pending) {
    res.status(404).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'リンクが無効です。再度メールを送信してください。' } });
    return;
  }
  if (Date.now() > pending.expires_at) {
    await queryRun(`DELETE FROM pending_registrations WHERE id = $1`, [pending.id]);
    res.status(410).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'リンクの有効期限が切れています。再度メールを送信してください。' } });
    return;
  }

  res.json({ success: true, data: { email: pending.email, name: pending.name } });
});

// ─── 会員登録 Step3: パスワード設定・アカウント作成 ──
router.post('/complete', async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'トークンとパスワードを入力してください' } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'パスワードは8文字以上にしてください' } });
    return;
  }

  const pending = await queryOne<PendingRegistration>(
    `SELECT * FROM pending_registrations WHERE token = $1`, [token]
  );
  if (!pending || Date.now() > pending.expires_at) {
    res.status(410).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'リンクが無効または期限切れです。再度メールを送信してください。' } });
    return;
  }

  const existingUser = await queryOne(`SELECT id FROM users WHERE email = $1`, [pending.email]);
  if (existingUser) {
    await queryRun(`DELETE FROM pending_registrations WHERE id = $1`, [pending.id]);
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に登録されています' } });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newUserId = await transaction(async (client) => {
    const rows = await client.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, name, role, subscription_status)
       VALUES ($1, $2, $3, 'viewer', 'trial') RETURNING id`,
      [pending.email, hash, pending.name]
    );
    const userId = rows.rows[0].id;
    await client.query(
      `INSERT INTO subscriptions
         (user_id, plan, plan_code, status, trial_starts_at, trial_ends_at, expires_at)
       VALUES ($1, 'free', 'free', 'trial', NOW(), $2, $2)`,
      [userId, trialEndsAt]
    );
    return userId;
  });
  await queryRun(`DELETE FROM pending_registrations WHERE id = $1`, [pending.id]);

  const user: UserPublic = { id: newUserId, email: pending.email, name: pending.name, role: 'viewer' };
  const jwtToken = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  // ウェルカムメール（非同期、エラーを無視）
  sendWelcomeTrialEmail(pending.email, pending.name, trialEndsAt).catch(() => {});

  logger.info(`新規ユーザー登録（トライアル開始）: ${pending.email}`);
  res.status(201).json({ success: true, data: { token: jwtToken, user } });
});

// ─── 管理者によるユーザー作成 ─────────────────────────
router.post('/register', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } });
    return;
  }
  const { email, password, name, role = 'viewer' } = req.body as {
    email?: string; password?: string; name?: string; role?: string;
  };
  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '全項目を入力してください' } });
    return;
  }
  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に使用されています' } });
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = await queryRun(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, hash, name, role]
  );
  res.status(201).json({ success: true, data: { id: result.id, email, name, role } });
});

// ─── 自分の情報 ──────────────────────────────────────
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

// ─── 自分の名前を変更 ─────────────────────────────────
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '名前を入力してください' } });
    return;
  }
  const trimmedName = name.trim();
  await queryRun(`UPDATE users SET name = $1 WHERE id = $2`, [trimmedName, req.user!.id]);
  const updated = await queryOne<UserPublic>(`SELECT id, email, name, role FROM users WHERE id = $1`, [req.user!.id]);
  const token = jwt.sign(updated!, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, data: { user: updated, token } });
});

// ─── アカウント削除 (自分) ───────────────────────────
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  await queryRun(`DELETE FROM users WHERE id = $1`, [req.user!.id]);
  logger.info(`アカウント削除: user_id=${req.user!.id}`);
  res.json({ success: true, data: null });
});

// ─── パスワードリセット要求 ───────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'メールアドレスを入力してください' } });
    return;
  }

  const user = await queryOne<User>(`SELECT * FROM users WHERE email = $1`, [email]);
  if (user) {
    await queryRun(
      `DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await queryRun(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    try {
      await sendPasswordResetEmail(email, user.name, token);
    } catch (err) {
      logger.error('パスワードリセットメール送信エラー', { error: err });
    }
  }

  res.json({ success: true, data: { message: 'メールアドレスが登録されている場合、リセット用メールを送信しました' } });
});

// ─── パスワードリセット実行 ───────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'トークンとパスワードを入力してください' } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'パスワードは8文字以上にしてください' } });
    return;
  }

  const record = await queryOne<{ id: number; user_id: number; expires_at: number; used_at: string | null }>(
    `SELECT * FROM password_reset_tokens WHERE token = $1`, [token]
  );
  if (!record) {
    res.status(404).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'リンクが無効です' } });
    return;
  }
  if (record.used_at) {
    res.status(410).json({ success: false, error: { code: 'TOKEN_USED', message: 'このリンクは既に使用されています' } });
    return;
  }
  if (Date.now() > record.expires_at) {
    res.status(410).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'リンクの有効期限が切れています。再度お試しください。' } });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  await queryRun(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, record.user_id]);
  await queryRun(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [record.id]);

  logger.info(`パスワードリセット完了: user_id=${record.user_id}`);
  res.json({ success: true, data: { message: 'パスワードを変更しました。ログインしてください。' } });
});

// ─── ユーザー一覧 (管理者) ───────────────────────────
router.get('/users', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } });
    return;
  }
  const users = await query(`SELECT id, email, name, role, created_at FROM users ORDER BY created_at`);
  res.json({ success: true, data: users });
});

// ─── ユーザー削除 (管理者) ───────────────────────────
router.delete('/users/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } });
    return;
  }
  if (Number(req.params.id) === req.user.id) {
    res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE_SELF', message: '自分自身は削除できません' } });
    return;
  }
  await queryRun(`DELETE FROM users WHERE id = $1`, [req.params.id]);
  res.json({ success: true, data: null });
});

export default router;
