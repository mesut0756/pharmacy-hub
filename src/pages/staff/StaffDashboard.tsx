import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, AlertTriangle, TrendingDown, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const StaffDashboard = () => {
  const { pharmacyId } = useAuth();
  const [stats, setStats] = useState({ 
    totalMedicines: 0, 
    lowStock: 0, 
    expiringSoon: 0, 
    todaySales: 0, 
    monthlySales: 0,
    todayProfit: 0,
    monthlyProfit: 0
  });
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (pharmacyId) fetchData();
  }, [pharmacyId]);

  const fetchData = async () => {
    const { data: medicines } = await supabase.from('medicines').select('*').eq('pharmacy_id', pharmacyId);
    const twentyDays = new Date(); twentyDays.setDate(twentyDays.getDate() + 20);
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch receipts for today
    const { data: todayReceipts } = await supabase
      .from('receipts')
      .select('total_amount, receipt_items(quantity, profit)')
      .eq('pharmacy_id', pharmacyId)
      .gte('created_at', today);

    // Fetch receipts for this month
    const { data: monthlyReceipts } = await supabase
      .from('receipts')
      .select('total_amount, receipt_items(quantity, profit)')
      .eq('pharmacy_id', pharmacyId)
      .gte('created_at', startOfMonth);

    // Fetch recent receipts
    const { data: recent } = await supabase
      .from('receipts')
      .select('*, receipt_items(quantity, selling_price, profit, medicines(name))')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate totals
    const todaySales = todayReceipts?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;
    const todayProfit = todayReceipts?.reduce((sum, r) => 
      sum + (r.receipt_items?.reduce((p: number, item: any) => p + (Number(item.profit || 0) * item.quantity), 0) || 0), 0) || 0;

    const monthlySales = monthlyReceipts?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;
    const monthlyProfit = monthlyReceipts?.reduce((sum, r) => 
      sum + (r.receipt_items?.reduce((p: number, item: any) => p + (Number(item.profit || 0) * item.quantity), 0) || 0), 0) || 0;

    setStats({
      totalMedicines: medicines?.length || 0,
      lowStock: medicines?.filter(m => m.stock_quantity <= m.low_stock_threshold).length || 0,
      expiringSoon: medicines?.filter(m => m.expiry_date && new Date(m.expiry_date) <= twentyDays && new Date(m.expiry_date) >= new Date()).length || 0,
      todaySales,
      monthlySales,
      todayProfit,
      monthlyProfit
    });
    setRecentReceipts(recent || []);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div className="space-y-8">
      <PageHeader title="Staff Dashboard" description="Your pharmacy overview" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Medicines" value={stats.totalMedicines} icon={Pill} variant="primary" />
        <StatCard title="Low Stock" value={stats.lowStock} icon={TrendingDown} variant="destructive" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={AlertTriangle} variant="warning" />
        <StatCard title="Today's Sales" value={formatCurrency(stats.todaySales)} icon={ShoppingCart} variant="success" />
        <StatCard title="Today's Profit" value={formatCurrency(stats.todayProfit)} icon={TrendingUp} variant="info" />
        <StatCard title="Monthly Sales" value={formatCurrency(stats.monthlySales)} icon={DollarSign} variant="success" />
        <StatCard title="Monthly Profit" value={formatCurrency(stats.monthlyProfit)} icon={TrendingUp} variant="info" />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Receipts</CardTitle></CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? <p className="text-muted-foreground text-center py-4">No receipts yet</p> : (
            <div className="space-y-2">
              {recentReceipts.map((r: any) => {
                const totalProfit = r.receipt_items?.reduce((sum: number, item: any) => sum + (Number(item.profit || 0) * item.quantity), 0) || 0;
                const itemCount = r.receipt_items?.length || 0;
                return (
                  <div key={r.id} className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{r.customer_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="secondary">{itemCount} items</Badge>
                        <span className="text-green-600 dark:text-green-400 text-sm">+{formatCurrency(totalProfit)}</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(r.total_amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default StaffDashboard;
