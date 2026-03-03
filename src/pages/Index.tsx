import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, ShieldCheck, Activity, MapPin } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const Index = () => {
  const { userRole, user } = useAuth();

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-semibold">Selamat Datang 👋</h2>
          <p className="text-sm text-muted-foreground">
            {user?.email} — <span className="capitalize">{userRole?.replace('_', ' ') || 'Belum ada role'}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Total Pekerja" value="5" icon={Users} color="bg-primary/10 text-primary" />
          <StatCard title="Zona Aktif" value="5" icon={MapPin} color="bg-success/10 text-success" />
          <StatCard title="Kamera Aktif" value="10" icon={Camera} color="bg-primary/10 text-primary" />
          <StatCard title="Event Hari Ini" value="23" icon={Activity} color="bg-warning/10 text-warning" />
          <StatCard title="Alert Baru" value="3" icon={AlertTriangle} color="bg-destructive/10 text-destructive" />
          <StatCard title="Kepatuhan APD" value="87%" icon={ShieldCheck} color="bg-success/10 text-success" />
        </div>

        {/* Quick Info */}
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
