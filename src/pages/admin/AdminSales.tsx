import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { YearlySalesChart } from '@/components/charts/YearlySalesChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SaleRecord {
  id: string;
  pharmacy_name: string;
  medicine_name: string;
  staff_email: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
}

interface Pharmacy {
  id: string;
  name: string;
}

const AdminSales = () => {
  const [salesData, setSalesData] = useState<{ month: string; total: number }[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPharmacies();
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [selectedYear, selectedPharmacy]);

  const fetchPharmacies = async () => {
    const { data } = await supabase.from('pharmacies').select('id, name');
    if (data) {
      setPharmacies(data);
    }
  };

  const fetchSalesData = async () => {
    setLoading(true);

    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    let query = supabase
      .from('sales')
      .select('*')
      .gte('sale_date', startOfYear)
      .lte('sale_date', endOfYear)
      .order('sale_date', { ascending: false });

    if (selectedPharmacy !== 'all') {
      query = query.eq('pharmacy_id', selectedPharmacy);
    }

    const { data: salesRes } = await query;

    // Process sales data by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = months.map((month, index) => {
      const monthSales = salesRes?.filter((sale) => {
        const saleMonth = new Date(sale.sale_date).getMonth();
        return saleMonth === index;
      }).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      return { month, total: monthSales };
    });

    setSalesData(monthlySales);

    // Fetch detailed sales with related data
    const detailedSales: SaleRecord[] = [];
    if (salesRes) {
      for (const sale of salesRes.slice(0, 50)) {
        const [pharmacyRes, medicineRes, profileRes] = await Promise.all([
          supabase.from('pharmacies').select('name').eq('id', sale.pharmacy_id).single(),
          supabase.from('medicines').select('name').eq('id', sale.medicine_id).single(),
          supabase.from('profiles').select('email').eq('id', sale.staff_id).single(),
        ]);

        detailedSales.push({
          id: sale.id,
          pharmacy_name: pharmacyRes.data?.name || 'Unknown',
          medicine_name: medicineRes.data?.name || 'Unknown',
          staff_email: profileRes.data?.email || 'Unknown',
          quantity: sale.quantity,
          unit_price: Number(sale.unit_price),
          total_amount: Number(sale.total_amount),
          sale_date: sale.sale_date,
        });
      }
    }

    setSales(detailedSales);
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Reports"
        description="View and analyze sales data across all pharmacies"
      >
        <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by pharmacy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pharmacies</SelectItem>
            {pharmacies.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Sales Chart */}
      <YearlySalesChart
        data={salesData}
        title={selectedPharmacy === 'all' ? 'Overall Sales' : `Sales - ${pharmacies.find(p => p.id === selectedPharmacy)?.name}`}
        year={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={[2023, 2024, 2025]}
      />

      {/* Sales Table */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBarChart className="w-5 h-5 text-primary" />
            Sales Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sales found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(sale.sale_date)}
                      </TableCell>
                      <TableCell>{sale.pharmacy_name}</TableCell>
                      <TableCell>{sale.medicine_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {sale.staff_email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{sale.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSales;
