import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatDateTime } from '@/lib/exportUtils';
import { Label } from '@/components/ui/label';
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
  receipt_items: ReceiptItem[];
}

const StaffHistory = () => {
  const { pharmacyId } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>('');

  useEffect(() => {
    if (pharmacyId) fetchReceipts();
  }, [pharmacyId]);

  const fetchReceipts = async () => {
    const { data } = await supabase
      .from('receipts')
      .select(`
        id,
        customer_name,
        payment_method,
        total_amount,
        created_at,
        receipt_items (
          id,
          medicine_id,
          quantity,
          buying_price,
          selling_price,
          profit,
          total,
          medicines (name)
        )
      `)
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .limit(100);

    setReceipts((data as ReceiptData[]) || []);
  };

  const handleExport = () => {
    const exportData = receipts.flatMap(r => 
      r.receipt_items.map(item => ({
        date: formatDateTime(r.created_at),
        customer: r.customer_name,
        payment_method: r.payment_method,
        medicine: item.medicines?.name || 'Unknown',
        quantity: item.quantity,
        selling_price: Number(item.selling_price).toFixed(2),
        total: Number(item.total).toFixed(2),
        profit: Number(item.profit).toFixed(2),
      }))
    );

    exportToCSV(exportData, 'sales_history', [
      { key: 'date', label: 'Date' },
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

  const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      evc_plus: 'EVC Plus',
      debt: 'Debt',
      bank_card: 'Bank Card'
    };
    return labels[method] || method;
  };

  const filteredReceipts = paymentFilter
    ? receipts.filter(r => r.payment_method === paymentFilter)
    : receipts;

  const paymentSum =
    paymentFilter && paymentFilter !== ''
      ? filteredReceipts.reduce((sum, r) => sum + r.total_amount, 0)
      : 0;

  return (
    <PullToRefreshContainer onRefresh={fetchReceipts} className="space-y-6">
      <PageHeader title="Sales History" description="View all recorded receipts">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Label className="text-sm whitespace-nowrap">Filter by Payment:</Label>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded px-3 py-2 bg-input text-foreground text-sm w-full sm:w-auto"
        >
          <option value="">All</option>
          <option value="cash">Cash</option>
          <option value="evc_plus">EVC Plus</option>
          <option value="debt">Debt</option>
          <option value="bank_card">Bank Card</option>
        </select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="w-5 h-5" />Sales Records
            </CardTitle>
            {paymentFilter && paymentFilter !== '' && (
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
                  <TableHead className="text-xs hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="text-right text-xs hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead className="text-right text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No receipts yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map(receipt => (
                    <TableRow
                      key={receipt.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedReceipt(receipt)}
                    >
                      <TableCell className="text-xs sm:text-sm font-medium max-w-[120px] truncate">
                        {receipt.customer_name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {formatPaymentMethod(receipt.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">
                        {receipt.receipt_items.length}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-bold">
                        ${Number(receipt.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(receipt.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Receipt — {selectedReceipt?.customer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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

export default StaffHistory;
