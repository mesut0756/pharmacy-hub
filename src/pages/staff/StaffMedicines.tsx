import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pill, Edit, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { exportToCSV } from "@/lib/exportUtils";

const StaffMedicines = () => {
  const { pharmacyId, user } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    buying_price: "",
    stock_quantity: "",
    low_stock_threshold: "10",
    expiry_date: "",
    description: "",
    image_url: "",
  });

  useEffect(() => {
    if (pharmacyId) fetchMedicines();
  }, [pharmacyId]);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from("medicines")
      .select("*")
      .eq("pharmacy_id", pharmacyId)
      .order("name");
    setMedicines(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category || null,
      price: parseFloat(form.price),
      buying_price: form.buying_price ? parseFloat(form.buying_price) : 0,
      stock_quantity: parseInt(form.stock_quantity),
      low_stock_threshold: parseInt(form.low_stock_threshold),
      expiry_date: form.expiry_date || null,
      description: form.description || null,
      image_url: form.image_url || null,
      pharmacy_id: pharmacyId,
      created_by: user?.id,
    };

    if (editingMed) {
      await supabase.from("medicines").update(payload).eq("id", editingMed.id);
      toast({ title: "Medicine updated" });
    } else {
      await supabase.from("medicines").insert(payload);
      toast({ title: "Medicine added" });
    }
    resetForm();
    fetchMedicines();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) {
      toast({
        title: "Error",
        description: "Cannot delete medicine with existing sales",
        variant: "destructive",
      });
    } else {
      toast({ title: "Medicine deleted" });
      fetchMedicines();
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setIsOpen(false);
    setEditingMed(null);
    setForm({
      name: "",
      category: "",
      price: "",
      buying_price: "",
      stock_quantity: "",
      low_stock_threshold: "10",
      expiry_date: "",
      description: "",
      image_url: "",
    });
  };

  const openEdit = (med: any) => {
    setEditingMed(med);
    setForm({
      name: med.name,
      category: med.category || "",
      price: med.price.toString(),
      buying_price: med.buying_price?.toString() || "",
      stock_quantity: med.stock_quantity.toString(),
      low_stock_threshold: med.low_stock_threshold.toString(),
      expiry_date: med.expiry_date || "",
      description: med.description || "",
      image_url: med.image_url || "",
    });
    setIsOpen(true);
  };

  const handleExport = () => {
    exportToCSV(medicines, "medicines", [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "buying_price", label: "Buying Price" },
      { key: "price", label: "Selling Price" },
      { key: "profit", label: "Profit" },
      { key: "stock_quantity", label: "Stock" },
      { key: "low_stock_threshold", label: "Low Stock Threshold" },
      { key: "expiry_date", label: "Expiry Date" },
      { key: "description", label: "Description" },
    ]);
    toast({ title: "Medicines exported to CSV" });
  };

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Medicines"
        description="Manage your pharmacy inventory"
      >
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog
            open={isOpen}
            onOpenChange={(o) => {
              setIsOpen(o);
              if (!o) setEditingMed(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMed ? "Edit" : "Add"} Medicine
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Image</Label>
                  <ImageUpload
                    currentImageUrl={form.image_url}
                    onImageUploaded={(url) =>
                      setForm({ ...form, image_url: url })
                    }
                    onImageRemoved={() => setForm({ ...form, image_url: "" })}
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary bg-input"
                  >
                    <option value="Animal">Animal</option>
                    <option value="Human">Human</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Buying Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.buying_price}
                      onChange={(e) =>
                        setForm({ ...form, buying_price: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Selling Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                {form.buying_price && form.price && (
                  <div className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
                    Profit: $
                    {(
                      parseFloat(form.price) - parseFloat(form.buying_price)
                    ).toFixed(2)}{" "}
                    per unit
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={form.stock_quantity}
                      onChange={(e) =>
                        setForm({ ...form, stock_quantity: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      value={form.low_stock_threshold}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          low_stock_threshold: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) =>
                      setForm({ ...form, expiry_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingMed ? "Update" : "Add"} Medicine
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((med) => (
          <Card key={med.id} className="card-hover overflow-hidden">
            <CardContent className="p-0">
              {med.image_url ? (
                <img
                  src={med.image_url}
                  alt={med.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-muted flex items-center justify-center">
                  <Pill className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{med.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {med.category || "Uncategorized"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(med)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(med)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Buying: </span>
                    <span>${Number(med.buying_price || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit: </span>
                    <span className="text-green-600">
                      ${Number(med.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-lg font-bold">
                    ${Number(med.price).toFixed(2)}
                  </span>
                  <Badge
                    variant={
                      med.stock_quantity <= med.low_stock_threshold
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {med.stock_quantity} in stock
                  </Badge>
                </div>
                {med.expiry_date && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Expires: {new Date(med.expiry_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffMedicines;
