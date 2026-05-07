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
import { useTranslation } from 'react-i18next';

const ROLES = ['admin', 'operator', 'supervisor'] as const;
const PAGE_KEYS = ['dashboard', 'workers', 'zones', 'users', 'roles', 'simulate', 'operator-validation', 'supervisor-validation'] as const;

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
  const { t } = useTranslation();
  const [localPerms, setLocalPerms] = useState<Record<string, PermRow>>({});
  const [dirty, setDirty] = useState(false);

  const { isLoading } = useQuery({
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

    if ((field === 'can_edit' || field === 'can_delete') && newValue) {
      updated.can_view = true;
    }
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
      toast({ title: t('roles.saved') });
    },
    onError: (e: Error) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  return (
    <AppLayout title={t('roles.title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('roles.intro')}</p>
          <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {t('common.saveChanges')}
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
                    {t(`users.roles.${role}`)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
                    <span>{t('roles.menu')}</span>
                    <span className="text-center">{t('roles.view')}</span>
                    <span className="text-center">{t('roles.edit')}</span>
                    <span className="text-center">{t('roles.delete')}</span>
                  </div>
                  {PAGE_KEYS.map(pageKey => {
                    const perm = getPerm(role, pageKey);
                    return (
                      <div key={pageKey} className="grid grid-cols-[1fr,80px,80px,80px] gap-2 items-center py-1">
                        <span className="text-sm">{t(`roles.pages.${pageKey}`)}</span>
                        <div className="flex justify-center"><Switch checked={perm.can_view} onCheckedChange={() => togglePerm(role, pageKey, 'can_view')} /></div>
                        <div className="flex justify-center">
                          {PAGE_TOGGLE_CONFIG[pageKey]?.edit !== false
                            ? <Switch checked={perm.can_edit} onCheckedChange={() => togglePerm(role, pageKey, 'can_edit')} />
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                        <div className="flex justify-center">
                          {PAGE_TOGGLE_CONFIG[pageKey]?.delete !== false
                            ? <Switch checked={perm.can_delete} onCheckedChange={() => togglePerm(role, pageKey, 'can_delete')} />
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
