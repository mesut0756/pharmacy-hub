import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const StaffDebts = () => {
  const { pharmacyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['staff-customer-debts', pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, customer_name, total_amount, created_at, debt_paid_at')
        .eq('pharmacy_id', pharmacyId!)
        .eq('payment_method', 'debt')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase
        .from('receipts')
        .update({ debt_paid_at: new Date().toISOString(), debt_paid_by: user?.id })
        .eq('id', receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-customer-debts'] });
      toast({ title: 'Debt marked as paid' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = debts.filter(d =>
    d.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const unpaidTotal = debts.filter(d => !d.debt_paid_at).reduce((sum, d) => sum + Number(d.total_amount), 0);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Debts" description="Manage customer debt payments" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Unpaid Total: {formatCurrency(unpaidTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Mobile layout */}
          <div className="space-y-3 lg:hidden">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No customer debts found</p>
            ) : (
              filtered.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{debt.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(debt.created_at), 'MMM d, yyyy')}</p>
                    <p className="font-semibold">{formatCurrency(debt.total_amount)}</p>
                  </div>
                  <div>
                    {debt.debt_paid_at ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">Paid</Badge>
                    ) : (
                      <Button size="sm" onClick={() => markPaidMutation.mutate(debt.id)} disabled={markPaidMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customer debts found</TableCell></TableRow>
                ) : (
                  filtered.map((debt) => (
                    <TableRow key={debt.id} className={debt.debt_paid_at ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{debt.customer_name}</TableCell>
                      <TableCell>{formatCurrency(debt.total_amount)}</TableCell>
                      <TableCell>{format(new Date(debt.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {debt.debt_paid_at ? (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Paid {format(new Date(debt.debt_paid_at), 'MMM d')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!debt.debt_paid_at && (
                          <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(debt.id)} disabled={markPaidMutation.isPending}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDebts;
