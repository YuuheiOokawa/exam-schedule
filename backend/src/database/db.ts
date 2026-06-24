import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

// ─── JWT ─────────────────────────────────────────────────────────
const DEFAULT_JWT_SECRET = 'exam-schedule-jwt-secret-2026';
export const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET is using the default insecure value. Set JWT_SECRET in environment variables.');
}
if (JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn('[WARNING] JWT_SECRET is using the default value. Set JWT_SECRET in .env for security.');
}

// ─── Connection ───────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/exam_schedule';
const DATABASE_SSL = process.env.DATABASE_SSL;

export const sql = postgres(DATABASE_URL, {
  ssl: DATABASE_SSL === 'true' ? 'require' : false,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

// ─── Query helpers ────────────────────────────────────────────────
export async function query<T = unknown>(sqlStr: string, params: unknown[] = []): Promise<T[]> {
  const rows = await sql.unsafe(sqlStr, params as never[]);
  return rows as unknown as T[];
}

export async function queryOne<T = unknown>(sqlStr: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await sql.unsafe(sqlStr, params as never[]);
  return rows[0] as T | undefined;
}

export async function queryRun(sqlStr: string, params: unknown[] = []): Promise<{ id?: number; rowCount: number }> {
  const rows = await sql.unsafe(sqlStr, params as never[]);
  return { id: (rows[0] as { id?: number } | undefined)?.id, rowCount: rows.count };
}

// transaction の client は pg 互換インターフェース (res.rows[x] が使えるよう)
type TxClient = {
  query: <T = unknown>(sqlStr: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

export async function transaction<T>(fn: (client: TxClient) => Promise<T>): Promise<T> {
  return sql.begin(async (txSql) => {
    const client: TxClient = {
      query: async <R = unknown>(sqlStr: string, params: unknown[] = []) => {
        const rows = await txSql.unsafe(sqlStr, params as never[]);
        return { rows: rows as unknown as R[] };
      },
    };
    return fn(client);
  }) as unknown as Promise<T>;
}

// ─── Schema ──────────────────────────────────────────────────────
async function createTables(): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS qualifications (
      id                   SERIAL PRIMARY KEY,
      name                 TEXT NOT NULL,
      main_category        TEXT NOT NULL DEFAULT '民間資格',
      sub_category         TEXT NOT NULL DEFAULT 'IT・情報',
      official_url         TEXT,
      description          TEXT,
      is_scrapable         INTEGER NOT NULL DEFAULT 0,
      exam_format          TEXT NOT NULL DEFAULT 'fixed_date',
      requires_renewal     INTEGER NOT NULL DEFAULT 0,
      renewal_period_years INTEGER,
      score_enabled        INTEGER NOT NULL DEFAULT 0,
      score_unit           TEXT,
      score_max            TEXT,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qualification_schedules (
      id                        SERIAL PRIMARY KEY,
      qualification_id          INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      exam_date                 TEXT,
      application_start_date    TEXT,
      application_end_date      TEXT,
      result_announcement_date  TEXT,
      exam_fee                  TEXT,
      source_url                TEXT,
      fetched_at                TIMESTAMPTZ,
      note                      TEXT,
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_at                TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fetch_logs (
      id               SERIAL PRIMARY KEY,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      status           TEXT NOT NULL,
      message          TEXT,
      fetched_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id              SERIAL PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      name            TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'viewer',
      subscription_tier TEXT NOT NULL DEFAULT 'free',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pending_registrations (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      token      TEXT NOT NULL UNIQUE,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_held_qualifications (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      score            TEXT,
      acquired_at      TEXT,
      held_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, qualification_id)
    );

    CREATE TABLE IF NOT EXISTS user_wishlist (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, qualification_id)
    );

    CREATE TABLE IF NOT EXISTS qualification_score_history (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      score            TEXT NOT NULL,
      taken_at         TEXT NOT NULL,
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qualification_score_section_defs (
      id               SERIAL PRIMARY KEY,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      section_key      TEXT NOT NULL,
      section_label    TEXT NOT NULL,
      max_score        INTEGER,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      UNIQUE(qualification_id, section_key)
    );

    CREATE TABLE IF NOT EXISTS score_section_values (
      id               SERIAL PRIMARY KEY,
      score_history_id INTEGER NOT NULL REFERENCES qualification_score_history(id) ON DELETE CASCADE,
      section_key      TEXT NOT NULL,
      score            NUMERIC NOT NULL,
      UNIQUE(score_history_id, section_key)
    );

    CREATE TABLE IF NOT EXISTS user_exam_plans (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualification_id INTEGER NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
      planned_date     TEXT NOT NULL,
      notes            TEXT,
      result           TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at BIGINT NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id  TEXT,
      stripe_sub_id       TEXT,
      plan                TEXT NOT NULL DEFAULT 'free',
      status              TEXT NOT NULL DEFAULT 'active',
      current_period_end  TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint   TEXT NOT NULL,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id               SERIAL PRIMARY KEY,
      plan_code        TEXT NOT NULL UNIQUE,
      name             TEXT NOT NULL,
      interval_months  INTEGER NOT NULL,
      price_jpy        INTEGER NOT NULL,
      price_monthly    INTEGER NOT NULL,
      discount_pct     INTEGER NOT NULL DEFAULT 0,
      stripe_price_id  TEXT,
      apple_product_id TEXT,
      google_product_id TEXT,
      is_active        BOOLEAN NOT NULL DEFAULT true,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id                        SERIAL PRIMARY KEY,
      user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id           INTEGER REFERENCES subscriptions(id),
      plan_code                 TEXT NOT NULL,
      platform                  TEXT NOT NULL DEFAULT 'web',
      amount_jpy                INTEGER NOT NULL,
      currency                  TEXT NOT NULL DEFAULT 'jpy',
      status                    TEXT NOT NULL,
      stripe_payment_intent_id  TEXT,
      stripe_invoice_id         TEXT,
      apple_transaction_id      TEXT,
      google_order_id           TEXT,
      paid_at                   TIMESTAMPTZ,
      period_start              TIMESTAMPTZ,
      period_end                TIMESTAMPTZ,
      created_at                TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_events (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id INTEGER REFERENCES subscriptions(id),
      event_type      TEXT NOT NULL,
      plan_code       TEXT,
      platform        TEXT,
      metadata        JSONB,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feature_limits (
      id          SERIAL PRIMARY KEY,
      plan_tier   TEXT NOT NULL,
      feature_key TEXT NOT NULL,
      limit_value INTEGER,
      is_enabled  BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(plan_tier, feature_key)
    );

    CREATE INDEX IF NOT EXISTS idx_qual_main_category         ON qualifications(main_category);
    CREATE INDEX IF NOT EXISTS idx_qual_sub_category          ON qualifications(sub_category);
    CREATE INDEX IF NOT EXISTS idx_schedules_qual_id          ON qualification_schedules(qualification_id);
    CREATE INDEX IF NOT EXISTS idx_logs_fetched_at            ON fetch_logs(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_users_email                ON users(email);
    CREATE INDEX IF NOT EXISTS idx_held_user_id               ON user_held_qualifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_id           ON user_wishlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_score_history_user_qual    ON qualification_score_history(user_id, qualification_id);
    CREATE INDEX IF NOT EXISTS idx_exam_plans_user_id         ON user_exam_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_plans_user_qual       ON user_exam_plans(user_id, qualification_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_token       ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_push_subs_user_id          ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subs_stripe_sub_id         ON subscriptions(stripe_sub_id);
    CREATE INDEX IF NOT EXISTS idx_exam_plans_planned_date    ON user_exam_plans(planned_date);
  `);
}

// ─── Migrations (idempotent column additions) ─────────────────────
async function runMigrations(): Promise<void> {
  const alterStatements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'free'`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web'`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ`,
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
  ];
  for (const stmt of alterStatements) {
    await sql.unsafe(stmt);
  }
  // migration で追加した列のインデックス（createTables では列が存在しないため後回し）
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_subs_expires_at           ON subscriptions(expires_at)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_subs_grace_period         ON subscriptions(grace_period_ends_at)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status)`);
  await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_invoice_id_uniq ON payments(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_score_section_defs_qual ON qualification_score_section_defs(qualification_id)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_score_section_vals_hist ON score_section_values(score_history_id)`);

  // 既存ユーザーの subscription_status を subscription_tier から同期
  await sql.unsafe(`
    UPDATE users u
    SET subscription_status = CASE
      WHEN u.subscription_tier = 'pro' THEN 'premium'
      ELSE 'free'
    END
    WHERE u.subscription_status = 'free'
      AND u.subscription_tier != 'free'
  `);
}

// ─── Seed helpers ─────────────────────────────────────────────────
async function seedDefaultAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? 'admin123';

  if (process.env.NODE_ENV === 'production' && adminPassword === 'admin123') {
    logger.warn('[WARNING] ADMIN_INITIAL_PASSWORD is using the default value. Set it in environment variables.');
  }

  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
  if (existing) return;
  const hash = bcrypt.hashSync(adminPassword, 10);
  await queryRun(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
    [adminEmail, hash, '管理者', 'admin']
  );
  logger.info('Default admin user created', { email: adminEmail });
}

async function updateScoreSettings(): Promise<void> {
  const scoreQuals: Array<{ pattern: string; unit: string; max: string | null }> = [
    { pattern: 'TOEIC',     unit: '点',           max: '990' },
    { pattern: 'TOEFL',     unit: '点',           max: '120' },
    { pattern: '英検',       unit: 'CSEスコア',    max: '3400' },
    { pattern: 'IELTS',     unit: 'バンドスコア', max: '9.0' },
    { pattern: 'TOPIK',     unit: '点',           max: '300' },
    { pattern: '中国語検定', unit: '点',           max: '100' },
    { pattern: 'HSK',       unit: '点',           max: '300' },
  ];
  const passFailPatterns = ['漢字検定', '漢検', '数学検定', 'G検定', '基本情報', '応用情報', '日商簿記'];

  for (const q of scoreQuals) {
    await sql.unsafe(
      `UPDATE qualifications SET score_enabled = 1, score_unit = $1, score_max = $2 WHERE name LIKE $3`,
      [q.unit, q.max, `%${q.pattern}%`]
    );
  }
  for (const p of passFailPatterns) {
    await sql.unsafe(
      `UPDATE qualifications SET score_enabled = 0, score_unit = NULL, score_max = NULL WHERE name LIKE $1`,
      [`%${p}%`]
    );
  }
}

async function seedPlanDefinitions(): Promise<void> {
  const existing = await queryOne(`SELECT id FROM plans WHERE plan_code = 'monthly'`);
  if (existing) return;
  const plans = [
    { plan_code: 'monthly',   name: '月額プラン',  interval_months: 1,  price_jpy: 480,  price_monthly: 480, discount_pct: 0,  sort_order: 1 },
    { plan_code: 'quarterly', name: '3ヶ月プラン', interval_months: 3,  price_jpy: 1380, price_monthly: 460, discount_pct: 4,  sort_order: 2 },
    { plan_code: 'biannual',  name: '6ヶ月プラン', interval_months: 6,  price_jpy: 2640, price_monthly: 440, discount_pct: 8,  sort_order: 3 },
    { plan_code: 'annual',    name: '年額プラン',  interval_months: 12, price_jpy: 4560, price_monthly: 380, discount_pct: 21, sort_order: 4 },
  ];
  for (const p of plans) {
    await queryRun(
      `INSERT INTO plans (plan_code, name, interval_months, price_jpy, price_monthly, discount_pct, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (plan_code) DO NOTHING`,
      [p.plan_code, p.name, p.interval_months, p.price_jpy, p.price_monthly, p.discount_pct, p.sort_order]
    );
  }
  logger.info('Plan definitions seeded');
}

async function seedScoreSectionDefs(): Promise<void> {
  type SectionDef = { section_key: string; section_label: string; max_score: number | null; sort_order: number };

  // 各資格名パターンに対するセクション定義
  const defs: Array<{ namePattern: string; sections: SectionDef[] }> = [
    {
      namePattern: '%英検%1級%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 850, sort_order: 1 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 850, sort_order: 2 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 850, sort_order: 3 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 850, sort_order: 4 },
      ],
    },
    {
      namePattern: '%英検%準1級%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 750, sort_order: 1 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 750, sort_order: 2 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 750, sort_order: 3 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 750, sort_order: 4 },
      ],
    },
    {
      namePattern: '%英検%2級%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 650, sort_order: 1 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 650, sort_order: 2 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 650, sort_order: 3 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 650, sort_order: 4 },
      ],
    },
    {
      namePattern: '%英検%準2級%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 600, sort_order: 1 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 300, sort_order: 2 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 600, sort_order: 3 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 300, sort_order: 4 },
      ],
    },
    {
      namePattern: '%英検%3級%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 550, sort_order: 1 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 125, sort_order: 2 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 550, sort_order: 3 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 125, sort_order: 4 },
      ],
    },
    {
      namePattern: '%TOEIC Listening%Reading%',
      sections: [
        { section_key: 'listening', section_label: 'リスニング',   max_score: 495, sort_order: 1 },
        { section_key: 'reading',   section_label: 'リーディング', max_score: 495, sort_order: 2 },
      ],
    },
    {
      namePattern: '%TOEIC Speaking%Writing%',
      sections: [
        { section_key: 'speaking', section_label: 'スピーキング', max_score: 200, sort_order: 1 },
        { section_key: 'writing',  section_label: 'ライティング', max_score: 200, sort_order: 2 },
      ],
    },
    {
      namePattern: '%TOEFL%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: 30, sort_order: 1 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: 30, sort_order: 2 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: 30, sort_order: 3 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: 30, sort_order: 4 },
      ],
    },
    {
      namePattern: '%IELTS%',
      sections: [
        { section_key: 'reading',   section_label: 'リーディング', max_score: null, sort_order: 1 },
        { section_key: 'listening', section_label: 'リスニング',   max_score: null, sort_order: 2 },
        { section_key: 'speaking',  section_label: 'スピーキング', max_score: null, sort_order: 3 },
        { section_key: 'writing',   section_label: 'ライティング', max_score: null, sort_order: 4 },
      ],
    },
  ];

  for (const { namePattern, sections } of defs) {
    const quals = await query<{ id: number }>(`SELECT id FROM qualifications WHERE name LIKE $1`, [namePattern]);
    for (const qual of quals) {
      for (const s of sections) {
        await queryRun(
          `INSERT INTO qualification_score_section_defs
             (qualification_id, section_key, section_label, max_score, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (qualification_id, section_key) DO NOTHING`,
          [qual.id, s.section_key, s.section_label, s.max_score, s.sort_order]
        );
      }
    }
  }
  logger.info('Score section definitions seeded');
}

async function seedFeatureLimits(): Promise<void> {
  const existing = await queryOne(`SELECT id FROM feature_limits WHERE plan_tier = 'free'`);
  if (existing) return;
  const limits = [
    { plan_tier: 'free',    feature_key: 'max_held_qualifications',    limit_value: 5,    is_enabled: true },
    { plan_tier: 'free',    feature_key: 'max_wishlist',               limit_value: 10,   is_enabled: true },
    { plan_tier: 'free',    feature_key: 'max_exam_plans',             limit_value: 3,    is_enabled: true },
    { plan_tier: 'free',    feature_key: 'max_score_history_per_qual', limit_value: 5,    is_enabled: true },
    { plan_tier: 'free',    feature_key: 'push_notification_types',    limit_value: 1,    is_enabled: true },
    { plan_tier: 'free',    feature_key: 'calendar_export',            limit_value: null, is_enabled: false },
    { plan_tier: 'free',    feature_key: 'study_planner',              limit_value: null, is_enabled: false },
    { plan_tier: 'free',    feature_key: 'ai_advice',                  limit_value: null, is_enabled: false },
    { plan_tier: 'free',    feature_key: 'data_export',                limit_value: null, is_enabled: false },
    { plan_tier: 'premium', feature_key: 'max_held_qualifications',    limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'max_wishlist',               limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'max_exam_plans',             limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'max_score_history_per_qual', limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'push_notification_types',    limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'calendar_export',            limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'study_planner',              limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'ai_advice',                  limit_value: null, is_enabled: true },
    { plan_tier: 'premium', feature_key: 'data_export',                limit_value: null, is_enabled: true },
  ];
  for (const l of limits) {
    await queryRun(
      `INSERT INTO feature_limits (plan_tier, feature_key, limit_value, is_enabled)
       VALUES ($1, $2, $3, $4) ON CONFLICT (plan_tier, feature_key) DO NOTHING`,
      [l.plan_tier, l.feature_key, l.limit_value, l.is_enabled]
    );
  }
  logger.info('Feature limits seeded');
}

async function seedInitialData(): Promise<void> {
  const { seedQualifications } = await import('./seeds/qualifications.js');
  const cnt = (await queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM qualifications`))!;
  if (Number(cnt.cnt) > 0) return;

  await transaction(async (client) => {
    for (const q of seedQualifications) {
      const res = await client.query<{ id: number }>(
        `INSERT INTO qualifications
           (name, main_category, sub_category, official_url, description,
            is_scrapable, exam_format, requires_renewal, renewal_period_years)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [q.name, q.main_category, q.sub_category, q.official_url, q.description,
         q.is_scrapable ? 1 : 0, q.exam_format, q.requires_renewal ? 1 : 0, q.renewal_period_years ?? null]
      );
      await client.query(
        `INSERT INTO qualification_schedules (qualification_id, source_url, note) VALUES ($1,$2,$3)`,
        [res.rows[0].id, q.official_url, '初期データ。管理画面から日程を手動登録してください。']
      );
    }
  });

  const inserted = (await queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM qualifications`))!;
  logger.info(`Seed data inserted: ${inserted.cnt} qualifications`);
}

async function seedAdditionalData(): Promise<void> {
  const { additionalSeedQualifications } = await import('./seeds/additionalQualifications.js');
  let added = 0;

  await transaction(async (client) => {
    for (const q of additionalSeedQualifications) {
      const existing = await client.query<{ id: number }>(`SELECT id FROM qualifications WHERE name = $1`, [q.name]);
      if (existing.rows.length > 0) continue;
      const res = await client.query<{ id: number }>(
        `INSERT INTO qualifications
           (name, main_category, sub_category, official_url, description,
            is_scrapable, exam_format, requires_renewal, renewal_period_years)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [q.name, q.main_category, q.sub_category, q.official_url, q.description,
         q.is_scrapable ? 1 : 0, q.exam_format, q.requires_renewal ? 1 : 0, q.renewal_period_years ?? null]
      );
      await client.query(
        `INSERT INTO qualification_schedules (qualification_id, source_url, note) VALUES ($1,$2,$3)`,
        [res.rows[0].id, q.official_url, '初期データ。管理画面から日程を手動登録してください。']
      );
      added++;
    }
  });

  if (added > 0) logger.info(`Additional seed data inserted: ${added} qualifications`);
}

// ─── Public init ─────────────────────────────────────────────────
export async function initializeDatabase(): Promise<void> {
  await createTables();
  await runMigrations();
  await seedPlanDefinitions();
  await seedFeatureLimits();
  await seedInitialData();
  await seedAdditionalData();
  await updateScoreSettings();
  await seedScoreSectionDefs();
  await seedDefaultAdmin();
  logger.info('Database initialized (PostgreSQL/postgres.js)');
}
