import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AlertTriangle, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

interface Notification {
  id: string;
  pharmacy_name: string;
  medicine_name: string;
  type: 'expiring' | 'low_stock';
  message: string;
  days_remaining: number | null;
  is_confirmed: boolean;
  created_at: string;
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*, pharmacies(name), medicines(name)').order('created_at', { ascending: false });
    if (data) {
      setNotifications(data.map((n: any) => ({
        id: n.id, pharmacy_name: n.pharmacies?.name || 'Unknown', medicine_name: n.medicines?.name || 'Unknown',
        type: n.type, message: n.message, days_remaining: n.days_remaining, is_confirmed: n.is_confirmed, created_at: n.created_at,
      })));
    }
    setLoading(false);
  };

  const pending = notifications.filter(n => !n.is_confirmed);
  const confirmed = notifications.filter(n => n.is_confirmed);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const NotificationCard = ({ notification: n }: { notification: Notification }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={`p-2 rounded-lg shrink-0 ${n.type === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
        {n.type === 'expiring' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm sm:text-base truncate">{n.medicine_name}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{n.pharmacy_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {n.is_confirmed ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />Confirmed
              </Badge>
            ) : n.days_remaining !== null ? (
              <Badge variant={n.days_remaining <= 5 ? 'destructive' : 'secondary'} className="text-xs">
                <Clock className="w-3 h-3 mr-1" />{n.days_remaining} days
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Pending</Badge>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{n.message}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
      </div>
    </div>
  );

  return (
    <PullToRefreshContainer onRefresh={fetchNotifications} className="space-y-6">
      <PageHeader title="Notifications" description="View all system notifications" />

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
              {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> :
                pending.length === 0 ? (
                  <div className="text-center py-8"><Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground text-sm">No pending notifications</p></div>
                ) : (
                  <div className="space-y-3">{pending.map(n => <NotificationCard key={n.id} notification={n} />)}</div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">Confirmed Notifications</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> :
                confirmed.length === 0 ? (
                  <div className="text-center py-8"><CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground text-sm">No confirmed notifications</p></div>
                ) : (
                  <div className="space-y-3">{confirmed.map(n => <NotificationCard key={n.id} notification={n} />)}</div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PullToRefreshContainer>
  );
};

export default AdminNotifications;
