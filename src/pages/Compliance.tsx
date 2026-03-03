import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, subDays } from 'date-fns';

const PIE_COLORS = ['hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))'];
const alertTypeLabels: Record<string, string> = {
  UNAUTHORIZED_EXIT: 'Keluar Tanpa Izin',
  APD_VIOLATION: 'Pelanggaran APD',
  UNKNOWN_PERSON: 'Orang Tidak Dikenal',
};

export default function Compliance() {
  const { data: stats } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn: async () => {
      const [eventsRes, alertsRes] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('alerts').select('*', { count: 'exact', head: true }),
      ]);
      const totalEvents = eventsRes.count || 0;
      const totalViolations = alertsRes.count || 0;
      const rate = totalEvents > 0 ? ((totalEvents - totalViolations) / totalEvents * 100).toFixed(1) : '100';
      return { totalEvents, totalViolations, complianceRate: rate };
    },
  });

  const { data: dailyData = [] } = useQuery({
    queryKey: ['compliance-daily'],
    queryFn: async () => {
      const days: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const start = format(d, 'yyyy-MM-dd') + 'T00:00:00';
        const end = format(d, 'yyyy-MM-dd') + 'T23:59:59';
        const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        days.push({ date: format(d, 'dd/MM'), count: count || 0 });
      }
      return days;
    },
  });

  const { data: pieData = [] } = useQuery({
    queryKey: ['compliance-pie'],
    queryFn: async () => {
      const types = ['UNAUTHORIZED_EXIT', 'APD_VIOLATION', 'UNKNOWN_PERSON'] as const;
      const result = await Promise.all(types.map(async (t) => {
        const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('alert_type', t);
        return { name: alertTypeLabels[t], value: count || 0 };
      }));
      return result.filter((r) => r.value > 0);
    },
  });

  return (
    <AppLayout title="Laporan Kepatuhan">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Event</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats?.totalEvents ?? '—'}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pelanggaran</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats?.totalViolations ?? '—'}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tingkat Kepatuhan</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats?.complianceRate ?? '—'}%</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Pelanggaran 7 Hari Terakhir</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pelanggaran" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Breakdown Tipe Pelanggaran</CardTitle></CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-16">Belum ada data</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
