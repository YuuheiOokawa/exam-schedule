# Step 3: DB設計

## なぜSQLiteか

- ローカル運用でサーバー不要
- ファイル1つで完結（バックアップが `cp` コマンドで済む）
- better-sqlite3で同期APIを使えるため、Node.jsでのコードがシンプル
- 資格数・ユーザー数がローカル規模なら性能問題なし

---

## ER図

```
qualifications (資格マスタ)
    │
    │ 1:N
    ├──► qualification_schedules (試験スケジュール)
    │
    └──► fetch_logs (取得ログ)
```

---

## テーブル定義

### qualifications（資格マスタ）

| カラム | 型 | NOT NULL | デフォルト | 説明 |
|--------|-----|----------|-----------|------|
| id | INTEGER PK | ✓ | AUTOINCREMENT | |
| name | TEXT | ✓ | - | 資格名 |
| main_category | TEXT | ✓ | - | 大カテゴリ（国家資格/民間資格/公的資格） |
| sub_category | TEXT | ✓ | - | 小カテゴリ（IT・情報/クラウドなど） |
| official_url | TEXT | - | - | 公式ページURL |
| description | TEXT | - | - | 資格概要 |
| is_scrapable | BOOLEAN | - | 0 | 自動取得対応か |
| exam_format | TEXT | - | 'fixed_date' | fixed_date / anytime / regional |
| requires_renewal | BOOLEAN | - | 0 | 更新必要か |
| renewal_period_years | INTEGER | - | NULL | 更新頻度（年） |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP | |

**exam_format の値：**
- `fixed_date`：年数回の固定日程（IPA試験など）
- `anytime`：随時受験可能（AWS、Oracle、Javaなど）
- `regional`：都道府県ごとに日程が異なる（運転免許など）

---

### qualification_schedules（試験スケジュール）

| カラム | 型 | NOT NULL | デフォルト | 説明 |
|--------|-----|----------|-----------|------|
| id | INTEGER PK | ✓ | AUTOINCREMENT | |
| qualification_id | INTEGER FK | ✓ | - | qualifications.id |
| exam_date | TEXT | - | - | 試験日（YYYY-MM-DD or テキスト） |
| application_start_date | TEXT | - | - | 申込開始日 |
| application_end_date | TEXT | - | - | 申込締切日 |
| result_announcement_date | TEXT | - | - | 合格発表日 |
| exam_fee | TEXT | - | - | 受験料（テキスト） |
| source_url | TEXT | - | - | 情報取得元URL |
| fetched_at | DATETIME | - | - | 最終取得日時 |
| note | TEXT | - | - | 備考 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP | |

**外部キー：** `FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE`

---

### fetch_logs（取得ログ）

| カラム | 型 | NOT NULL | デフォルト | 説明 |
|--------|-----|----------|-----------|------|
| id | INTEGER PK | ✓ | AUTOINCREMENT | |
| qualification_id | INTEGER FK | ✓ | - | qualifications.id |
| status | TEXT | ✓ | - | 'success' or 'error' |
| message | TEXT | - | - | 取得結果メッセージ |
| fetched_at | DATETIME | - | CURRENT_TIMESTAMP | |

---

## DDL（実際のSQL）

```sql
CREATE TABLE IF NOT EXISTS qualifications (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  main_category        TEXT NOT NULL DEFAULT '民間資格',
  sub_category         TEXT NOT NULL DEFAULT 'IT・情報',
  official_url         TEXT,
  description          TEXT,
  is_scrapable         BOOLEAN NOT NULL DEFAULT 0,
  exam_format          TEXT NOT NULL DEFAULT 'fixed_date',
  requires_renewal     BOOLEAN NOT NULL DEFAULT 0,
  renewal_period_years INTEGER,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qualification_schedules (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  qualification_id          INTEGER NOT NULL,
  exam_date                 TEXT,
  application_start_date    TEXT,
  application_end_date      TEXT,
  result_announcement_date  TEXT,
  exam_fee                  TEXT,
  source_url                TEXT,
  fetched_at                DATETIME,
  note                      TEXT,
  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fetch_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  qualification_id INTEGER NOT NULL,
  status           TEXT NOT NULL,
  message          TEXT,
  fetched_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
);

-- 自動更新トリガー
CREATE TRIGGER IF NOT EXISTS qualifications_updated_at
  AFTER UPDATE ON qualifications
BEGIN
  UPDATE qualifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS schedules_updated_at
  AFTER UPDATE ON qualification_schedules
BEGIN
  UPDATE qualification_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_qual_main_category ON qualifications(main_category);
CREATE INDEX IF NOT EXISTS idx_qual_sub_category  ON qualifications(sub_category);
CREATE INDEX IF NOT EXISTS idx_schedules_qual_id  ON qualification_schedules(qualification_id);
CREATE INDEX IF NOT EXISTS idx_logs_qual_id       ON fetch_logs(qualification_id);
CREATE INDEX IF NOT EXISTS idx_logs_fetched_at    ON fetch_logs(fetched_at);
```

---

## 設計上の判断

| 判断 | 理由 |
|------|------|
| exam_date を TEXT型にする | 「随時」「年2回」などテキスト値も入る。日付のみの場合は YYYY-MM-DD 形式を規約とする |
| スケジュールを別テーブルに分離 | 1資格に複数年度のスケジュールが存在しうる（上期・下期、複数回試験） |
| category を2階層に分ける | IT資格だけでなく全資格を扱うため。大カテゴリで大まかに、小カテゴリで詳細に絞り込める |
| ON DELETE CASCADE | 資格を削除したら関連スケジュール・ログも自動削除 |
| WALモード | 読み取り性能向上。並行アクセス時の安全性確保 |

---

## 初期データ（シード）カテゴリ設計

```
国家資格
  └── IT・情報: 基本情報技術者、応用情報技術者、高度情報処理技術者（各区分）

民間資格
  ├── クラウド: AWS全種、GCP全種、Azure全種
  ├── データベース: Oracle Master各グレード
  ├── プログラミング言語: Java Silver/Gold、Python3、PHP、Ruby
  ├── セキュリティ: CompTIA Security+、CISSP
  ├── ネットワーク: CCNA、CCNP、LPIC-1/2/3
  ├── プロジェクト管理: PMP、ITIL 4
  └── データ・AI: G検定、E資格、統計検定

公的資格
  ├── 会計・簿記: 日商簿記1〜3級
  └── 語学: 英検1〜5級、TOEIC L&R、TOEFL iBT、HSK
```
