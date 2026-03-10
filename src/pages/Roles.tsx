import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ROLES = ['admin', 'operator', 'supervisor'] as const;
const PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'workers', label: 'Kelola Pekerja' },
  { key: 'zones', label: 'Zona & Kamera' },
  { key: 'users', label: 'Kelola Pengguna' },
  { key: 'roles', label: 'Kelola Role' },
  { key: 'simulate', label: 'Simulasi Deteksi' },
  { key: 'operator-validation', label: 'Validasi Operator' },
  { key: 'supervisor-validation', label: 'Validasi Supervisor' },
];

const PAGE_TOGGLE_CONFIG: Record<string, { edit: boolean; delete: boolean }> = {
  dashboard: { edit: false, delete: false },
  workers: { edit: true, delete: true },
  zones: { edit: true, delete: true },
  users: { edit: true, delete: true },
  roles: { edit: true, delete: true },
  simulate: { edit: true, delete: false },
  'operator-validation': { edit: true, delete: false },
  'supervisor-validation': { edit: true, delete: false },
};

type PermRow = {
  id?: string;
  role: string;
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export default function Roles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [localPerms, setLocalPerms] = useState<Record<string, PermRow>>({});
  const [dirty, setDirty] = useState(false);

  const { data: perms = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      const map: Record<string, PermRow> = {};
      (data || []).forEach((p: any) => {
        map[`${p.role}:${p.page_key}`] = p;
      });
      setLocalPerms(map);
      return data;
    },
  });

  const getPerm = (role: string, page: string): PermRow => {
    const key = `${role}:${page}`;
    return localPerms[key] || { role, page_key: page, can_view: false, can_edit: false, can_delete: false };
  };

  const togglePerm = (role: string, page: string, field: 'can_view' | 'can_edit' | 'can_delete') => {
    const key = `${role}:${page}`;
    const current = getPerm(role, page);
    const newValue = !current[field];
    const updated = { ...current, [field]: newValue };

    // Auto-enable view when edit or delete is enabled
    if ((field === 'can_edit' || field === 'can_delete') && newValue) {
      updated.can_view = true;
    }
    // Auto-disable edit and delete when view is disabled
    if (field === 'can_view' && !newValue) {
      updated.can_edit = false;
      updated.can_delete = false;
    }

    setLocalPerms(prev => ({ ...prev, [key]: updated }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows = Object.values(localPerms).map(p => ({
        role: p.role as any,
        page_key: p.page_key,
        can_view: p.can_view,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      }));
      for (const row of rows) {
        const { error } = await supabase.from('role_permissions').upsert(row as any, { onConflict: 'role,page_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      setDirty(false);
      toast({ title: 'Hak akses disimpan' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <AppLayout title="Kelola Role">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Atur hak akses menu per role</p>
          <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          ROLES.map(role => (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  <Badge variant={role === 'admin' ? 'destructive' : role === 'operator' ? 'default' : 'secondary'}>
                    {role}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
                    <span>Menu</span>
                    <span className="text-center">Lihat</span>
                    <span className="text-center">Edit</span>
                    <span className="text-center">Hapus</span>
                  </div>
                  {PAGES.map(page => {
                    const perm = getPerm(role, page.key);
                    return (
                      <div key={page.key} className="grid grid-cols-[1fr,80px,80px,80px] gap-2 items-center py-1">
                        <span className="text-sm">{page.label}</span>
                        <div className="flex justify-center"><Switch checked={perm.can_view} onCheckedChange={() => togglePerm(role, page.key, 'can_view')} /></div>
                        <div className="flex justify-center">
                          {PAGE_TOGGLE_CONFIG[page.key]?.edit !== false
                            ? <Switch checked={perm.can_edit} onCheckedChange={() => togglePerm(role, page.key, 'can_edit')} />
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                        <div className="flex justify-center">
                          {PAGE_TOGGLE_CONFIG[page.key]?.delete !== false
                            ? <Switch checked={perm.can_delete} onCheckedChange={() => togglePerm(role, page.key, 'can_delete')} />
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
