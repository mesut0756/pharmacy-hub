import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AlertTriangle, TrendingDown, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

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

  const pending = notifications.filter(n => !n.is_confirmed);
  const confirmed = notifications.filter(n => n.is_confirmed);

  const NotificationItem = ({ n }: { n: any }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
      <div className="flex gap-3 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${n.type === 'expiry' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
          {n.type === 'expiry' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">{n.medicines?.name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{n.message}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {n.days_remaining != null && (
          <Badge variant={n.days_remaining <= 5 ? 'destructive' : 'secondary'} className="text-xs">
            <Clock className="w-3 h-3 mr-1" />{n.days_remaining} days
          </Badge>
        )}
        {n.is_confirmed ? (
          <Badge variant="outline" className="text-success text-xs"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>
        ) : (
          <Button size="sm" className="text-xs" onClick={() => confirmNotification(n.id)}>Confirm</Button>
        )}
      </div>
    </div>
  );

  return (
    <PullToRefreshContainer onRefresh={fetchNotifications} className="space-y-6">
      <PageHeader title="Notifications" description="Manage alerts for your pharmacy" />

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-1 text-xs sm:text-sm">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Confirmed ({confirmed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">Pending Notifications</CardTitle></CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <div className="text-center py-8"><Bell className="w-10 h-10 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground text-sm">No pending notifications</p></div>
              ) : (
                <div className="space-y-3">{pending.map(n => <NotificationItem key={n.id} n={n} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">Confirmed Notifications</CardTitle></CardHeader>
            <CardContent>
              {confirmed.length === 0 ? (
                <div className="text-center py-8"><CheckCircle className="w-10 h-10 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground text-sm">No confirmed notifications</p></div>
              ) : (
                <div className="space-y-3">{confirmed.map(n => <NotificationItem key={n.id} n={n} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PullToRefreshContainer>
  );
};
export default StaffNotifications;
