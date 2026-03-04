import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { type PageKey, canAccess } from '@/lib/permissions';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface ProtectedRouteProps {
  page: PageKey;
  children: React.ReactNode;
}

export function ProtectedRoute({ page, children }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canAccess(userRole, page)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
