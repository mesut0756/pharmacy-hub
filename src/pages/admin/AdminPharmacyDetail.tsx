import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { YearlySalesChart } from '@/components/charts/YearlySalesChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Pill, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign,
  Package,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PharmacyDetail {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface RecentReceipt {
  id: string;
  customer_name: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
  profit: number;
}

const AdminPharmacyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState<PharmacyDetail | null>(null);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStockCount: 0,
    expiringCount: 0,
    totalYearlySales: 0,
  });
  const [salesData, setSalesData] = useState<{ month: string; total: number }[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPharmacyData();
    }
  }, [id, selectedYear]);

  const fetchPharmacyData = async () => {
    setLoading(true);

    // Fetch pharmacy details
    const { data: pharmacyData } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('id', id)
      .single();

    if (pharmacyData) {
      setPharmacy(pharmacyData);
    }

    // Fetch medicine stats
    const { data: medicines } = await supabase
      .from('medicines')
      .select('*')
      .eq('pharmacy_id', id);

    const twentyDaysFromNow = new Date();
    twentyDaysFromNow.setDate(twentyDaysFromNow.getDate() + 20);

    const expiringCount = medicines?.filter((m) => {
      if (!m.expiry_date) return false;
      const expiry = new Date(m.expiry_date);
      return expiry >= new Date() && expiry <= twentyDaysFromNow;
    }).length || 0;

    const lowStockCount = medicines?.filter((m) => 
      m.stock_quantity <= m.low_stock_threshold
    ).length || 0;

    // Fetch yearly receipts
    const startOfYear = `${selectedYear}-01-01T00:00:00`;
    const endOfYear = `${selectedYear}-12-31T23:59:59`;

    const { data: receiptsRes } = await supabase
      .from('receipts')
      .select('id, created_at, total_amount, customer_name, payment_method')
      .eq('pharmacy_id', id)
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)
      .order('created_at', { ascending: false });

    // Get receipt items for profit calculation
    const receiptIds = receiptsRes?.map(r => r.id) || [];
    let totalProfit = 0;
    
    if (receiptIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('receipt_items')
        .select('receipt_id, profit')
        .in('receipt_id', receiptIds);
      
      totalProfit = itemsData?.reduce((sum, item) => sum + Number(item.profit || 0), 0) || 0;
    }

    // Process sales data by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = months.map((month, index) => {
      const monthSales = receiptsRes?.filter((receipt) => {
        const receiptMonth = new Date(receipt.created_at).getMonth();
        return receiptMonth === index;
      }).reduce((sum, receipt) => sum + Number(receipt.total_amount), 0) || 0;

      return { month, total: monthSales };
    });

    const totalYearlySales = monthlySales.reduce((sum, m) => sum + m.total, 0);

    // Process recent receipts with profit
    const recentReceiptsData: RecentReceipt[] = (receiptsRes || []).slice(0, 10).map(receipt => {
      const receiptProfit = receiptIds.length > 0 ? 0 : 0; // Will be calculated below
      return {
        id: receipt.id,
        customer_name: receipt.customer_name,
        payment_method: receipt.payment_method,
        total_amount: Number(receipt.total_amount),
        created_at: receipt.created_at,
        profit: 0,
      };
    });

    // Calculate profit for each recent receipt
    if (recentReceiptsData.length > 0) {
      const recentIds = recentReceiptsData.map(r => r.id);
      const { data: recentItems } = await supabase
        .from('receipt_items')
        .select('receipt_id, profit')
        .in('receipt_id', recentIds);
      
      recentReceiptsData.forEach(receipt => {
        receipt.profit = recentItems?.filter(i => i.receipt_id === receipt.id)
          .reduce((sum, i) => sum + Number(i.profit || 0), 0) || 0;
      });
    }

    setStats({
      totalMedicines: medicines?.length || 0,
      lowStockCount,
      expiringCount,
      totalYearlySales,
    });
    setSalesData(monthlySales);
    setRecentReceipts(recentReceiptsData);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Pharmacy not found</h2>
        <Button variant="link" onClick={() => navigate('/admin/pharmacies')}>
          Go back to pharmacies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/pharmacies')}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <PageHeader
          title={pharmacy.name}
          description={pharmacy.address || 'No address provided'}
          className="mb-0"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Medicines"
          value={stats.totalMedicines}
          icon={Pill}
          variant="primary"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockCount}
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringCount}
          icon={AlertTriangle}
          variant="warning"
          description="Within 20 days"
        />
        <StatCard
          title="Yearly Sales"
          value={formatCurrency(stats.totalYearlySales)}
          icon={DollarSign}
          variant="success"
        />
      </div>

      {/* Sales Chart */}
      <YearlySalesChart
        data={salesData}
        title={`${pharmacy.name} - Yearly Sales`}
        year={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={[2023, 2024, 2025]}
      />

      {/* Recent Receipts */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Recent Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No receipts recorded yet</p>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{receipt.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(receipt.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{receipt.payment_method.replace('_', ' ')}</Badge>
                    <p className="font-semibold mt-1">{formatCurrency(receipt.total_amount)}</p>
                    <p className="text-xs text-green-600">Profit: {formatCurrency(receipt.profit)}</p>
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

export default AdminPharmacyDetail;
