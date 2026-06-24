import { Link, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, Trophy, Calendar, Settings, LogIn, LogOut,
  UserPlus, GraduationCap, Sun, Moon, Star, Map,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { count: heldCount } = useHeldQualifications();
  const { count: wishlistCount } = useWishlist();
  const { pathname } = useLocation();

  const navItems = [
    { to: ROUTES.HOME,     label: 'ダッシュボード', icon: Home,     badge: 0,             requireAuth: false },
    { to: ROUTES.LIST,     label: '資格一覧',       icon: BookOpen, badge: 0,             requireAuth: false },
    { to: ROUTES.ROADMAP,  label: 'ロードマップ',   icon: Map,      badge: 0,             requireAuth: false },
    { to: ROUTES.CALENDAR, label: '試験日程',       icon: Calendar, badge: 0,             requireAuth: true  },
    { to: ROUTES.HELD,     label: '保有資格',       icon: Trophy,   badge: heldCount,     requireAuth: true  },
    { to: ROUTES.WISHLIST, label: '挑戦リスト',     icon: Star,     badge: wishlistCount, requireAuth: true  },
  ];

  return (
    <aside className="sidebar hidden lg:flex">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link to={ROUTES.HOME} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                          flex items-center justify-center shadow-lg shadow-indigo-500/30
                          group-hover:shadow-indigo-500/50 transition-shadow shrink-0">
            <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[13px] tracking-tight leading-tight truncate">
              資格スケジュール
            </p>
            <p className="text-slate-400 text-[10px] leading-tight">Exam Manager</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold text-slate-400/70 uppercase tracking-[0.14em]">
          メニュー
        </p>

        {navItems
          .map(({ to, label, icon: Icon, badge, requireAuth }) => {
            const active = to === ROUTES.HOME
              ? pathname === '/'
              : pathname === to || pathname.startsWith(to + '/');
            const dest = requireAuth && !user ? ROUTES.LOGIN : to;
            return (
              <Link
                key={to}
                to={dest}
                style={active ? {
                  background: 'linear-gradient(135deg, #5c5fe8 0%, #4338ca 100%)',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.14)',
                } : undefined}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span>{label}</span>
                </div>
                {badge > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    active ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}

        {isAdmin && (
          <>
            <div className="my-3 mx-2 h-px bg-white/[0.06]" />
            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400/70 uppercase tracking-[0.14em]">
              管理
            </p>
            <Link
              to={ROUTES.ADMIN}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                pathname.startsWith(ROUTES.ADMIN)
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>管理画面</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                     text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
        </button>

        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]">
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0',
                isAdmin
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                  : 'bg-gradient-to-br from-indigo-500 to-blue-600'
              )}>
                {user.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <p className="text-slate-400 text-[10px] truncate">{user.email}</p>
              </div>
            </div>
            <Link
              to={ROUTES.PROFILE}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                         text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <span className="w-4 h-4 flex items-center justify-center text-xs">👤</span>
              <span>マイページ</span>
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                         text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>ログアウト</span>
            </button>
          </>
        ) : (
          <div className="space-y-1.5">
            <Link
              to={ROUTES.LOGIN}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm
                         font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>ログイン</span>
              </div>
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                         text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>新規登録</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
