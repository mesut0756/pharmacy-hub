import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  requiredRole?: 'admin' | 'staff';
}

export const DashboardLayout = ({ requiredRole }: DashboardLayoutProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    const redirectPath = role === 'admin' ? '/admin' : '/staff';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
