# 資格スケジュールアプリ — 現状分析 & リリース計画書

> 作成日: 2026-06-08  
> 対象: Web本番公開 → App Store / Google Play リリースまでの全工程  
> 実装禁止: このドキュメントは設計・計画書です。実装は別フェーズで行ってください。

---

## ─── PART 1: 現状実装ドキュメント ───

---

### 1. アプリ概要

| 項目 | 内容 |
|------|------|
| アプリ名 | 資格スケジュール |
| 種別 | 資格試験スケジュール管理 Webアプリ（PWA対応） |
| ターゲット | 資格取得を目指す社会人・学生 |
| コア価値 | 128件以上の資格試験日程・申込期限・合格発表日を一元管理 |
| 収益モデル | Freemium（フリー + プレミアム ¥480/月〜） |
| 現状 | ローカル開発完了・本番未デプロイ |

---

### 2. 現在できていること

| カテゴリ | 機能 | 状態 |
|---------|------|------|
| 認証 | メール認証付き会員登録（3ステップ） | ✅ 完了 |
| 認証 | ログイン / JWT自動更新 | ✅ 完了 |
| 認証 | パスワードリセット（メールリンク） | ✅ 完了 |
| 認証 | アカウント削除 | ✅ 完了 |
| 資格情報 | 128件以上の資格マスタ | ✅ 完了 |
| 資格情報 | 資格検索・フィルタ・詳細表示 | ✅ 完了 |
| 資格情報 | 試験日程の自動スクレイピング（13資格） | ✅ 完了 |
| カレンダー | FullCalendarで試験スケジュール表示 | ✅ 完了 |
| 保有資格 | 取得済み資格の登録・管理 | ✅ 完了（無料5件上限） |
| ウィッシュリスト | 挑戦したい資格の管理 | ✅ 完了（無料10件上限） |
| 受験予定 | 受験計画の登録・管理 | ✅ 完了（無料3件上限） |
| スコア履歴 | スコア記録（TOEIC等） | ✅ 完了（無料5件/資格） |
| ロードマップ | 資格取得順序の可視化 | ✅ 完了 |
| 課金 | Stripe Checkout（4プラン） | ✅ 完了 |
| 課金 | Stripe Webhook（5イベント） | ✅ 完了 |
| 課金 | サブスク状態管理（trial/premium/grace/expired） | ✅ 完了 |
| 課金 | 7日間フリートライアル自動開始 | ✅ 完了 |
| 課金 | カスタマーポータル | ✅ 完了 |
| 課金 | 支払い履歴 | ✅ 完了 |
| Push通知 | Web Push (VAPID) 基盤 | ✅ 完了 |
| Push通知 | 通知購読・解除 | ✅ 完了 |
| PWA | manifest.json + sw.js | ✅ 完了（PNG不足） |
| メール | 確認メール・パスワードリセット | ✅ 完了 |
| メール | 課金関連メール（決済失敗・解約・更新） | ✅ 完了 |
| 管理画面 | 資格・スケジュールの管理 | ✅ 完了 |
| テーマ | ライト / ダークモード | ✅ 完了 |
| デプロイ設定 | Vercel (Frontend) + Railway (Backend) | ✅ 設定済み・未デプロイ |

---

### 3. 実装済み機能一覧（詳細）

#### フロントエンド（16画面）

| 画面 | パス | 認証要否 | 主な機能 |
|------|------|---------|---------|
| ダッシュボード | / | 不要 | 直近イベント・おすすめ資格 |
| 資格一覧 | /list | 不要 | 検索・カテゴリフィルタ・ページネーション |
| 資格詳細 | /qualification/:id | 不要 | 詳細・日程・ウィッシュリスト追加 |
| カレンダー | /calendar | 必要 | FullCalendar・フィルタ |
| 保有資格 | /held | 必要 | 一覧・スコア編集・取得日 |
| ウィッシュリスト | /wishlist | 必要 | 一覧・保有済みへ移動 |
| ロードマップ | /roadmap | 必要 | 資格の順序可視化 |
| マイページ | /me | 不要 | プロフィール・サブスク状態・Push |
| 料金プラン | /pricing | 不要 | 4プランタブ・比較テーブル |
| ログイン | /login | 不要 | メール+パスワード |
| 新規登録 | /register | 不要 | メールアドレス入力 |
| メール送信完了 | /email-sent | 不要 | 確認メール送信済み表示 |
| パスワード設定 | /set-password | 不要 | トークン検証+パスワード設定 |
| パスワードリセット要求 | /forgot-password | 不要 | メール入力 |
| パスワードリセット | /reset-password | 不要 | 新パスワード設定 |
| 管理画面 | /admin | 管理者 | 資格・日程管理 |

#### バックエンド（API Route一覧）

| グループ | エンドポイント | 認証 | 説明 |
|---------|-------------|------|------|
| **auth** | POST /api/auth/signup | - | 登録ステップ1（メール送信） |
| | POST /api/auth/verify-token | - | トークン検証 |
| | POST /api/auth/complete | - | パスワード設定・ユーザー作成+trial開始 |
| | POST /api/auth/login | - | ログイン |
| | GET /api/auth/me | JWT | 自分の情報 |
| | PATCH /api/auth/me | JWT | 名前変更 |
| | DELETE /api/auth/me | JWT | アカウント削除 |
| | POST /api/auth/forgot-password | - | リセット要求 |
| | POST /api/auth/reset-password | - | パスワードリセット |
| | GET /api/auth/users | Admin | ユーザー一覧 |
| | DELETE /api/auth/users/:id | Admin | ユーザー削除 |
| **qualifications** | GET /api/qualifications | - | 一覧（スケジュール付き） |
| | GET /api/qualifications/:id | - | 詳細 |
| | POST /api/qualifications | Admin | 新規登録 |
| | PATCH /api/qualifications/:id | Admin | 更新 |
| **calendar** | GET /api/calendar | JWT | カレンダーイベント一覧 |
| **held** | GET /api/held | JWT | 保有資格一覧 |
| | POST /api/held/:id | JWT | 追加（上限チェック） |
| | DELETE /api/held/:id | JWT | 削除 |
| | PATCH /api/held/:id | JWT | スコア・取得日更新 |
| | GET /api/held/details | JWT | 詳細（スコア含む） |
| **wishlist** | GET /api/wishlist | JWT | ウィッシュリスト一覧 |
| | POST /api/wishlist/:id | JWT | 追加（上限チェック） |
| | DELETE /api/wishlist/:id | JWT | 削除 |
| **scores** | GET /api/scores/:qualId | JWT | スコア履歴 |
| | POST /api/scores/:qualId | JWT | スコア追加 |
| | DELETE /api/scores/:id | JWT | 削除 |
| **plans** | GET /api/plans | JWT | 受験予定一覧 |
| | POST /api/plans | JWT | 追加（上限チェック） |
| | PATCH /api/plans/:id | JWT | 更新 |
| | DELETE /api/plans/:id | JWT | 削除 |
| **subscription** | GET /api/subscription/status | JWT | サブスク状態 |
| | GET /api/subscription/entitlements | JWT | 機能制限状態 |
| | GET /api/subscription/plans | - | プラン一覧（公開） |
| | GET /api/subscription/history | JWT | 支払い履歴 |
| **stripe** | POST /api/stripe/create-checkout | JWT | Checkoutセッション作成 |
| | POST /api/stripe/portal | JWT | カスタマーポータル |
| | POST /api/stripe/webhook | - | Stripe Webhook（raw body） |
| | POST /api/stripe/sync-price | JWT | Price ID同期（管理用） |
| | GET /api/stripe/subscription | JWT | サブスク情報（後方互換） |
| **push** | GET /api/push/vapid-public-key | - | VAPID公開鍵 |
| | POST /api/push/subscribe | JWT | Push購読登録 |
| | DELETE /api/push/subscribe | JWT | Push購読解除 |
| | GET /api/push/status | JWT | 購読状態確認 |
| | POST /api/push/test | JWT | テスト通知送信 |
| **admin** | GET /api/admin/qualifications | Admin | 管理用一覧 |
| | PATCH /api/admin/schedules/:id | Admin | 日程更新 |
| | GET /api/admin/fetch-logs | Admin | スクレイピングログ |
| | POST /api/admin/scrape/:id | Admin | 手動スクレイピング |
| **health** | GET /api/health | - | ヘルスチェック |

---

### 4. 未実装機能一覧

| 機能 | 優先度 | 理由 |
|------|--------|------|
| **プレミアム限定機能（UI未実装）** | | |
| 学習計画自動作成 | 高 | PricingPageに記載あり・未実装 |
| スコア履歴グラフ表示 | 高 | データはあるがグラフなし |
| 進捗分析ダッシュボード | 中 | 設計のみ |
| CSVエクスポート | 中 | 設計のみ |
| カレンダー連携（iCal/Google） | 中 | 設計のみ |
| 申込期限Push通知（自動送信） | 高 | インフラはあるがスケジューラ未実装 |
| 合格発表リマインド通知 | 中 | 未実装 |
| AI アドバイス | 低 | 将来機能 |
| **法的・コンプライアンス** | | |
| プライバシーポリシーページ | 最高 | App Store審査必須 |
| 利用規約ページ | 最高 | App Store審査必須 |
| 特定商取引法に基づく表示 | 最高 | 日本法令要件 |
| サポートページ/問い合わせ | 高 | App Store審査必須 |
| **パフォーマンス** | | |
| レート制限（express-rate-limit） | 高 | セキュリティ必須 |
| APIレスポンスの圧縮（gzip） | 中 | パフォーマンス |
| 画像最適化（PNG変換） | 中 | PWA・Apple対応 |
| DBインデックス追加 | 中 | 大量データ対応 |
| **セキュリティ** | | |
| CSRF対策 | 高 | SPA+APIの場合要検討 |
| Helmet設定の詳細化 | 中 | CSP等 |
| admin初期パスワード変更フロー | 高 | admin123がハードコード |
| JWTのhttpOnlyクッキー移行検討 | 中 | XSS対策 |
| **デプロイ・運用** | | |
| 本番環境への実際のデプロイ | 最高 | まだ未実施 |
| エラー監視（Sentry等） | 高 | 本番必須 |
| ログ集約（Railway Logs等） | 中 | 運用必須 |
| .env.example ファイル | 高 | 開発者向け |
| **テスト** | | |
| ユニットテスト | 高 | 品質保証 |
| APIインテグレーションテスト | 高 | 品質保証 |
| **スマホアプリ化** | | |
| Capacitor/React Native対応 | 将来 | Phase 8 |
| Apple IAP実装 | 将来 | App Store必須 |
| Google Play Billing実装 | 将来 | Google Play必須 |
| アプリアイコン（PNG 1024x1024） | 将来 | ストア申請必須 |

---

### 5. 画面一覧（再掲・補足）

**公開画面（認証不要）:**
- `/` — ダッシュボード（ゲストでも閲覧可能）
- `/list` — 資格一覧
- `/qualification/:id` — 資格詳細
- `/pricing` — 料金プラン
- `/login` / `/register` / `/email-sent` / `/set-password`
- `/forgot-password` / `/reset-password`

**認証必須画面:**
- `/calendar` — 試験カレンダー
- `/held` — 保有資格
- `/wishlist` — 挑戦リスト
- `/roadmap` — ロードマップ
- `/me` — マイページ

**管理者専用:**
- `/admin` — 管理画面

**未作成（必要）:**
- `/privacy` — プライバシーポリシー
- `/terms` — 利用規約
- `/tokusho` — 特定商取引法に基づく表示
- `/support` — サポート・お問い合わせ
- `/404` — Not Found

---

### 6. API一覧（上記「3」を参照）

---

### 7. DB構造

#### テーブル一覧（16テーブル）

```
qualifications           — 資格マスタ（128件+）
qualification_schedules  — 試験日程（複数レコード/資格対応）
fetch_logs               — スクレイピングログ
users                    — ユーザー（subscription_status含む）
pending_registrations    — 仮登録（メール認証待ち）
user_held_qualifications — 保有資格
user_wishlist            — ウィッシュリスト
qualification_score_history — スコア履歴
user_exam_plans          — 受験予定
password_reset_tokens    — パスワードリセットトークン
subscriptions            — サブスクリプション状態
push_subscriptions       — Web Push購読情報
plans                    — プラン定義（4プラン）
payments                 — 支払い記録
subscription_events      — サブスクイベントログ
feature_limits           — 機能制限設定（プランTier別）
```

#### 主要テーブルの構造

```sql
-- ユーザー（重要カラム）
users:
  id, email, password_hash, name, role(viewer/admin),
  subscription_tier(free/pro), subscription_status(free/trial/premium/canceled/grace_period/expired),
  created_at

-- サブスクリプション（重要カラム）
subscriptions:
  user_id, stripe_customer_id, stripe_sub_id, plan(free/pro),
  plan_code(free/monthly/quarterly/biannual/annual),
  status(trial/active/canceled/past_due/expired),
  trial_starts_at, trial_ends_at, expires_at,
  grace_period_ends_at, canceled_at, platform(web/ios/android)

-- プラン定義
plans:
  plan_code, name, interval_months, price_jpy, price_monthly,
  discount_pct, stripe_price_id, apple_product_id, google_product_id
```

#### インデックス（実装済み）
qualifications, users, held, wishlist, score_history, exam_plans に基本インデックス済み

#### インデックス不足（要追加）
- `users.subscription_status` — 期限切れバッチ処理で使用
- `subscriptions.expires_at` — 期限切れバッチ処理で使用
- `subscriptions.stripe_sub_id` — Webhook処理で使用
- `push_subscriptions.user_id` — 通知送信で使用

---

### 8. ディレクトリ構成

```
exam-schedule-app/
├── backend/
│   ├── Dockerfile
│   ├── railway.json
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              — アプリエントリ・ミドルウェア設定
│       ├── constants/index.ts    — 定数
│       ├── database/
│       │   ├── db.ts             — DB接続・スキーマ・マイグレーション
│       │   └── seeds/            — 資格シードデータ
│       ├── middleware/
│       │   ├── auth.ts           — JWT認証ミドルウェア
│       │   ├── entitlements.ts   — 機能制限チェック
│       │   ├── errorHandler.ts   — エラーハンドラ
│       │   └── requirePro.ts     — 旧プロ限定（エンタイトルメントに移行中）
│       ├── routes/
│       │   ├── index.ts          — ルート集約
│       │   ├── auth.ts           — 認証
│       │   ├── qualifications.ts — 資格情報
│       │   ├── calendar.ts       — カレンダー
│       │   ├── held.ts           — 保有資格
│       │   ├── wishlist.ts       — ウィッシュリスト
│       │   ├── scores.ts         — スコア履歴
│       │   ├── plans.ts          — 受験予定
│       │   ├── subscription.ts   — サブスク情報
│       │   ├── stripe.ts         — Stripe課金
│       │   ├── push.ts           — Push通知
│       │   └── admin.ts          — 管理API
│       ├── scrapers/
│       │   ├── scheduler.ts      — Cron（日次スクレイピング + 毎時期限チェック）
│       │   ├── registry.ts       — スクレイパー登録
│       │   ├── base/BaseScraper.ts
│       │   ├── national/         — 国家資格（IPA・宅建・FP・行政書士・社労士・中小企業診断士）
│       │   └── public/private/   — 公的・民間資格（英検・TOEIC・JLPT等）
│       ├── services/
│       │   └── emailService.ts   — メール送信（Resend/SMTP/console）
│       ├── types/index.ts        — 共通型定義
│       └── utils/                — logger・httpClient・date

└── frontend/
    ├── vercel.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── package.json
    ├── public/
    │   ├── manifest.json         — PWAマニフェスト
    │   ├── sw.js                 — Service Worker
    │   ├── favicon.svg
    │   ├── icon-192.svg          — ※PNGが必要
    │   └── icon-512.svg          — ※PNGが必要
    └── src/
        ├── App.tsx               — Router・Provider設定
        ├── main.tsx              — エントリ
        ├── contexts/             — Auth・Theme・Toast・Held・Wishlist
        ├── pages/                — 16ページ
        ├── features/             — calendar・qualifications・admin の機能単位
        ├── components/
        │   ├── auth/             — ProtectedRoute
        │   ├── feedback/         — Loading・Error・Toast・Empty
        │   ├── layout/           — Sidebar・BottomNav・PageContainer
        │   ├── premium/          — PremiumBadge・PremiumFeatureGate
        │   └── ui/               — Badge・Button・Input・Modal・Select等
        ├── hooks/                — useDebounce・useEntitlements・usePushNotification
        ├── services/             — api・auth・held・wishlist・score・plan・subscription等
        ├── constants/            — routes・categories・levels・eventTypes
        ├── types/                — api・calendar・qualification
        └── utils/                — cn・date・format・level
```

---

### 9. 使用技術

| レイヤー | 技術 | バージョン | 用途 |
|---------|------|----------|------|
| **フロントエンド** | React | 18.3 | UIフレームワーク |
| | TypeScript | 5.4 | 型安全 |
| | Vite | 5.3 | ビルドツール |
| | React Router | v6.24 | SPAルーティング（lazy loading） |
| | TanStack Query | v5 | サーバー状態管理 |
| | Tailwind CSS | 3.4 | スタイリング |
| | FullCalendar | 6.1 | カレンダーUI |
| | Lucide React | 0.400 | アイコン |
| | Axios | 1.7 | HTTPクライアント |
| | date-fns | 3.6 | 日付処理 |
| **バックエンド** | Express | 4.19 | Webフレームワーク |
| | TypeScript | 5.4 | 型安全 |
| | postgres.js | 3.4 | PostgreSQLクライアント |
| | JWT (jsonwebtoken) | 9.0 | 認証 |
| | bcryptjs | 3.0 | パスワードハッシュ |
| | Stripe | 16.0 | 決済 |
| | web-push | 3.6 | Push通知（VAPID） |
| | Resend | 6.12 | メール送信 |
| | nodemailer | 8.0 | SMTP送信（フォールバック） |
| | node-cron | 4.2 | 定期処理 |
| | cheerio | 1.0 | HTMLパース（スクレイパー） |
| | helmet | 7.1 | セキュリティヘッダー |
| | cors | 2.8 | CORS設定 |
| | morgan | 1.10 | HTTPリクエストログ |
| **データベース** | PostgreSQL | 16 | メインDB |
| | Neon | クラウド | PostgreSQL Serverless |
| **インフラ** | Vercel | - | フロントエンドホスティング |
| | Railway | - | バックエンドホスティング |
| | Docker | - | バックエンドコンテナ |

---

### 10. 現在の問題点

#### 🔴 重大（本番公開前に必須）

| # | 問題 | 影響 | 対応 |
|---|------|------|------|
| 1 | **管理者初期パスワードがハードコード** `admin123` | セキュリティ侵害 | 初回ログイン強制変更フロー、または環境変数化 |
| 2 | **JWTシークレットのデフォルト値** がdb.tsにハードコード | JWT偽造リスク | .envの必須化（productionでは既にエラーあり） |
| 3 | **レート制限なし** | ブルートフォース・DoS | express-rate-limitの追加 |
| 4 | **プライバシーポリシー未実装** | 法的リスク・App Store審査落ち | 法的ページ作成 |
| 5 | **利用規約未実装** | 法的リスク・App Store審査落ち | 法的ページ作成 |
| 6 | **特定商取引法表示未実装** | 日本法令違反 | 法的ページ作成 |
| 7 | **本番未デプロイ** | リリース不可 | Vercel+Railway本番デプロイ |

#### 🟠 重要（早期対応推奨）

| # | 問題 | 影響 | 対応 |
|---|------|------|------|
| 8 | **Push通知の自動送信なし** | 「試験日リマインド」機能が実際は動かない | 定期バッチで試験日前X日に送信 |
| 9 | **PWAアイコンがSVGのみ** | iOSホーム画面追加時にアイコン表示されない | PNG変換（192x192, 512x512, 1024x1024） |
| 10 | **sw.jsがViteビルドに含まれない** | PWA動作不確実 | main.tsxでのSW登録確認 |
| 11 | **`require()`がES Modulesで使用** | Node.js ESM環境でのランタイムエラーリスク | import()に変更 |
| 12 | **エラー監視なし** | 本番障害の把握遅延 | Sentry等の導入 |
| 13 | **テストコードなし** | リグレッション未検出 | 最低限のAPIテスト追加 |

#### 🟡 改善推奨

| # | 問題 | 影響 | 対応 |
|---|------|------|------|
| 14 | **JWTをlocalStorageに保存** | XSS時にトークン漏洩 | httpOnly Cookie検討（SPA特性考慮） |
| 15 | **バックエンドの`dev`スクリプトが遅い** | 開発体験 | tsx watchまたはts-node-devの使用 |
| 16 | **`requirePro`ミドルウェアが残存** | 新エンタイトルメントとの重複 | 整理・削除 |
| 17 | **DBインデックス不足** | パフォーマンス | 上記インデックス追加 |
| 18 | **APIバージョニングなし** | 後方互換性管理困難 | /api/v1/ プレフィックス検討 |
| 19 | **`.env`に実認証情報が記載** | Gitへの誤コミットリスク | .env.exampleを作成し.envを.gitignoreに追加確認 |

---

### 11. リリースまでに不足しているもの（優先順）

1. **法的ページ**（プライバシーポリシー・利用規約・特商法）
2. **本番デプロイ実施**（Vercel + Railway）
3. **本番環境変数設定**（Stripe本番キー・VAPID・JWT秘密鍵等）
4. **Stripe本番プロダクト・Price作成**
5. **Push通知自動送信スケジューラ**
6. **PWA PNGアイコン**
7. **レート制限**
8. **管理者パスワード運用手順**
9. **エラー監視設定**
10. **サポートページ**

---

## ─── PART 2: 要件定義 ───

---

### Phase 2-A: Web本番公開に必要な要件

| 要件 | 重要度 | 内容 |
|------|--------|------|
| ホスティング | 必須 | Vercel（フロント）+ Railway（バック）本番環境 |
| ドメイン | 推奨 | カスタムドメイン取得・DNS設定 |
| SSL | 自動 | Vercel/Railwayが自動提供 |
| 環境変数 | 必須 | 本番用JWT_SECRET・Stripe本番キー等 |
| 法的ページ | 必須 | プライバシーポリシー・利用規約・特商法 |
| エラー監視 | 推奨 | Sentry導入 |
| Stripe本番 | 必須 | テストモードから本番モードへ切り替え |
| レート制限 | 必須 | 認証エンドポイントへのブルートフォース対策 |

### Phase 2-B: スマホアプリ化に必要な要件

| 要件 | 内容 |
|------|------|
| アーキテクチャ選択 | PWA強化 or Capacitor or React Native（後述） |
| iOS対応 | Safari PWA制限・Push通知（iOS 16.4+） |
| Apple Developer Account | $99/年 |
| Google Developer Account | $25一回 |
| アプリ内課金 | Apple IAP / Google Play Billing（WebのStripeとは別） |
| ストア資産 | アイコン・スクリーンショット・説明文 |

### Phase 2-C: App Store / Google Play申請要件

| 要件 | App Store | Google Play |
|------|-----------|-------------|
| 課金方式 | Apple IAP必須（デジタルコンテンツ） | Google Play Billing必須 |
| 手数料 | 30%（Small Business 15%） | 30%（最初の100万円は15%） |
| プライバシーポリシー | 必須 | 必須 |
| 利用規約 | 必須 | 必須 |
| サポートURL | 必須 | 必須 |
| 年齢制限 | 4+ | 全ユーザー対象 |
| コンテンツ審査 | 1-7日 | 数時間〜数日 |

---

## ─── PART 3: 設計書 ───

---

### Phase 3-A: 課金設計（確定版）

#### 料金体系

| プラン | 月額換算 | 合計 | 割引 | Stripe請求周期 |
|--------|---------|------|------|--------------|
| 月額 | ¥480 | ¥480 | - | 月次 |
| 3ヶ月 | ¥460 | ¥1,380 | 4% OFF | 3ヶ月 |
| 6ヶ月 | ¥440 | ¥2,640 | 8% OFF | 6ヶ月 |
| 年額 | ¥380 | ¥4,560 | **21% OFF** | 年次 |

#### 無料 vs プレミアム 機能差

| 機能 | 無料 | プレミアム |
|------|------|----------|
| 保有資格登録 | **5件まで** | 無制限 |
| ウィッシュリスト | **10件まで** | 無制限 |
| 受験予定 | **3件まで** | 無制限 |
| スコア履歴 | **5件/資格** | 無制限 |
| 試験日カレンダー | ✅ | ✅ |
| Push通知（試験前日） | ✅ | ✅ |
| 申込期限アラート | ❌ | ✅ |
| 合格発表リマインド | ❌ | ✅ |
| 1ヶ月前〜前日通知 | ❌ | ✅ |
| スコアグラフ | ❌ | ✅ |
| 学習計画作成 | ❌ | ✅（未実装） |
| 進捗分析 | ❌ | ✅（未実装） |
| CSVエクスポート | ❌ | ✅（未実装） |
| カレンダー連携 | ❌ | ✅（未実装） |

#### サブスク状態遷移

```
新規登録
  → trial (7日間・CC不要)
       ↓ 期限切れ
  → free (または premium購入)
       ↓ Stripe購入完了
  → premium (active)
       ↓ 解約申請
  → canceled (期間終了まで利用可)
       ↓ 期間終了
  → expired → free移行
       ↓ 更新失敗
  → grace_period (3日猶予)
       ↓ 未解決
  → expired → free移行
```

#### Web版 vs スマホ版 課金統一

```
Web版   → Stripe Checkout（stripe_customer_id + stripe_sub_id）
iOS版   → Apple IAP → バックエンドでレシート検証 → subscriptions更新
Android → Google Play Billing → バックエンドで通知検証 → subscriptions更新

共通: subscriptions.platformカラムで区別（web/ios/android）
共通: users.subscription_statusが真実の情報源（どのプラットフォームでも参照）
```

---

### Phase 3-B: 通知設計

#### 現状の問題
- Push通知インフラは完成しているが**自動送信のスケジューラが存在しない**
- `/push/test` エンドポイントのみ存在

#### 必要な実装

```
毎日 09:00 JST に実行するバッチ:

1. 試験日通知（無料・プレミアム共通）
   - 試験日前日: 全ユーザー対象
   - 試験日1週間前: プレミアムユーザーのみ
   - 試験日1ヶ月前: プレミアムユーザーのみ

2. 申込期限通知（プレミアムのみ）
   - 申込締切3日前
   - 申込締切前日

3. 合格発表通知（プレミアムのみ）
   - 合格発表日当日
```

---

### Phase 3-C: セキュリティ設計

| 項目 | 現状 | 推奨対応 |
|------|------|---------|
| レート制限 | ❌ なし | /auth/login: 10回/15分、/auth/signup: 5回/時間 |
| JWTストレージ | localStorage | SPAではlocalStorageが一般的。XSS対策としてCSP強化を優先 |
| CSP（Content Security Policy） | Helmet基本設定のみ | Helmet CSP詳細設定 |
| SQLインジェクション | `sql.unsafe()`使用 | パラメータは別引数渡しで保護済み |
| パスワード強度 | 8文字以上のみ | zxcvbn等で強度チェック追加 |
| admin初期パスワード | `admin123`ハードコード | 環境変数化 or 初回変更強制 |
| HTTPS | Vercel/Railway自動 | 自動SSL有効 |

---

## ─── PART 4: Web本番公開計画 ───

---

### 推奨構成

```
[ユーザー]
    ↓ HTTPS
[Vercel] ← フロントエンド（React/Vite）
    ↓ /api/* をプロキシ（または直接API URL）
[Railway] ← バックエンド（Express/Node.js/Docker）
    ↓ PostgreSQL接続
[Neon] ← PostgreSQL Serverless（既に設定済み）
```

#### 選定理由
- **Vercel**: Viteプロジェクトと高相性・無料枠十分・世界規模CDN・自動HTTPS
- **Railway**: Dockerfile既存・Node.jsサーバー向け・環境変数管理が容易
- **Neon**: 既に接続設定済み・Serverless PostgreSQL・接続プール管理不要

### 本番デプロイ手順（概要）

#### フロントエンド（Vercel）
```
1. vercel.com でプロジェクト作成
2. GitHubリポジトリ連携
3. Root Directory: frontend
4. Build Command: npm run build
5. Output Directory: dist
6. 環境変数設定:
   VITE_API_URL=https://your-backend.railway.app
7. カスタムドメイン設定（任意）
```

#### バックエンド（Railway）
```
1. railway.app でプロジェクト作成
2. GitHubリポジトリ連携
3. Root Directory: backend
4. 環境変数設定（以下必須）:
   DATABASE_URL=（NeonのURL）
   DATABASE_SSL=true
   JWT_SECRET=（ランダム64文字以上）
   NODE_ENV=production
   CORS_ORIGIN=https://your-app.vercel.app
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_QUARTERLY=price_...
   STRIPE_PRICE_BIANNUAL=price_...
   STRIPE_PRICE_ANNUAL=price_...
   VAPID_PUBLIC_KEY=（生成済みのもの）
   VAPID_PRIVATE_KEY=（生成済みのもの）
   VAPID_SUBJECT=mailto:support@yourdomain.com
   RESEND_API_KEY=re_...
   APP_URL=https://your-app.vercel.app
5. Webhook URL登録: https://backend.railway.app/api/stripe/webhook
```

### 環境変数管理方針
- 本番: Vercel/RailwayのダッシュボードでGUI管理
- ローカル: backend/.env（.gitignoreに追加済み確認必須）
- `.env.example`を作成してキー名のみをコミット

---

## ─── PART 5: 課金機能設計（確定） ───

（Phase 3-A を参照。以下はスマホアプリ追加考慮）

### Stripe + Apple IAP + Google Play Billing の統合方針

```
Web版（Stripe）:
  - 既存実装完了
  - 本番キーへの切り替えのみ必要

iOS版（Apple IAP）:
  - App Store ConnectでIn-App Purchase商品を4つ作成
  - plans.apple_product_idに登録
  - バックエンドに /api/subscription/apple-iap エンドポイント追加
  - レシート検証: App Store Server API（新方式）
  - Appleはサブスク更新通知をServer-to-Serverで送信（Webhookと同様）

Android版（Google Play Billing）:
  - Google Play ConsoleでIn-App Products作成
  - plans.google_product_idに登録
  - バックエンドに /api/subscription/google-play エンドポイント追加
  - Google Play Developer API でレシート検証
  - Real-time Developer Notifications（PubSub）で更新通知

重要原則:
  - iOSアプリでサブスクを提供する場合、Webページへの誘導は禁止
  - Apple/Google手数料（30%）込みで価格設定する（または同額）
  - Web版との課金状態はsubscriptions.platform + subscription_statusで統一管理
```

---

## ─── PART 6: スマホアプリ化計画 ───

---

### 選択肢比較

| 方式 | メリット | デメリット | このアプリへの適合度 |
|------|---------|----------|-----------------|
| **PWA強化** | コスト最小・Web共通・既存コード流用 | iOS Push通知制限・ストア審査なし・ダウンロード数少ない | ★★★☆☆ |
| **Capacitor** | Webコードをほぼそのまま利用・React対応 | WebView依存・ネイティブ感が薄い | ★★★★☆ |
| **React Native** | ネイティブ性能・最高のUX | 大規模コード変更・学習コスト高 | ★★★☆☆ |
| **Expo** | React Nativeを簡略化・OTA更新 | Expoの制約あり・ビルドが重い | ★★★★☆ |

### **推奨: Capacitorによるハイブリッドアプリ**

#### 選定理由
1. 既存のReact/Tailwind/TanStack Queryコードをそのまま流用
2. Webとスマホでビジネスロジック・UIコンポーネントを共有
3. Apple IAP / Google Play BillingのCapacitorプラグインが成熟
4. Push通知もCapacitor Pushプラグインで対応可能
5. `npm run build`のViteビルド成果物をCapacitorでラップするだけ

#### Capacitor移行時の追加作業

```
1. Capacitorインストール・設定
2. iOS Xcode Project生成
3. Android Studio Project生成
4. Apple Developer Account取得
5. Google Developer Account取得
6. Capacitor Push通知プラグイン設定
7. Capacitor Stripe / IAP プラグイン設定
8. ディープリンク設定
9. スプラッシュスクリーン・アイコン設定
10. App Store Connect / Google Play Console設定
```

#### 共通化できる処理（ほぼすべて）
- UI コンポーネント全て
- TanStack Queryのデータ取得ロジック
- 認証フロー（JWT）
- ルーティング（React Router）
- 状態管理（Context）
- バリデーション

#### スマホ専用で必要な変更
- `localStorage` → `@capacitor/preferences`（Secure Storage）
- Web Push → `@capacitor/push-notifications`（FCM/APNs）
- Stripe Checkout → `@capacitor-community/stripe`（iOS IAP対応）
- カメラ・ギャラリーアクセス（将来の証明書写真機能等）

---

## ─── PART 7: ストア申請準備 ───

---

### App Store申請チェックリスト

#### 必須素材
| 素材 | 仕様 | 状態 |
|------|------|------|
| アプリアイコン | 1024×1024 PNG | ❌ 未作成（現在SVGのみ） |
| スクリーンショット iPhone | 6.7インチ（1290×2796）最低3枚 | ❌ 未作成 |
| スクリーンショット iPad | 12.9インチ（任意） | ❌ 未作成 |
| App Previewビデオ | 任意 | ❌ 未作成 |

#### 必須情報
| 項目 | 内容 | 状態 |
|------|------|------|
| アプリ名 | 資格スケジュール（仮） | ❌ 未決定 |
| サブタイトル | 試験日程・申込期限を一元管理 | ❌ 未決定 |
| カテゴリ | 教育 / 仕事効率化 | 確定 |
| 年齢制限 | 4+ | 確定 |
| プライバシーポリシーURL | https://your-app.com/privacy | ❌ ページ未作成 |
| サポートURL | https://your-app.com/support | ❌ ページ未作成 |
| マーケティングURL | 任意 | - |

#### サブスクリプション設定（App Store Connect）
```
1. App Store Connect → In-App Purchases → Subscriptions
2. サブスクリプショングループ作成：「プレミアムプラン」
3. 商品追加（4つ）:
   - com.yourapp.premium.monthly   ¥480/月
   - com.yourapp.premium.quarterly ¥1,380/3ヶ月
   - com.yourapp.premium.biannual  ¥2,640/6ヶ月
   - com.yourapp.premium.annual    ¥4,560/年
4. 審査用スクリーンショット・メモ追加
5. サブスクリプション説明文（各プランごと）
```

#### 審査で落ちやすいポイント
| リスク | 対策 |
|--------|------|
| 課金画面でApple IAP以外の誘導 | Web課金への誘導を削除 |
| プライバシーポリシーが不十分 | 収集データ・用途を明示 |
| テストアカウントがない | Sandbox Testerアカウント作成 |
| クラッシュ | 全画面の動作確認 |
| 機能説明と実際の機能の不一致 | スクリーンショットと実際を一致させる |
| 復元ボタンなし | サブスクリプション購入復元機能を実装 |
| ログイン強制でコンテンツ閲覧不可 | ゲストで基本機能を利用できるように |

### Google Play申請チェックリスト

| 素材/設定 | 仕様 | 状態 |
|---------|------|------|
| アプリアイコン | 512×512 PNG | ❌ 未作成 |
| フィーチャーグラフィック | 1024×500 PNG | ❌ 未作成 |
| スクリーンショット | 最低2枚（最大8枚） | ❌ 未作成 |
| 説明文（短文） | 80文字以内 | ❌ 未作成 |
| 説明文（長文） | 4000文字以内 | ❌ 未作成 |
| カテゴリ | 教育 | 確定 |
| コンテンツレーティング | 全ユーザー対象 | ❌ アンケート回答必要 |
| プライバシーポリシーURL | 同上 | ❌ 未作成 |
| データセーフティフォーム | データ収集内容の開示 | ❌ 未記入 |

---

## ─── PART 8: 実装ロードマップ ───

---

### 優先順位付き実装計画

| 優先度 | Phase | 作業内容 | 目的 | 変更対象 | 実装前に決めること | リスク |
|--------|-------|---------|------|---------|----------------|--------|
| 🔴最高 | 4. Web本番公開 | レート制限追加 | セキュリティ | backend/src/index.ts | 制限値（回/分） | 正常ユーザーへの影響 |
| 🔴最高 | 4. Web本番公開 | 法的ページ作成（プライバシー・利用規約・特商法） | 法令順守 | frontend/src/pages/新規 | 会社名・住所・代表者名 | 弁護士レビュー推奨 |
| 🔴最高 | 4. Web本番公開 | Vercel + Railway 本番デプロイ | リリース | インフラ設定 | ドメイン・環境変数全値 | DBマイグレーション |
| 🔴最高 | 4. Web本番公開 | Stripe本番プロダクト・Price作成 | 課金機能 | Stripeダッシュボード | 本番カード決済テスト | 二重課金リスク |
| 🔴最高 | 4. Web本番公開 | .env.example作成 | 開発者向け | backend/.env.example | - | 誤コミット防止 |
| 🟠高 | 7. 通知機能 | Push通知自動送信スケジューラ | コア機能完成 | backend/src/scrapers/scheduler.ts | 通知タイミング定義 | 大量送信時のwebpushエラー |
| 🟠高 | 4. Web本番公開 | PWA PNGアイコン生成 | iOS PWA対応 | frontend/public/ | デザイン確定 | SVGからの変換品質 |
| 🟠高 | 4. Web本番公開 | エラー監視（Sentry）導入 | 運用品質 | frontend + backend | Sentryプロジェクト作成 | パフォーマンスへの影響 |
| 🟠高 | 5. 機能制御 | admin初期パスワード運用改善 | セキュリティ | backend/src/database/db.ts | 環境変数 ADMIN_INIT_PASSWORD | 既存管理者への影響 |
| 🟡中 | 5. 機能制御 | `require()`をimport()に修正 | 安定性 | backend/src/database/db.ts | - | ESMランタイムエラー防止 |
| 🟡中 | 5. 機能制御 | スコア履歴グラフ実装 | プレミアム価値向上 | frontend/src/pages/HeldPage.tsx | グラフライブラリ選定 | FullCalendar競合注意 |
| 🟡中 | 5. 機能制御 | 404ページ実装 | UX改善 | frontend/src/pages/NotFoundPage.tsx | - | - |
| 🟡中 | 6. 課金機能 | 支払い履歴ページ実装（UI） | 透明性 | frontend/src/pages/新規 | デザイン | - |
| 🔵将来 | 8. スマホアプリ化 | Capacitorセットアップ | スマホ化 | プロジェクト全体 | iOS/Android最低バージョン | Web UIのスマホ最適化 |
| 🔵将来 | 8. スマホアプリ化 | Apple IAP実装 | App Store必須 | backend + frontend | Apple Developer登録 | Apple手数料30% |
| 🔵将来 | 8. スマホアプリ化 | Google Play Billing実装 | Google Play必須 | backend + frontend | Google Developer登録 | Google手数料30% |
| 🔵将来 | 9. ストア申請 | アイコン・スクリーンショット作成 | ストア申請 | デザイン素材 | ブランドガイドライン | デザイナー手配 |
| 🔵将来 | 9. ストア申請 | App Store Connect設定 | iOS申請 | Appleポータル | Apple Developer Account | 審査1〜7日 |
| 🔵将来 | 9. ストア申請 | Google Play Console設定 | Android申請 | Googleポータル | Google Developer Account | 審査数時間〜数日 |

---

### MVPリリース範囲（Web版）

**含む:**
- 現在実装済みの全機能（認証・資格管理・カレンダー・課金・Push通知基盤）
- 法的ページ（プライバシーポリシー・利用規約・特商法）
- レート制限
- 本番デプロイ（Vercel + Railway）
- Stripe本番切り替え
- カスタムドメイン

**MVP後の追加（v1.1）:**
- Push通知自動送信スケジューラ
- スコア履歴グラフ
- 支払い履歴ページ
- エラー監視

**スマホアプリ版（v2.0、目標6ヶ月後）:**
- Capacitorラッピング
- Apple IAP / Google Play Billing
- ストア申請・審査

---

## ─── PART 9: 実装前に必ず決めること ───

---

### 技術面

| # | 決定事項 | 現状 | 推奨 |
|---|---------|------|------|
| 1 | **スマホアプリのアーキテクチャ** | 未決定 | Capacitor（コスト最小） |
| 2 | **カスタムドメイン名** | 未決定 | 早期取得推奨（SEO・ブランド） |
| 3 | **Stripe Price IDの本番値** | テスト環境のみ | 本番プロダクト作成後に.envへ設定 |
| 4 | **VAPID鍵の本番値** | 開発用鍵 | `npx web-push generate-vapid-keys`で生成 |
| 5 | **Push通知の送信タイミング** | 未定義 | 前日・7日前・1ヶ月前 |
| 6 | **APIバージョニング方針** | なし | /api/v1/を採用するか決定 |
| 7 | **グラフライブラリ選定** | 未選定 | Chart.js / Recharts / Victory |
| 8 | **admininitパスワード管理** | ハードコード | 環境変数 ADMIN_INITIAL_EMAIL/PASSWORD |
| 9 | **エラー監視ツール** | なし | Sentry（無料プランあり） |

### 事業面

| # | 決定事項 | 推奨 |
|---|---------|------|
| 10 | **アプリ名（正式）** | 早期商標検索推奨 |
| 11 | **運営者情報**（特商法表示用）| 氏名・住所・電話番号 or メール |
| 12 | **サポート連絡先** | 専用メールアドレス推奨 |
| 13 | **Apple Developer Account** | $99/年・本名での登録必要 |
| 14 | **Google Developer Account** | $25一回・本人確認必要 |
| 15 | **スマホ版の価格設定** | Apple手数料30%を考慮（¥480→実収入¥336） |
| 16 | **ストアリリース優先度** | App Store → Google Play 順推奨 |

---

## ─── PART 10: パフォーマンス評価 ───

---

### 現状のパフォーマンス（推定）

| 指標 | 推定値 | 目標 | 対策 |
|------|--------|------|------|
| 初回表示（LCP） | 2-4秒 | < 2.5秒 | 静的アセットCDN・SW キャッシュ |
| 画面遷移 | 即時（React SPA） | ✅ 良好 | lazy loading済み |
| API レスポンス | 50-300ms | < 200ms | DB インデックス追加 |
| バンドルサイズ | 不明 | < 300KB gzip | bundle-analyzer実行推奨 |
| DBクエリ | 未計測 | - | EXPLAIN ANALYZE適用推奨 |

### 改善点

| 優先度 | 対策 | 期待効果 |
|--------|------|---------|
| 高 | DBインデックス追加（subscription_status・expires_at・stripe_sub_id） | バッチ処理・Webhook高速化 |
| 中 | バンドルアナライザ実行 → 不要パッケージ削除 | 初回読込速度改善 |
| 中 | react-query staleTimeの最適化（資格マスタは長めに） | API通信削減 |
| 低 | gzip圧縮の確認（Railwayデフォルト） | 転送量削減 |
| 低 | FullCalendar遅延読み込みの確認 | 初回バンドル削減 |

---

## 付録: 環境変数一覧

```env
# backend/.env.example（作成が必要）

# === 必須 ===
DATABASE_URL=postgresql://...
DATABASE_SSL=true
JWT_SECRET=（64文字以上のランダム文字列）
NODE_ENV=production

# === CORS ===
CORS_ORIGIN=https://your-frontend.vercel.app

# === Stripe ===
STRIPE_SECRET_KEY=sk_live_...（本番）/ sk_test_...（テスト）
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_QUARTERLY=price_...
STRIPE_PRICE_BIANNUAL=price_...
STRIPE_PRICE_ANNUAL=price_...

# === Push通知 ===
VAPID_PUBLIC_KEY=（npx web-push generate-vapid-keysで生成）
VAPID_PRIVATE_KEY=（同上）
VAPID_SUBJECT=mailto:support@yourdomain.com

# === メール ===
# Resend（推奨）
RESEND_API_KEY=re_...
RESEND_FROM=noreply@yourdomain.com
# または SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=（アプリパスワード）
SMTP_FROM=your@gmail.com

# === アプリ ===
APP_URL=https://your-frontend.vercel.app
PORT=3001

# frontend/.env.example（作成が必要）
VITE_API_URL=https://your-backend.railway.app
```

---

*このドキュメントは設計・計画書です。実装の開始前に必ず上記「実装前に決めること」の全項目を確定してください。*
