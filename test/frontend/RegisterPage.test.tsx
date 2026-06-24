// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ─── モック定義 ─────────────────────────────────────────────────────────────
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で変数を事前に作成する
const { mockLoginWithToken, mockApiPost, mockNavigate } = vi.hoisted(() => ({
  mockLoginWithToken: vi.fn(),
  mockApiPost:        vi.fn(),
  mockNavigate:       vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  apiClient: { post: mockApiPost },
}));

// useNavigate をモック（レンダー中の navigate() 呼び出しが MemoryRouter に伝播しない問題を回避）
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── モック後にコンポーネントをインポート ───────────────────────────────────
import RegisterPage from '@/pages/RegisterPage';
import { useAuth } from '@/contexts/AuthContext';

// ─── テストヘルパー ─────────────────────────────────────────────────────────

/** 未ログイン状態でコンポーネントをレンダリング */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/"         element={<div data-testid="home-page">ホームページ</div>} />
      </Routes>
    </MemoryRouter>
  );
}

/** フォームの各フィールドを入力する */
async function fillForm(opts: {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}) {
  const user = userEvent.setup();
  if (opts.name    != null) await user.type(screen.getByPlaceholderText('山田 太郎'),   opts.name);
  if (opts.email   != null) await user.type(screen.getByPlaceholderText('your@email.com'), opts.email);

  const pwInputs = screen.getAllByPlaceholderText('••••••••');
  if (opts.password != null) await user.type(pwInputs[0], opts.password);
  if (opts.confirm  != null) await user.type(pwInputs[1], opts.confirm);
}

// ─── テストスイート ──────────────────────────────────────────────────────────
describe('RegisterPage — フロントエンドコンポーネントテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 未ログイン
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isAdmin: false,
      loginWithToken: mockLoginWithToken,
      login:       vi.fn(),
      updateUser:  vi.fn(),
      logout:      vi.fn(),
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 初期レンダリング
  // ══════════════════════════════════════════════════════════════════
  describe('初期レンダリング', () => {
    it('タイトル「アカウント登録」が表示される', () => {
      renderPage();
      expect(screen.getByText('アカウント登録')).toBeInTheDocument();
    });

    it('お名前・メールアドレス・パスワード・確認パスワードの入力欄がある', () => {
      renderPage();
      expect(screen.getByPlaceholderText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      expect(pwInputs).toHaveLength(2);
    });

    it('「アカウントを作成」ボタンがある', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /アカウントを作成/ })).toBeInTheDocument();
    });

    it('「ログインに戻る」リンクがある', () => {
      renderPage();
      expect(screen.getByRole('link', { name: /ログインに戻る/ })).toBeInTheDocument();
    });

    it('「7日間トライアル」の説明文が表示される', () => {
      renderPage();
      expect(screen.getByText(/7日間トライアル/)).toBeInTheDocument();
    });

    it('初期状態でエラーメッセージは表示されない', () => {
      renderPage();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // ログイン済みリダイレクト
  // ══════════════════════════════════════════════════════════════════
  describe('ログイン済みリダイレクト', () => {
    it('user が存在する場合はホームへリダイレクトされる', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, email: 'already@example.com', name: 'ログイン済み', role: 'viewer' },
        isLoading: false,
        isAdmin: false,
        loginWithToken: mockLoginWithToken,
        login: vi.fn(), updateUser: vi.fn(), logout: vi.fn(),
      });

      renderPage();
      // useNavigate をモックしているため navigate() の呼び出しを直接検証する
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('user が null の場合は登録フォームを表示する', () => {
      renderPage();
      expect(screen.getByText('アカウント登録')).toBeInTheDocument();
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // クライアントサイドバリデーション
  // ══════════════════════════════════════════════════════════════════
  describe('クライアントサイドバリデーション', () => {
    it('名前が空の場合はエラーを表示する', async () => {
      renderPage();
      await fillForm({ email: 'test@example.com', password: 'password123', confirm: 'password123' });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(await screen.findByText(/お名前を入力してください/)).toBeInTheDocument();
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('メールアドレスが空の場合はエラーを表示する', async () => {
      renderPage();
      await fillForm({ name: '山田 太郎', password: 'password123', confirm: 'password123' });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(await screen.findByText(/メールアドレスを入力してください/)).toBeInTheDocument();
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('パスワードが 8 文字未満の場合はエラーを表示する', async () => {
      renderPage();
      await fillForm({ name: '山田 太郎', email: 'test@example.com', password: '1234567', confirm: '1234567' });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      // ラベル「パスワード（8文字以上）」と区別するため "は" を含む文字列で検索
      expect(await screen.findByText(/パスワードは8文字以上/)).toBeInTheDocument();
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('パスワードと確認パスワードが一致しない場合はエラーを表示する', async () => {
      renderPage();
      await fillForm({
        name: '山田 太郎',
        email: 'test@example.com',
        password: 'password123',
        confirm:  'different456',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      // インラインインジケーターとエラーバナーの両方が「パスワードが一致しません」を表示するため
      // findAllByText で 1 件以上存在することを検証する
      const matches = await screen.findAllByText(/パスワードが一致しません/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('バリデーションエラー時は API を呼ばない', async () => {
      renderPage();
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 正常系: 登録成功
  // ══════════════════════════════════════════════════════════════════
  describe('正常系: 登録成功', () => {
    const successResponse = {
      data: {
        success: true,
        data: {
          token: 'test-jwt-token-xyz',
          user: { id: 1, email: 'new@example.com', name: '新規ユーザー', role: 'viewer' as const },
        },
      },
    };

    it('API を正しいペイロードで呼ぶ', async () => {
      mockApiPost.mockResolvedValue(successResponse);
      renderPage();

      await fillForm({
        name:     '新規ユーザー',
        email:    'new@example.com',
        password: 'password123',
        confirm:  'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/auth/signup-direct',
          { email: 'new@example.com', name: '新規ユーザー', password: 'password123' }
        );
      });
    });

    it('loginWithToken を正しい引数で呼ぶ', async () => {
      mockApiPost.mockResolvedValue(successResponse);
      renderPage();

      await fillForm({
        name: '新規ユーザー', email: 'new@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      await waitFor(() => {
        expect(mockLoginWithToken).toHaveBeenCalledWith(
          'test-jwt-token-xyz',
          expect.objectContaining({ email: 'new@example.com', name: '新規ユーザー', role: 'viewer' })
        );
      });
    });

    it('登録成功後にホームへ遷移する', async () => {
      mockApiPost.mockResolvedValue(successResponse);
      renderPage();

      await fillForm({
        name: '新規ユーザー', email: 'new@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      // useNavigate をモックしているため navigate() の呼び出しを直接検証する
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 異常系: API エラー
  // ══════════════════════════════════════════════════════════════════
  describe('異常系: API エラー', () => {
    it('メール重複エラーを表示する', async () => {
      mockApiPost.mockRejectedValue({
        response: {
          data: {
            error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に登録されています' },
          },
        },
      });

      renderPage();
      await fillForm({
        name: '山田 太郎', email: 'dup@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(await screen.findByText(/既に登録されています/)).toBeInTheDocument();
    });

    it('ネットワークエラー時にフォールバックメッセージを表示する', async () => {
      mockApiPost.mockRejectedValue(new Error('Network Error'));

      renderPage();
      await fillForm({
        name: '山田 太郎', email: 'test@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(await screen.findByText(/登録に失敗しました/)).toBeInTheDocument();
    });

    it('エラー時は loginWithToken を呼ばない', async () => {
      mockApiPost.mockRejectedValue(new Error('error'));

      renderPage();
      await fillForm({
        name: '山田 太郎', email: 'test@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      await waitFor(() => {
        expect(mockLoginWithToken).not.toHaveBeenCalled();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // パスワード強度インジケーター
  // ══════════════════════════════════════════════════════════════════
  describe('パスワード強度インジケーター', () => {
    it('パスワードが空の場合はインジケーターが非表示', () => {
      renderPage();
      expect(screen.queryByText('弱い')).not.toBeInTheDocument();
      expect(screen.queryByText('ふつう')).not.toBeInTheDocument();
      expect(screen.queryByText('強い')).not.toBeInTheDocument();
    });

    it('7 文字以下 → 「弱い」を表示する', async () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      await userEvent.setup().type(pwInputs[0], '1234567');

      expect(screen.getByText('弱い')).toBeInTheDocument();
    });

    it('8〜11 文字 → 「ふつう」を表示する', async () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      await userEvent.setup().type(pwInputs[0], 'password1');

      expect(screen.getByText('ふつう')).toBeInTheDocument();
    });

    it('12 文字以上 → 「強い」を表示する', async () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      await userEvent.setup().type(pwInputs[0], 'strongpassword');

      expect(screen.getByText('強い')).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // パスワード表示/非表示トグル
  // ══════════════════════════════════════════════════════════════════
  describe('パスワード表示/非表示トグル', () => {
    it('初期状態はパスワードが非表示（type="password"）', () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      expect(pwInputs[0]).toHaveAttribute('type', 'password');
    });

    it('目アイコンをクリックするとパスワードが表示される（type="text"）', async () => {
      renderPage();
      const toggleBtn = screen.getByRole('button', { name: '' });
      await userEvent.setup().click(toggleBtn);

      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      expect(pwInputs[0]).toHaveAttribute('type', 'text');
    });

    it('もう一度クリックすると非表示に戻る', async () => {
      renderPage();
      const toggleBtn = screen.getByRole('button', { name: '' });
      const user = userEvent.setup();
      await user.click(toggleBtn);
      await user.click(toggleBtn);

      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      expect(pwInputs[0]).toHaveAttribute('type', 'password');
    });

    it('トグル後は確認パスワードも同じ type になる', async () => {
      renderPage();
      const toggleBtn = screen.getByRole('button', { name: '' });
      await userEvent.setup().click(toggleBtn);

      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      expect(pwInputs[1]).toHaveAttribute('type', 'text');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 確認パスワード: 一致インジケーター
  // ══════════════════════════════════════════════════════════════════
  describe('確認パスワードの一致チェック', () => {
    it('パスワードと確認が一致しない場合はインラインエラーを表示する', async () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      const user = userEvent.setup();
      await user.type(pwInputs[0], 'password123');
      await user.type(pwInputs[1], 'differentxyz');

      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });

    it('パスワードと確認が一致する場合はインラインエラーを表示しない', async () => {
      renderPage();
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      const user = userEvent.setup();
      await user.type(pwInputs[0], 'password123');
      await user.type(pwInputs[1], 'password123');

      expect(screen.queryByText('パスワードが一致しません')).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 送信中の状態
  // ══════════════════════════════════════════════════════════════════
  describe('送信中の状態', () => {
    it('送信中はボタンテキストが「登録中...」に変わる', async () => {
      // API を意図的に遅延させる
      mockApiPost.mockReturnValue(new Promise(() => {}));

      renderPage();
      await fillForm({
        name: '山田 太郎', email: 'test@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      expect(await screen.findByText('登録中...')).toBeInTheDocument();
    });

    it('送信中はボタンが disabled になる', async () => {
      mockApiPost.mockReturnValue(new Promise(() => {}));

      renderPage();
      await fillForm({
        name: '山田 太郎', email: 'test@example.com',
        password: 'password123', confirm: 'password123',
      });
      await userEvent.setup().click(screen.getByRole('button', { name: /アカウントを作成/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /登録中/ })).toBeDisabled();
      });
    });
  });
});
