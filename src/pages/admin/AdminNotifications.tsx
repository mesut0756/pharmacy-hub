import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AlertTriangle, TrendingDown, Clock, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('notifications')
      .select('*, pharmacies(name), medicines(name)')
      .order('created_at', { ascending: false });

    if (data) {
      const processed: Notification[] = data.map((n: any) => ({
        id: n.id,
        pharmacy_name: n.pharmacies?.name || 'Unknown',
        medicine_name: n.medicines?.name || 'Unknown',
        type: n.type as 'expiring' | 'low_stock',
        message: n.message,
        days_remaining: n.days_remaining,
        is_confirmed: n.is_confirmed,
        created_at: n.created_at,
      }));
      setNotifications(processed);
    }

    setLoading(false);
  };

  const pendingNotifications = notifications.filter((n) => !n.is_confirmed);
  const confirmedNotifications = notifications.filter((n) => n.is_confirmed);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={`p-2 rounded-lg ${
        notification.type === 'expiring' 
          ? 'bg-warning/10 text-warning' 
          : 'bg-destructive/10 text-destructive'
      }`}>
        {notification.type === 'expiring' ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <TrendingDown className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{notification.medicine_name}</p>
            <p className="text-sm text-muted-foreground">{notification.pharmacy_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {notification.is_confirmed ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Confirmed
              </Badge>
            ) : notification.days_remaining !== null ? (
              <Badge variant={notification.days_remaining <= 5 ? 'destructive' : 'secondary'}>
                <Clock className="w-3 h-3 mr-1" />
                {notification.days_remaining} days
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-2">{formatDate(notification.created_at)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="View all system notifications across pharmacies"
      />

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Bell className="w-4 h-4" />
            Pending ({pendingNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Confirmed ({confirmedNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : pendingNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirmed Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : confirmedNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No confirmed notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {confirmedNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotifications;
