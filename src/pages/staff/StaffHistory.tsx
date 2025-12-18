import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History } from 'lucide-react';

const StaffHistory = () => {
  const { pharmacyId } = useAuth();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => { if (pharmacyId) fetchSales(); }, [pharmacyId]);

  const fetchSales = async () => {
    const { data } = await supabase.from('sales').select('*, medicines(name)').eq('pharmacy_id', pharmacyId).order('sale_date', { ascending: false }).limit(100);
    setSales(data || []);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Sales History" description="View all recorded sales" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Sales Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Medicine</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.sale_date).toLocaleString()}</TableCell>
                  <TableCell>{s.medicines?.name}</TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{s.quantity}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">${Number(s.total_amount).toFixed(2)}</TableCell>
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
