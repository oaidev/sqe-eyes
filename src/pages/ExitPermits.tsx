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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PermitStatus = Database['public']['Enums']['permit_status'];

const statusColors: Record<PermitStatus, string> = {
  PENDING: 'bg-yellow-500 text-white',
  APPROVED: 'bg-green-600 text-white',
  REJECTED: 'bg-red-600 text-white',
};

export default function ExitPermits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [reason, setReason] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['exit-permits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exit_permits')
        .select('*, workers(nama, sid)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('id, nama, sid').eq('is_active', true).order('nama');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('exit_permits').insert({
        worker_id: workerId,
        reason,
        requested_by: user.id,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-permits'] });
      setShowCreate(false);
      setWorkerId(''); setReason(''); setValidFrom(''); setValidUntil('');
      toast.success('Permohonan izin keluar dibuat');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PermitStatus }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('exit_permits').update({ status, approved_by: user.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-permits'] });
      toast.success('Status izin diperbarui');
    },
  });

  return (
    <AppLayout title="Izin Keluar">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{permits.length} permohonan</span>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Buat Permohonan</Button>
        </div>

        {permits.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3" />
            <p>Belum ada permohonan izin keluar</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pekerja</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                    <TableCell>
                      {p.workers ? (
                        <div>
                          <p className="text-sm">{p.workers.nama}</p>
                          <p className="text-xs text-muted-foreground">{p.workers.sid}</p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{p.reason}</TableCell>
                    <TableCell className="text-xs">
                      {p.valid_from ? format(new Date(p.valid_from), 'dd/MM HH:mm') : '—'} → {p.valid_until ? format(new Date(p.valid_until), 'dd/MM HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[p.status as PermitStatus]} text-[10px]`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'APPROVED' })}>
                            <Check className="h-3 w-3 mr-1" /> Setujui
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'REJECTED' })}>
                            <X className="h-3 w-3 mr-1" /> Tolak
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Permohonan Izin Keluar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pekerja</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger><SelectValue placeholder="Pilih pekerja" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.nama} ({w.sid})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alasan</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan keluar..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Berlaku Dari</Label>
                <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div>
                <Label>Berlaku Sampai</Label>
                <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!workerId || !reason || createMutation.isPending}>Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
