import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ValidationStatus = Database['public']['Enums']['validation_status'];

const ppeItems = ['HEAD_COVER', 'HAND_COVER', 'FACE_COVER', 'SAFETY_SHOES', 'REFLECTIVE_VEST'] as const;
const ppeLabels: Record<string, string> = {
  HEAD_COVER: 'Penutup Kepala', HAND_COVER: 'Sarung Tangan', FACE_COVER: 'Masker',
  SAFETY_SHOES: 'Sepatu Safety', REFLECTIVE_VEST: 'Rompi Reflektif',
};

export default function Validations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<any | null>(null);
  const [formStatus, setFormStatus] = useState<ValidationStatus>('VALID');
  const [alasan, setAlasan] = useState('');
  const [komentar, setKomentar] = useState('');
  const [apdChecks, setApdChecks] = useState<Record<string, boolean>>({});

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts-diteruskan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, events(detected_at, ppe_results, workers(nama, sid, jabatan), cameras(name, zones(name)))')
        .eq('status', 'DITERUSKAN')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!dialog || !user) return;
      const { error: valErr } = await supabase.from('supervisor_validations').insert({
        alert_id: dialog.id,
        supervisor_id: user.id,
        status: formStatus,
        alasan_keluar: alasan || null,
        komentar: komentar || null,
        apd_manual_check: apdChecks,
      });
      if (valErr) throw valErr;
      const { error: alertErr } = await supabase.from('alerts').update({ status: 'SELESAI' as Database['public']['Enums']['alert_status'] }).eq('id', dialog.id);
      if (alertErr) throw alertErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-diteruskan'] });
      setDialog(null);
      toast.success('Validasi berhasil disimpan');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openDialog = (alert: any) => {
    setDialog(alert);
    setFormStatus('VALID');
    setAlasan('');
    setKomentar('');
    const checks: Record<string, boolean> = {};
    ppeItems.forEach((p) => { checks[p] = true; });
    setApdChecks(checks);
  };

  return (
    <AppLayout title="Validasi Alert">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Daftar alert yang perlu divalidasi supervisor.</p>

        {alerts.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mb-3" />
            <p>Tidak ada alert yang perlu divalidasi</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{format(new Date(a.created_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.alert_type}</Badge></TableCell>
                    <TableCell>
                      {a.events?.workers ? (
                        <div>
                          <p className="text-sm">{a.events.workers.nama}</p>
                          <p className="text-xs text-muted-foreground">{a.events.workers.sid} — {a.events.workers.jabatan}</p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{a.events?.cameras?.zones?.name || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openDialog(a)}>Validasi</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Form Validasi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status Validasi</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as ValidationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALID">VALID</SelectItem>
                  <SelectItem value="TIDAK_VALID">TIDAK VALID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alasan Keluar</Label>
              <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Opsional..." rows={2} />
            </div>
            <div>
              <Label>Cek APD Manual</Label>
              <div className="space-y-2 mt-1">
                {ppeItems.map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-sm">{ppeLabels[item]}</span>
                    <Switch checked={apdChecks[item] ?? true} onCheckedChange={(v) => setApdChecks((p) => ({ ...p, [item]: v }))} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Komentar</Label>
              <Textarea value={komentar} onChange={(e) => setKomentar(e.target.value)} placeholder="Opsional..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>Simpan Validasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
