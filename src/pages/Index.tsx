import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useMemo } from 'react';

const StatCard = ({ title, value, icon: Icon, color, loading }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; loading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

export default function Index() {
  const { userRole, user } = useAuth();

  const { data: workerCount, isLoading: wl } = useQuery({
    queryKey: ['stats-workers'],
    queryFn: async () => { const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('is_active', true); return count ?? 0; },
  });

  const { data: zoneCount, isLoading: zl } = useQuery({
    queryKey: ['stats-zones'],
    queryFn: async () => { const { count } = await supabase.from('zones').select('*', { count: 'exact', head: true }).eq('is_active', true); return count ?? 0; },
  });

  const { data: cameraCount, isLoading: cl } = useQuery({
    queryKey: ['stats-cameras'],
    queryFn: async () => { const { count } = await supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('is_active', true); return count ?? 0; },
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: alertCount, isLoading: al } = useQuery({
    queryKey: ['stats-alerts-today'],
    queryFn: async () => { const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).gte('created_at', today); return count ?? 0; },
  });

  const { data: validatedCount = 0, isLoading: vl } = useQuery({
    queryKey: ['stats-validated-today'],
    queryFn: async () => {
      // Get today's alerts that have at least one validation
      const { data: todayAlerts } = await supabase.from('alerts').select('id').gte('created_at', today);
      if (!todayAlerts || todayAlerts.length === 0) return 0;
      const alertIds = todayAlerts.map(a => a.id);
      const { data: vals } = await supabase.from('supervisor_validations').select('alert_id').in('alert_id', alertIds);
      const validatedSet = new Set((vals || []).map((v: any) => v.alert_id));
      return validatedSet.size;
    },
  });

  const unvalidatedCount = (alertCount ?? 0) - validatedCount;

  // 7-day chart data
  const { data: chartValidations = [] } = useQuery({
    queryKey: ['stats-7day-validations'],
    queryFn: async () => {
      const from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const { data } = await supabase.from('supervisor_validations').select('status, created_at').gte('created_at', `${from}T00:00:00`);
      return data || [];
    },
  });

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'dd MMM', { locale: idLocale }), valid: 0, tidak_valid: 0 };
    });
    chartValidations.forEach((v: any) => {
      const vDate = v.created_at?.substring(0, 10);
      const day = days.find(d => d.date === vDate);
      if (day) {
        if (v.status === 'VALID') day.valid++;
        else if (v.status === 'TIDAK_VALID') day.tidak_valid++;
      }
    });
    return days;
  }, [chartValidations]);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Selamat Datang 👋</h2>
          <p className="text-sm text-muted-foreground">
            {user?.email} — <span className="capitalize">{userRole || 'Belum ada role'}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Pekerja Aktif" value={String(workerCount ?? 0)} icon={Users} color="bg-primary/10 text-primary" loading={wl} />
          <StatCard title="Zona Aktif" value={String(zoneCount ?? 0)} icon={MapPin} color="bg-green-500/10 text-green-600" loading={zl} />
          <StatCard title="Kamera Aktif" value={String(cameraCount ?? 0)} icon={Camera} color="bg-primary/10 text-primary" loading={cl} />
          <StatCard title="Alert Hari Ini" value={String(alertCount ?? 0)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-600" loading={al} />
          <StatCard title="Sudah Divalidasi" value={String(validatedCount)} icon={CheckCircle} color="bg-green-500/10 text-green-600" loading={vl} />
          <StatCard title="Belum Divalidasi" value={String(unvalidatedCount)} icon={XCircle} color="bg-destructive/10 text-destructive" loading={vl || al} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validasi 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="valid" name="Valid" fill="hsl(var(--destructive))" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tidak_valid" name="Tidak Valid" fill="hsl(var(--primary))" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
