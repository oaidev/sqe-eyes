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
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, Camera, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { REGEX_ZONE_NAME, validateField } from '@/lib/validation';
import type { Tables } from '@/integrations/supabase/types';

type Zone = Tables<'zones'>;
type CameraRow = Tables<'cameras'>;

const PPE_ITEMS = [
  { key: 'HEAD_COVER', label: 'Helm' },
  { key: 'HAND_COVER', label: 'Sarung Tangan' },
  { key: 'SAFETY_GLASSES', label: 'Kacamata Safety' },
  { key: 'SAFETY_SHOES', label: 'Sepatu Safety' },
  { key: 'REFLECTIVE_VEST', label: 'Rompi Reflektif' },
];
const JABATAN_OPTIONS = ['Mekanik', 'Operator Alat Berat', 'Supervisor Lapangan', 'Helper', 'Driver', 'Welder', 'Electrician'];

interface PpeMatrix { [key: string]: boolean }
interface JabatanPpe { jabatan: string; ppe: PpeMatrix }

export default function Zones() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { canEdit, canDelete } = usePermissions();
  const hasEdit = canEdit('zones');
  const hasDelete = canDelete('zones');

  const [zoneDialog, setZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', description: '' });
  const [camDialog, setCamDialog] = useState(false);
  const [editingCam, setEditingCam] = useState<CameraRow | null>(null);
  const [camForm, setCamForm] = useState<{ name: string; rtsp_url: string; jenis_pelanggaran: string; zone_id: string; off_time_start: string; off_time_end: string }>({ name: '', rtsp_url: '', jenis_pelanggaran: 'APD_TIDAK_LENGKAP', zone_id: '', off_time_start: '', off_time_end: '' });
  const [offTimeEnabled, setOffTimeEnabled] = useState(false);
  const [deleteZone, setDeleteZone] = useState<Zone | null>(null);
  const [deleteCam, setDeleteCam] = useState<CameraRow | null>(null);

  const [generalPpe, setGeneralPpe] = useState<PpeMatrix>({});
  const [perJabatanEnabled, setPerJabatanEnabled] = useState(false);
  const [jabatanPpeList, setJabatanPpeList] = useState<JabatanPpe[]>([]);

  const zoneNameValid = validateField(zoneForm.name, REGEX_ZONE_NAME);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data } = await supabase.from('sites').select('*').eq('is_active', true); return data || []; },
  });
  const siteId = sites[0]?.id || '';

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => { const { data, error } = await supabase.from('zones').select('*').order('name'); if (error) throw error; return data as Zone[]; },
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => { const { data, error } = await supabase.from('cameras').select('*').order('name'); if (error) throw error; return data as CameraRow[]; },
  });

  const { data: ppeRules = [] } = useQuery({
    queryKey: ['ppe-rules'],
    queryFn: async () => { const { data } = await supabase.from('zone_ppe_rules').select('*'); return data || []; },
  });

  const saveZoneMut = useMutation({
    mutationFn: async () => {
      if (editingZone) {
        const { error } = await supabase.from('zones').update({ name: zoneForm.name, description: zoneForm.description }).eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zones').insert({ name: zoneForm.name, description: zoneForm.description, site_id: siteId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setZoneDialog(false); setEditingZone(null); toast({ title: 'Zona disimpan' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteZoneMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('zones').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setDeleteZone(null); toast({ title: 'Zona dihapus' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveCamMut = useMutation({
    mutationFn: async () => {
      let camId = editingCam?.id;
      const pointType = camForm.jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? 'exit' : 'area';
      const camPayload: any = {
        name: camForm.name,
        rtsp_url: camForm.rtsp_url || null,
        point_type: pointType,
        jenis_pelanggaran: camForm.jenis_pelanggaran,
        off_time_start: camForm.jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? (camForm.off_time_start || null) : null,
        off_time_end: camForm.jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? (camForm.off_time_end || null) : null,
      };
      if (editingCam) {
        const { error } = await supabase.from('cameras').update(camPayload).eq('id', editingCam.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('cameras').insert({ ...camPayload, zone_id: camForm.zone_id }).select('id').single();
        if (error) throw error;
        camId = data.id;
      }
      if (camId) {
        await (supabase.from('zone_ppe_rules').delete() as any).eq('camera_id', camId);
        if (camForm.jenis_pelanggaran === 'APD_TIDAK_LENGKAP') {
          const rules: any[] = [];
          PPE_ITEMS.forEach(item => {
            if (generalPpe[item.key]) rules.push({ zone_id: camForm.zone_id, camera_id: camId, ppe_item: item.key, is_required: true, jabatan: null });
          });
          if (perJabatanEnabled) {
            jabatanPpeList.forEach(jp => {
              PPE_ITEMS.forEach(item => {
                if (jp.ppe[item.key]) rules.push({ zone_id: camForm.zone_id, camera_id: camId, ppe_item: item.key, is_required: true, jabatan: jp.jabatan });
              });
            });
          }
          if (rules.length > 0) {
            const { error } = await supabase.from('zone_ppe_rules').insert(rules);
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cameras'] }); qc.invalidateQueries({ queryKey: ['ppe-rules'] }); setCamDialog(false); setEditingCam(null); toast({ title: 'Kamera disimpan' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteCamMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('cameras').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cameras'] }); setDeleteCam(null); toast({ title: 'Kamera dihapus' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleCam = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('cameras').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cameras'] }),
  });

  const openCamDialog = (zone_id: string, cam?: CameraRow) => {
    setEditingCam(cam || null);
    setCamForm({
      name: cam?.name || '', rtsp_url: cam?.rtsp_url || '',
      jenis_pelanggaran: (cam as any)?.jenis_pelanggaran || 'APD_TIDAK_LENGKAP',
      zone_id,
      off_time_start: (cam as any)?.off_time_start || '',
      off_time_end: (cam as any)?.off_time_end || '',
    });
    setOffTimeEnabled(!!(cam as any)?.off_time_start);
    const camRules = ppeRules.filter((r: any) => r.camera_id === cam?.id);
    const gen: PpeMatrix = {};
    const jabMap = new Map<string, PpeMatrix>();
    camRules.forEach((r: any) => {
      if (!r.jabatan) gen[r.ppe_item] = true;
      else { if (!jabMap.has(r.jabatan)) jabMap.set(r.jabatan, {}); jabMap.get(r.jabatan)![r.ppe_item] = true; }
    });
    setGeneralPpe(gen);
    setPerJabatanEnabled(jabMap.size > 0);
    setJabatanPpeList(Array.from(jabMap.entries()).map(([jabatan, ppe]) => ({ jabatan, ppe })));
    setCamDialog(true);
  };

  const addJabatanPpe = () => setJabatanPpeList(prev => [...prev, { jabatan: '', ppe: {} }]);

  return (
    <AppLayout title="Zona & Kamera">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{zones.length} zona terdaftar</p>
          {hasEdit && (
            <Button size="sm" onClick={() => { setEditingZone(null); setZoneForm({ name: '', description: '' }); setZoneDialog(true); }}>
              <Plus className="mr-1 h-4 w-4" />Tambah Zona
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : zones.map(zone => {
          const zoneCams = cameras.filter(c => c.zone_id === zone.id);
          return (
            <Collapsible key={zone.id}>
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">{zone.description || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline"><Camera className="mr-1 h-3 w-3" />{zoneCams.length}</Badge>
                      {hasEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditingZone(zone); setZoneForm({ name: zone.name, description: zone.description || '' }); setZoneDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {hasDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleteZone(zone); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t px-4 pb-4 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Kamera di zona ini</p>
                      {hasEdit && (
                        <Button variant="outline" size="sm" onClick={() => openCamDialog(zone.id)}>
                          <Plus className="mr-1 h-3 w-3" />Tambah Kamera
                        </Button>
                      )}
                    </div>
                    {zoneCams.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Belum ada kamera</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>RTSP URL</TableHead><TableHead>Jenis Pelanggaran</TableHead><TableHead>Aktif</TableHead>{(hasEdit || hasDelete) && <TableHead className="w-[60px]" />}</TableRow></TableHeader>
                        <TableBody>
                          {zoneCams.map(cam => (
                            <TableRow key={cam.id}>
                              <TableCell className="font-medium">{cam.name}</TableCell>
                              <TableCell className="font-mono text-xs max-w-[200px] truncate">{cam.rtsp_url || '-'}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{(cam as any).jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? 'Keluar Zona' : 'APD Tidak Lengkap'}</Badge></TableCell>
                              <TableCell><Switch checked={cam.is_active} onCheckedChange={v => toggleCam.mutate({ id: cam.id, active: v })} disabled={!hasEdit} /></TableCell>
                              {(hasEdit || hasDelete) && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    {hasEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCamDialog(zone.id, cam)}><Pencil className="h-3.5 w-3.5" /></Button>}
                                    {hasDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCam(cam)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Zone Dialog */}
      <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingZone ? 'Edit Zona' : 'Tambah Zona'}</DialogTitle><DialogDescription>Kelola informasi zona.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nama Zona <span className="text-destructive">*</span></Label>
              <Input value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })} maxLength={100} />
              {zoneForm.name && !zoneNameValid && <p className="text-xs text-destructive">Nama zona hanya boleh mengandung huruf, angka, dan -</p>}
              <p className="text-xs text-muted-foreground text-right">{zoneForm.name.length}/100</p>
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Input value={zoneForm.description} onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })} maxLength={250} />
              <p className="text-xs text-muted-foreground text-right">{zoneForm.description.length}/250</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialog(false)}>Batal</Button>
            <Button onClick={() => saveZoneMut.mutate()} disabled={saveZoneMut.isPending || !zoneForm.name || !zoneNameValid}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={camDialog} onOpenChange={setCamDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCam ? 'Edit Kamera' : 'Tambah Kamera'}</DialogTitle><DialogDescription>Kelola kamera dan konfigurasi deteksi.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nama Kamera <span className="text-destructive">*</span></Label>
              <Input value={camForm.name} onChange={e => setCamForm({ ...camForm, name: e.target.value })} maxLength={100} />
              <p className="text-xs text-muted-foreground text-right">{camForm.name.length}/100</p>
            </div>
            <div className="grid gap-2">
              <Label>RTSP URL <span className="text-destructive">*</span></Label>
              <Input value={camForm.rtsp_url} onChange={e => setCamForm({ ...camForm, rtsp_url: e.target.value })} placeholder="rtsp://..." maxLength={500} />
              <p className="text-xs text-muted-foreground text-right">{camForm.rtsp_url.length}/500</p>
            </div>
            <div className="grid gap-2">
              <Label>Jenis Pelanggaran yang Dideteksi</Label>
              <Select value={camForm.jenis_pelanggaran} onValueChange={v => setCamForm({ ...camForm, jenis_pelanggaran: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APD_TIDAK_LENGKAP">APD Tidak Lengkap</SelectItem>
                  <SelectItem value="KELUAR_TANPA_IZIN">Keluar Zona</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: APD Matrix */}
            {camForm.jenis_pelanggaran === 'APD_TIDAK_LENGKAP' && (
              <>
                <div className="border-t pt-3">
                  <Label className="font-medium">Matrix APD (General)</Label>
                  <div className="grid gap-2 mt-2">
                    {PPE_ITEMS.map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm">{item.label}</span>
                        <Switch checked={!!generalPpe[item.key]} onCheckedChange={v => setGeneralPpe(prev => ({ ...prev, [item.key]: v }))} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">APD Berbeda per Jabatan</Label>
                    <Switch checked={perJabatanEnabled} onCheckedChange={setPerJabatanEnabled} />
                  </div>
                  {perJabatanEnabled && (
                    <div className="space-y-3 mt-3">
                      {jabatanPpeList.map((jp, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="grid gap-2">
                            <Select value={jp.jabatan} onValueChange={v => {
                              const updated = [...jabatanPpeList]; updated[idx] = { ...updated[idx], jabatan: v }; setJabatanPpeList(updated);
                            }}>
                              <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                              <SelectContent>{JABATAN_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                            </Select>
                            {PPE_ITEMS.map(item => (
                              <div key={item.key} className="flex items-center justify-between">
                                <span className="text-xs">{item.label}</span>
                                <Switch checked={!!jp.ppe[item.key]} onCheckedChange={v => {
                                  const updated = [...jabatanPpeList];
                                  updated[idx] = { ...updated[idx], ppe: { ...updated[idx].ppe, [item.key]: v } };
                                  setJabatanPpeList(updated);
                                }} />
                              </div>
                            ))}
                            <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => setJabatanPpeList(prev => prev.filter((_, i) => i !== idx))}>
                              Hapus Jabatan
                            </Button>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" size="sm" onClick={addJabatanPpe}><Plus className="mr-1 h-3 w-3" />Tambah Jabatan</Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Conditional: Waktu Kamera Off for Keluar Tanpa Izin */}
            {camForm.jenis_pelanggaran === 'KELUAR_TANPA_IZIN' && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Waktu Kamera Off (Tidak Mendeteksi)</Label>
                  <Switch checked={offTimeEnabled} onCheckedChange={v => {
                    setOffTimeEnabled(v);
                    if (!v) setCamForm({ ...camForm, off_time_start: '', off_time_end: '' });
                  }} />
                </div>
                {offTimeEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="grid gap-2"><Label className="text-sm">Mulai</Label><Input type="time" value={camForm.off_time_start} onChange={e => setCamForm({ ...camForm, off_time_start: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-sm">Selesai</Label><Input type="time" value={camForm.off_time_end} onChange={e => setCamForm({ ...camForm, off_time_end: e.target.value })} /></div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCamDialog(false)}>Batal</Button>
            <Button onClick={() => saveCamMut.mutate()} disabled={saveCamMut.isPending || !camForm.name || !camForm.rtsp_url}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Zone */}
      <Dialog open={!!deleteZone} onOpenChange={() => setDeleteZone(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Zona</DialogTitle><DialogDescription>Yakin hapus zona <strong>{deleteZone?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteZone(null)}>Batal</Button><Button variant="destructive" onClick={() => deleteZone && deleteZoneMut.mutate(deleteZone.id)}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Camera */}
      <Dialog open={!!deleteCam} onOpenChange={() => setDeleteCam(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Kamera</DialogTitle><DialogDescription>Yakin hapus kamera <strong>{deleteCam?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteCam(null)}>Batal</Button><Button variant="destructive" onClick={() => deleteCam && deleteCamMut.mutate(deleteCam.id)}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
