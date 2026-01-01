import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Receipt, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { exportToCSV, formatCurrency, formatDate } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

const AdminReceipts = () => {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptItems, setReceiptItems] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReceipts(); }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('receipts')
      .select(`
        *,
        pharmacies:pharmacy_id(name),
        profiles:staff_id(full_name, email)
      `)
      .order('created_at', { ascending: false });
    setReceipts(data || []);
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
      pharmacy_name: r.pharmacies?.name || 'Unknown',
      customer_name: r.customer_name,
      staff: r.profiles?.full_name || r.profiles?.email || 'Unknown',
      payment_method: getPaymentMethodLabel(r.payment_method),
      total_amount: r.total_amount,
      date: formatDate(r.created_at)
    }));
    exportToCSV(exportData, 'receipts', [
      { key: 'pharmacy_name', label: 'Pharmacy' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'staff', label: 'Staff' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'total_amount', label: 'Total Amount' },
      { key: 'date', label: 'Date' }
    ]);
    toast({ title: 'Receipts exported to CSV' });
  };

  const filtered = receipts.filter(r => 
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.pharmacies?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Receipts" description="View all pharmacy receipts">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 w-48" 
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading receipts...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No receipts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(receipt => (
            <Collapsible 
              key={receipt.id} 
              open={expandedReceipts.has(receipt.id)}
              onOpenChange={() => toggleExpand(receipt.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{receipt.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {receipt.pharmacies?.name || 'Unknown Pharmacy'} • {receipt.profiles?.full_name || receipt.profiles?.email || 'Unknown Staff'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getPaymentMethodVariant(receipt.payment_method)}>
                          {getPaymentMethodLabel(receipt.payment_method)}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(receipt.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(receipt.created_at)}</p>
                        </div>
                        {expandedReceipts.has(receipt.id) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
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
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReceipts;