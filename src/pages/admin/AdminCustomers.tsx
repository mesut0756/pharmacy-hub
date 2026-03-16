import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Users, Phone } from 'lucide-react';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

const AdminCustomers = () => {
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*, pharmacies(name)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: debtTotals = {} } = useQuery({
    queryKey: ['admin-customer-debt-totals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('customer_name, total_amount, debt_paid_at, pharmacy_id')
        .eq('payment_method', 'debt');
      if (error) throw error;
      const totals: Record<string, number> = {};
      (data || []).forEach(r => {
        if (!r.debt_paid_at) {
          const key = `${r.customer_name.toLowerCase()}_${r.pharmacy_id}`;
          totals[key] = (totals[key] || 0) + Number(r.total_amount);
        }
      });
      return totals;
    },
  });

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.pharmacies?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getOwed = (name: string, pharmacyId: string) =>
    debtTotals[`${name.toLowerCase()}_${pharmacyId}`] || 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <PullToRefreshContainer onRefresh={() => refetch()} className="space-y-6">
      <PageHeader title="All Customers" description="View customers across all pharmacies" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {customers.length} Customer{customers.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or pharmacy..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Mobile */}
          <div className="space-y-3 lg:hidden">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No customers found</p>
            ) : (
              filtered.map((c: any) => {
                const owed = getOwed(c.name, c.pharmacy_id);
                return (
                  <div key={c.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.name}</p>
                      {owed > 0 && (
                        <Badge variant="destructive">{formatCurrency(owed)}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.pharmacies?.name || '—'}</p>
                    {c.phone_number && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone_number}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Owed Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                ) : (
                  filtered.map((c: any) => {
                    const owed = getOwed(c.name, c.pharmacy_id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.pharmacies?.name || '—'}</TableCell>
                        <TableCell>{c.phone_number || '—'}</TableCell>
                        <TableCell>
                          {owed > 0 ? (
                            <Badge variant="destructive">{formatCurrency(owed)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PullToRefreshContainer>
  );
};

export default AdminCustomers;
