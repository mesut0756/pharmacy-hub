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

  useEffect(() => { if (pharmacyId) fetchReceipts(); }, [pharmacyId]);

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

  return (
    <div className="space-y-8">
      <PageHeader title="Sales History" description="View all recorded receipts">
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />Sales Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No receipts yet</p>
          ) : (
            <div className="space-y-3">
              {receipts.map(receipt => (
                <Collapsible 
                  key={receipt.id} 
                  open={expandedId === receipt.id}
                  onOpenChange={(open) => setExpandedId(open ? receipt.id : null)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        {expandedId === receipt.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="font-medium">{receipt.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(receipt.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{formatPaymentMethod(receipt.payment_method)}</Badge>
                        <Badge variant="secondary">{receipt.receipt_items.length} items</Badge>
                        <span className="font-bold text-lg">${Number(receipt.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 ml-8 border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Medicine</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receipt.receipt_items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>{item.medicines?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${Number(item.selling_price).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${Number(item.total).toFixed(2)}</TableCell>
                              <TableCell className="text-right text-green-600 dark:text-green-400">
                                +${Number(item.profit).toFixed(2)}
                              </TableCell>
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
