import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, type PageKey } from '@/hooks/usePermissions';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface ProtectedRouteProps {
  page: PageKey;
  children: React.ReactNode;
}

export function ProtectedRoute({ page, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { canView, isLoading } = usePermissions();

  if (loading || isLoading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canView(page)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
