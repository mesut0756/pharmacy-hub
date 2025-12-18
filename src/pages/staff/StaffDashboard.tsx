import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, AlertTriangle, TrendingDown, DollarSign, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const StaffDashboard = () => {
  const { pharmacyId } = useAuth();
  const [stats, setStats] = useState({ totalMedicines: 0, lowStock: 0, expiringSoon: 0, todaySales: 0, monthlySales: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    if (pharmacyId) fetchData();
  }, [pharmacyId]);

  const fetchData = async () => {
    const { data: medicines } = await supabase.from('medicines').select('*').eq('pharmacy_id', pharmacyId);
    const twentyDays = new Date(); twentyDays.setDate(twentyDays.getDate() + 20);
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    const { data: todaySalesData } = await supabase.from('sales').select('total_amount').eq('pharmacy_id', pharmacyId).gte('sale_date', today);
    const { data: monthlySalesData } = await supabase.from('sales').select('total_amount').eq('pharmacy_id', pharmacyId).gte('sale_date', startOfMonth);
    const { data: recent } = await supabase.from('sales').select('*, medicines(name)').eq('pharmacy_id', pharmacyId).order('sale_date', { ascending: false }).limit(5);

    setStats({
      totalMedicines: medicines?.length || 0,
      lowStock: medicines?.filter(m => m.stock_quantity <= m.low_stock_threshold).length || 0,
      expiringSoon: medicines?.filter(m => m.expiry_date && new Date(m.expiry_date) <= twentyDays && new Date(m.expiry_date) >= new Date()).length || 0,
      todaySales: todaySalesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
      monthlySales: monthlySalesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    });
    setRecentSales(recent || []);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div className="space-y-8">
      <PageHeader title="Staff Dashboard" description="Your pharmacy overview" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Medicines" value={stats.totalMedicines} icon={Pill} variant="primary" />
        <StatCard title="Low Stock" value={stats.lowStock} icon={TrendingDown} variant="destructive" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={AlertTriangle} variant="warning" />
        <StatCard title="Today's Sales" value={formatCurrency(stats.todaySales)} icon={ShoppingCart} variant="success" />
        <StatCard title="Monthly Sales" value={formatCurrency(stats.monthlySales)} icon={DollarSign} variant="info" />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
        <CardContent>
          {recentSales.length === 0 ? <p className="text-muted-foreground text-center py-4">No sales yet</p> : (
            <div className="space-y-2">
              {recentSales.map((s: any) => (
                <div key={s.id} className="flex justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="font-medium">{s.medicines?.name}</p><p className="text-sm text-muted-foreground">{new Date(s.sale_date).toLocaleString()}</p></div>
                  <div className="text-right"><Badge>×{s.quantity}</Badge><p className="font-semibold">{formatCurrency(s.total_amount)}</p></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default StaffDashboard;
