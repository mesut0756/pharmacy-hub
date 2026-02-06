import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Pencil, Trash2, Search, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CustomerDebtReceipt {
  id: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  pharmacy_name: string;
  staff_name: string;
  debt_paid_at: string | null;
  debt_paid_by_name: string | null;
}

interface AdminDebt {
  id: string;
  person_name: string;
  phone_number: string | null;
  amount: number;
  expected_payment_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

const AdminDebts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAdmin, setSearchAdmin] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<AdminDebt | null>(null);
  
  // Form state
  const [personName, setPersonName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  // Fetch customer debt receipts (payment_method = 'debt')
  const { data: customerDebts = [], isLoading: loadingCustomer } = useQuery({
    queryKey: ["customer-debts"],
    queryFn: async () => {
      const { data: receipts, error } = await supabase
        .from("receipts")
        .select(`
          id,
          customer_name,
          total_amount,
          created_at,
          pharmacy_id,
          staff_id,
          debt_paid_at,
          debt_paid_by
        `)
        .eq("payment_method", "debt")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch pharmacy and staff names
      const pharmacyIds = [...new Set(receipts.map(r => r.pharmacy_id))];
      const staffIds = [...new Set(receipts.map(r => r.staff_id))];
      const paidByIds = [...new Set(receipts.map(r => r.debt_paid_by).filter(Boolean))];
      const allProfileIds = [...new Set([...staffIds, ...paidByIds])];

      const [pharmaciesRes, profilesRes] = await Promise.all([
        supabase.from("pharmacies").select("id, name").in("id", pharmacyIds),
        supabase.from("profiles").select("id, full_name").in("id", allProfileIds.length > 0 ? allProfileIds : ['none'])
      ]);

      const pharmacyMap = new Map(pharmaciesRes.data?.map(p => [p.id, p.name]) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p.full_name]) || []);

      return receipts.map(r => ({
        id: r.id,
        customer_name: r.customer_name,
        total_amount: r.total_amount,
        created_at: r.created_at,
        pharmacy_name: pharmacyMap.get(r.pharmacy_id) || "Unknown",
        staff_name: profileMap.get(r.staff_id) || "Unknown",
        debt_paid_at: r.debt_paid_at,
        debt_paid_by_name: r.debt_paid_by ? (profileMap.get(r.debt_paid_by) || "Unknown") : null,
      })) as CustomerDebtReceipt[];
    },
  });

  // Fetch admin debts
  const { data: adminDebts = [], isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin-debts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_debts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminDebt[];
    },
  });

  // Add admin debt mutation
  const addDebtMutation = useMutation({
    mutationFn: async (debt: {
      person_name: string;
      phone_number: string | null;
      amount: number;
      expected_payment_date: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase.from("admin_debts").insert(debt);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-debts"] });
      toast({ title: "Debt added successfully" });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error adding debt", description: error.message, variant: "destructive" });
    },
  });

  // Update admin debt mutation
  const updateDebtMutation = useMutation({
    mutationFn: async (debt: {
      id: string;
      person_name: string;
      phone_number: string | null;
      amount: number;
      expected_payment_date: string | null;
      notes: string | null;
      is_paid: boolean;
      paid_at: string | null;
    }) => {
      const { id, ...updates } = debt;
      const { error } = await supabase.from("admin_debts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-debts"] });
      toast({ title: "Debt updated successfully" });
      resetForm();
      setEditingDebt(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating debt", description: error.message, variant: "destructive" });
    },
  });

  // Delete admin debt mutation
  const deleteDebtMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-debts"] });
      toast({ title: "Debt deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting debt", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPersonName("");
    setPhoneNumber("");
    setAmount("");
    setExpectedDate(undefined);
    setNotes("");
  };

  const handleSubmit = () => {
    if (!personName.trim() || !amount) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const debtData = {
      person_name: personName.trim(),
      phone_number: phoneNumber.trim() || null,
      amount: parseFloat(amount),
      expected_payment_date: expectedDate ? format(expectedDate, "yyyy-MM-dd") : null,
      notes: notes.trim() || null,
    };

    if (editingDebt) {
      updateDebtMutation.mutate({
        ...debtData,
        id: editingDebt.id,
        is_paid: editingDebt.is_paid,
        paid_at: editingDebt.paid_at,
      });
    } else {
      addDebtMutation.mutate(debtData);
    }
  };

  const handleEdit = (debt: AdminDebt) => {
    setEditingDebt(debt);
    setPersonName(debt.person_name);
    setPhoneNumber(debt.phone_number || "");
    setAmount(debt.amount.toString());
    setExpectedDate(debt.expected_payment_date ? new Date(debt.expected_payment_date) : undefined);
    setNotes(debt.notes || "");
  };

  const handleTogglePaid = (debt: AdminDebt) => {
    updateDebtMutation.mutate({
      id: debt.id,
      person_name: debt.person_name,
      phone_number: debt.phone_number,
      amount: debt.amount,
      expected_payment_date: debt.expected_payment_date,
      notes: debt.notes,
      is_paid: !debt.is_paid,
      paid_at: !debt.is_paid ? new Date().toISOString() : null,
    });
  };

  // Filter customer debts
  const filteredCustomerDebts = customerDebts.filter(d =>
    d.customer_name.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  // Filter admin debts
  const filteredAdminDebts = adminDebts.filter(d =>
    d.person_name.toLowerCase().includes(searchAdmin.toLowerCase())
  );

  // Calculate totals
  const totalCustomerDebt = customerDebts.filter(d => !d.debt_paid_at).reduce((sum, d) => sum + d.total_amount, 0);
  const totalAdminDebtUnpaid = adminDebts
    .filter(d => !d.is_paid)
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debts Management"
        description="Manage customer debts and your owed debts"
      />

      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer">Customer Debts</TabsTrigger>
          <TabsTrigger value="admin">My Owed Debts</TabsTrigger>
        </TabsList>

        {/* Customer Debts Tab */}
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Customer Debts: ${totalCustomerDebt.toFixed(2)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCustomer ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomerDebts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No customer debts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomerDebts.map((debt) => (
                        <TableRow key={debt.id} className={debt.debt_paid_at ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{debt.customer_name}</TableCell>
                          <TableCell>${debt.total_amount.toFixed(2)}</TableCell>
                          <TableCell>{debt.pharmacy_name}</TableCell>
                          <TableCell>{debt.staff_name}</TableCell>
                          <TableCell>{format(new Date(debt.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {debt.debt_paid_at ? (
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                Paid {format(new Date(debt.debt_paid_at), "MMM d, yyyy")}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Unpaid</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {debt.debt_paid_by_name || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Owed Debts Tab */}
        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Unpaid: ${totalAdminDebtUnpaid.toFixed(2)}
                </span>
                <Dialog open={isAddDialogOpen || !!editingDebt} onOpenChange={(open) => {
                  if (!open) {
                    setIsAddDialogOpen(false);
                    setEditingDebt(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Debt
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingDebt ? "Edit Debt" : "Add New Debt"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="personName">Person Name *</Label>
                        <Input
                          id="personName"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          placeholder="Enter name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Payment Date (Optional)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !expectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {expectedDate ? format(expectedDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={expectedDate}
                              onSelect={setExpectedDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={addDebtMutation.isPending || updateDebtMutation.isPending}
                      >
                        {editingDebt ? "Update Debt" : "Add Debt"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by person name..."
                  value={searchAdmin}
                  onChange={(e) => setSearchAdmin(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paid</TableHead>
                      <TableHead>Person</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAdmin ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredAdminDebts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No debts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdminDebts.map((debt) => (
                        <TableRow key={debt.id} className={debt.is_paid ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={debt.is_paid}
                              onCheckedChange={() => handleTogglePaid(debt)}
                            />
                          </TableCell>
                          <TableCell className={cn("font-medium", debt.is_paid && "line-through")}>
                            {debt.person_name}
                          </TableCell>
                          <TableCell>{debt.phone_number || "-"}</TableCell>
                          <TableCell className={debt.is_paid ? "line-through" : ""}>
                            ${debt.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {debt.expected_payment_date
                              ? format(new Date(debt.expected_payment_date), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {debt.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(debt)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteDebtMutation.mutate(debt.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDebts;
