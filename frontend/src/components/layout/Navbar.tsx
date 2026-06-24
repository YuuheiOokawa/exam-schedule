import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, BookOpen, Calendar, Settings, Trophy, LogIn, LogOut, GraduationCap } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: ROUTES.HOME, label: '資格一覧', icon: BookOpen },
  { to: ROUTES.HELD, label: '保持資格', icon: Trophy },
  { to: ROUTES.CALENDAR, label: 'カレンダー', icon: Calendar },
  { to: ROUTES.ADMIN, label: '管理', icon: Settings, adminOnly: true },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const { count: heldCount } = useHeldQualifications();
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 glass border-b border-slate-200/60 dark:border-slate-700/30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* ロゴ */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                          flex items-center justify-center shadow-sm shadow-brand-500/30
                          group-hover:shadow-md group-hover:shadow-brand-500/40
                          group-hover:scale-105 transition-all duration-150">
            <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 hidden sm:block tracking-tight">
            資格スケジュール
          </span>
        </Link>

        {/* ナビ */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.filter(({ adminOnly }) => !adminOnly || isAdmin).map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            const isHeldNav = to === ROUTES.HELD;
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:block">{label}</span>
                {isHeldNav && heldCount > 0 && (
                  <span className={cn(
                    'min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                    active ? 'bg-brand-600 text-white' : 'bg-emerald-500 text-white'
                  )}>
                    {heldCount > 99 ? '99+' : heldCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* セパレーター */}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5" />

          {/* ダークモード */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500
                       hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100
                       hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 認証 */}
          {user ? (
            <div className="flex items-center gap-1.5 ml-0.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                              bg-slate-100 dark:bg-slate-800/60">
                <div className={cn(
                  'w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white',
                  isAdmin ? 'bg-brand-600' : 'bg-slate-400 dark:bg-slate-500'
                )}>
                  {user.name[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
                  {user.name}
                </span>
                {isAdmin && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40
                                   text-brand-700 dark:text-brand-300 font-bold tracking-wide">
                    ADMIN
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                aria-label="ログアウト"
                title="ログアウト"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500
                           hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl ml-1
                         bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold
                         shadow-sm shadow-brand-600/20 hover:shadow-md hover:shadow-brand-600/30
                         transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:block">ログイン</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
