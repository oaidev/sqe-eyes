import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const alertTypeLabels: Record<string, string> = {
  UNAUTHORIZED_EXIT: 'Keluar Tanpa Izin',
  APD_VIOLATION: 'Pelanggaran APD',
  UNKNOWN_PERSON: 'Orang Tidak Dikenal',
};

export default function Violations() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ['violations-alerts', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from('alerts')
        .select('*, events(detected_at, workers(id, nama, sid), cameras(name, zones(name))), supervisor_validations(status, komentar)')
        .order('created_at', { ascending: false });
      if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00');
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Group by worker
  const workerMap = new Map<string, { nama: string; sid: string; violations: any[] }>();
  alerts.forEach((a: any) => {
    const w = a.events?.workers;
    if (!w) return;
    if (!workerMap.has(w.id)) workerMap.set(w.id, { nama: w.nama, sid: w.sid, violations: [] });
    workerMap.get(w.id)!.violations.push(a);
  });

  const workerList = Array.from(workerMap.entries())
    .map(([id, data]) => ({ id, ...data, total: data.violations.length, lastDate: data.violations[0]?.created_at }))
    .sort((a, b) => b.total - a.total);

  return (
    <AppLayout title="Rekap Pelanggaran">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" placeholder="Dari" />
          <span className="text-sm text-muted-foreground">s/d</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" placeholder="Sampai" />
          <span className="text-sm text-muted-foreground">{workerList.length} pekerja, {alerts.length} pelanggaran</span>
        </div>

        {workerList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-3" />
            <p>Tidak ada data pelanggaran</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Nama</TableHead>
                  <TableHead>SID</TableHead>
                  <TableHead>Total Pelanggaran</TableHead>
                  <TableHead>Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerList.map((w) => {
                  const isOpen = expandedId === w.id;
                  return (
                    <Collapsible key={w.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : w.id)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer">
                            <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                            <TableCell className="font-medium">{w.nama}</TableCell>
                            <TableCell className="text-xs">{w.sid}</TableCell>
                            <TableCell><Badge variant="destructive" className="text-[10px]">{w.total}</Badge></TableCell>
                            <TableCell className="text-xs">{w.lastDate ? format(new Date(w.lastDate), 'dd/MM/yy HH:mm') : '—'}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/50 p-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Waktu</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Zona</TableHead>
                                    <TableHead>Validasi</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {w.violations.map((v: any) => (
                                    <TableRow key={v.id}>
                                      <TableCell className="text-xs">{format(new Date(v.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                                      <TableCell><Badge variant="outline" className="text-[10px]">{alertTypeLabels[v.alert_type] || v.alert_type}</Badge></TableCell>
                                      <TableCell className="text-xs">{v.events?.cameras?.zones?.name || '—'}</TableCell>
                                      <TableCell>
                                        {v.supervisor_validations && v.supervisor_validations.length > 0
                                          ? <Badge variant="secondary" className="text-[10px]">{v.supervisor_validations[0].status}</Badge>
                                          : <span className="text-xs text-muted-foreground">Belum</span>}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
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
