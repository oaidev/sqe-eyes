import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type AccessRule = Tables<'zone_access_rules'>;
type Zone = Tables<'zones'>;

const SHIFTS = ['day', 'night', 'rotating'] as const;

export default function AccessRules() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterZone, setFilterZone] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessRule | null>(null);
  const [deleteItem, setDeleteItem] = useState<AccessRule | null>(null);
  const [form, setForm] = useState({ zone_id: '', jabatan: '', shift: '' as string, time_start: '', time_end: '' });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => { const { data } = await supabase.from('zones').select('*').order('name'); return (data || []) as Zone[]; },
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['access-rules'],
    queryFn: async () => { const { data } = await supabase.from('zone_access_rules').select('*').order('created_at', { ascending: false }); return (data || []) as AccessRule[]; },
  });

  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z.name]));

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        zone_id: form.zone_id,
        jabatan: form.jabatan || null,
        shift: (form.shift || null) as any,
        time_start: form.time_start || null,
        time_end: form.time_end || null,
      };
      if (editing) {
        const { error } = await supabase.from('zone_access_rules').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zone_access_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-rules'] }); setDialogOpen(false); setEditing(null); toast({ title: 'Aturan disimpan' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('zone_access_rules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-rules'] }); setDeleteItem(null); toast({ title: 'Aturan dihapus' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('zone_access_rules').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['access-rules'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ zone_id: zones[0]?.id || '', jabatan: '', shift: '', time_start: '', time_end: '' }); setDialogOpen(true); };
  const openEdit = (r: AccessRule) => { setEditing(r); setForm({ zone_id: r.zone_id, jabatan: r.jabatan || '', shift: r.shift || '', time_start: r.time_start || '', time_end: r.time_end || '' }); setDialogOpen(true); };

  const filtered = filterZone === 'all' ? rules : rules.filter(r => r.zone_id === filterZone);

  return (
    <AppLayout title="Aturan Akses">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter zona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Zona</SelectItem>
              {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Tambah Aturan</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada aturan akses</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{zoneMap[r.zone_id] || '-'}</TableCell>
                    <TableCell>{r.jabatan || <span className="text-muted-foreground">Semua</span>}</TableCell>
                    <TableCell className="capitalize">{r.shift || <span className="text-muted-foreground">Semua</span>}</TableCell>
                    <TableCell>{r.time_start && r.time_end ? `${r.time_start} – ${r.time_end}` : <span className="text-muted-foreground">24 jam</span>}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={v => toggleMut.mutate({ id: r.id, active: v })} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItem(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Aturan' : 'Tambah Aturan'}</DialogTitle><DialogDescription>Konfigurasi aturan akses zona.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Zona</Label>
              <Select value={form.zone_id} onValueChange={v => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih zona" /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Jabatan (kosongkan = semua)</Label><Input value={form.jabatan} onChange={e => setForm({ ...form, jabatan: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Shift</Label>
              <Select value={form.shift || 'all'} onValueChange={v => setForm({ ...form, shift: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Shift</SelectItem>
                  {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Waktu Mulai</Label><Input type="time" value={form.time_start} onChange={e => setForm({ ...form, time_start: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Waktu Selesai</Label><Input type="time" value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.zone_id}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Aturan</DialogTitle><DialogDescription>Yakin hapus aturan akses ini?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button><Button variant="destructive" onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
