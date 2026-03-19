import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { BottomNavbar } from './BottomNavbar';
import { Loader2, BellRing, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  requiredRole?: 'admin' | 'staff';
}

const NotificationBanner = () => {
  const { permissionState, requestPermission, showPrompt } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!showPrompt || dismissed || permissionState !== 'default') return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between gap-3 animate-slide-up">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <BellRing className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Enable Notifications</p>
          <p className="text-xs text-muted-foreground">Get instant alerts for expiring medicines & low stock</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" onClick={requestPermission} className="text-xs h-8">
          Enable
        </Button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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
        <NotificationBanner />
        <div className="p-4 lg:p-8 pb-20 lg:pb-8">
          <Outlet />
        </div>
      </main>
      <BottomNavbar />
    </div>
  );
};
