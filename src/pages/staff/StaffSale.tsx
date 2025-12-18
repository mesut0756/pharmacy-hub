import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Pill, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const StaffSale = () => {
  const { pharmacyId, user } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { if (pharmacyId) fetchMedicines(); }, [pharmacyId]);

  const fetchMedicines = async () => {
    const { data } = await supabase.from('medicines').select('*').eq('pharmacy_id', pharmacyId).gt('stock_quantity', 0).order('name');
    setMedicines(data || []);
  };

  const handleSale = async () => {
    if (!selectedMed || quantity < 1 || quantity > selectedMed.stock_quantity) return;
    
    const total = selectedMed.price * quantity;
    await supabase.from('sales').insert({ pharmacy_id: pharmacyId, medicine_id: selectedMed.id, staff_id: user?.id, quantity, unit_price: selectedMed.price, total_amount: total });
    await supabase.from('medicines').update({ stock_quantity: selectedMed.stock_quantity - quantity }).eq('id', selectedMed.id);
    
    toast({ title: 'Sale recorded!', description: `Sold ${quantity}x ${selectedMed.name} for $${total.toFixed(2)}` });
    setSelectedMed(null); setQuantity(1); fetchMedicines();
  };

  const filtered = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader title="Record Sale" description="Select a medicine to record a sale">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" /></div>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(med => (
          <Card key={med.id} className="card-hover cursor-pointer" onClick={() => { setSelectedMed(med); setQuantity(1); }}>
            <CardContent className="p-4">
              <div className="flex gap-3"><div className="p-2 rounded-lg bg-primary/10"><Pill className="w-5 h-5 text-primary" /></div><div><p className="font-semibold">{med.name}</p><p className="text-sm text-muted-foreground">{med.category || 'Uncategorized'}</p></div></div>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-lg font-bold">${med.price}</span>
                <Badge variant="secondary">{med.stock_quantity} available</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selectedMed} onOpenChange={() => setSelectedMed(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
          {selectedMed && (
            <div className="space-y-6">
              <div className="text-center"><p className="text-xl font-semibold">{selectedMed.name}</p><p className="text-muted-foreground">${selectedMed.price} per unit</p></div>
              <div className="space-y-2"><Label>Quantity</Label><div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="w-4 h-4" /></Button>
                <Input type="number" value={quantity} onChange={e => setQuantity(Math.min(selectedMed.stock_quantity, Math.max(1, parseInt(e.target.value) || 1)))} className="w-20 text-center" />
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(selectedMed.stock_quantity, quantity + 1))}><Plus className="w-4 h-4" /></Button>
              </div><p className="text-sm text-muted-foreground text-center">{selectedMed.stock_quantity} available</p></div>
              <div className="p-4 rounded-lg bg-muted text-center"><p className="text-sm text-muted-foreground">Total Amount</p><p className="text-2xl font-bold">${(selectedMed.price * quantity).toFixed(2)}</p></div>
              <Button onClick={handleSale} className="w-full" disabled={quantity > selectedMed.stock_quantity}><ShoppingCart className="w-4 h-4 mr-2" />Confirm Sale</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default StaffSale;
