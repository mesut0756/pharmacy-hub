import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Bell, Settings, Pill, ShoppingCart,
  History, User, LogOut, Menu, Moon, Sun, CreditCard, Notebook, ReceiptIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  isBell?: boolean;
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Pharmacies', url: '/admin/pharmacies', icon: Building2 },
  { title: 'Medicines', url: '/admin/medicines', icon: Pill },
  { title: 'Receipts', url: '/admin/receipts', icon: ShoppingCart },
  { title: 'Debts', url: '/admin/debts', icon: CreditCard },
  { title: 'Customers', url: '/admin/customers', icon: User },
  { title: 'Sales History', url: '/admin/history', icon: History },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell, isBell: true },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const staffNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/staff', icon: LayoutDashboard },
  { title: 'Medicines', url: '/staff/medicines', icon: Pill },
  { title: 'Record Sales', url: '/staff/recordsales', icon: Notebook },
  { title: 'Receipts', url: '/staff/sale', icon: ReceiptIcon },
  { title: 'Customers', url: '/staff/customers', icon: User },
  { title: 'Customer Debts', url: '/staff/debts', icon: CreditCard },
  { title: 'Sales History', url: '/staff/history', icon: History },
  { title: 'Notifications', url: '/staff/notifications', icon: Bell, isBell: true },
  { title: 'Profile', url: '/staff/profile', icon: User },
];

export const AppSidebar = () => {
  const { isAdmin, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = isAdmin ? adminNavItems : staffNavItems;
  const onNotificationsPage = location.pathname.includes('/notifications');

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_confirmed', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user, onNotificationsPage]);

  const hasUnread = unreadCount > 0 && !onNotificationsPage;

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/staff') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const renderIcon = (item: NavItem, active: boolean) => {
    if (item.isBell) {
      return (
        <div className="relative">
          <Bell className={cn("w-5 h-5 flex-shrink-0 transition-colors", hasUnread && !active && "text-yellow-500 dark:text-yellow-400")} />
          {hasUnread && (
            <>
              {!collapsed && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {collapsed && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-sidebar animate-pulse" />
              )}
            </>
          )}
        </div>
      );
    }
    return <item.icon className="w-5 h-5 flex-shrink-0" />;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-6 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
          <Pill className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-lg text-sidebar-foreground">Pharmacy</h1>
            <p className="text-xs text-sidebar-foreground/60">
              {isAdmin ? 'Admin Portal' : 'Staff Portal'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isActive(item.url) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
              collapsed && "justify-center px-2"
            )}
          >
            {renderIcon(item, isActive(item.url))}
            {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center px-2"
          )}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!collapsed && user && (
          <div className="px-3 py-2 animate-fade-in">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200",
            "text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent />
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        <Menu className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
};
