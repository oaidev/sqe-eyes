import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Upload, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Worker = Tables<'workers'>;

const SHIFTS: Array<'day' | 'night' | 'rotating'> = ['day', 'night', 'rotating'];
const ENROLLMENT_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ENROLLED: { label: 'Terdaftar', variant: 'default' },
  NOT_ENROLLED: { label: 'Belum Didaftarkan', variant: 'secondary' },
  ENROLLING: { label: 'Proses', variant: 'outline' },
  FAILED: { label: 'Gagal', variant: 'destructive' },
};

const emptyForm: { sid: string; nama: string; jabatan: string; departemen: string; shift: 'day' | 'night' | 'rotating' } = { sid: '', nama: '', jabatan: '', departemen: '', shift: 'day' };

export default function Workers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterShift, setFilterShift] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Worker | null>(null);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Worker[];
    },
  });

  const departments = [...new Set(workers.map(w => w.departemen))];

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editing) {
        const { error } = await supabase.from('workers').update({ sid: values.sid, nama: values.nama, jabatan: values.jabatan, departemen: values.departemen, shift: values.shift }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workers').insert({ sid: values.sid, nama: values.nama, jabatan: values.jabatan, departemen: values.departemen, shift: values.shift });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      qc.invalidateQueries({ queryKey: ['stats-workers'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? 'Pekerja diperbarui' : 'Pekerja ditambahkan' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      qc.invalidateQueries({ queryKey: ['stats-workers'] });
      setDeleteDialog(null);
      toast({ title: 'Pekerja dihapus' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: TablesInsert<'workers'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = cols[idx]; });
      if (row.sid && row.nama && row.jabatan && row.departemen) {
        rows.push({ sid: row.sid, nama: row.nama, jabatan: row.jabatan, departemen: row.departemen, shift: (row.shift || 'day') as 'day' | 'night' | 'rotating' });
      }
    }
    if (rows.length === 0) { toast({ title: 'CSV kosong atau format salah', variant: 'destructive' }); return; }
    const { error } = await supabase.from('workers').insert(rows);
    if (error) { toast({ title: 'Error import', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['workers'] });
    toast({ title: `${rows.length} pekerja diimport` });
    e.target.value = '';
  };

  const openEdit = (w: Worker) => {
    setEditing(w);
    setForm({ sid: w.sid, nama: w.nama, jabatan: w.jabatan, departemen: w.departemen, shift: w.shift });
    setDialogOpen(true);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const filtered = workers.filter(w => {
    const matchSearch = !search || w.nama.toLowerCase().includes(search.toLowerCase()) || w.sid.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || w.departemen === filterDept;
    const matchShift = filterShift === 'all' || w.shift === filterShift;
    return matchSearch && matchDept && matchShift;
  });

  return (
    <AppLayout title="Kelola Pekerja">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari nama atau SID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Departemen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dept</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Shift" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Shift</SelectItem>
                {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label>
              <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              <Button variant="outline" size="sm" asChild><span><Upload className="mr-1 h-4 w-4" />Import CSV</span></Button>
            </label>
            <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Tambah Pekerja</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data pekerja</TableCell></TableRow>
                ) : filtered.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.sid}</TableCell>
                    <TableCell className="font-medium">{w.nama}</TableCell>
                    <TableCell>{w.jabatan}</TableCell>
                    <TableCell>{w.departemen}</TableCell>
                    <TableCell className="capitalize">{w.shift}</TableCell>
                    <TableCell><Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                    <TableCell><Badge variant={ENROLLMENT_LABELS[w.enrollment_status]?.variant || 'secondary'}>{ENROLLMENT_LABELS[w.enrollment_status]?.label || w.enrollment_status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDialog(w)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pekerja' : 'Tambah Pekerja'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data pekerja.' : 'Isi data pekerja baru.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>SID</Label><Input value={form.sid} onChange={e => setForm({ ...form, sid: e.target.value })} placeholder="SID-2024-001" /></div>
            <div className="grid gap-2"><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Jabatan</Label><Input value={form.jabatan} onChange={e => setForm({ ...form, jabatan: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Departemen</Label><Input value={form.departemen} onChange={e => setForm({ ...form, departemen: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Shift</Label>
              <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.sid || !form.nama || !form.jabatan || !form.departemen}>
              {saveMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pekerja</DialogTitle>
            <DialogDescription>Yakin ingin menghapus <strong>{deleteDialog?.nama}</strong> ({deleteDialog?.sid})?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
