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
    <div className="space-y-8">
      <PageHeader title="Notifications" description="Manage alerts for your pharmacy" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Active Notifications</CardTitle></CardHeader>
        <CardContent>
          {notifications.length === 0 ? <p className="text-center py-8 text-muted-foreground">No notifications</p> : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg ${n.type === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {n.type === 'expiring' ? <AlertTriangle className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div><p className="font-medium">{n.medicines?.name}</p><p className="text-sm text-muted-foreground">{n.message}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.days_remaining != null && <Badge variant={n.days_remaining <= 5 ? 'destructive' : 'secondary'}>{n.days_remaining} days</Badge>}
                    {n.is_confirmed ? <Badge variant="outline" className="text-success"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge> : <Button size="sm" onClick={() => confirmNotification(n.id)}>Confirm</Button>}
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
