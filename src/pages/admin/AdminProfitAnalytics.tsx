import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface ProfitData {
  period: string;
  profit: number;
  revenue: number;
  cost: number;
}

interface PharmacyProfit {
  name: string;
  profit: number;
}

const AdminProfitAnalytics = () => {
  const [dailyData, setDailyData] = useState<ProfitData[]>([]);
  const [weeklyData, setWeeklyData] = useState<ProfitData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ProfitData[]>([]);
  const [pharmacyProfits, setPharmacyProfits] = useState<PharmacyProfit[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    yearProfit: 0,
  });

  useEffect(() => {
    fetchProfitData();
  }, [selectedYear, selectedMonth]);

  const fetchProfitData = async () => {
    setLoading(true);

    // Get date ranges
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
    const startOfYear = `${selectedYear}-01-01T00:00:00`;
    const endOfYear = `${selectedYear}-12-31T23:59:59`;

    // Fetch all receipt items with receipts for the year
    const { data: receiptItems } = await supabase
      .from('receipt_items')
      .select(`
        profit,
        selling_price,
        buying_price,
        quantity,
        receipt_id,
        receipts!inner(created_at, pharmacy_id, pharmacies(name))
      `)
      .gte('receipts.created_at', startOfYear)
      .lte('receipts.created_at', endOfYear);

    if (!receiptItems) {
      setLoading(false);
      return;
    }

    // Calculate daily profit for the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyProfits: ProfitData[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(selectedYear, selectedMonth - 1, day);
      const dayEnd = new Date(selectedYear, selectedMonth - 1, day, 23, 59, 59);
      
      const dayItems = receiptItems.filter((item: any) => {
        const itemDate = new Date(item.receipts.created_at);
        return itemDate >= dayStart && itemDate <= dayEnd;
      });

      const profit = dayItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0);
      const revenue = dayItems.reduce((sum: number, item: any) => sum + (Number(item.selling_price) * item.quantity || 0), 0);
      const cost = dayItems.reduce((sum: number, item: any) => sum + (Number(item.buying_price) * item.quantity || 0), 0);

      dailyProfits.push({
        period: `${day}`,
        profit,
        revenue,
        cost,
      });
    }

    // Calculate weekly profit for the year
    const weeklyProfits: ProfitData[] = [];
    for (let week = 0; week < 52; week++) {
      const weekStart = new Date(selectedYear, 0, 1 + week * 7);
      const weekEnd = new Date(selectedYear, 0, 7 + week * 7, 23, 59, 59);
      
      const weekItems = receiptItems.filter((item: any) => {
        const itemDate = new Date(item.receipts.created_at);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });

      const profit = weekItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0);
      const revenue = weekItems.reduce((sum: number, item: any) => sum + (Number(item.selling_price) * item.quantity || 0), 0);
      const cost = weekItems.reduce((sum: number, item: any) => sum + (Number(item.buying_price) * item.quantity || 0), 0);

      if (profit > 0 || revenue > 0) {
        weeklyProfits.push({
          period: `W${week + 1}`,
          profit,
          revenue,
          cost,
        });
      }
    }

    // Calculate monthly profit for the year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyProfits: ProfitData[] = months.map((month, index) => {
      const monthItems = receiptItems.filter((item: any) => {
        const itemDate = new Date(item.receipts.created_at);
        return itemDate.getMonth() === index;
      });

      const profit = monthItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0);
      const revenue = monthItems.reduce((sum: number, item: any) => sum + (Number(item.selling_price) * item.quantity || 0), 0);
      const cost = monthItems.reduce((sum: number, item: any) => sum + (Number(item.buying_price) * item.quantity || 0), 0);

      return { period: month, profit, revenue, cost };
    });

    // Calculate pharmacy-wise profits
    const pharmacyMap = new Map<string, number>();
    receiptItems.forEach((item: any) => {
      const pharmacyName = item.receipts.pharmacies?.name || 'Unknown';
      const currentProfit = pharmacyMap.get(pharmacyName) || 0;
      pharmacyMap.set(pharmacyName, currentProfit + (Number(item.profit) || 0));
    });

    const pharmacyProfitsList: PharmacyProfit[] = Array.from(pharmacyMap.entries())
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit);

    // Calculate summary stats
    const todayItems = receiptItems.filter((item: any) => {
      const itemDate = new Date(item.receipts.created_at);
      return itemDate >= new Date(startOfDay);
    });

    const weekItems = receiptItems.filter((item: any) => {
      const itemDate = new Date(item.receipts.created_at);
      return itemDate >= new Date(startOfWeek);
    });

    const monthItems = receiptItems.filter((item: any) => {
      const itemDate = new Date(item.receipts.created_at);
      return itemDate >= new Date(startOfMonth) && itemDate <= new Date(endOfMonth);
    });

    setStats({
      todayProfit: todayItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0),
      weekProfit: weekItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0),
      monthProfit: monthItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0),
      yearProfit: receiptItems.reduce((sum: number, item: any) => sum + (Number(item.profit) || 0), 0),
    });

    setDailyData(dailyProfits);
    setWeeklyData(weeklyProfits.length > 0 ? weeklyProfits : []);
    setMonthlyData(monthlyProfits);
    setPharmacyProfits(pharmacyProfitsList);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profit Analytics"
        description="Track profit trends across all pharmacies"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Profit"
          value={formatCurrency(stats.todayProfit)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="This Week's Profit"
          value={formatCurrency(stats.weekProfit)}
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          title="This Month's Profit"
          value={formatCurrency(stats.monthProfit)}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          title="Year's Profit"
          value={formatCurrency(stats.yearProfit)}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Daily Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Profit - {months[selectedMonth - 1]?.label} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis tickFormatter={(val) => `$${val}`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Day ${label}`}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Profit Breakdown - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis tickFormatter={(val) => `$${val}`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="hsl(var(--muted-foreground))" name="Cost" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="hsl(142 76% 36%)" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pharmacy Profits */}
      <Card>
        <CardHeader>
          <CardTitle>Profit by Pharmacy - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {pharmacyProfits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No profit data available</p>
          ) : (
            <div className="space-y-4">
              {pharmacyProfits.map((pharmacy, index) => (
                <div key={pharmacy.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{pharmacy.name}</span>
                  </div>
                  <span className={`font-bold ${pharmacy.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(pharmacy.profit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfitAnalytics;
