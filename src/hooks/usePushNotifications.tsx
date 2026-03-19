import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_SOUND_URL = 'https://actions.google.com/sounds/v1/alerts/notification_simple-01.ogg';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasRequestedRef = useRef(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.6;
    return () => { audioRef.current = null; };
  }, []);

  // Check permission state
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);
  }, []);

  // Register custom SW for push events
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-push.js', { scope: '/' }).catch(() => {});
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as const;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    hasRequestedRef.current = true;
    return result;
  }, []);

  const playSound = useCallback(() => {
    try { audioRef.current?.play().catch(() => {}); } catch {}
  }, []);

  const vibrate = useCallback(() => {
    try { navigator.vibrate?.([200, 100, 200]); } catch {}
  }, []);

  const showNotification = useCallback(async (title: string, body: string, url?: string) => {
    if (permissionState !== 'granted') return;

    // Try service worker notification (works in background)
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const opts: NotificationOptions & Record<string, unknown> = {
          body,
          icon: '/pwa-icon-192.png',
          badge: '/pwa-icon-192.png',
          tag: 'pharmacy-alert',
          vibrate: [200, 100, 200, 100, 200],
          data: { url: url || '/' },
        };
        await registration.showNotification(title, opts);
        return;
      }
    } catch {}

    // Fallback to basic Notification API
    try {
      const n = new Notification(title, { body, icon: '/pwa-icon-192.png', tag: 'pharmacy-alert' });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }, [permissionState]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          const typeLabel = newNotif.type === 'expiring' ? '⚠️ Expiring Medicine' : '📦 Low Stock Alert';
          const message = newNotif.message || 'New pharmacy alert';
          const notifUrl = '/staff/notifications';

          playSound();
          vibrate();
          showNotification(typeLabel, message, notifUrl);

          toast({
            title: typeLabel,
            description: message,
            variant: 'destructive',
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, playSound, vibrate, showNotification, toast]);

  return {
    permissionState,
    requestPermission,
    showPrompt: permissionState === 'default' && !hasRequestedRef.current,
  };
};
