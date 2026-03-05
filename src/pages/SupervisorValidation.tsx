import { useState, useMemo } from 'react';
import { BoundingBoxOverlay } from '@/components/simulate/BoundingBoxOverlay';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Download, Activity, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const PPE_LABELS: Record<string, string> = {
  HEAD_COVER: 'Helm', HAND_COVER: 'Sarung Tangan', SAFETY_GLASSES: 'Kacamata Safety',
  SAFETY_SHOES: 'Sepatu Safety', REFLECTIVE_VEST: 'Rompi Reflektif',
};

const JENIS_PELANGGARAN_OPTIONS = [
  { value: 'APD_TIDAK_LENGKAP', label: 'APD Tidak Lengkap' },
  { value: 'KELUAR_TANPA_IZIN', label: 'Keluar Zona' },
];

function getAlasanOptions(jenisPelanggaran: string, status: string) {
  if (jenisPelanggaran === 'APD_TIDAK_LENGKAP') {
    if (status === 'VALID') return [{ value: 'APD_TIDAK_LENGKAP', label: 'APD Tidak Lengkap' }, { value: 'LAINNYA', label: 'Alasan Lainnya' }];
    return [{ value: 'APD_LENGKAP', label: 'APD Lengkap' }, { value: 'LAINNYA', label: 'Alasan Lainnya' }];
  }
  if (jenisPelanggaran === 'KELUAR_TANPA_IZIN') {
    if (status === 'VALID') return [{ value: 'TIDAK_ADA_IZIN', label: 'Tidak Ada Izin' }, { value: 'LAINNYA', label: 'Alasan Lainnya' }];
    return [{ value: 'SUDAH_IZIN', label: 'Sudah Ada Izin' }, { value: 'LAINNYA', label: 'Alasan Lainnya' }];
  }
  return [{ value: 'LAINNYA', label: 'Alasan Lainnya' }];
}

interface EventRow {
  id: string;
  detected_at: string;
  event_type: string;
  ppe_results: any;
  snapshot_url: string | null;
  bounding_box: any;
  worker_id: string | null;
  camera_id: string | null;
  workers: { nama: string; sid: string } | null;
  cameras: { name: string; point_type: string; zone_id: string; jenis_pelanggaran: string | null; zones: { name: string } | null } | null;
  alerts: { id: string; alert_type: string; status: string }[];
}

interface ValidationRow {
  id: string;
  alert_id: string;
  status: string;
  validation_level: string;
  alasan_type: string | null;
  alasan_text: string | null;
  supervisor_id: string;
  jenis_pelanggaran: string | null;
}

export default function SupervisorValidation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchSid, setSearchSid] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterCamera, setFilterCamera] = useState('all');
  const [filterJenisPelanggaran, setFilterJenisPelanggaran] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [finalStatus, setFinalStatus] = useState<'VALID' | 'TIDAK_VALID'>('VALID');
  const [alasanType, setAlasanType] = useState('APD_TIDAK_LENGKAP');
  const [alasanText, setAlasanText] = useState('');
  const [reviseSid, setReviseSid] = useState('__none__');
  const [jenisPelanggaran, setJenisPelanggaran] = useState('APD_TIDAK_LENGKAP');

  const { data: operatorValidations = [] } = useQuery({
    queryKey: ['all-validations'],
    queryFn: async () => {
      const { data } = await supabase.from('supervisor_validations').select('*').eq('validation_level', 'operator');
      return (data || []) as ValidationRow[];
    },
  });

  const validatedAlertIds = useMemo(() => new Set(operatorValidations.map(v => v.alert_id)), [operatorValidations]);
  const opValidationMap = useMemo(() => {
    const map: Record<string, ValidationRow> = {};
    operatorValidations.forEach(v => { map[v.alert_id] = v; });
    return map;
  }, [operatorValidations]);

  const { data: supervisorValidations = [] } = useQuery({
    queryKey: ['supervisor-validations'],
    queryFn: async () => {
      const { data } = await supabase.from('supervisor_validations').select('*').eq('validation_level', 'supervisor');
      return (data || []) as ValidationRow[];
    },
  });
  const supValidationMap = useMemo(() => {
    const map: Record<string, ValidationRow> = {};
    supervisorValidations.forEach(v => { map[v.alert_id] = v; });
    return map;
  }, [supervisorValidations]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['supervisor-events', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, workers(nama, sid), cameras(name, point_type, zone_id, jenis_pelanggaran, zones(name)), alerts(id, alert_type, status)')
        .gte('detected_at', `${dateFrom}T00:00:00`)
        .lte('detected_at', `${dateTo}T23:59:59`)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EventRow[];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones-list'],
    queryFn: async () => { const { data } = await supabase.from('zones').select('id, name'); return data || []; },
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-list'],
    queryFn: async () => { const { data } = await supabase.from('cameras').select('id, name'); return data || []; },
  });

  const { data: allWorkers = [] } = useQuery({
    queryKey: ['workers-for-revision'],
    queryFn: async () => {
      const { data } = await supabase.from('workers').select('id, sid, nama').eq('is_active', true).order('sid');
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return events.filter(e => {
      const alert = e.alerts?.[0];
      if (!alert || !validatedAlertIds.has(alert.id)) return false;
      if (searchSid) {
        const q = searchSid.toLowerCase();
        if (!e.workers?.sid?.toLowerCase().includes(q) && !e.workers?.nama?.toLowerCase().includes(q)) return false;
      }
      const opVal = opValidationMap[alert.id];
      const supVal = supValidationMap[alert.id];
      const currentStatus = supVal?.status || opVal?.status || 'BARU';
      if (filterStatus !== 'all' && currentStatus !== filterStatus) return false;
      if (filterZone !== 'all' && e.cameras?.zone_id !== filterZone) return false;
      if (filterCamera !== 'all' && e.camera_id !== filterCamera) return false;
      if (filterJenisPelanggaran !== 'all' && e.cameras?.jenis_pelanggaran !== filterJenisPelanggaran) return false;
      return true;
    });
  }, [events, validatedAlertIds, searchSid, filterStatus, filterZone, filterCamera, filterJenisPelanggaran, opValidationMap, supValidationMap]);

  const getStatus = (e: EventRow) => {
    const alert = e.alerts?.[0];
    if (!alert) return '-';
    const sup = supValidationMap[alert.id];
    if (sup) return sup.status;
    return 'BELUM';
  };

  const getJenisPelanggaran = (e: EventRow) => {
    const alert = e.alerts?.[0];
    if (!alert) return e.cameras?.jenis_pelanggaran || null;
    const sup = supValidationMap[alert.id];
    if (sup?.jenis_pelanggaran) return sup.jenis_pelanggaran;
    const op = opValidationMap[alert.id];
    return op?.jenis_pelanggaran || e.cameras?.jenis_pelanggaran || null;
  };

  const alasanOptions = getAlasanOptions(jenisPelanggaran, finalStatus);

  const submitFinal = useMutation({
    mutationFn: async () => {
      if (!selectedEvent || !user) return;
      const alert = selectedEvent.alerts?.[0];
      if (!alert) throw new Error('Tidak ada alert');

      if (reviseSid && reviseSid !== '__none__') {
        await supabase.from('events').update({ worker_id: reviseSid } as any).eq('id', selectedEvent.id);
      }

      const { error } = await supabase.from('supervisor_validations').insert({
        alert_id: alert.id,
        supervisor_id: user.id,
        status: finalStatus,
        validation_level: 'supervisor',
        alasan_type: alasanType as any,
        alasan_text: alasanType === 'LAINNYA' ? alasanText : null,
        jenis_pelanggaran: jenisPelanggaran,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Validasi final disimpan' });
      qc.invalidateQueries({ queryKey: ['supervisor-validations'] });
      qc.invalidateQueries({ queryKey: ['supervisor-events'] });
      setSelectedEvent(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'VALID': return <Badge variant="destructive">Valid</Badge>;
      case 'TIDAK_VALID': return <Badge variant="outline">Tidak Valid</Badge>;
      case 'BELUM': return <Badge variant="secondary">Belum</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const exportExcel = () => {
    const headers = ['Tanggal', 'Pekerja', 'SID', 'Kamera', 'Zona', 'Status Operator', 'Status Final', 'Jenis Pelanggaran'];
    const rows = filtered.map(e => {
      const alert = e.alerts?.[0];
      const op = alert ? opValidationMap[alert.id] : null;
      const jp = getJenisPelanggaran(e);
      const jpLabel = JENIS_PELANGGARAN_OPTIONS.find(o => o.value === jp)?.label || jp || '-';
      return [
        format(new Date(e.detected_at), 'dd/MM/yyyy HH:mm'),
        e.workers?.nama || 'Tidak Dikenal', e.workers?.sid || '-',
        e.cameras?.name || '-', e.cameras?.zones?.name || '-',
        op?.status || '-', getStatus(e), jpLabel,
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `validasi-supervisor-${dateFrom}-${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const ppeResults = selectedEvent?.ppe_results || {};

  const openEventDialog = (e: EventRow) => {
    const alert = e.alerts?.[0];
    const opVal = alert ? opValidationMap[alert.id] : null;
    const camJp = e.cameras?.jenis_pelanggaran || opVal?.jenis_pelanggaran || 'APD_TIDAK_LENGKAP';
    setSelectedEvent(e);
    setFinalStatus('VALID');
    setJenisPelanggaran(camJp);
    const opts = getAlasanOptions(camJp, 'VALID');
    setAlasanType(opts[0]?.value || 'LAINNYA');
    setAlasanText('');
    setReviseSid('__none__');
  };

  return (
    <AppLayout title="Validasi Supervisor">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Event Tervalidasi</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />{filtered.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Final Supervisor</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />{supervisorValidations.length}</div></CardContent></Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
          <span className="text-sm text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari SID/Nama..." value={searchSid} onChange={e => setSearchSid(e.target.value)} className="pl-8 w-[160px]" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="VALID">Valid</SelectItem>
              <SelectItem value="TIDAK_VALID">Tidak Valid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Zona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Zona</SelectItem>
              {zones.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterJenisPelanggaran} onValueChange={setFilterJenisPelanggaran}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Jenis Pelanggaran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {JENIS_PELANGGARAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal & Waktu</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Kamera</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Status Operator</TableHead>
                  <TableHead>Status Final</TableHead>
                  <TableHead>Jenis Pelanggaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada event yang tervalidasi operator</TableCell></TableRow>
                ) : filtered.map(e => {
                  const alert = e.alerts?.[0];
                  const opVal = alert ? opValidationMap[alert.id] : null;
                  const jp = getJenisPelanggaran(e);
                  const jpLabel = JENIS_PELANGGARAN_OPTIONS.find(o => o.value === jp)?.label || '-';
                  return (
                    <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEventDialog(e)}>
                      <TableCell className="text-xs">{format(new Date(e.detected_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {e.workers ? <span>{e.workers.sid} - {e.workers.nama}</span> : <span className="text-destructive">Tidak Dikenal</span>}
                      </TableCell>
                      <TableCell className="text-sm">{e.cameras?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{e.cameras?.zones?.name || '-'}</TableCell>
                      <TableCell>{statusBadge(opVal?.status || '-')}</TableCell>
                      <TableCell>{statusBadge(getStatus(e))}</TableCell>
                      <TableCell className="text-xs">{jpLabel}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail / Final Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail & Validasi Final</DialogTitle>
            <DialogDescription>Validasi final supervisor jika diperlukan</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Waktu:</span> {format(new Date(selectedEvent.detected_at), 'dd MMM yyyy HH:mm:ss', { locale: idLocale })}</div>
                <div><span className="text-muted-foreground">Pekerja:</span> {selectedEvent.workers ? `${selectedEvent.workers.sid} - ${selectedEvent.workers.nama}` : 'Tidak Dikenal'}</div>
                <div><span className="text-muted-foreground">Kamera:</span> {selectedEvent.cameras?.name || '-'}</div>
                <div><span className="text-muted-foreground">Zona:</span> {selectedEvent.cameras?.zones?.name || '-'}</div>
              </div>

              {/* Operator validation info */}
              {selectedEvent.alerts?.[0] && opValidationMap[selectedEvent.alerts[0].id] && (() => {
                const opVal = opValidationMap[selectedEvent.alerts[0].id];
                const opJpLabel = JENIS_PELANGGARAN_OPTIONS.find(o => o.value === opVal.jenis_pelanggaran)?.label || opVal.jenis_pelanggaran || '-';
                return (
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Validasi Operator:</p>
                    <p>Status: {statusBadge(opVal.status)}</p>
                    <p className="mt-1">Jenis Pelanggaran: {opJpLabel}</p>
                    <p className="mt-1">Alasan: {opVal.alasan_type?.replace(/_/g, ' ') || '-'}</p>
                    {opVal.alasan_text && <p className="mt-1 text-muted-foreground">{opVal.alasan_text}</p>}
                  </div>
                );
              })()}

              {Object.keys(ppeResults).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Checklist APD</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(ppeResults).map(([item, val]: [string, any]) => (
                      <Badge key={item} variant={val?.detected ? 'default' : 'destructive'} className="gap-1">
                        {val?.detected ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {PPE_LABELS[item] || item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              <div className="space-y-3">
                {selectedEvent.snapshot_url && (
                  <div>
                    <Label className="text-sm font-medium">Foto Evidence</Label>
                    {selectedEvent.bounding_box ? (
                      <div className="mt-1">
                        <BoundingBoxOverlay
                          imageSrc={selectedEvent.snapshot_url}
                          persons={[{
                            boundingBox: selectedEvent.bounding_box,
                            workerName: selectedEvent.workers?.nama || null,
                            hasViolation: Object.values(selectedEvent.ppe_results || {}).some((v: any) => !v?.detected),
                            ppeStatus: Object.entries(selectedEvent.ppe_results || {})
                              .map(([k, v]: [string, any]) => `${PPE_LABELS[k] || k} ${v?.detected ? '✓' : '✗'}`)
                              .join(', '),
                            personIndex: 1,
                          }]}
                        />
                      </div>
                    ) : (
                      <img src={selectedEvent.snapshot_url} alt="Snapshot" className="mt-1 rounded-lg border max-h-64 object-contain w-full" />
                    )}
                  </div>
                )}
              </div>

              {/* Final form */}
              <div className="border-t pt-4 space-y-3">
                <Label className="font-medium">Validasi Final Supervisor</Label>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label className="text-sm">Revisi SID (Opsional)</Label>
                    <Select value={reviseSid} onValueChange={setReviseSid}>
                      <SelectTrigger><SelectValue placeholder="Pilih pekerja untuk revisi..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tidak ada revisi</SelectItem>
                        {allWorkers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.sid} - {w.nama}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Jenis Pelanggaran</Label>
                    <Select value={jenisPelanggaran} onValueChange={v => { setJenisPelanggaran(v); const opts = getAlasanOptions(v, finalStatus); setAlasanType(opts[0]?.value || 'LAINNYA'); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JENIS_PELANGGARAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Status</Label>
                    <Select value={finalStatus} onValueChange={v => { setFinalStatus(v as any); const opts = getAlasanOptions(jenisPelanggaran, v); setAlasanType(opts[0]?.value || 'LAINNYA'); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VALID">Valid</SelectItem>
                        <SelectItem value="TIDAK_VALID">Tidak Valid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Alasan</Label>
                    <Select value={alasanType} onValueChange={setAlasanType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {alasanOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {alasanType === 'LAINNYA' && (
                    <div className="grid gap-2">
                      <Label className="text-sm">Alasan Lainnya</Label>
                      <Textarea value={alasanText} onChange={e => setAlasanText(e.target.value)} placeholder="Tulis alasan..." />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Tutup</Button>
            <Button onClick={() => submitFinal.mutate()} disabled={submitFinal.isPending}>
              {submitFinal.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Simpan Final
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
