import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Notebook,
  ReceiptIcon,
  CreditCard,
  History,
  Bell,
  User,
  Building2,
  ShoppingCart,
  Settings,
  MoreHorizontal,
  X,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Pharmacies', url: '/admin/pharmacies', icon: Building2 },
  { title: 'Medicines', url: '/admin/medicines', icon: Pill },
  { title: 'Receipts', url: '/admin/receipts', icon: ShoppingCart },
  { title: 'Debts', url: '/admin/debts', icon: CreditCard },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const staffNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/staff', icon: LayoutDashboard },
  { title: 'Medicines', url: '/staff/medicines', icon: Pill },
  { title: 'Record Sales', url: '/staff/recordsales', icon: Notebook },
  { title: 'Receipts', url: '/staff/sale', icon: ReceiptIcon },
  { title: 'Debts', url: '/staff/debts', icon: CreditCard },
  { title: 'History', url: '/staff/history', icon: History },
  { title: 'Notifications', url: '/staff/notifications', icon: Bell },
  { title: 'Profile', url: '/staff/profile', icon: User },
];

export const BottomNavbar = () => {
  const { isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = isAdmin ? adminNavItems : staffNavItems;
  const visibleItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/staff') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreItems.some((item) => isActive(item.url));

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden animate-slide-up">
          <div className="mx-3 mb-2 rounded-xl border border-border bg-card shadow-lg p-2 space-y-1">
            {moreItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isActive(item.url) && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.title}</span>
              </NavLink>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="font-medium text-sm">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            {/* Logout */}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card">
        <div className="flex items-center justify-around h-16 px-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                "text-muted-foreground",
                isActive(item.url) && "text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              "text-muted-foreground",
              (moreOpen || isMoreActive) && "text-primary"
            )}
          >
            {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
