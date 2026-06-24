import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ROUTES } from '@/constants/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState message="認証確認中..." />;
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (requireAdmin && !isAdmin) return <Navigate to={ROUTES.HOME} replace />;

  return <>{children}</>;
}
