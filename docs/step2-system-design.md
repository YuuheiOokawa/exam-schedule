# Step 2: システム設計

## なぜこのアーキテクチャか

ローカル運用想定のため、シンプルな2層構成（フロントエンド + バックエンドAPI）を採用する。
クラウド依存をゼロにすることで、`start.bat` ダブルクリックで誰でも起動できる。

---

## システム構成図

```
┌─────────────────────────────────────────────────────┐
│                   ユーザーブラウザ                    │
│              React + TypeScript + Vite               │
│                   localhost:3000                     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / REST API
                       │
┌──────────────────────▼──────────────────────────────┐
│                  バックエンドAPI                      │
│              Node.js + Express + TypeScript           │
│                   localhost:3001                     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼────────────┐
│   SQLite DB  │ │  Scrapers  │ │  外部公式サイト   │
│  exam.db     │ │  各資格別  │ │  IPA/AWS/etc.   │
└──────────────┘ └────────────┘ └─────────────────┘
```

---

## 技術スタック選定と理由

### フロントエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| React | 18 | コンポーネントエコシステムが最大。チームへの普及率が高い |
| TypeScript | 5 | 型安全による実装品質向上。IDEサポートが強力 |
| Vite | 5 | HMRが高速。設定が少なく、ビルドも速い |
| Tailwind CSS | 3 | ユーティリティファーストでデザイン一貫性を保てる。インラインスタイル散乱を防ぐ |
| TanStack Query | 5 | サーバー状態管理。キャッシュ・ローディング・エラー処理が標準装備 |
| React Router | 6 | デファクトスタンダード。ファイルベースルーティングへの移行も容易 |
| FullCalendar | 6 | カレンダーUIの実装コストを大幅削減。日本語ロケール対応 |
| axios | 1 | HTTP通信。インターセプター機能でエラーハンドリングを一元化 |
| date-fns | 3 | 軽量な日付処理。Tree-shakingが効く |
| lucide-react | - | 一貫したアイコンセット。SVGベースで軽量 |
| clsx + tailwind-merge | - | 条件付きクラス名の安全な合成 |

### バックエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| Node.js | 20 LTS | フロントエンドと言語統一。エコシステムが巨大 |
| Express | 4 | 軽量・シンプル。ミドルウェアの豊富さ |
| TypeScript | 5 | フロント・バック間で型定義を共有可能 |
| better-sqlite3 | - | 同期APIでシンプル。Node.jsから直接操作可能 |
| cheerio | - | Node.js向けjQueryライクなHTML解析。スクレイピング用 |
| helmet | - | セキュリティヘッダーの自動付与 |
| morgan | - | HTTPリクエストログ |
| cors | - | フロント-バック間のCORS設定 |

---

## API設計方針

### RESTful設計

```
GET    /api/qualifications              # 一覧（?search=&category=&main_category=）
GET    /api/qualifications/:id          # 詳細
POST   /api/qualifications/:id/fetch    # 公式サイトから情報取得

GET    /api/calendar/events             # カレンダーイベント一覧（?from=&to=）

POST   /api/admin/qualifications        # 資格追加
PUT    /api/admin/qualifications/:id    # 資格更新
DELETE /api/admin/qualifications/:id    # 資格削除
PUT    /api/admin/schedules/:id         # スケジュール手動登録
GET    /api/admin/logs                  # 取得ログ
POST   /api/admin/fetch-all             # 全資格一括取得

GET    /api/health                      # ヘルスチェック
```

### レスポンス形式の統一

```typescript
// 成功
{ success: true, data: T }

// 一覧（ページネーション対応）
{ success: true, data: T[], meta: { total: number, page: number } }

// エラー
{ success: false, error: { code: string, message: string } }
```

---

## スクレイパー設計方針

```
BaseScraper（抽象クラス）
  ↓ extends
各資格スクレイパー（例: AwsSAAScaper）
  ↓ registry.ts に登録
ScraperRegistry
  ↓ 呼び出し
AdminRoute（/fetch, /fetch-all）
```

- 1資格 = 1ファイル
- 失敗しても `{ success: false, error: string }` を返すだけでアプリを止めない
- レート制限：3秒間隔（公式サイトへの配慮）
- ユーザーエージェントを明示する

---

## ディレクトリ分離理由

フロント・バックエンドを別ディレクトリに分離。

```
exam-schedule-app/
├── frontend/   ← React アプリ（port 3000）
├── backend/    ← Express API（port 3001）
└── docs/       ← 設計資料（本ドキュメント）
```

**理由：**
- ビルド・デプロイを独立させられる
- `package.json` の依存関係が混在しない
- 将来的にフロントをVercel・バックをRailwayへデプロイする際も対応しやすい

---

## 起動フロー

```
start.bat
  ├── cd backend && npm install && node src/index.js  (ターミナル1)
  └── cd frontend && npm install && npm run dev        (ターミナル2)
```

初回起動時にSQLiteが自動作成され、初期データが投入される。
