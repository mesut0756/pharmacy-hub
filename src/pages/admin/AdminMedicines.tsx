import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Download, Pill, AlertTriangle, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh-container';

interface Medicine {
  id: string;
  name: string;
  
  price: number;
  buying_price: number | null;
  profit: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  expiry_date: string | null;
  image_url: string | null;
  pharmacy_name: string;
  pharmacy_id: string;
}

interface Pharmacy {
  id: string;
  name: string;
}

const AdminMedicines = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('all');
  
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [medicinesRes, pharmaciesRes] = await Promise.all([
      supabase.from('medicines').select('*, pharmacies(name)').order('name'),
      supabase.from('pharmacies').select('id, name').order('name'),
    ]);
    if (medicinesRes.data) {
      setMedicines(medicinesRes.data.map((m: any) => ({
        id: m.id, name: m.name, price: m.price,
        buying_price: m.buying_price, profit: m.profit, stock_quantity: m.stock_quantity,
        low_stock_threshold: m.low_stock_threshold, expiry_date: m.expiry_date,
        image_url: m.image_url, pharmacy_name: m.pharmacies?.name || 'Unknown', pharmacy_id: m.pharmacy_id,
      })));
    }
    if (pharmaciesRes.data) setPharmacies(pharmaciesRes.data);
    setLoading(false);
  };

  

  const isExpiringSoon = (d: string | null) => {
    if (!d) return false;
    const days = Math.ceil((new Date(d).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  };
  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;
  const isLowStock = (q: number, t: number) => q <= t;

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) || med.category?.toLowerCase().includes(searchTerm.toLowerCase()) || med.pharmacy_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPharmacy = selectedPharmacy === 'all' || med.pharmacy_id === selectedPharmacy;
    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = isLowStock(med.stock_quantity, med.low_stock_threshold);
    else if (stockFilter === 'out') matchesStock = med.stock_quantity === 0;
    else if (stockFilter === 'available') matchesStock = med.stock_quantity > med.low_stock_threshold;
    let matchesExpiry = true;
    if (expiryFilter === 'expiring') matchesExpiry = isExpiringSoon(med.expiry_date);
    else if (expiryFilter === 'expired') matchesExpiry = isExpired(med.expiry_date);
    else if (expiryFilter === 'valid') matchesExpiry = !isExpiringSoon(med.expiry_date) && !isExpired(med.expiry_date);
    return matchesSearch && matchesPharmacy && matchesCategory && matchesStock && matchesExpiry;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Pharmacy', 'Selling Price', 'Buying Price', 'Profit', 'Stock', 'Threshold', 'Expiry Date'];
    const rows = filteredMedicines.map(med => [med.name, med.category || '', med.pharmacy_name, med.price, med.buying_price || 0, med.profit || 0, med.stock_quantity, med.low_stock_threshold, med.expiry_date || '']);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-medicines-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: medicines.length,
    lowStock: medicines.filter(m => isLowStock(m.stock_quantity, m.low_stock_threshold)).length,
    expiring: medicines.filter(m => isExpiringSoon(m.expiry_date)).length,
    expired: medicines.filter(m => isExpired(m.expiry_date)).length,
  };

  return (
    <PullToRefreshContainer onRefresh={fetchData} className="space-y-6">
      <PageHeader title="All Medicines" description="View all medicines across pharmacies">
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Pill className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
          <div><p className="text-xs sm:text-sm text-muted-foreground">Total</p><p className="text-lg sm:text-2xl font-bold">{stats.total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" /></div>
          <div><p className="text-xs sm:text-sm text-muted-foreground">Low Stock</p><p className="text-lg sm:text-2xl font-bold">{stats.lowStock}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" /></div>
          <div><p className="text-xs sm:text-sm text-muted-foreground">Expiring</p><p className="text-lg sm:text-2xl font-bold">{stats.expiring}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" /></div>
          <div><p className="text-xs sm:text-sm text-muted-foreground">Expired</p><p className="text-lg sm:text-2xl font-bold">{stats.expired}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
              <SelectTrigger><SelectValue placeholder="All Pharmacies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pharmacies</SelectItem>
                {pharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(cat => <SelectItem key={cat} value={cat!}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger><SelectValue placeholder="Stock Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="available">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger><SelectValue placeholder="Expiry Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expiry</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filteredMedicines.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No medicines found</p>
        ) : (
          filteredMedicines.map(med => (
            <Card key={med.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.pharmacy_name}</p>
                  </div>
                  <Badge variant={med.stock_quantity === 0 ? 'destructive' : isLowStock(med.stock_quantity, med.low_stock_threshold) ? 'secondary' : 'default'} className="text-xs shrink-0">
                    {med.stock_quantity} in stock
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Sell: </span>{formatCurrency(med.price)}</div>
                  <div><span className="text-muted-foreground">Buy: </span>{med.buying_price ? formatCurrency(med.buying_price) : '-'}</div>
                  <div><span className="text-muted-foreground">Profit: </span>
                    {med.profit ? <span className={med.profit >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(med.profit)}</span> : '-'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {med.category && <Badge variant="outline" className="text-xs">{med.category}</Badge>}
                  {med.expiry_date && (
                    <Badge variant={isExpired(med.expiry_date) ? 'destructive' : isExpiringSoon(med.expiry_date) ? 'secondary' : 'outline'} className="text-xs">
                      {format(new Date(med.expiry_date), 'MMM dd, yyyy')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">Buying</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredMedicines.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No medicines found</TableCell></TableRow>
                ) : (
                  filteredMedicines.map(med => (
                    <TableRow key={med.id}>
                      <TableCell className="font-medium">{med.name}</TableCell>
                      <TableCell>{med.pharmacy_name}</TableCell>
                      <TableCell>{med.category ? <Badge variant="outline">{med.category}</Badge> : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(med.price)}</TableCell>
                      <TableCell className="text-right">{med.buying_price ? formatCurrency(med.buying_price) : '-'}</TableCell>
                      <TableCell className="text-right">
                        {med.profit ? <span className={med.profit >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(med.profit)}</span> : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={med.stock_quantity === 0 ? 'destructive' : isLowStock(med.stock_quantity, med.low_stock_threshold) ? 'secondary' : 'default'}>
                          {med.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {med.expiry_date ? (
                          <Badge variant={isExpired(med.expiry_date) ? 'destructive' : isExpiringSoon(med.expiry_date) ? 'secondary' : 'outline'}>
                            {format(new Date(med.expiry_date), 'MMM dd, yyyy')}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PullToRefreshContainer>
  );
};

export default AdminMedicines;
