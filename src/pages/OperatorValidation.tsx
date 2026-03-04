import { useState, useMemo } from 'react';
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
import { Loader2, Search, Download, Activity, AlertTriangle, ShieldCheck, ShieldAlert, Image, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const PPE_LABELS: Record<string, string> = {
  HEAD_COVER: 'Helm', HAND_COVER: 'Sarung Tangan', SAFETY_GLASSES: 'Kacamata Safety',
  FACE_COVER: 'Kacamata Safety', SAFETY_SHOES: 'Sepatu Safety', REFLECTIVE_VEST: 'Rompi Reflektif',
};

const ALASAN_OPTIONS = [
  { value: 'APD_TIDAK_LENGKAP', label: 'APD Tidak Lengkap' },
  { value: 'SUDAH_IZIN', label: 'Sudah Izin' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

interface EventRow {
  id: string;
  detected_at: string;
  event_type: string;
  confidence_score: number | null;
  ppe_results: any;
  snapshot_url: string | null;
  clip_url: string | null;
  worker_id: string | null;
  camera_id: string;
  workers: { nama: string; sid: string } | null;
  cameras: { name: string; point_type: string; zone_id: string; zones: { name: string } | null } | null;
  alerts: { id: string; alert_type: string; status: string }[];
}

export default function OperatorValidation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchSid, setSearchSid] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterCamera, setFilterCamera] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [validationStatus, setValidationStatus] = useState<'VALID' | 'TIDAK_VALID'>('VALID');
  const [alasanType, setAlasanType] = useState('APD_TIDAK_LENGKAP');
  const [alasanText, setAlasanText] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['operator-events', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, workers(nama, sid), cameras(name, point_type, zone_id, zones(name)), alerts(id, alert_type, status)')
        .gte('detected_at', `${dateFrom}T00:00:00`)
        .lte('detected_at', `${dateTo}T23:59:59`)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EventRow[];
    },
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['operator-validations'],
    queryFn: async () => {
      const { data } = await supabase.from('supervisor_validations').select('alert_id, status, validation_level');
      return data || [];
    },
  });

  const validationMap = useMemo(() => {
    const map: Record<string, string> = {};
    validations.forEach((v: any) => {
      if (v.validation_level === 'operator') map[v.alert_id] = v.status;
    });
    return map;
  }, [validations]);

  const { data: zones = [] } = useQuery({
    queryKey: ['zones-list'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('id, name');
      return data || [];
    },
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-list'],
    queryFn: async () => {
      const { data } = await supabase.from('cameras').select('id, name');
      return data || [];
    },
  });

  const getEventStatus = (event: EventRow) => {
    const alert = event.alerts?.[0];
    if (!alert) return 'TIDAK_ADA_ALERT';
    const validation = validationMap[alert.id];
    return validation || 'BARU';
  };

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (searchSid && !e.workers?.sid?.toLowerCase().includes(searchSid.toLowerCase())) return false;
      if (filterStatus !== 'all') {
        const status = getEventStatus(e);
        if (filterStatus === 'BARU' && status !== 'BARU') return false;
        if (filterStatus === 'VALID' && status !== 'VALID') return false;
        if (filterStatus === 'TIDAK_VALID' && status !== 'TIDAK_VALID') return false;
      }
      if (filterType !== 'all') {
        const alertType = e.alerts?.[0]?.alert_type;
        if (filterType === 'APD_VIOLATION' && alertType !== 'APD_VIOLATION') return false;
        if (filterType === 'UNKNOWN_PERSON' && alertType !== 'UNKNOWN_PERSON') return false;
      }
      if (filterZone !== 'all' && e.cameras?.zone_id !== filterZone) return false;
      if (filterCamera !== 'all' && e.camera_id !== filterCamera) return false;
      return true;
    });
  }, [events, searchSid, filterStatus, filterType, filterZone, filterCamera, validationMap]);

  const totalViolations = filtered.filter(e => e.alerts && e.alerts.length > 0).length;

  const submitValidation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent || !user) return;
      const alert = selectedEvent.alerts?.[0];
      if (!alert) throw new Error('Tidak ada alert untuk event ini');
      const { error } = await supabase.from('supervisor_validations').insert({
        alert_id: alert.id,
        supervisor_id: user.id,
        status: validationStatus,
        validation_level: 'operator',
        alasan_type: alasanType as any,
        alasan_text: alasanType === 'LAINNYA' ? alasanText : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Validasi disimpan' });
      qc.invalidateQueries({ queryKey: ['operator-validations'] });
      setSelectedEvent(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const exportExcel = () => {
    const headers = ['Tanggal', 'Pekerja', 'SID', 'Kamera', 'Tipe', 'Zona', 'Status', 'Tipe Pelanggaran', 'Confidence'];
    const rows = filtered.map(e => [
      format(new Date(e.detected_at), 'dd/MM/yyyy HH:mm'),
      e.workers?.nama || 'Tidak Dikenal',
      e.workers?.sid || '-',
      e.cameras?.name || '-',
      e.event_type,
      e.cameras?.zones?.name || '-',
      getEventStatus(e),
      e.alerts?.[0]?.alert_type || '-',
      e.confidence_score ? `${(e.confidence_score * 100).toFixed(0)}%` : '-',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `validasi-operator-${dateFrom}-${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'VALID': return <Badge className="bg-primary text-primary-foreground">Valid</Badge>;
      case 'TIDAK_VALID': return <Badge variant="destructive">Tidak Valid</Badge>;
      case 'BARU': return <Badge variant="outline">Baru</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  const ppeResults = selectedEvent?.ppe_results || {};

  return (
    <AppLayout title="Validasi Operator">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Event</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />{filtered.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Pelanggaran</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />{totalViolations}</div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
          <span className="text-sm text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari SID..." value={searchSid} onChange={e => setSearchSid(e.target.value)} className="pl-8 w-[140px]" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="BARU">Baru</SelectItem>
              <SelectItem value="VALID">Valid</SelectItem>
              <SelectItem value="TIDAK_VALID">Tidak Valid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="APD_VIOLATION">Pelanggaran APD</SelectItem>
              <SelectItem value="UNKNOWN_PERSON">Orang Tidak Dikenal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Zona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Zona</SelectItem>
              {zones.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCamera} onValueChange={setFilterCamera}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Kamera" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kamera</SelectItem>
              {cameras.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal & Waktu</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Kamera</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pelanggaran</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada event</TableCell></TableRow>
                ) : filtered.map(e => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedEvent(e); setValidationStatus('VALID'); setAlasanType('APD_TIDAK_LENGKAP'); setAlasanText(''); }}>
                    <TableCell className="text-xs">{format(new Date(e.detected_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</TableCell>
                    <TableCell className="font-medium text-sm">{e.workers?.nama || <span className="text-destructive">Tidak Dikenal</span>}</TableCell>
                    <TableCell className="text-sm">{e.cameras?.name || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.cameras?.point_type === 'entry' ? 'Masuk' : e.cameras?.point_type === 'exit' ? 'Keluar' : 'Area'}</Badge></TableCell>
                    <TableCell className="text-sm">{e.cameras?.zones?.name || '-'}</TableCell>
                    <TableCell>{statusBadge(getEventStatus(e))}</TableCell>
                    <TableCell><Badge variant={e.alerts?.[0] ? 'destructive' : 'secondary'} className="text-[10px]">{e.alerts?.[0]?.alert_type === 'APD_VIOLATION' ? 'APD' : e.alerts?.[0]?.alert_type === 'UNKNOWN_PERSON' ? 'Unknown' : '-'}</Badge></TableCell>
                    <TableCell className="text-xs">{e.confidence_score ? `${(e.confidence_score * 100).toFixed(0)}%` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Event</DialogTitle>
            <DialogDescription>Lihat detail dan lakukan validasi</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Waktu:</span> {format(new Date(selectedEvent.detected_at), 'dd MMM yyyy HH:mm:ss', { locale: idLocale })}</div>
                <div><span className="text-muted-foreground">Pekerja:</span> {selectedEvent.workers?.nama || 'Tidak Dikenal'}</div>
                <div><span className="text-muted-foreground">SID:</span> {selectedEvent.workers?.sid || '-'}</div>
                <div><span className="text-muted-foreground">Kamera:</span> {selectedEvent.cameras?.name || '-'}</div>
                <div><span className="text-muted-foreground">Tipe:</span> {selectedEvent.cameras?.point_type === 'entry' ? 'Masuk' : selectedEvent.cameras?.point_type === 'exit' ? 'Keluar' : 'Area'}</div>
                <div><span className="text-muted-foreground">Zona:</span> {selectedEvent.cameras?.zones?.name || '-'}</div>
                <div><span className="text-muted-foreground">Confidence:</span> {selectedEvent.confidence_score ? `${(selectedEvent.confidence_score * 100).toFixed(0)}%` : '-'}</div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(getEventStatus(selectedEvent))}</div>
              </div>

              {/* PPE Checklist */}
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
              <div className="flex gap-3">
                {selectedEvent.snapshot_url && (
                  <a href={selectedEvent.snapshot_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm"><Image className="mr-1 h-4 w-4" />Foto</Button>
                  </a>
                )}
                {selectedEvent.clip_url && (
                  <a href={selectedEvent.clip_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm"><Video className="mr-1 h-4 w-4" />Video</Button>
                  </a>
                )}
              </div>

              {/* Validation form */}
              {selectedEvent.alerts?.[0] && getEventStatus(selectedEvent) === 'BARU' && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="font-medium">Validasi Manual</Label>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="text-sm">Status Validasi</Label>
                      <Select value={validationStatus} onValueChange={v => setValidationStatus(v as any)}>
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
                          {ALASAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Tutup</Button>
            {selectedEvent?.alerts?.[0] && getEventStatus(selectedEvent) === 'BARU' && (
              <Button onClick={() => submitValidation.mutate()} disabled={submitValidation.isPending}>
                {submitValidation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Simpan Validasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
