import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, Download, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatDateTime } from '@/lib/exportUtils';
import { Label } from '@/components/ui/label';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    <div className="space-y-6">
      <PageHeader title="Sales History" description="View all recorded receipts">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </PageHeader>

      {/* Payment Method Filter */}
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
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <History className="w-5 h-5" />Sales Records
          </CardTitle>
          {paymentFilter && paymentFilter !== '' && (
            <p className="text-sm font-semibold text-right">
              Total {formatPaymentMethod(paymentFilter)}: ${paymentSum.toFixed(2)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No receipts yet</p>
          ) : (
            <div className="space-y-3">
              {filteredReceipts.map(receipt => (
                <Collapsible 
                  key={receipt.id} 
                  open={expandedId === receipt.id}
                  onOpenChange={(open) => setExpandedId(open ? receipt.id : null)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        {expandedId === receipt.id ? (
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        )}
                        <div className="text-left min-w-0">
                          <p className="font-medium truncate">{receipt.customer_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{formatPaymentMethod(receipt.payment_method)}</Badge>
                          <Badge variant="secondary" className="text-xs">{receipt.receipt_items.length} items</Badge>
                        </div>
                        <span className="font-bold text-sm sm:text-lg">${Number(receipt.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Mobile: show badges */}
                    <div className="flex gap-2 mt-2 ml-6 sm:hidden">
                      <Badge variant="outline" className="text-xs">{formatPaymentMethod(receipt.payment_method)}</Badge>
                      <Badge variant="secondary" className="text-xs">{receipt.receipt_items.length} items</Badge>
                    </div>
                    <div className="mt-2 sm:ml-8 border rounded-lg overflow-x-auto">
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
                          {receipt.receipt_items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs sm:text-sm">{item.medicines?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">${Number(item.selling_price).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium text-xs sm:text-sm">${Number(item.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
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

export default StaffHistory;
