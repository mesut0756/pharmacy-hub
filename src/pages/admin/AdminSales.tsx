import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { YearlySalesChart } from '@/components/charts/YearlySalesChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileBarChart, Receipt, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatCurrency, formatDateTime } from '@/lib/exportUtils';

interface ReceiptRecord {
  id: string;
  pharmacy_name: string;
  customer_name: string;
  staff_name: string;
  payment_method: string;
  total_amount: number;
  profit: number;
  created_at: string;
}

interface Pharmacy {
  id: string;
  name: string;
}

const AdminSales = () => {
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<{ month: string; total: number }[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [receiptItems, setReceiptItems] = useState<Record<string, any[]>>({});
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
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

    const startOfYear = `${selectedYear}-01-01T00:00:00`;
    const endOfYear = `${selectedYear}-12-31T23:59:59`;

    let query = supabase
      .from('receipts')
      .select(`
        id, created_at, total_amount, customer_name, payment_method, pharmacy_id,
        pharmacies:pharmacy_id(name),
        profiles:staff_id(full_name, email)
      `)
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)
      .order('created_at', { ascending: false });

    if (selectedPharmacy !== 'all') {
      query = query.eq('pharmacy_id', selectedPharmacy);
    }

    const { data: receiptsRes } = await query;

    // Get all receipt IDs to fetch profits
    const receiptIds = receiptsRes?.map(r => r.id) || [];
    let profitsByReceipt: Record<string, number> = {};

    if (receiptIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('receipt_items')
        .select('receipt_id, profit')
        .in('receipt_id', receiptIds);
      
      itemsData?.forEach(item => {
        profitsByReceipt[item.receipt_id] = (profitsByReceipt[item.receipt_id] || 0) + Number(item.profit || 0);
      });
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

    setSalesData(monthlySales);

    // Process receipts
    const processedReceipts: ReceiptRecord[] = (receiptsRes || []).slice(0, 50).map((r: any) => ({
      id: r.id,
      pharmacy_name: r.pharmacies?.name || 'Unknown',
      customer_name: r.customer_name,
      staff_name: r.profiles?.full_name || r.profiles?.email || 'Unknown',
      payment_method: r.payment_method,
      total_amount: Number(r.total_amount),
      profit: profitsByReceipt[r.id] || 0,
      created_at: r.created_at,
    }));

    setReceipts(processedReceipts);
    setLoading(false);
  };

  const fetchReceiptItems = async (receiptId: string) => {
    if (receiptItems[receiptId]) return;
    
    const { data } = await supabase
      .from('receipt_items')
      .select(`
        *,
        medicines:medicine_id(name)
      `)
      .eq('receipt_id', receiptId);
    
    setReceiptItems(prev => ({ ...prev, [receiptId]: data || [] }));
  };

  const toggleExpand = async (receiptId: string) => {
    const newExpanded = new Set(expandedReceipts);
    if (newExpanded.has(receiptId)) {
      newExpanded.delete(receiptId);
    } else {
      newExpanded.add(receiptId);
      await fetchReceiptItems(receiptId);
    }
    setExpandedReceipts(newExpanded);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      evc_plus: 'EVC Plus',
      debt: 'Debt',
      bank_card: 'Bank Card'
    };
    return labels[method] || method;
  };

  const getPaymentMethodVariant = (method: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      cash: 'default',
      evc_plus: 'secondary',
      debt: 'destructive',
      bank_card: 'outline'
    };
    return variants[method] || 'default';
  };

  const handleExport = () => {
    const exportData = receipts.map(r => ({
      date: formatDateTime(r.created_at),
      pharmacy: r.pharmacy_name,
      customer: r.customer_name,
      staff: r.staff_name,
      payment_method: getPaymentMethodLabel(r.payment_method),
      total: r.total_amount.toFixed(2),
      profit: r.profit.toFixed(2),
    }));

    exportToCSV(exportData, `sales_report_${selectedYear}`, [
      { key: 'date', label: 'Date' },
      { key: 'pharmacy', label: 'Pharmacy' },
      { key: 'customer', label: 'Customer' },
      { key: 'staff', label: 'Staff' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'total', label: 'Total' },
      { key: 'profit', label: 'Profit' },
    ]);
    toast({ title: 'Sales report exported to CSV' });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Reports"
        description="View and analyze sales data across all pharmacies"
      >
        <div className="flex gap-2 flex-wrap">
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        </div>
      </PageHeader>

      {/* Sales Chart */}
      <YearlySalesChart
        data={salesData}
        title={selectedPharmacy === 'all' ? 'Overall Sales' : `Sales - ${pharmacies.find(p => p.id === selectedPharmacy)?.name}`}
        year={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={[2023, 2024, 2025, 2026]}
      />

      {/* Receipts List */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBarChart className="w-5 h-5 text-primary" />
            Sales Records (Receipts)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No receipts found for the selected period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map(receipt => (
                <Collapsible 
                  key={receipt.id} 
                  open={expandedReceipts.has(receipt.id)}
                  onOpenChange={() => toggleExpand(receipt.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Receipt className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{receipt.customer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {receipt.pharmacy_name} • {receipt.staff_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={getPaymentMethodVariant(receipt.payment_method)}>
                            {getPaymentMethodLabel(receipt.payment_method)}
                          </Badge>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(receipt.total_amount)}</p>
                            <p className="text-xs text-green-600">Profit: {formatCurrency(receipt.profit)}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(receipt.created_at)}</p>
                          </div>
                          {expandedReceipts.has(receipt.id) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Medicine</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Buying Price</TableHead>
                            <TableHead className="text-right">Selling Price</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receiptItems[receipt.id]?.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>{item.medicines?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.buying_price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.selling_price)}</TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(item.profit)}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                Loading items...
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSales;