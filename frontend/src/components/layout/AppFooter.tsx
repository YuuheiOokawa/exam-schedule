import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export function AppFooter() {
  return (
    <footer className="hidden lg:block border-t border-[var(--border)] bg-[var(--bg)] py-4 px-6 text-xs text-[var(--text-3)]">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} 資格スケジュール</span>
        <nav className="flex flex-wrap gap-4">
          <Link to={ROUTES.PRIVACY} className="hover:text-[var(--text-2)] transition-colors">
            プライバシーポリシー
          </Link>
          <Link to={ROUTES.TERMS} className="hover:text-[var(--text-2)] transition-colors">
            利用規約
          </Link>
          <Link to={ROUTES.TOKUSHO} className="hover:text-[var(--text-2)] transition-colors">
            特定商取引法に基づく表記
          </Link>
          <Link to={ROUTES.SUPPORT} className="hover:text-[var(--text-2)] transition-colors">
            サポート
          </Link>
        </nav>
      </div>
    </footer>
  );
}
