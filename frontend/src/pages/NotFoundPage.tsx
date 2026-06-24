import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-6xl font-bold text-[var(--text-3)] mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2">ページが見つかりません</h1>
      <p className="text-sm text-[var(--text-3)] mb-8">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--surface-2)] transition-colors"
        >
          <ArrowLeft size={15} />
          前のページへ
        </button>
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Home size={15} />
          ホームへ
        </Link>
      </div>
    </div>
  );
}
