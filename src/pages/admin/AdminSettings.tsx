import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun, Bell, Shield } from 'lucide-react';

const AdminSettings = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your admin preferences"
      />

      <div className="grid gap-6 max-w-2xl">
        {/* Appearance */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how the dashboard looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for critical events
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when medicines are running low
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Expiry Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about expiring medicines
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Account security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                As an admin, you have read-only access to all pharmacy data. 
                Contact the system administrator to modify security settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
