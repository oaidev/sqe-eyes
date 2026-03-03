import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, ShieldCheck, Activity, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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

const Index = () => {
  const { userRole, user } = useAuth();

  const { data: workerCount, isLoading: wl } = useQuery({
    queryKey: ['stats-workers'],
    queryFn: async () => {
      const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('is_active', true);
      return count ?? 0;
    },
  });

  const { data: zoneCount, isLoading: zl } = useQuery({
    queryKey: ['stats-zones'],
    queryFn: async () => {
      const { count } = await supabase.from('zones').select('*', { count: 'exact', head: true }).eq('is_active', true);
      return count ?? 0;
    },
  });

  const { data: cameraCount, isLoading: cl } = useQuery({
    queryKey: ['stats-cameras'],
    queryFn: async () => {
      const { count } = await supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('is_active', true);
      return count ?? 0;
    },
  });

  const { data: eventCount, isLoading: el } = useQuery({
    queryKey: ['stats-events-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('events').select('*', { count: 'exact', head: true }).gte('detected_at', today);
      return count ?? 0;
    },
  });

  const { data: alertCount, isLoading: al } = useQuery({
    queryKey: ['stats-alerts-baru'],
    queryFn: async () => {
      const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'BARU');
      return count ?? 0;
    },
  });

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Selamat Datang 👋</h2>
          <p className="text-sm text-muted-foreground">
            {user?.email} — <span className="capitalize">{userRole?.replace('_', ' ') || 'Belum ada role'}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Total Pekerja" value={String(workerCount ?? 0)} icon={Users} color="bg-primary/10 text-primary" loading={wl} />
          <StatCard title="Zona Aktif" value={String(zoneCount ?? 0)} icon={MapPin} color="bg-success/10 text-success" loading={zl} />
          <StatCard title="Kamera Aktif" value={String(cameraCount ?? 0)} icon={Camera} color="bg-primary/10 text-primary" loading={cl} />
          <StatCard title="Event Hari Ini" value={String(eventCount ?? 0)} icon={Activity} color="bg-warning/10 text-warning" loading={el} />
          <StatCard title="Alert Baru" value={String(alertCount ?? 0)} icon={AlertTriangle} color="bg-destructive/10 text-destructive" loading={al} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Site</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><strong>Site:</strong> LMO Berau — PT Bukit Makmur Mandiri Utama</p>
            <p><strong>Lokasi:</strong> Berau, Kalimantan Timur, Indonesia</p>
            <p><strong>Zona Terpantau:</strong> Workshop Bigshop, Workshop LCC, Office Area, Fuel Station, Parking Area</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Index;
