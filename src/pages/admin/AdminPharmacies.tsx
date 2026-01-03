import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Users, Pill, DollarSign, Search, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PharmacyData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  staff_count: number;
  medicine_count: number;
  yearly_sales: number;
}

const AdminPharmacies = () => {
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<PharmacyData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPharmacies();
  }, []);

  useEffect(() => {
    const filtered = pharmacies.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPharmacies(filtered);
  }, [searchQuery, pharmacies]);

  const fetchPharmacies = async () => {
    setLoading(true);

    const { data: pharmacyData } = await supabase
      .from('pharmacies')
      .select('*');

    if (!pharmacyData) {
      setLoading(false);
      return;
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const enrichedPharmacies: PharmacyData[] = await Promise.all(
      pharmacyData.map(async (pharmacy) => {
        const [staffRes, medicineRes, receiptsRes] = await Promise.all([
          supabase
            .from('pharmacy_staff')
            .select('id', { count: 'exact' })
            .eq('pharmacy_id', pharmacy.id),
          supabase
            .from('medicines')
            .select('id', { count: 'exact' })
            .eq('pharmacy_id', pharmacy.id),
          supabase
            .from('receipts')
            .select('total_amount')
            .eq('pharmacy_id', pharmacy.id)
            .gte('created_at', startOfYear)
            .lte('created_at', endOfYear),
        ]);

        const yearlySales = receiptsRes.data?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;

        return {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          phone: pharmacy.phone,
          email: pharmacy.email,
          staff_count: staffRes.count || 0,
          medicine_count: medicineRes.count || 0,
          yearly_sales: yearlySales,
        };
      })
    );

    setPharmacies(enrichedPharmacies);
    setFilteredPharmacies(enrichedPharmacies);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pharmacies"
        description="View and manage all pharmacies in the system"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pharmacies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPharmacies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pharmacies Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'No pharmacies have been added yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPharmacies.map((pharmacy, index) => (
            <Card
              key={pharmacy.id}
              className="card-hover cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => navigate(`/admin/pharmacies/${pharmacy.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pharmacy.name}</CardTitle>
                      {pharmacy.email && (
                        <p className="text-sm text-muted-foreground">{pharmacy.email}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                {pharmacy.address && (
                  <p className="text-sm text-muted-foreground mb-4">{pharmacy.address}</p>
                )}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold">{pharmacy.staff_count}</p>
                    <p className="text-xs text-muted-foreground">Staff</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Pill className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold">{pharmacy.medicine_count}</p>
                    <p className="text-xs text-muted-foreground">Medicines</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(pharmacy.yearly_sales)}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPharmacies;
