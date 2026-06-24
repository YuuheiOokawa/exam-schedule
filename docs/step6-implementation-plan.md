# Step 6: 実装方針決定

## 移行方針：フルリライト

現在のコードはJavaScript + インラインスタイルで動作しているが、TypeScript・Tailwind・機能分離への**フルリライト**を行う。

**インクリメンタル移行を選ばない理由：**
- 型不整合・スタイル混在が残り技術的負債を引き継ぐ
- テスト不能な構造のまま
- Tailwind移行中はインラインスタイルとの二重管理が発生する

| 項目 | 現状 | 新設計 |
|------|------|--------|
| 言語 | JavaScript | TypeScript 5 |
| スタイル | インラインスタイル | Tailwind CSS 3 |
| 状態管理 | useEffect + useState | TanStack Query v5 + useContext |
| ディレクトリ | フラット | Feature-Driven |
| 型定義 | なし | 全ファイルに型 |

---

## 状態管理の判断

### TanStack Query（採用）

このアプリの状態の90%は「サーバーから取得するデータ」。
キャッシュ・ローディング・エラー処理が標準装備で、コードが激減する。

```typescript
// Before（旧パターン）
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
useEffect(() => { fetch().then(setData).catch(setError).finally(...) }, []);

// After（TanStack Query）
const { data, isLoading, error } = useQuery({
  queryKey: ['qualifications'],
  queryFn: qualificationService.getAll,
});
```

### Zustand / Redux（不採用）

グローバルなクライアント状態がテーマ・トーストのみ。`useContext`で十分。

### Context（採用 - 最小限）

- `ThemeContext`：ダークモード切替
- `ToastContext`：通知表示

---

## MVP実装フェーズ

各フェーズ完了時に動く状態を維持する。

### Phase 1：基盤構築（バックエンド + 型定義）

```
1. backend TypeScript化・ディレクトリ再構成
2. DB migration（main_category / sub_category 等の追加）
3. 全資格の初期データ（seeds）整備
4. APIレスポンス型定義の共通化
5. エラーハンドリングミドルウェア実装
```

### Phase 2：フロントエンド基盤

```
6. Vite + TypeScript + Tailwind CSS セットアップ
7. ESLint / Prettier 設定
8. デザインシステム構築（Button / Card / Badge / Input）
9. レイアウト（Navbar / PageContainer）
10. ルーティング設定
11. APIクライアント（axios + TanStack Query）
```

### Phase 3：コア機能

```
12. 資格一覧ページ（検索・フィルター）
13. 資格詳細ページ
14. カレンダーページ
```

### Phase 4：管理機能

```
15. 管理画面（資格CRUD）
16. スケジュール手動登録
17. 取得ログ表示
18. 一括スクレイピングボタン
```

### Phase 5：スクレイパー整備

```
19. BaseScraper 抽象クラス
20. IPA（基本情報・応用情報）
21. AWS主要資格
22. その他順次追加
```

---

## ライブラリ選定（確定版）

### フロントエンド

| ライブラリ | バージョン | 用途 | 採用理由 |
|-----------|-----------|------|---------|
| react | 18 | UIフレームワーク | デファクトスタンダード |
| typescript | 5 | 型安全 | 品質要件必須 |
| vite | 5 | ビルドツール | HMRが高速・設定が少ない |
| tailwindcss | 3 | スタイリング | ユーティリティファーストで一貫性を保てる |
| @tanstack/react-query | 5 | サーバー状態管理 | APIデータ管理のデファクトスタンダード |
| react-router-dom | 6 | ルーティング | デファクトスタンダード |
| @fullcalendar/react | 6 | カレンダーUI | 実装コスト削減・日本語対応 |
| axios | 1 | HTTP通信 | インターセプターで一元エラー処理 |
| date-fns | 3 | 日付処理 | 軽量・Tree-shaking対応 |
| lucide-react | latest | アイコン | SVGベース・一貫したデザイン |
| clsx | 2 | 条件付きクラス | 可読性向上 |
| tailwind-merge | 2 | Tailwindクラス合成 | クラス競合を防ぐ |

### バックエンド

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| express | 4 | Webフレームワーク |
| typescript | 5 | 型安全 |
| tsx | latest | TypeScript実行（開発時） |
| better-sqlite3 | 9 | SQLite（同期API） |
| axios | 1 | スクレイピング用HTTPクライアント |
| cheerio | 1 | HTML解析 |
| helmet | 7 | セキュリティヘッダー |
| morgan | 1 | リクエストログ |
| cors | 2 | CORS設定 |

---

## ダークモード実装方針

```css
/* globals.css */
:root {
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
}
.dark {
  --color-bg: #0F172A;
  --color-surface: #1E293B;
}
```

```typescript
// tailwind.config.ts
darkMode: 'class'

// 使用例
className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
```

`localStorage` に保存し、OS設定（`prefers-color-scheme`）も自動検出する。

---

## エラーハンドリング方針

| レイヤー | 方針 |
|---------|------|
| APIエラー | axiosインターセプターで一元処理 |
| Reactエラー | ErrorBoundaryでクラッシュを局所化 |
| フォームバリデーション | 送信前にクライアント検証 |
| スクレイパー失敗 | `{ success: false, error }` を返すだけ。アプリを止めない |
| DB操作失敗 | try-catchで捕捉し構造化エラーレスポンスを返す |

---

## コード品質ルール

```jsonc
// .eslintrc.cjs 主要ルール
"@typescript-eslint/no-explicit-any": "error",
"@typescript-eslint/no-unused-vars": "error",
"no-console": "warn",
"prefer-const": "error"
```

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

---

## 決定事項まとめ

| 項目 | 決定 |
|------|------|
| 移行方針 | フルリライト |
| 状態管理 | TanStack Query + useContext |
| スタイリング | Tailwind CSS（darkMode: class） |
| 型定義共有 | フロント・バックで types/ を同期 |
| 実装順序 | Phase1（基盤）→ Phase2（フロント基盤）→ Phase3（コア）→ Phase4（管理）→ Phase5（スクレイパー） |
| エラー戦略 | スクレイパー失敗はアプリを止めない |
