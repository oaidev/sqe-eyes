import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Upload, Download, Pencil, Trash2, Loader2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnrollFaceDialog } from '@/components/workers/EnrollFaceDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { REGEX_NAME, REGEX_SID, validateField } from '@/lib/validation';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Worker = Tables<'workers'>;

const JABATAN_OPTIONS = ['Driver', 'Electrician', 'Helper', 'Mekanik', 'Operator Alat Berat', 'Supervisor Lapangan', 'Welder'].sort();
const DEPT_OPTIONS = ['Engineering', 'HRD', 'Logistik', 'Maintenance', 'Plant', 'Produksi', 'SHE'].sort();

type FormState = { sid: string; nama: string; jabatan: string; departemen: string };
const emptyForm: FormState = { sid: '', nama: '', jabatan: '', departemen: '' };

export default function Workers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { canEdit, canDelete } = usePermissions();
  const hasEdit = canEdit('workers');
  const hasDelete = canDelete('workers');

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Worker | null>(null);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [enrollWorker, setEnrollWorker] = useState<Worker | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const namaValid = validateField(form.nama, REGEX_NAME);
  const sidValid = validateField(form.sid, REGEX_SID);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Worker[];
    },
  });

  const { data: faceEmbeddings = [] } = useQuery({
    queryKey: ['face-embeddings'],
    queryFn: async () => {
      const { data } = await supabase.from('worker_face_embeddings').select('worker_id, photo_url');
      return data || [];
    },
  });

  const faceMap = new Map(faceEmbeddings.map((f: any) => [f.worker_id, f.photo_url]));
  const departments = [...new Set(workers.map(w => w.departemen))];

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      if (editing) {
        const { error } = await supabase.from('workers').update({ nama: values.nama, jabatan: values.jabatan, departemen: values.departemen }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workers').insert({ sid: values.sid, nama: values.nama, jabatan: values.jabatan, departemen: values.departemen, is_active: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      setDialogOpen(false); setEditing(null); setForm(emptyForm);
      toast({ title: editing ? 'Pekerja diperbarui' : 'Pekerja ditambahkan' });
    },
    onError: (e: Error) => {
      const msg = e.message?.includes('duplicate key') || e.message?.includes('unique constraint') ? 'SID sudah terdaftar' : e.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); setDeleteDialog(null); toast({ title: 'Pekerja dihapus' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const downloadTemplate = () => {
    const csv = 'sid,nama,jabatan,departemen\nSID-2024-001,Budi Santoso,Mekanik,Maintenance';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'template_pekerja.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: TablesInsert<'workers'>[] = [];
    const errors: string[] = [];
    const existingSids = new Set(workers.map(w => w.sid.toLowerCase()));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = cols[idx]; });
      if (!row.sid || !row.nama || !row.jabatan || !row.departemen) { errors.push(`Baris ${i + 1}: Data tidak lengkap`); continue; }
      if (!validateField(row.nama, REGEX_NAME)) { errors.push(`Baris ${i + 1}: Nama hanya boleh mengandung huruf`); continue; }
      if (!validateField(row.sid, REGEX_SID)) { errors.push(`Baris ${i + 1}: SID tidak valid`); continue; }
      if (existingSids.has(row.sid.toLowerCase())) { errors.push(`Baris ${i + 1}: SID sudah terdaftar`); continue; }
      if (!JABATAN_OPTIONS.includes(row.jabatan)) { errors.push(`Baris ${i + 1}: Jabatan tidak terdaftar (${row.jabatan})`); continue; }
      if (!DEPT_OPTIONS.includes(row.departemen)) { errors.push(`Baris ${i + 1}: Departemen tidak terdaftar (${row.departemen})`); continue; }
      if (row.nama.length > 100) { errors.push(`Baris ${i + 1}: Nama harus kurang dari 100 karakter`); continue; }
      rows.push({ sid: row.sid, nama: row.nama, jabatan: row.jabatan, departemen: row.departemen, is_active: false });
    }

    if (errors.length > 0) { toast({ title: 'Error Import', description: errors.join('\n'), variant: 'destructive' }); e.target.value = ''; return; }
    if (rows.length === 0) { toast({ title: 'Error Import', description: 'CSV kosong atau format salah', variant: 'destructive' }); e.target.value = ''; return; }

    setImportProgress({ current: 0, total: rows.length });
    let successCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const { error } = await supabase.from('workers').insert(rows[i]);
      if (error) { errors.push(`Baris ${i + 2}: ${error.message}`); } else { successCount++; }
      setImportProgress({ current: i + 1, total: rows.length });
    }
    setImportProgress(null);
    if (errors.length > 0) { toast({ title: 'Error Import', description: `${successCount} berhasil, ${errors.length} gagal`, variant: 'destructive' }); }
    else { toast({ title: `${successCount} pekerja diimport` }); }
    qc.invalidateQueries({ queryKey: ['workers'] });
    e.target.value = '';
  };

  const openEdit = (w: Worker) => { setEditing(w); setForm({ sid: w.sid, nama: w.nama, jabatan: w.jabatan, departemen: w.departemen }); setDialogOpen(true); };
  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const filtered = workers.filter(w => {
    const matchSearch = !search || w.nama.toLowerCase().includes(search.toLowerCase()) || w.sid.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || w.departemen === filterDept;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? w.is_active : !w.is_active);
    return matchSearch && matchDept && matchStatus;
  });

  const formInvalid = saveMutation.isPending || (!editing && !form.sid) || !form.nama || !form.jabatan || !form.departemen || !namaValid || (!editing && !sidValid);

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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasEdit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-1 h-4 w-4" />Template CSV</Button>
              <label>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={!!importProgress} />
                <Button variant="outline" size="sm" asChild disabled={!!importProgress}><span><Upload className="mr-1 h-4 w-4" />Import CSV</span></Button>
              </label>
              <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Tambah Pekerja</Button>
            </div>
          )}
        </div>

        {importProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Mengimport pekerja...</span>
              <span>{importProgress.current}/{importProgress.total}</span>
            </div>
            <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Status</TableHead>
                  {(hasEdit || hasDelete) && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data pekerja</TableCell></TableRow>
                ) : filtered.map(w => {
                  const faceUrl = faceMap.get(w.id);
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.sid}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {faceUrl ? (
                            <img src={faceUrl} alt={w.nama} className="h-8 w-8 rounded-full object-cover cursor-pointer border" onClick={(e) => { e.stopPropagation(); setPhotoPreview(faceUrl); }} />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">{w.nama.substring(0, 2).toUpperCase()}</div>
                          )}
                          <span className="font-medium">{w.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell>{w.jabatan}</TableCell>
                      <TableCell>{w.departemen}</TableCell>
                      <TableCell><Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Aktif' : 'Tidak Aktif'}</Badge></TableCell>
                      {(hasEdit || hasDelete) && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {hasEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEnrollWorker(w)} title="Daftarkan Wajah"><Camera className="h-3.5 w-3.5" /></Button>}
                            {hasEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>}
                            {hasDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDialog(w)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
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
            {!editing && (
              <div className="grid gap-2">
                <Label>SID <span className="text-destructive">*</span></Label>
                <Input value={form.sid} onChange={e => setForm({ ...form, sid: e.target.value })} placeholder="SID-2024-001" maxLength={100} />
                {form.sid && !sidValid && <p className="text-xs text-destructive">SID hanya boleh mengandung huruf, angka, dan karakter - _ /</p>}
                <p className="text-xs text-muted-foreground text-right">{form.sid.length}/100</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} maxLength={100} />
              {form.nama && !namaValid && <p className="text-xs text-destructive">Nama hanya boleh mengandung huruf</p>}
              <p className="text-xs text-muted-foreground text-right">{form.nama.length}/100</p>
            </div>
            <div className="grid gap-2">
              <Label>Jabatan <span className="text-destructive">*</span></Label>
              <Select value={form.jabatan} onValueChange={v => setForm({ ...form, jabatan: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                <SelectContent>{JABATAN_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Departemen <span className="text-destructive">*</span></Label>
              <Select value={form.departemen} onValueChange={v => setForm({ ...form, departemen: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>{DEPT_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={formInvalid}>
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

      {/* Photo Preview */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Foto Wajah</DialogTitle></DialogHeader>
          {photoPreview && <img src={photoPreview} alt="Face" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Enroll Face Dialog */}
      <EnrollFaceDialog worker={enrollWorker} open={!!enrollWorker} onOpenChange={(v) => { if (!v) setEnrollWorker(null); }} />
    </AppLayout>
  );
}
