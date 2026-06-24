# Step 7: 実装 (Implementation)

## 概要

Step 6 で策定した実装計画に基づき、フルスクラッチでの TypeScript + Tailwind CSS アプリケーションを実装しました。

---

## Phase 1: バックエンド基盤

### 実装ファイル

| ファイル | 内容 |
|---|---|
| `backend/src/types/index.ts` | 全型定義（Qualification, Schedule, FetchLog, CalendarEvent 等） |
| `backend/src/constants/index.ts` | PORT, カラー定数, HTTP_STATUS 等 |
| `backend/src/utils/logger.ts` | タイムスタンプ付きコンソールロガー |
| `backend/src/utils/httpClient.ts` | axios インスタンス（スクレイパー用） |
| `backend/src/middleware/errorHandler.ts` | Express エラーハンドラー + 404 ハンドラー |
| `backend/src/database/db.ts` | DB初期化・マイグレーション・シードデータ挿入 |
| `backend/src/database/seeds/qualifications.ts` | 128 資格のシードデータ |

### DB スキーマ

```sql
qualifications (id, name, main_category, sub_category, official_url,
                description, is_scrapable, exam_format, requires_renewal,
                renewal_period_years, created_at, updated_at)

qualification_schedules (id, qualification_id, exam_date, application_start_date,
                          application_end_date, result_announcement_date,
                          exam_fee, source_url, fetched_at, note,
                          created_at, updated_at)

fetch_logs (id, qualification_id, status, message, fetched_at)
```

### マイグレーション戦略

既存 DB がある場合は `PRAGMA table_info` でカラム存在確認後、`ALTER TABLE` で追加。データ破壊なし。

### シードデータ (128 資格)

| カテゴリ | 数 |
|---|---|
| 国家資格 / IT・情報 | 12 (IPA 全試験) |
| 国家資格 / 法律・行政 | 3 (宅建, 社労士, 行政書士) |
| 国家資格 / 会計・税務 | 5 (公認会計士, 税理士, FP1-3級) |
| 国家資格 / 建設・不動産 | 3 (一・二級建築士, 宅地建物取引士) |
| 国家資格 / 工業・電気 | 3 (第一・二種電気工事士, 危険物取扱者) |
| 国家資格 / 医療・福祉 | 4 (医師, 看護師, 薬剤師, 介護福祉士) |
| 国家資格 / 食品・調理 | 2 (調理師, 栄養士) |
| 民間資格 / クラウド | 23 (AWS×11, GCP×6, Azure×6) |
| 民間資格 / データベース | 4 (Oracle Master 4グレード) |
| 民間資格 / プログラミング言語 | 6 (Java SE, Python, PHP, Ruby) |
| 民間資格 / セキュリティ | 3 (CompTIA Security+, CISSP, CEH) |
| 民間資格 / ネットワーク | 5 (CCNA, CCNP, LPIC-1-3) |
| 民間資格 / プロジェクト管理 | 2 (PMP, ITIL 4 Foundation) |
| 民間資格 / データ・AI | 2 (G検定, E資格, 統計検定) |
| 公的資格 / 語学 | 8 (英検1-3級/準, TOEIC, TOEFL, IELTS, HSK, JLPT) |
| 公的資格 / 会計・簿記 | 5 (日商簿記1-3級, 全商簿記, 建設業経理) |

---

## Phase 2: フロントエンド基盤

### 実装ファイル

| ファイル | 内容 |
|---|---|
| `frontend/vite.config.ts` | Vite設定（ポート3000, APIプロキシ, パスエイリアス） |
| `frontend/tailwind.config.ts` | ダークモード, カスタムカラー, アニメーション |
| `frontend/postcss.config.js` | Tailwind + Autoprefixer |
| `frontend/src/styles/globals.css` | CSS変数, Tailwindディレクティブ, .glass/.card コンポーネント |
| `frontend/src/contexts/ThemeContext.tsx` | ダーク/ライトモード切替（localStorage + OS設定） |
| `frontend/src/contexts/ToastContext.tsx` | 通知トースト管理 |
| `frontend/src/utils/cn.ts` | clsx + tailwind-merge ユーティリティ |
| `frontend/src/utils/date.ts` | date-fns ラッパー（日本語フォーマット） |
| `frontend/src/constants/routes.ts` | ルート定数 |
| `frontend/src/constants/categories.ts` | カテゴリ定数・色マッピング |
| `frontend/src/constants/eventTypes.ts` | カレンダーイベント種別定数 |

### デザインシステム

- **カラー**: brand (blue-500), emerald (成功), red (エラー), amber (警告)
- **ダークモード**: `dark` クラス戦略, CSS変数で切替
- **アニメーション**: fade-in, slide-in-right, scale-in (Tailwindカスタムキーフレーム)
- **コンポーネント**: `.glass` (glassmorphism), `.card` (ホワイト/ダーク切替), `.card-hover` (スケール + シャドウ)
- **フォント**: システムフォント (San Francisco / Segoe UI / Noto Sans JP)

---

## Phase 3: コア機能

### 実装ファイル

| ファイル | 内容 |
|---|---|
| `frontend/src/services/qualificationService.ts` | 資格 API クライアント |
| `frontend/src/services/calendarService.ts` | カレンダー API クライアント |
| `frontend/src/features/qualifications/hooks/useQualifications.ts` | TanStack Query v5 hooks |
| `frontend/src/features/calendar/hooks/useCalendarEvents.ts` | カレンダーイベント hooks |
| `frontend/src/features/qualifications/components/QualificationCard.tsx` | 資格カードコンポーネント |
| `frontend/src/features/qualifications/components/CategoryFilter.tsx` | 2段階カテゴリフィルター |
| `frontend/src/features/qualifications/components/ScheduleInfo.tsx` | スケジュール情報表示 |
| `frontend/src/features/calendar/components/EventFilter.tsx` | イベントタイプフィルター |
| `frontend/src/features/calendar/components/EventLegend.tsx` | カレンダー凡例 |
| `frontend/src/features/calendar/components/EventPopup.tsx` | イベント詳細ポップアップ |
| `frontend/src/pages/QualificationsPage.tsx` | 資格一覧ページ（検索+フィルター+グリッド） |
| `frontend/src/pages/QualificationDetailPage.tsx` | 資格詳細ページ |
| `frontend/src/pages/CalendarPage.tsx` | カレンダーページ（FullCalendar） |

### 状態管理

- **サーバー状態**: TanStack Query v5 (`useQuery`, `useMutation`)
- **UI状態**: `useState` (検索文字列, フィルター値, 選択イベント等)
- **グローバル状態**: `ThemeContext` (ダークモード), `ToastContext` (通知)
- **デバウンス**: 検索入力は 300ms デバウンス (`useDebounce` hook)

---

## Phase 4: 管理機能

### 実装ファイル

| ファイル | 内容 |
|---|---|
| `backend/src/routes/admin.ts` | 管理 API (CRUD + スケジュール更新 + ログ + 一括取得) |
| `frontend/src/services/adminService.ts` | 管理 API クライアント |
| `frontend/src/features/admin/hooks/useAdminQualifications.ts` | 管理 mutations hooks |
| `frontend/src/pages/AdminPage.tsx` | 管理画面（タブ式: 一覧/追加/スケジュール/ログ） |

### 管理画面機能

1. **資格一覧タブ**: テーブル表示、編集/スケジュール/削除 アクション
2. **新規追加タブ**: 全フィールド入力フォーム、大カテゴリ連動の小カテゴリ動的更新
3. **スケジュール編集タブ**: YYYY-MM-DD 日付入力 (試験日, 申込開始/終了, 結果発表, 受験料)
4. **取得ログタブ**: スクレイパー実行履歴、成功/エラーアイコン付き
5. **一括取得ボタン**: `is_scrapable=true` の全資格をまとめてスクレイプ

---

## Phase 5: 起動スクリプト・インストール・動作確認

### 依存パッケージインストール

```
backend:  299 packages (better-sqlite3@latest, tsx@4.x, TypeScript@5.x 等)
frontend: (react@18, tailwindcss@3, @tanstack/react-query@5, FullCalendar@6 等)
```

### バックエンド起動確認

```
npx tsx src/index.ts
→ [INFO] Seed data inserted: 128 qualifications
→ [INFO] Database initialized
→ [INFO] Backend server started {port: 3001}
```

### API 動作確認

| エンドポイント | 結果 |
|---|---|
| `GET /api/health` | `{"success":true,"data":{"status":"ok"}}` |
| `GET /api/qualifications?limit=3` | 128件中3件返却、全フィールド正常 |
| `GET /api/qualifications/categories` | 3大カテゴリ × 16小カテゴリ正常 |

### TypeScript コンパイル確認

```
backend:  tsc --noEmit → エラー 0
frontend: tsc --noEmit → エラー 0
```

### 起動スクリプト修正

`start.bat` の バックエンド起動コマンドを `node src/index.js` → `npm run dev` (tsx watch) に変更。

### 既知の注意点

- **SQLite WAL モード**: OneDrive 同期フォルダ上では `SQLITE_IOERR_TRUNCATE` エラーが発生。`journal_mode = WAL` は無効化し、デフォルト (DELETE) モードで運用。

---

## スクレイパー実装 (IPA 試験)

| ファイル | 対象資格 |
|---|---|
| `backend/src/scrapers/base/BaseScraper.ts` | 抽象基底クラス（fetchHtml, buildResult） |
| `backend/src/scrapers/national/ipa/JitecKihon.ts` | 基本情報技術者試験 |
| `backend/src/scrapers/national/ipa/JitecOyo.ts` | 応用情報技術者試験 |
| `backend/src/scrapers/registry.ts` | SCRAPER_REGISTRY マップ |

### 新規スクレイパー追加手順

1. `backend/src/scrapers/{category}/{name}.ts` を作成し `BaseScraper` を継承
2. `backend/src/scrapers/registry.ts` に `{ '資格名': スクレイパークラス }` を追記
3. DB の `is_scrapable` を `1` に設定

---

## ディレクトリ構成 (最終)

```
exam-schedule-app/
├── backend/
│   ├── src/
│   │   ├── constants/    # PORT, カラー等
│   │   ├── database/     # db.ts + seeds/
│   │   ├── middleware/   # errorHandler
│   │   ├── routes/       # qualifications, calendar, admin, index
│   │   ├── scrapers/     # BaseScraper + registry + IPA実装
│   │   ├── types/        # 全型定義
│   │   ├── utils/        # logger, httpClient, date
│   │   └── index.ts      # Express エントリポイント
│   ├── data/             # SQLite DB ファイル (gitignore)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/   # ui/ + feedback/ + layout/
│   │   ├── constants/    # routes, categories, eventTypes
│   │   ├── contexts/     # ThemeContext, ToastContext
│   │   ├── features/     # qualifications/ + calendar/ + admin/
│   │   ├── hooks/        # useDebounce
│   │   ├── pages/        # QualificationsPage, DetailPage, CalendarPage, AdminPage
│   │   ├── services/     # qualificationService, calendarService, adminService
│   │   ├── styles/       # globals.css
│   │   ├── types/        # qualification.ts, calendar.ts, api.ts
│   │   ├── utils/        # cn.ts, date.ts, format.ts
│   │   ├── App.tsx       # ルーター + プロバイダー
│   │   └── main.tsx      # ReactDOM.createRoot エントリポイント
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/                 # Step 1-7 ドキュメント
├── start.bat             # 起動スクリプト (npm run dev 使用)
└── stop.bat              # 停止スクリプト
```
