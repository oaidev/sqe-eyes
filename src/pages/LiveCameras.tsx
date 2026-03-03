import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, MonitorPlay, ScanSearch } from 'lucide-react';
import { SimulateCameraDialog } from '@/components/cameras/SimulateCameraDialog';

export default function LiveCameras() {
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [simulateOpen, setSimulateOpen] = useState(false);
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('*, zones(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zones').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const filtered = zoneFilter === 'all' ? cameras : cameras.filter((c) => c.zone_id === zoneFilter);

  const pointLabel: Record<string, string> = { entry: 'Masuk', exit: 'Keluar', area: 'Area' };

  return (
    <AppLayout title="Live Kamera">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Zona</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} kamera</span>
          <div className="ml-auto">
            <Button onClick={() => setSimulateOpen(true)} size="sm" className="gap-1.5">
              <ScanSearch className="h-4 w-4" />
              Simulasi Deteksi
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Camera className="h-12 w-12 mb-3" />
            <p>Belum ada kamera terdaftar</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cam) => (
              <Card key={cam.id} className="overflow-hidden">
                <div className="relative bg-muted aspect-video flex items-center justify-center">
                  <MonitorPlay className="h-12 w-12 text-muted-foreground/40" />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {cam.is_active ? (
                      <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 animate-pulse">● LIVE</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">OFFLINE</Badge>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-[10px] bg-background/80">{pointLabel[cam.point_type] || cam.point_type}</Badge>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{cam.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{(cam as any).zones?.name || '—'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SimulateCameraDialog open={simulateOpen} onOpenChange={setSimulateOpen} />
    </AppLayout>
  );
}
