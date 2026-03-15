import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Users, Plus, Pencil, Trash2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

const StaffCustomers = () => {
  const { pharmacyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['staff-customers', pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_id', pharmacyId!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  // Fetch debt totals per customer
  const { data: debtTotals = {} } = useQuery({
    queryKey: ['customer-debt-totals', pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('customer_name, total_amount, debt_paid_at')
        .eq('pharmacy_id', pharmacyId!)
        .eq('payment_method', 'debt');
      if (error) throw error;
      const totals: Record<string, number> = {};
      (data || []).forEach(r => {
        if (!r.debt_paid_at) {
          const key = r.customer_name.toLowerCase();
          totals[key] = (totals[key] || 0) + Number(r.total_amount);
        }
      });
      return totals;
    },
    enabled: !!pharmacyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name is required');
      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update({ name: name.trim(), phone_number: phone.trim() || null })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({ pharmacy_id: pharmacyId!, name: name.trim(), phone_number: phone.trim() || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-customers'] });
      toast({ title: editingId ? 'Customer updated' : 'Customer added' });
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-customers'] });
      toast({ title: 'Customer deleted' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setName('');
    setPhone('');
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone_number || '');
    setDialogOpen(true);
  };

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getOwed = (customerName: string) => debtTotals[customerName.toLowerCase()] || 0;
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['staff-customers'] });
    await queryClient.invalidateQueries({ queryKey: ['customer-debt-totals'] });
  };

  return (
    <PullToRefreshContainer onRefresh={handleRefresh} className="space-y-6">
      <PageHeader title="Customers" description="Manage registered customers">
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
      </PageHeader>

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
              placeholder="Search customers..."
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
                const owed = getOwed(c.name);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.phone_number && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone_number}
                        </p>
                      )}
                      {owed > 0 && (
                        <Badge variant="destructive" className="mt-1">
                          Owes {formatCurrency(owed)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                  <TableHead>Phone</TableHead>
                  <TableHead>Owed Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                ) : (
                  filtered.map((c: any) => {
                    const owed = getOwed(c.name);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone_number || '—'}</TableCell>
                        <TableCell>
                          {owed > 0 ? (
                            <Badge variant="destructive">{formatCurrency(owed)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)" />
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Add Customer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefreshContainer>
  );
};

export default StaffCustomers;
