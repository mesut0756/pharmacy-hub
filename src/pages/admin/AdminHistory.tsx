import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatDateTime } from '@/lib/exportUtils';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

interface ReceiptItem {
  id: string;
  medicine_id: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  profit: number;
  total: number;
  medicines: { name: string } | null;
}

interface ReceiptData {
  id: string;
  customer_name: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
  staff_id: string;
  receipt_items: ReceiptItem[];
  pharmacies: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
}

const AdminHistory = () => {
  const { toast } = useToast();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: receipts = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id, customer_name, payment_method, total_amount, created_at, staff_id,
          receipt_items (id, medicine_id, quantity, buying_price, selling_price, profit, total, medicines(name)),
          pharmacies(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch staff names
      const staffIds = [...new Set((data || []).map(r => r.staff_id))];
      let profileMap: Record<string, { full_name: string | null; email: string }> = {};
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', staffIds);
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
      }

      return (data || []).map(r => ({
        ...r,
        profiles: profileMap[r.staff_id] || null,
      })) as ReceiptData[];
    },
  });

  const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = { cash: 'Cash', evc_plus: 'EVC Plus', debt: 'Debt', bank_card: 'Bank Card' };
    return labels[method] || method;
  };

  const filtered = receipts
    .filter(r => !paymentFilter || r.payment_method === paymentFilter)
    .filter(r =>
      !search ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.pharmacies?.name || '').toLowerCase().includes(search.toLowerCase())
    );

  const paymentSum = paymentFilter
    ? filtered.reduce((sum, r) => sum + r.total_amount, 0)
    : 0;

  const handleExport = () => {
    const exportData = filtered.flatMap(r =>
      r.receipt_items.map(item => ({
        date: formatDateTime(r.created_at),
        pharmacy: r.pharmacies?.name || '—',
        staff: r.profiles?.full_name || r.profiles?.email || '—',
        customer: r.customer_name,
        payment_method: formatPaymentMethod(r.payment_method),
        medicine: item.medicines?.name || 'Unknown',
        quantity: item.quantity,
        selling_price: Number(item.selling_price).toFixed(2),
        total: Number(item.total).toFixed(2),
        profit: Number(item.profit).toFixed(2),
      }))
    );
    exportToCSV(exportData, 'admin_sales_history', [
      { key: 'date', label: 'Date' },
      { key: 'pharmacy', label: 'Pharmacy' },
      { key: 'staff', label: 'Staff' },
      { key: 'customer', label: 'Customer' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'selling_price', label: 'Selling Price' },
      { key: 'total', label: 'Total' },
      { key: 'profit', label: 'Profit' },
    ]);
    toast({ title: 'Sales history exported to CSV' });
  };

  return (
    <PullToRefreshContainer onRefresh={async () => { await refetch(); }} className="space-y-6">
      <PageHeader title="Sales History" description="View all receipts across pharmacies">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer or pharmacy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Payment:</Label>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="rounded px-3 py-2 bg-input text-foreground text-sm"
          >
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="evc_plus">EVC Plus</option>
            <option value="debt">Debt</option>
            <option value="bank_card">Bank Card</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="w-5 h-5" />All Sales Records
            </CardTitle>
            {paymentFilter && (
              <p className="text-sm font-semibold">
                Total {formatPaymentMethod(paymentFilter)}: ${paymentSum.toFixed(2)}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Pharmacy</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Staff</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead className="text-right text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No receipts found</TableCell></TableRow>
                ) : (
                  filtered.map(receipt => (
                    <TableRow key={receipt.id} className="cursor-pointer" onClick={() => setSelectedReceipt(receipt)}>
                      <TableCell className="text-xs sm:text-sm font-medium max-w-[120px] truncate">{receipt.customer_name}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{receipt.pharmacies?.name || '—'}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{receipt.profiles?.full_name || receipt.profiles?.email || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{formatPaymentMethod(receipt.payment_method)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-bold">${Number(receipt.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{new Date(receipt.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={open => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Receipt — {selectedReceipt?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pharmacy</span>
              <span>{selectedReceipt?.pharmacies?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Staff</span>
              <span>{selectedReceipt?.profiles?.full_name || selectedReceipt?.profiles?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <Badge variant="outline">{formatPaymentMethod(selectedReceipt?.payment_method || '')}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{selectedReceipt && new Date(selectedReceipt.created_at).toLocaleString()}</span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Medicine</TableHead>
                    <TableHead className="text-right text-xs">Qty</TableHead>
                    <TableHead className="text-right text-xs">Price</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReceipt?.receipt_items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs sm:text-sm">{item.medicines?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">${Number(item.selling_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium">${Number(item.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center pt-2 border-t font-semibold">
              <span>Total</span>
              <span>${Number(selectedReceipt?.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefreshContainer>
  );
};

export default AdminHistory;
