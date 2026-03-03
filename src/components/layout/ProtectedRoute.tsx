import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { type AppRole, type PageKey, canAccess } from '@/lib/permissions';

interface ProtectedRouteProps {
  page: PageKey;
  children: React.ReactNode;
}

export function ProtectedRoute({ page, children }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canAccess(userRole, page)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
