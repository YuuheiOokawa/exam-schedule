import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Trophy, LogIn, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const TABS = [
  { to: ROUTES.HOME,     label: 'ホーム',     icon: Home,     requireAuth: false },
  { to: ROUTES.LIST,     label: '一覧',       icon: BookOpen, requireAuth: false },
  { to: ROUTES.CALENDAR, label: 'カレンダー', icon: Calendar, requireAuth: true  },
  { to: ROUTES.HELD,     label: '保有',       icon: Trophy,   requireAuth: true  },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { count } = useHeldQualifications();

  const isAuthPage = [ROUTES.LOGIN, ROUTES.REGISTER, '/email-sent', '/set-password'].some(
    (p) => pathname.startsWith(p)
  );
  if (isAuthPage) return null;

  return (
    <nav className="bottom-nav lg:hidden">
      <div className="flex w-full h-[64px] px-2">
        {TABS.map(({ to, label, icon: Icon, requireAuth }) => {
          const active = to === ROUTES.HOME
            ? pathname === '/'
            : pathname === to || pathname.startsWith(to + '/');
          const dest   = requireAuth && !user ? ROUTES.LOGIN : to;
          const showBadge = to === ROUTES.HELD && count > 0;

          return (
            <Link
              key={to}
              to={dest}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative',
                'transition-colors duration-200 select-none',
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-3)]'
              )}
            >
              {/* Pill background under icon */}
              <div className={cn(
                'relative flex items-center justify-center w-12 h-7 rounded-full',
                'transition-all duration-200',
                active
                  ? 'bg-indigo-100 dark:bg-indigo-500/20'
                  : 'bg-transparent'
              )}>
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    active ? 'w-5 h-5' : 'w-[21px] h-[21px]'
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {showBadge && (
                  <span className={cn(
                    'absolute -top-1 -right-0.5 min-w-[15px] h-[15px] px-0.5',
                    'flex items-center justify-center',
                    'bg-indigo-600 text-white text-[9px] font-bold rounded-full',
                    'ring-2 ring-[var(--surface)]'
                  )}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              <span className={cn(
                'text-[10px] font-semibold leading-none transition-all duration-200',
                active ? 'opacity-100' : 'opacity-60'
              )}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* Profile / Login tab */}
        {(() => {
          const active = pathname === ROUTES.PROFILE || pathname === ROUTES.LOGIN;
          return (
            <Link
              to={user ? ROUTES.PROFILE : ROUTES.LOGIN}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative',
                'transition-colors duration-200 select-none',
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-3)]'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-12 h-7 rounded-full',
                'transition-all duration-200',
                active
                  ? 'bg-indigo-100 dark:bg-indigo-500/20'
                  : 'bg-transparent'
              )}>
                {user ? (
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    'text-[9px] font-bold text-white',
                    active
                      ? 'bg-indigo-600'
                      : 'bg-gradient-to-br from-indigo-400 to-violet-500'
                  )}>
                    {user.name[0]?.toUpperCase()}
                  </div>
                ) : (
                  <LogIn className="w-[21px] h-[21px]" strokeWidth={1.8} />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold leading-none transition-all duration-200',
                active ? 'opacity-100' : 'opacity-60'
              )}>
                {user ? 'マイページ' : 'ログイン'}
              </span>
            </Link>
          );
        })()}
      </div>
    </nav>
  );
}
