import { useState } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
  const [personName, setPersonName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const { data: customerDebts = [], isLoading: loadingCustomer } = useQuery({
    queryKey: ["customer-debts"],
    queryFn: async () => {
      const { data: receipts, error } = await supabase
        .from("receipts")
        .select("id, customer_name, total_amount, created_at, pharmacy_id, staff_id, debt_paid_at, debt_paid_by")
        .eq("payment_method", "debt")
        .order("created_at", { ascending: false });
      if (error) throw error;

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

  const { data: adminDebts = [], isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin-debts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_debts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminDebt[];
    },
  });

  const addDebtMutation = useMutation({
    mutationFn: async (debt: { person_name: string; phone_number: string | null; amount: number; expected_payment_date: string | null; notes: string | null; }) => {
      const { error } = await supabase.from("admin_debts").insert(debt);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-debts"] }); toast({ title: "Debt added" }); resetForm(); setIsAddDialogOpen(false); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const updateDebtMutation = useMutation({
    mutationFn: async (debt: { id: string; person_name: string; phone_number: string | null; amount: number; expected_payment_date: string | null; notes: string | null; is_paid: boolean; paid_at: string | null; }) => {
      const { id, ...updates } = debt;
      const { error } = await supabase.from("admin_debts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-debts"] }); toast({ title: "Debt updated" }); resetForm(); setEditingDebt(null); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-debts"] }); toast({ title: "Debt deleted" }); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const resetForm = () => { setPersonName(""); setPhoneNumber(""); setAmount(""); setExpectedDate(undefined); setNotes(""); };

  const handleSubmit = () => {
    if (!personName.trim() || !amount) { toast({ title: "Please fill required fields", variant: "destructive" }); return; }
    const debtData = {
      person_name: personName.trim(),
      phone_number: phoneNumber.trim() || null,
      amount: parseFloat(amount),
      expected_payment_date: expectedDate ? format(expectedDate, "yyyy-MM-dd") : null,
      notes: notes.trim() || null,
    };
    if (editingDebt) {
      updateDebtMutation.mutate({ ...debtData, id: editingDebt.id, is_paid: editingDebt.is_paid, paid_at: editingDebt.paid_at });
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
      id: debt.id, person_name: debt.person_name, phone_number: debt.phone_number,
      amount: debt.amount, expected_payment_date: debt.expected_payment_date,
      notes: debt.notes, is_paid: !debt.is_paid, paid_at: !debt.is_paid ? new Date().toISOString() : null,
    });
  };

  const filteredCustomerDebts = customerDebts.filter(d => d.customer_name.toLowerCase().includes(searchCustomer.toLowerCase()));
  const filteredAdminDebts = adminDebts.filter(d => d.person_name.toLowerCase().includes(searchAdmin.toLowerCase()));
  const totalCustomerDebt = customerDebts.filter(d => !d.debt_paid_at).reduce((sum, d) => sum + d.total_amount, 0);
  const totalAdminDebtUnpaid = adminDebts.filter(d => !d.is_paid).reduce((sum, d) => sum + d.amount, 0);

  const DebtFormDialog = () => (
    <Dialog open={isAddDialogOpen || !!editingDebt} onOpenChange={(open) => { if (!open) { setIsAddDialogOpen(false); setEditingDebt(null); resetForm(); } }}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDebt ? "Edit Debt" : "Add New Debt"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Person Name *</Label>
            <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Enter name" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter phone" />
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Expected Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedDate ? format(expectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={expectedDate} onSelect={setExpectedDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={addDebtMutation.isPending || updateDebtMutation.isPending}>
            {editingDebt ? "Update Debt" : "Add Debt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-debts'] }),
    ]);
  };

  return (
    <PullToRefreshContainer onRefresh={handleRefresh} className="space-y-6">
      <PageHeader title="Debts Management" description="Manage customer debts and your owed debts" />

      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer" className="text-xs sm:text-sm">Customer Debts</TabsTrigger>
          <TabsTrigger value="admin" className="text-xs sm:text-sm">My Owed Debts</TabsTrigger>
        </TabsList>

        {/* Customer Debts Tab */}
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                Unpaid: ${totalCustomerDebt.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input placeholder="Search customer..." value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} className="w-full sm:max-w-sm" />
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 lg:hidden">
                {loadingCustomer ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : filteredCustomerDebts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No customer debts found</p>
                ) : (
                  filteredCustomerDebts.map((debt) => (
                    <div key={debt.id} className={cn("p-3 rounded-lg bg-muted/50 space-y-2", debt.debt_paid_at && "opacity-60")}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{debt.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{debt.pharmacy_name} • {debt.staff_name}</p>
                        </div>
                        <p className="font-bold text-sm shrink-0">${debt.total_amount.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{format(new Date(debt.created_at), "MMM d, yyyy")}</p>
                        {debt.debt_paid_at ? (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            Paid {format(new Date(debt.debt_paid_at), "MMM d")}
                            {debt.debt_paid_by_name && ` by ${debt.debt_paid_by_name}`}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Unpaid</Badge>
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
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCustomer ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredCustomerDebts.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customer debts found</TableCell></TableRow>
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
                              <Badge variant="secondary" className="bg-success/10 text-success">Paid {format(new Date(debt.debt_paid_at), "MMM d, yyyy")}</Badge>
                            ) : (
                              <Badge variant="destructive">Unpaid</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{debt.debt_paid_by_name || "-"}</TableCell>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  Unpaid: ${totalAdminDebtUnpaid.toFixed(2)}
                </span>
                <DebtFormDialog />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input placeholder="Search person..." value={searchAdmin} onChange={(e) => setSearchAdmin(e.target.value)} className="w-full sm:max-w-sm" />
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 lg:hidden">
                {loadingAdmin ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : filteredAdminDebts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No debts found</p>
                ) : (
                  filteredAdminDebts.map((debt) => (
                    <div key={debt.id} className={cn("p-3 rounded-lg bg-muted/50 space-y-2", debt.is_paid && "opacity-60")}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className={cn("font-medium text-sm truncate", debt.is_paid && "line-through")}>{debt.person_name}</p>
                          {debt.phone_number && <p className="text-xs text-muted-foreground">{debt.phone_number}</p>}
                        </div>
                        <p className={cn("font-bold text-sm shrink-0", debt.is_paid && "line-through")}>${debt.amount.toFixed(2)}</p>
                      </div>
                      {debt.notes && <p className="text-xs text-muted-foreground truncate">{debt.notes}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={debt.is_paid} onCheckedChange={() => handleTogglePaid(debt)} />
                          <span className="text-xs text-muted-foreground">
                            {debt.expected_payment_date ? `Due: ${format(new Date(debt.expected_payment_date), "MMM d")}` : "No due date"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(debt)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDebtMutation.mutate(debt.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
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
                      <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredAdminDebts.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No debts found</TableCell></TableRow>
                    ) : (
                      filteredAdminDebts.map((debt) => (
                        <TableRow key={debt.id} className={debt.is_paid ? "opacity-60" : ""}>
                          <TableCell><Checkbox checked={debt.is_paid} onCheckedChange={() => handleTogglePaid(debt)} /></TableCell>
                          <TableCell className={cn("font-medium", debt.is_paid && "line-through")}>{debt.person_name}</TableCell>
                          <TableCell>{debt.phone_number || "-"}</TableCell>
                          <TableCell className={debt.is_paid ? "line-through" : ""}>${debt.amount.toFixed(2)}</TableCell>
                          <TableCell>{debt.expected_payment_date ? format(new Date(debt.expected_payment_date), "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{debt.notes || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(debt)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteDebtMutation.mutate(debt.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
