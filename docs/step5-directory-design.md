# Step 5: ディレクトリ設計

## 設計方針

**Feature-Driven Design（機能駆動設計）** を採用する。

### なぜこの設計か

| 問題（旧設計） | 解決（新設計） |
|-------------|-------------|
| JSファイルが混在、型安全なし | TypeScript全体適用 |
| インラインスタイルが散乱 | Tailwind CSS統一 |
| フラット構造で機能が混在 | features/配下に機能を閉じ込め |
| 資格追加のたびindex.jsを直接編集 | registry.tsに1行追記するだけ |
| テストが書けない構造 | 責務分離でテスト可能に |

### 設計の核心原則

```
pages/    → ルーティングの入口のみ（薄く保つ）
features/ → ドメインロジックをここに閉じ込める
components/ → 機能非依存の汎用UIのみ
services/ → API通信の唯一の窓口
```

---

## フロントエンド完全構成

```
frontend/
├── src/
│   ├── components/              # 汎用・再利用コンポーネント
│   │   ├── ui/                  # 最小単位のUIパーツ
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── index.ts         # re-export
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── PageContainer.tsx
│   │   │   └── Footer.tsx
│   │   └── feedback/
│   │       ├── LoadingState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── EmptyState.tsx
│   │       └── Toast.tsx
│   │
│   ├── features/                # 機能ドメイン単位
│   │   ├── qualifications/
│   │   │   ├── components/
│   │   │   │   ├── QualificationCard.tsx
│   │   │   │   ├── QualificationList.tsx
│   │   │   │   ├── QualificationDetail.tsx
│   │   │   │   ├── QualificationSearch.tsx
│   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   └── ScheduleInfo.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useQualifications.ts
│   │   │   │   ├── useQualificationDetail.ts
│   │   │   │   └── useQualificationSearch.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   ├── EventPopup.tsx
│   │   │   │   ├── EventFilter.tsx
│   │   │   │   └── EventLegend.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCalendarEvents.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   └── admin/
│   │       ├── components/
│   │       │   ├── AdminQualificationTable.tsx
│   │       │   ├── QualificationForm.tsx
│   │       │   ├── ScheduleForm.tsx
│   │       │   ├── FetchLogTable.tsx
│   │       │   └── BulkFetchButton.tsx
│   │       ├── hooks/
│   │       │   ├── useAdminQualifications.ts
│   │       │   └── useFetchLogs.ts
│   │       └── types/
│   │           └── index.ts
│   │
│   ├── pages/                   # ルーティング入口（薄く保つ）
│   │   ├── QualificationsPage.tsx
│   │   ├── QualificationDetailPage.tsx
│   │   ├── CalendarPage.tsx
│   │   └── AdminPage.tsx
│   │
│   ├── services/                # API通信層
│   │   ├── api.ts               # axiosインスタンス・共通設定
│   │   ├── qualificationService.ts
│   │   ├── calendarService.ts
│   │   └── adminService.ts
│   │
│   ├── hooks/                   # グローバルフック
│   │   ├── useTheme.ts          # ダークモード
│   │   ├── useToast.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/                   # グローバル型定義
│   │   ├── qualification.ts
│   │   ├── schedule.ts
│   │   ├── calendar.ts
│   │   └── api.ts
│   │
│   ├── constants/               # ハードコーディング禁止
│   │   ├── categories.ts        # カテゴリ一覧
│   │   ├── eventTypes.ts        # カレンダーイベント種別・色
│   │   ├── routes.ts            # パス定数
│   │   └── api.ts               # APIエンドポイント定数
│   │
│   ├── utils/                   # 純粋関数
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   │
│   ├── styles/
│   │   └── globals.css          # Tailwindベース + CSS変数
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── package.json
```

---

## バックエンド完全構成

```
backend/
├── src/
│   ├── database/
│   │   ├── db.ts
│   │   ├── migrations/
│   │   │   └── 001_initial.sql
│   │   └── seeds/
│   │       └── qualifications.ts
│   │
│   ├── routes/
│   │   ├── qualifications.ts
│   │   ├── calendar.ts
│   │   ├── admin.ts
│   │   └── index.ts
│   │
│   ├── scrapers/                # ★ 資格別スクレイパー
│   │   ├── base/
│   │   │   └── BaseScraper.ts
│   │   ├── national/            # 国家資格
│   │   │   └── ipa/
│   │   │       ├── JitecKihon.ts
│   │   │       ├── JitecOyo.ts
│   │   │       └── JitecAdvanced.ts
│   │   ├── cloud/               # クラウド
│   │   │   ├── aws/
│   │   │   │   ├── AwsCCP.ts
│   │   │   │   ├── AwsSAA.ts
│   │   │   │   └── ... (全種)
│   │   │   ├── gcp/
│   │   │   └── azure/
│   │   ├── database/
│   │   │   └── oracle/
│   │   ├── language/
│   │   │   ├── java/
│   │   │   ├── python/
│   │   │   └── ruby/
│   │   ├── security/
│   │   ├── network/
│   │   ├── project/
│   │   ├── data/
│   │   └── registry.ts          # ★ 全スクレイパー登録
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── requestLogger.ts
│   │   └── rateLimiter.ts
│   │
│   ├── types/
│   │   ├── qualification.ts
│   │   ├── scraper.ts
│   │   └── api.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── httpClient.ts
│   │   └── logger.ts
│   │
│   ├── constants/
│   │   └── index.ts
│   │
│   └── index.ts
│
├── data/                        # SQLiteファイル（.gitignore）
├── tsconfig.json
├── .eslintrc.cjs
├── package.json
└── nodemon.json
```

---

## 新資格追加の手順（3ステップ）

```
1. scrapers/[カテゴリ]/NewExam.ts を作成
2. scrapers/registry.ts に1行追加
3. seeds/qualifications.ts に初期データを追加
```

ルート・API・DB構造は変更不要。

---

## 対応資格カテゴリ（スコープ）

| 大カテゴリ | 小カテゴリ | スクレイパー |
|-----------|-----------|------------|
| 国家資格 | IT・情報 | 実装あり（IPA） |
| 国家資格 | 医療・福祉〜 | 手動登録のみ |
| 民間資格 | クラウド（AWS/GCP/Azure） | 実装あり |
| 民間資格 | データベース（Oracle） | 実装あり |
| 民間資格 | プログラミング言語 | 実装あり（Java/Python/Ruby） |
| 民間資格 | セキュリティ/ネットワーク | 順次実装 |
| 公的資格 | 語学（英検/TOEIC/HSK） | 実装あり/手動 |
| 公的資格 | 会計（日商簿記） | 手動登録のみ |
