import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Minus, Plus, Trash2, Receipt, User, CreditCard, Pill, Printer } from 'lucide-react';
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

  // Ref for print area
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pharmacyId) fetchMedicines();
  }, [pharmacyId]);

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

  // PRINT FUNCTION
  const printReceipt = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '', 'width=300,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 280px; padding: 10px; }
            h2, p { text-align: center; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { text-align: left; padding: 2px 0; }
            .total { font-weight: bold; margin-top: 5px; }
            hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleConfirmSale = async () => {
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
          customer_name: customerName.trim() || null, // optional
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

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    !receiptItems.find(item => item.medicine_id === m.id && item.quantity >= m.stock_quantity)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Record Sale" description="Create a new sales receipt" />

      <div className="grid lg:grid-cols-1 gap-6">

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

              {/* Medicine Search */}
              <div className="relative">
                <Label className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4" />
                  Search Medicine
                </Label>

                <Input
                  placeholder="Start typing medicine name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {search && filteredMedicines.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-60 overflow-y-auto">
                    {filteredMedicines.map(med => (
                      <button
                        key={med.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center"
                        onClick={() => {
                          addToReceipt(med);
                          setSearch('');
                        }}
                      >
                        <span>{med.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ${Number(med.price).toFixed(2)} · {med.stock_quantity} left
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {search && filteredMedicines.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                    No medicines found
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </Label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full rounded px-3 py-2 bg-input text-foreground"
                >
                  <option value="">Select payment method</option>
                  <option value="cash">Cash</option>
                  <option value="evc_plus">EVC Plus</option>
                  <option value="debt">Debt</option>
                  <option value="bank_card">Bank Card</option>
                </select>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Items ({receiptItems.length})</p>
              {receiptItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Add medicines to the receipt
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
                <span className={`text-2xl font-bold ${paymentMethod === 'debt' ? 'text-destructive' : ''}`}>
                  ${totalAmount.toFixed(2)}
                </span>
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

              {receiptItems.length > 0 && (
                <Button 
                  onClick={printReceipt} 
                  variant="outline" 
                  className="w-full mt-2"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print Receipt
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden print area */}
      <div ref={printRef} style={{ display: 'none' }}>
        <h2 className='text-4xl'>Livestock Agro Drug Company</h2>
        <p className='text-xl'>Email: ladcokismaayo@gmail.com</p>
        <p className='text-xl'>Tel: +252614974959/+25261877003/+252771629562</p>
        <p className='text-xl'>Location: Umbultoria, Kismayo, Somalia</p>
        <hr />
        <p className='font-bold'>Customer: {customerName || 'Walk-in'}</p>
        <p className='text-2xl'>Payment: {paymentMethod}</p>
        <hr />
        <table>
          <tbody>
            {receiptItems.map(item => (
              <tr key={item.medicine_id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>${(item.quantity * item.selling_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <p className="total">Total: ${totalAmount.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default StaffSale;
