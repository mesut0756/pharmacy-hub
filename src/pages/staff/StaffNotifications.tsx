import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const StaffNotifications = () => {
  const { pharmacyId, user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => { if (pharmacyId) fetchNotifications(); }, [pharmacyId]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*, medicines(name)').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false });
    setNotifications(data || []);
  };

  const confirmNotification = async (id: string) => {
    await supabase.from('notifications').update({ is_confirmed: true, confirmed_by: user?.id, confirmed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Notification confirmed' });
    fetchNotifications();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Manage alerts for your pharmacy" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="w-5 h-5" />Active Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? <p className="text-center py-8 text-muted-foreground">No notifications</p> : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                  <div className="flex gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${n.type === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {n.type === 'expiring' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{n.medicines?.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{n.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {n.days_remaining != null && <Badge variant={n.days_remaining <= 5 ? 'destructive' : 'secondary'} className="text-xs">{n.days_remaining} days</Badge>}
                    {n.is_confirmed ? (
                      <Badge variant="outline" className="text-success text-xs"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>
                    ) : (
                      <Button size="sm" className="text-xs" onClick={() => confirmNotification(n.id)}>Confirm</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default StaffNotifications;
