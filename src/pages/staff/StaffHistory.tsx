import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, formatDateTime } from '@/lib/exportUtils';

const StaffHistory = () => {
  const { pharmacyId } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => { if (pharmacyId) fetchSales(); }, [pharmacyId]);

  const fetchSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*, medicines(name)')
      .eq('pharmacy_id', pharmacyId)
      .order('sale_date', { ascending: false })
      .limit(100);
    setSales(data || []);
  };

  const handleExport = () => {
    const exportData = sales.map(s => ({
      date: formatDateTime(s.sale_date),
      medicine: s.medicines?.name || 'Unknown',
      quantity: s.quantity,
      unit_price: Number(s.unit_price).toFixed(2),
      total: Number(s.total_amount).toFixed(2),
    }));

    exportToCSV(exportData, 'sales_history', [
      { key: 'date', label: 'Date' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit_price', label: 'Unit Price' },
      { key: 'total', label: 'Total' },
    ]);
    toast({ title: 'Sales history exported to CSV' });
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Sales History" description="View all recorded sales">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.sale_date).toLocaleString()}</TableCell>
                  <TableCell>{s.medicines?.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{s.quantity}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${Number(s.total_amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffHistory;
