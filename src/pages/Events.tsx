import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { format } from 'date-fns';

const eventColors: Record<string, string> = {
  MASUK: 'bg-green-600 text-white',
  KELUAR: 'bg-orange-500 text-white',
  UNKNOWN: 'bg-red-600 text-white',
};

const ppeLabels: Record<string, string> = {
  HEAD_COVER: 'Penutup Kepala',
  HAND_COVER: 'Sarung Tangan',
  FACE_COVER: 'Masker',
  SAFETY_SHOES: 'Sepatu Safety',
  REFLECTIVE_VEST: 'Rompi Reflektif',
};

function getPpeStatus(ppe: any): { label: string; ok: boolean } {
  if (!ppe || typeof ppe !== 'object') return { label: '—', ok: true };
  const items = Object.entries(ppe);
  if (items.length === 0) return { label: '—', ok: true };
  const allOk = items.every(([, v]) => v === true);
  return allOk ? { label: 'Lengkap', ok: true } : { label: 'Perlu Perhatian', ok: false };
}

export default function Events() {
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', dateFilter],
    queryFn: async () => {
      const startOfDay = `${dateFilter}T00:00:00`;
      const endOfDay = `${dateFilter}T23:59:59`;
      const { data, error } = await supabase
        .from('events')
        .select('*, workers(nama, sid), cameras(name, zones(name))')
        .gte('detected_at', startOfDay)
        .lte('detected_at', endOfDay)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <AppLayout title="Event Terkini">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-[180px]" />
          <span className="text-sm text-muted-foreground">{events.length} event</span>
        </div>

        {events.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Activity className="h-12 w-12 mb-3" />
            <p>Tidak ada event pada tanggal ini</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Kamera</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>APD</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev: any) => {
                  const ppe = getPpeStatus(ev.ppe_results);
                  const isOpen = expandedId === ev.id;
                  return (
                    <Collapsible key={ev.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : ev.id)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer">
                            <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                            <TableCell className="text-xs">{format(new Date(ev.detected_at), 'HH:mm:ss')}</TableCell>
                            <TableCell>
                              {ev.workers ? (
                                <div>
                                  <p className="text-sm font-medium">{ev.workers.nama}</p>
                                  <p className="text-xs text-muted-foreground">{ev.workers.sid}</p>
                                </div>
                              ) : <span className="text-muted-foreground text-xs">Tidak dikenal</span>}
                            </TableCell>
                            <TableCell className="text-xs">{ev.cameras?.name || '—'}</TableCell>
                            <TableCell className="text-xs">{ev.cameras?.zones?.name || '—'}</TableCell>
                            <TableCell>
                              <Badge className={`${eventColors[ev.event_type] || ''} text-[10px]`}>{ev.event_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={ppe.ok ? 'secondary' : 'destructive'} className="text-[10px]">{ppe.label}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{ev.confidence_score != null ? `${(ev.confidence_score * 100).toFixed(0)}%` : '—'}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/50 p-4">
                              <p className="text-xs font-medium mb-2">Detail APD:</p>
                              {ev.ppe_results && typeof ev.ppe_results === 'object' && Object.keys(ev.ppe_results).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(ev.ppe_results).map(([key, val]) => (
                                    <Badge key={key} variant={val ? 'secondary' : 'destructive'} className="text-[10px]">
                                      {ppeLabels[key] || key}: {val ? '✓' : '✗'}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Tidak ada data APD</p>
                              )}
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
