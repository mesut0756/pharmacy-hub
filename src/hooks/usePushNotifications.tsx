import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_SOUND_URL = 'https://actions.google.com/sounds/v1/alerts/notification_simple-01.ogg';

export const usePushNotifications = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasRequestedRef = useRef(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.6;
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Check permission state
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as const;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    return result;
  }, []);

  const playSound = useCallback(() => {
    try {
      audioRef.current?.play().catch(() => {});
    } catch {}
  }, []);

  const vibrate = useCallback(() => {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {}
  }, []);

  const showNativeNotification = useCallback((title: string, body: string) => {
    if (permissionState !== 'granted') return;
    try {
      const options: NotificationOptions & Record<string, unknown> = {
        body,
        icon: '/placeholder.svg',
        tag: 'pharmacy-alert',
      };
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {}
  }, [permissionState]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as any;
          const typeLabel = newNotif.type === 'expiring' ? '⚠️ Expiring Medicine' : '📦 Low Stock Alert';
          const message = newNotif.message || 'New pharmacy alert';

          // Play sound & vibrate
          playSound();
          vibrate();

          // Show native notification
          showNativeNotification(typeLabel, message);

          // Also show in-app toast
          toast({
            title: typeLabel,
            description: message,
            variant: 'destructive',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, playSound, vibrate, showNativeNotification, toast]);

  return {
    permissionState,
    requestPermission,
    showPrompt: permissionState === 'default' && !hasRequestedRef.current,
  };
};
