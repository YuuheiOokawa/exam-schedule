# 資格試験スケジュール管理アプリ

資格試験の日程・申込期間・合格発表日をカレンダーで一元管理できるWebアプリです。

## 対応資格

| 資格名 | カテゴリ |
|--------|----------|
| Oracle Master Bronze DBA 2019 | データベース |
| 基本情報技術者試験 | 国家資格 |
| 応用情報技術者試験 | 国家資格 |
| AWS Certified Cloud Practitioner | クラウド |
| AWS Certified Solutions Architect - Associate | クラウド |
| Java SE 11 Silver | Java |
| Java SE 11 Gold | Java |

## 起動方法

### 前提条件

- Node.js 18以上がインストールされていること
  - 確認: `node -v`
  - インストール: https://nodejs.org/

### 起動（推奨）

`start.bat` をダブルクリックするだけで起動します。

初回起動時は自動的にパッケージをインストールします（数分かかります）。

### 手動起動

```bash
# バックエンド（ターミナル1）
cd backend
npm install
node src/index.js

# フロントエンド（ターミナル2）
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## 画面構成

- **資格一覧** (`/`) — 資格を検索・カテゴリ絞り込みで一覧表示
- **資格詳細** (`/qualification/:id`) — 各資格の詳細情報・最新情報取得ボタン
- **カレンダー** (`/calendar`) — 試験日・申込期間・合格発表日をカレンダー表示
- **管理画面** (`/admin`) — 資格の追加・編集・スケジュール手動登録・ログ確認

## 技術構成

```
exam-schedule-app/
├── backend/               # Node.js + Express + SQLite
│   ├── src/
│   │   ├── database/      # DB初期化・シード
│   │   ├── routes/        # APIエンドポイント
│   │   └── scrapers/      # 公式サイト情報取得
│   └── data/              # SQLiteデータベース（自動作成）
└── frontend/              # React + Vite + FullCalendar
    └── src/
        ├── api/           # APIクライアント
        ├── components/    # 共通コンポーネント
        └── pages/         # 各画面
```

## データベース

| テーブル | 概要 |
|----------|------|
| `qualifications` | 資格マスタ（名前・カテゴリ・公式URL） |
| `qualification_schedules` | 試験スケジュール（試験日・申込期間・受験料等） |
| `fetch_logs` | 情報取得ログ |

データは `backend/data/exam_schedule.db` に保存されます。

## 新しい資格を追加する方法

### 方法1: 管理画面から追加（推奨）

1. アプリを起動して http://localhost:3000/admin を開く
2. 「資格追加」タブで資格名・カテゴリ・公式URLを入力
3. 「スケジュール編集」タブで試験日等を手動入力

### 方法2: スクレイパーを実装して自動取得

1. `backend/src/scrapers/` に新しいスクレイパーファイルを作成

```javascript
// backend/src/scrapers/my-new-exam.js
const { BaseScraper } = require('./base');

class MyNewExamScraper extends BaseScraper {
  async fetch() {
    try {
      const $ = await this.fetchHtml(this.officialUrl);
      const result = this.buildResult();
      
      // ページのHTML構造に合わせてデータを取得
      result.exam_date = $('セレクタ').text().trim();
      result.exam_fee = '受験料テキスト';
      // ...
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message, data: this.buildResult() };
    }
  }
}

module.exports = MyNewExamScraper;
```

2. `backend/src/scrapers/index.js` の `SCRAPER_MAP` に追記

```javascript
const MyNewExamScraper = require('./my-new-exam');

const SCRAPER_MAP = {
  // ... 既存のエントリ
  '新しい資格名': MyNewExamScraper,
};
```

3. 管理画面から資格を追加し、「最新情報を取得」ボタンで動作確認

## API一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/qualifications` | 資格一覧（`?search=`・`?category=`で絞り込み） |
| GET | `/api/qualifications/:id` | 資格詳細 |
| POST | `/api/qualifications/:id/fetch` | 公式サイトから情報取得 |
| GET | `/api/calendar/events` | カレンダー用イベント一覧 |
| POST | `/api/admin/qualifications` | 資格追加 |
| PUT | `/api/admin/qualifications/:id` | 資格編集 |
| DELETE | `/api/admin/qualifications/:id` | 資格削除 |
| PUT | `/api/admin/schedules/:qualificationId` | スケジュール手動登録 |
| GET | `/api/admin/logs` | 取得ログ一覧 |
| POST | `/api/admin/fetch-all` | 全資格一括取得 |

## 注意事項

- 公式サイトへのアクセスは3秒間隔でリクエストしています
- 随時受験可能な資格（AWS・Oracle・Java）はカレンダーに表示されません（特定日がないため）
- カレンダーに表示するには管理画面で `YYYY-MM-DD` 形式の日付を手動登録してください
- IPA試験（基本・応用）は年2回の日程を管理画面から手動登録することを推奨します
