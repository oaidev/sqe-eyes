import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AlertStatus = Database['public']['Enums']['alert_status'];
type AlertType = Database['public']['Enums']['alert_type'];

const statusColors: Record<AlertStatus, string> = {
  BARU: 'bg-red-600 text-white',
  DITERUSKAN: 'bg-yellow-500 text-white',
  SELESAI: 'bg-green-600 text-white',
};

const alertTypeLabels: Record<AlertType, string> = {
  UNAUTHORIZED_EXIT: 'Keluar Tanpa Izin',
  APD_VIOLATION: 'Pelanggaran APD',
  UNKNOWN_PERSON: 'Orang Tidak Dikenal',
};

export default function Alerts() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [noteDialog, setNoteDialog] = useState<{ id: string; notes: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from('alerts')
        .select('*, events(detected_at, workers(nama, sid), cameras(name, zones(name)))')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as AlertStatus);
      if (typeFilter !== 'all') q = q.eq('alert_type', typeFilter as AlertType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alerts').update({ status: 'DITERUSKAN' as AlertStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert diteruskan ke supervisor');
    },
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('alerts').update({ notes }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setNoteDialog(null);
      toast.success('Catatan disimpan');
    },
  });

  return (
    <AppLayout title="Inbox Alert">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="BARU">Baru</SelectItem>
              <SelectItem value="DITERUSKAN">Diteruskan</SelectItem>
              <SelectItem value="SELESAI">Selesai</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="UNAUTHORIZED_EXIT">Keluar Tanpa Izin</SelectItem>
              <SelectItem value="APD_VIOLATION">Pelanggaran APD</SelectItem>
              <SelectItem value="UNKNOWN_PERSON">Orang Tidak Dikenal</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{alerts.length} alert</span>
        </div>

        {alerts.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-3" />
            <p>Tidak ada alert</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Tipe Alert</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{format(new Date(a.created_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{alertTypeLabels[a.alert_type as AlertType] || a.alert_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.events?.workers ? (
                        <div>
                          <p className="text-sm">{a.events.workers.nama}</p>
                          <p className="text-xs text-muted-foreground">{a.events.workers.sid}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">{a.events?.cameras?.zones?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[a.status as AlertStatus]} text-[10px]`}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setNoteDialog({ id: a.id, notes: a.notes || '' })} className="text-xs text-primary underline-offset-2 hover:underline">
                        {a.notes ? 'Edit' : 'Tambah'}
                      </button>
                    </TableCell>
                    <TableCell>
                      {a.status === 'BARU' && (
                        <Button size="sm" variant="outline" onClick={() => forwardMutation.mutate(a.id)} disabled={forwardMutation.isPending}>
                          <Send className="h-3 w-3 mr-1" /> Teruskan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catatan Alert</DialogTitle></DialogHeader>
          <Textarea
            value={noteDialog?.notes || ''}
            onChange={(e) => setNoteDialog((p) => p ? { ...p, notes: e.target.value } : null)}
            placeholder="Tulis catatan..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Batal</Button>
            <Button onClick={() => noteDialog && notesMutation.mutate(noteDialog)} disabled={notesMutation.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
