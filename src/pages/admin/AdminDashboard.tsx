import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { YearlySalesChart } from '@/components/charts/YearlySalesChart';
import { Building2, Users, Pill, AlertTriangle, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DashboardStats {
  totalPharmacies: number;
  totalStaff: number;
  totalMedicines: number;
  expiringMedicines: number;
  lowStockMedicines: number;
  totalYearlySales: number;
  totalCustomerDebt: number;
  totalAdminDebtUnpaid: number;
}

interface ExpiringMedicine {
  id: string;
  name: string;
  pharmacy_name: string;
  days_until_expiry: number;
}

interface LowStockMedicine {
  id: string;
  name: string;
  pharmacy_name: string;
  stock_quantity: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPharmacies: 0,
    totalStaff: 0,
    totalMedicines: 0,
    expiringMedicines: 0,
    lowStockMedicines: 0,
    totalYearlySales: 0,
    totalCustomerDebt: 0,
    totalAdminDebtUnpaid: 0,
  });
  const [salesData, setSalesData] = useState<{ month: string; total: number }[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expiringMedicines, setExpiringMedicines] = useState<ExpiringMedicine[]>([]);
  const [lowStockMedicines, setLowStockMedicines] = useState<LowStockMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [pharmaciesRes, staffRes, medicinesRes] = await Promise.all([
      supabase.from('pharmacies').select('id', { count: 'exact' }),
      supabase.from('pharmacy_staff').select('id', { count: 'exact' }),
      supabase.from('medicines').select('id', { count: 'exact' }),
    ]);

    const twentyDaysFromNow = new Date();
    twentyDaysFromNow.setDate(twentyDaysFromNow.getDate() + 20);
    
    const { data: expiringData } = await supabase
      .from('medicines')
      .select('id, name, expiry_date, pharmacy_id, pharmacies(name)')
      .lte('expiry_date', twentyDaysFromNow.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0]);

    const { data: lowStockData } = await supabase
      .from('medicines')
      .select('id, name, stock_quantity, low_stock_threshold, pharmacy_id, pharmacies(name)');

    const startOfYear = `${selectedYear}-01-01T00:00:00`;
    const endOfYear = `${selectedYear}-12-31T23:59:59`;
    
    const { data: salesRes } = await supabase
      .from('receipts')
      .select('created_at, total_amount')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear);

    // Fetch debt data
    const [customerDebtRes, adminDebtRes] = await Promise.all([
      supabase.from('receipts').select('total_amount').eq('payment_method', 'debt').is('debt_paid_at', null),
      supabase.from('admin_debts').select('amount').eq('is_paid', false),
    ]);

    const totalCustomerDebt = customerDebtRes.data?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;
    const totalAdminDebtUnpaid = adminDebtRes.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = months.map((month, index) => {
      const monthSales = salesRes?.filter(receipt => {
        const receiptMonth = new Date(receipt.created_at).getMonth();
        return receiptMonth === index;
      }).reduce((sum, receipt) => sum + Number(receipt.total_amount), 0) || 0;
      return { month, total: monthSales };
    });

    const totalYearlySales = monthlySales.reduce((sum, m) => sum + m.total, 0);

    const processedExpiring: ExpiringMedicine[] = (expiringData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      pharmacy_name: m.pharmacies?.name || 'Unknown',
      days_until_expiry: Math.ceil((new Date(m.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const processedLowStock: LowStockMedicine[] = (lowStockData || [])
      .filter((m: any) => m.stock_quantity <= m.low_stock_threshold)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        pharmacy_name: m.pharmacies?.name || 'Unknown',
        stock_quantity: m.stock_quantity,
      }));

    setStats({
      totalPharmacies: pharmaciesRes.count || 0,
      totalStaff: staffRes.count || 0,
      totalMedicines: medicinesRes.count || 0,
      expiringMedicines: processedExpiring.length,
      lowStockMedicines: processedLowStock.length,
      totalYearlySales,
      totalCustomerDebt,
      totalAdminDebtUnpaid,
    });

    setSalesData(monthlySales);
    setExpiringMedicines(processedExpiring.slice(0, 5));
    setLowStockMedicines(processedLowStock.slice(0, 5));
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Overview of all pharmacy operations"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Pharmacies" value={stats.totalPharmacies} icon={Building2} variant="primary" />
        <StatCard title="Total Staff" value={stats.totalStaff} icon={Users} variant="info" />
        <StatCard title="Total Medicines" value={stats.totalMedicines} icon={Pill} variant="success" />
        <StatCard title="Expiring Soon" value={stats.expiringMedicines} icon={AlertTriangle} variant="warning" description="Within 20 days" />
        <StatCard title="Low Stock" value={stats.lowStockMedicines} icon={TrendingDown} variant="destructive" />
        <StatCard title="Yearly Sales" value={formatCurrency(stats.totalYearlySales)} icon={DollarSign} variant="primary" />
        <StatCard title="Customer Debts" value={formatCurrency(stats.totalCustomerDebt)} icon={CreditCard} variant="warning" description="Unpaid" />
        <StatCard title="Admin Debts" value={formatCurrency(stats.totalAdminDebtUnpaid)} icon={CreditCard} variant="destructive" description="Unpaid" />
      </div>

      {/* Sales Chart */}
      <YearlySalesChart
        data={salesData}
        title="Overall Yearly Sales"
        year={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={[2026, 2027, 2028]}
      />

      {/* Alerts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expiring Medicines */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Medicines Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringMedicines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No medicines expiring soon</p>
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="space-y-3 lg:hidden">
                  {expiringMedicines.map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-muted-foreground">{med.pharmacy_name}</p>
                      </div>
                      <Badge variant={med.days_until_expiry <= 5 ? 'destructive' : 'secondary'}>
                        {med.days_until_expiry} days
                      </Badge>
                    </div>
                  ))}
                </div>
                {/* Desktop table layout */}
                <div className="hidden lg:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Pharmacy</TableHead>
                        <TableHead className="text-right">Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringMedicines.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="text-muted-foreground">{med.pharmacy_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={med.days_until_expiry <= 5 ? 'destructive' : 'secondary'}>
                              {med.days_until_expiry} days
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Medicines */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockMedicines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">All medicines are well stocked</p>
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="space-y-3 lg:hidden">
                  {lowStockMedicines.map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-muted-foreground">{med.pharmacy_name}</p>
                      </div>
                      <Badge variant="destructive">{med.stock_quantity} left</Badge>
                    </div>
                  ))}
                </div>
                {/* Desktop table layout */}
                <div className="hidden lg:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Pharmacy</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockMedicines.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="text-muted-foreground">{med.pharmacy_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{med.stock_quantity} left</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
