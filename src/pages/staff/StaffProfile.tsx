import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Building2, Download, Check, Smartphone, Share2 } from 'lucide-react';
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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Install this app on your device for quick access and offline support.
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2"><Smartphone className="w-4 h-4" /> iOS (Safari)</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Tap the <span className="inline-flex items-center gap-1 font-medium text-foreground"><Share2 className="w-3.5 h-3.5" /> Share</span> button in Safari</li>
                    <li>Scroll down and tap <span className="font-medium text-foreground">"Add to Home Screen"</span></li>
                    <li>Tap <span className="font-medium text-foreground">"Add"</span> to confirm</li>
                  </ol>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2"><Smartphone className="w-4 h-4" /> Android (Chrome)</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Tap the <span className="font-medium text-foreground">⋮ menu</span> in Chrome</li>
                    <li>Tap <span className="font-medium text-foreground">"Install app"</span> or <span className="font-medium text-foreground">"Add to Home Screen"</span></li>
                    <li>Tap <span className="font-medium text-foreground">"Install"</span> to confirm</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default StaffProfile;
