// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// vi.mock はファイル先頭にホイストされるため、変数参照は vi.hoisted で行う
const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only';

// ─── モック定義（インポートより先に宣言 → vitest がホイスティングする）──────
vi.mock('../../backend/src/database/db.js', () => ({
  queryOne:           vi.fn(),
  queryRun:           vi.fn(),
  query:              vi.fn(),
  transaction:        vi.fn(),
  initializeDatabase: vi.fn(),
  sql:                {},
  // ★ 変数参照ではなくリテラルで渡す（ホイスト後に参照できないため）
  JWT_SECRET: 'test-jwt-secret-for-testing-only',
}));

vi.mock('../../backend/src/services/emailService.js', () => ({
  sendVerificationEmail:       vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail:      vi.fn().mockResolvedValue(undefined),
  sendWelcomeTrialEmail:       vi.fn().mockResolvedValue(undefined),
  sendSubscriptionExpiredEmail: vi.fn().mockResolvedValue(undefined),
  sendTrialEndingSoonEmail:    vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../backend/src/utils/logger.js', () => ({
  logger: {
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../backend/src/middleware/auth.js', () => ({
  requireAuth: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  requireAdmin: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

// ─── モック後にルーターをインポート ─────────────────────────────────────────
import authRouter from '../../backend/src/routes/auth.js';
import * as dbModule from '../../backend/src/database/db.js';
import * as emailModule from '../../backend/src/services/emailService.js';

// ─── テスト用 Express アプリ ─────────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

// ─── テストスイート ──────────────────────────────────────────────────────────
describe('POST /auth/signup-direct — バックエンドユニットテスト', () => {
  const mockQueryOne = vi.mocked(dbModule.queryOne);
  const mockQueryRun = vi.mocked(dbModule.queryRun);
  const mockSendWelcomeEmail = vi.mocked(emailModule.sendWelcomeTrialEmail);

  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    // デフォルト: 重複ユーザーなし
    mockQueryOne.mockResolvedValue(undefined);
    // デフォルト: INSERT 成功・id=42 を返す
    mockQueryRun.mockResolvedValue({ id: 42, rowCount: 1 });
  });

  // ══════════════════════════════════════════════════════════════════
  // 正常系
  // ══════════════════════════════════════════════════════════════════
  describe('正常系', () => {
    it('有効なデータで 201 を返す', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('レスポンスに token と user を含む', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎', password: 'password123' });

      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
    });

    it('user.email・user.name・user.role が正しい', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'hello@example.com', name: 'テストユーザー', password: 'password123' });

      expect(res.body.data.user.email).toBe('hello@example.com');
      expect(res.body.data.user.name).toBe('テストユーザー');
      expect(res.body.data.user.role).toBe('viewer');
    });

    it('返却した JWT を検証するとユーザー情報が取得できる', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'jwt@example.com', name: 'JWTテスト', password: 'securepass' });

      const decoded = jwt.verify(
        res.body.data.token,
        TEST_JWT_SECRET
      ) as { email: string; name: string; role: string };

      expect(decoded.email).toBe('jwt@example.com');
      expect(decoded.name).toBe('JWTテスト');
      expect(decoded.role).toBe('viewer');
    });

    it('users テーブルに INSERT を呼ぶ', async () => {
      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'db@example.com', name: 'DBテスト', password: 'mypassword' });

      const insertUsersCall = mockQueryRun.mock.calls.find(
        ([sql]) => (sql as string).includes('INSERT INTO users')
      );
      expect(insertUsersCall).toBeDefined();
      const params = insertUsersCall![1] as unknown[];
      expect(params[0]).toBe('db@example.com');
      expect(params[2]).toBe('DBテスト');
    });

    it('subscriptions テーブルに trial INSERT を呼ぶ', async () => {
      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'trial@example.com', name: 'トライアル', password: 'mypassword' });

      const insertSubCall = mockQueryRun.mock.calls.find(
        ([sql]) => (sql as string).includes('INSERT INTO subscriptions')
      );
      expect(insertSubCall).toBeDefined();
      const params = insertSubCall![1] as unknown[];
      // 第1引数は新規ユーザーID（mockQueryRun の返り値の id = 42）
      expect(params[0]).toBe(42);
      // 第2引数は Date（trial_ends_at）
      expect(params[1]).toBeInstanceOf(Date);
    });

    it('ウェルカムメールを送信する', async () => {
      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'welcome@example.com', name: 'ウェルカム', password: 'mypassword' });

      // catch() で非同期送信しているため少し待つ
      await new Promise((r) => setTimeout(r, 50));

      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(
        'welcome@example.com',
        'ウェルカム',
        expect.any(Date)
      );
    });

    it('名前の前後空白をトリムして登録する', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'trim@example.com', name: '  田中 花子  ', password: 'mypassword' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.name).toBe('田中 花子');
    });

    it('パスワードをハッシュ化して保存する（平文は保存しない）', async () => {
      const rawPassword = 'myrawpassword';
      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'hash@example.com', name: '山田 太郎', password: rawPassword });

      const insertCall = mockQueryRun.mock.calls.find(
        ([sql]) => (sql as string).includes('INSERT INTO users')
      );
      const storedHash = (insertCall![1] as unknown[])[1] as string;

      expect(storedHash).not.toBe(rawPassword);
      // bcrypt ハッシュ形式: $2b$... or $2a$...
      expect(storedHash).toMatch(/^\$2[aby]\$/);
    });

    it('パスワードがちょうど 8 文字でも 201 を返す（境界値）', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'exact8@example.com', name: '山田 太郎', password: '12345678' });

      expect(res.status).toBe(201);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // バリデーション: 必須フィールド
  // ══════════════════════════════════════════════════════════════════
  describe('バリデーション – 必須フィールド', () => {
    it('email が未指定 → 400 MISSING_FIELDS', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ name: '山田 太郎', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('name が未指定 → 400 MISSING_FIELDS', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('password が未指定 → 400 MISSING_FIELDS', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('body が空オブジェクト → 400 MISSING_FIELDS', async () => {
      const res = await request(app).post('/auth/signup-direct').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('必須フィールド未指定時は DB を呼ばない', async () => {
      await request(app).post('/auth/signup-direct').send({ name: '山田 太郎' });

      expect(mockQueryOne).not.toHaveBeenCalled();
      expect(mockQueryRun).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // バリデーション: メールアドレス形式
  // ══════════════════════════════════════════════════════════════════
  describe('バリデーション – メールアドレス形式', () => {
    const invalid = [
      ['@ なし', 'notanemail'],
      ['ドメインなし', 'user@'],
      ['ローカルパートなし', '@example.com'],
      ['スペース含む', 'user @example.com'],
    ] as const;

    it.each(invalid)('%s → 400 INVALID_EMAIL', async (_label, email) => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email, name: '山田 太郎', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EMAIL');
    });

    it('有効な email 形式は通過する', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'valid+tag@sub.example.co.jp', name: '山田 太郎', password: 'password123' });

      expect(res.status).toBe(201);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // バリデーション: パスワード強度
  // ══════════════════════════════════════════════════════════════════
  describe('バリデーション – パスワード強度', () => {
    it('7 文字以下 → 400 WEAK_PASSWORD', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎', password: '1234567' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('エラーメッセージに "8文字以上" を含む', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎', password: 'short' });

      expect(res.body.error.message).toContain('8文字以上');
    });

    it('1 文字パスワード → 400 WEAK_PASSWORD', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'test@example.com', name: '山田 太郎', password: 'a' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('8 文字パスワードは許可される（境界値）', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'ok8@example.com', name: '山田 太郎', password: 'ABCD1234' });

      expect(res.status).toBe(201);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // メールアドレス重複チェック
  // ══════════════════════════════════════════════════════════════════
  describe('メールアドレス重複チェック', () => {
    it('既存メールアドレス → 409 EMAIL_EXISTS', async () => {
      mockQueryOne.mockResolvedValue({ id: 1 }); // 既存ユーザーが見つかる

      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'existing@example.com', name: '山田 太郎', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('エラーメッセージに "既に登録されています" を含む', async () => {
      mockQueryOne.mockResolvedValue({ id: 99 });

      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'dup@example.com', name: '山田 太郎', password: 'password123' });

      expect(res.body.error.message).toContain('既に登録されています');
    });

    it('重複メールの場合は INSERT を実行しない', async () => {
      mockQueryOne.mockResolvedValue({ id: 99 });

      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'dup@example.com', name: '山田 太郎', password: 'password123' });

      expect(mockQueryRun).not.toHaveBeenCalled();
    });

    it('重複メールの場合はウェルカムメールを送信しない', async () => {
      mockQueryOne.mockResolvedValue({ id: 99 });

      await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'dup@example.com', name: '山田 太郎', password: 'password123' });

      await new Promise((r) => setTimeout(r, 50));
      expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // レスポンス形式
  // ══════════════════════════════════════════════════════════════════
  describe('レスポンス形式', () => {
    it('エラーレスポンスに success: false が含まれる', async () => {
      const res = await request(app).post('/auth/signup-direct').send({});

      expect(res.body.success).toBe(false);
    });

    it('成功レスポンスに success: true が含まれる', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'ok@example.com', name: 'テスト', password: 'password123' });

      expect(res.body.success).toBe(true);
    });

    it('user オブジェクトにパスワードハッシュが含まれない', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'secure@example.com', name: 'テスト', password: 'password123' });

      const user = res.body.data.user;
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('password');
    });

    it('user オブジェクトに id・email・name・role が含まれる', async () => {
      const res = await request(app)
        .post('/auth/signup-direct')
        .send({ email: 'fields@example.com', name: 'テスト', password: 'password123' });

      const user = res.body.data.user;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
    });
  });
});
