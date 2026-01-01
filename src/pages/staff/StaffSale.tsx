import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Pill, ShoppingCart, Minus, Plus, Trash2, Receipt, User, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReceiptItem {
  medicine_id: string;
  name: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  stock_available: number;
}

const StaffSale = () => {
  const { pharmacyId, user } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (pharmacyId) fetchMedicines(); }, [pharmacyId]);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .gt('stock_quantity', 0)
      .order('name');
    setMedicines(data || []);
  };

  const addToReceipt = (med: any) => {
    const existing = receiptItems.find(item => item.medicine_id === med.id);
    if (existing) {
      if (existing.quantity < med.stock_quantity) {
        setReceiptItems(items => 
          items.map(item => 
            item.medicine_id === med.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      setReceiptItems([...receiptItems, {
        medicine_id: med.id,
        name: med.name,
        quantity: 1,
        buying_price: med.buying_price || 0,
        selling_price: med.price,
        stock_available: med.stock_quantity
      }]);
    }
  };

  const updateQuantity = (medicine_id: string, delta: number) => {
    setReceiptItems(items => 
      items.map(item => {
        if (item.medicine_id === medicine_id) {
          const newQty = Math.max(1, Math.min(item.stock_available, item.quantity + delta));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeItem = (medicine_id: string) => {
    setReceiptItems(items => items.filter(item => item.medicine_id !== medicine_id));
  };

  const totalAmount = receiptItems.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

  const handleConfirmSale = async () => {
    if (!customerName.trim()) {
      toast({ title: 'Error', description: 'Please enter customer name', variant: 'destructive' });
      return;
    }
    if (!paymentMethod) {
      toast({ title: 'Error', description: 'Please select payment method', variant: 'destructive' });
      return;
    }
    if (receiptItems.length === 0) {
      toast({ title: 'Error', description: 'Please add medicines to the receipt', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          pharmacy_id: pharmacyId,
          staff_id: user?.id,
          customer_name: customerName.trim(),
          payment_method: paymentMethod,
          total_amount: totalAmount
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const itemsToInsert = receiptItems.map(item => ({
        receipt_id: receipt.id,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        buying_price: item.buying_price,
        selling_price: item.selling_price
      }));

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update stock quantities
      for (const item of receiptItems) {
        const medicine = medicines.find(m => m.id === item.medicine_id);
        if (medicine) {
          await supabase
            .from('medicines')
            .update({ stock_quantity: medicine.stock_quantity - item.quantity })
            .eq('id', item.medicine_id);
        }
      }

      toast({ 
        title: 'Sale completed!', 
        description: `Receipt created for ${customerName} - Total: $${totalAmount.toFixed(2)}` 
      });

      // Reset form
      setCustomerName('');
      setPaymentMethod('');
      setReceiptItems([]);
      fetchMedicines();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    !receiptItems.find(item => item.medicine_id === m.id && item.quantity >= m.stock_quantity)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Record Sale" description="Create a new sales receipt" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Medicine Selection */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search medicines..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
          
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
            {filtered.map(med => (
              <Card 
                key={med.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => addToReceipt(med)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {med.image_url ? (
                    <img src={med.image_url} alt={med.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Pill className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{med.name}</p>
                    <p className="text-sm text-muted-foreground">{med.category || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(med.price).toFixed(2)}</p>
                    <Badge variant="secondary" className="text-xs">{med.stock_quantity} left</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No medicines found</p>
            )}
          </div>
        </div>

        {/* Right: Receipt */}
        <Card className="h-fit sticky top-4">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Customer Name
                </Label>
                <Input 
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="evc_plus">EVC Plus</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                    <SelectItem value="bank_card">Bank Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Items ({receiptItems.length})</p>
              {receiptItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Click on medicines to add them
                </p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {receiptItems.map(item => (
                    <div key={item.medicine_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.selling_price.toFixed(2)} × {item.quantity} = ${(item.selling_price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.medicine_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.medicine_id, 1)}
                          disabled={item.quantity >= item.stock_available}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.medicine_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
              </div>
              <Button 
                onClick={handleConfirmSale} 
                className="w-full" 
                size="lg"
                disabled={isSubmitting || receiptItems.length === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Processing...' : 'Confirm Sale'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffSale;