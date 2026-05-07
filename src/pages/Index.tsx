import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { id as idLocale, enUS } from 'date-fns/locale';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('en') ? enUS : idLocale;

  const { data: workerCount, isLoading: wl } = useQuery({
    queryKey: ['stats-workers'],
    queryFn: async () => { const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('is_active', true); return count ?? 0; },
  });

  const { data: zoneCount, isLoading: zl } = useQuery({
    queryKey: ['stats-zones-active-cameras'],
    queryFn: async () => {
      const { data } = await supabase.from('cameras').select('zone_id').eq('is_active', true);
      const uniqueZones = new Set((data || []).map(c => c.zone_id));
      return uniqueZones.size;
    },
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
      const { data: todayAlerts } = await supabase.from('alerts').select('id').gte('created_at', today);
      if (!todayAlerts || todayAlerts.length === 0) return 0;
      const alertIds = todayAlerts.map(a => a.id);
      const { data: vals } = await supabase.from('supervisor_validations').select('alert_id').in('alert_id', alertIds);
      const validatedSet = new Set((vals || []).map((v: any) => v.alert_id));
      return validatedSet.size;
    },
  });

  const unvalidatedCount = (alertCount ?? 0) - validatedCount;

  const { data: chartAlerts = [] } = useQuery({
    queryKey: ['stats-7day-alerts'],
    queryFn: async () => {
      const from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const { data } = await supabase.from('alerts').select('id, created_at, alert_type').gte('created_at', `${from}T00:00:00`);
      return data || [];
    },
  });

  const { data: chartValidations = [] } = useQuery({
    queryKey: ['stats-7day-validations'],
    queryFn: async () => {
      const from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const { data } = await supabase.from('supervisor_validations').select('alert_id, status').gte('created_at', `${from}T00:00:00`);
      return data || [];
    },
  });

  const validationMap = useMemo(() => {
    const map = new Map<string, string>();
    chartValidations.forEach((v: any) => map.set(v.alert_id, v.status));
    return map;
  }, [chartValidations]);

  const makeDays = () => Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'dd MMM', { locale: dateLocale }), valid: 0, tidak_valid: 0, belum: 0 };
  });

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'dd MMM', { locale: dateLocale }), sudah: 0, belum: 0 };
    });
    chartAlerts.forEach((a: any) => {
      const aDate = a.created_at?.substring(0, 10);
      const day = days.find(d => d.date === aDate);
      if (day) {
        if (validationMap.has(a.id)) day.sudah++;
        else day.belum++;
      }
    });
    return days;
  }, [chartAlerts, validationMap, dateLocale]);

  const apdChartData = useMemo(() => {
    const days = makeDays();
    chartAlerts.filter((a: any) => a.alert_type === 'APD_VIOLATION' || a.alert_type === 'UNKNOWN_PERSON').forEach((a: any) => {
      const day = days.find(d => d.date === a.created_at?.substring(0, 10));
      if (day) {
        const status = validationMap.get(a.id);
        if (status === 'VALID') day.valid++;
        else if (status === 'TIDAK_VALID') day.tidak_valid++;
        else day.belum++;
      }
    });
    return days;
  }, [chartAlerts, validationMap, dateLocale]);

  const exitChartData = useMemo(() => {
    const days = makeDays();
    chartAlerts.filter((a: any) => a.alert_type === 'UNAUTHORIZED_EXIT').forEach((a: any) => {
      const day = days.find(d => d.date === a.created_at?.substring(0, 10));
      if (day) {
        const status = validationMap.get(a.id);
        if (status === 'VALID') day.valid++;
        else if (status === 'TIDAK_VALID') day.tidak_valid++;
        else day.belum++;
      }
    });
    return days;
  }, [chartAlerts, validationMap, dateLocale]);

  return (
    <AppLayout title={t('dashboard.title')}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{t('dashboard.welcome')}</h2>
          <p className="text-sm text-muted-foreground">
            {user?.email} — <span className="capitalize">{userRole || t('dashboard.noRole')}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title={t('dashboard.stats.activeWorkers')} value={String(workerCount ?? 0)} icon={Users} color="bg-primary/10 text-primary" loading={wl} />
          <StatCard title={t('dashboard.stats.activeZones')} value={String(zoneCount ?? 0)} icon={MapPin} color="bg-green-500/10 text-green-600" loading={zl} />
          <StatCard title={t('dashboard.stats.activeCameras')} value={String(cameraCount ?? 0)} icon={Camera} color="bg-primary/10 text-primary" loading={cl} />
          <StatCard title={t('dashboard.stats.alertsToday')} value={String(alertCount ?? 0)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-600" loading={al} />
          <StatCard title={t('dashboard.stats.validated')} value={String(validatedCount)} icon={CheckCircle} color="bg-green-500/10 text-green-600" loading={vl} />
          <StatCard title={t('dashboard.stats.notValidated')} value={String(unvalidatedCount)} icon={XCircle} color="bg-destructive/10 text-destructive" loading={vl || al} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.charts.alerts7Days')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sudah" name={t('dashboard.charts.validated')} fill="hsl(var(--primary))" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="belum" name={t('dashboard.charts.notValidated')} fill="hsl(var(--destructive))" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.charts.apd7Days')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={apdChartData}>
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valid" name={t('dashboard.charts.valid')} fill="hsl(var(--chart-2))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tidak_valid" name={t('dashboard.charts.invalid')} fill="hsl(var(--destructive))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="belum" name={t('dashboard.charts.notValidated')} fill="hsl(var(--muted-foreground))" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.charts.exit7Days')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={exitChartData}>
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valid" name={t('dashboard.charts.valid')} fill="hsl(var(--chart-2))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tidak_valid" name={t('dashboard.charts.invalid')} fill="hsl(var(--destructive))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="belum" name={t('dashboard.charts.notValidated')} fill="hsl(var(--muted-foreground))" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
