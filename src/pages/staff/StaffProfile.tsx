import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Building2, Download, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

const StaffProfile = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your account information" />
      <div className="space-y-4 max-w-md">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><Mail className="w-5 h-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div></div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><Building2 className="w-5 h-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Role</p><p className="font-medium">Pharmacy Staff</p></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" />Install App</CardTitle></CardHeader>
          <CardContent>
            {isInstalled ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                App is already installed
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Install this app on your device for quick access and offline support.</p>
                <Button onClick={handleInstall} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Open this app in your mobile browser to install it on your home screen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default StaffProfile;
