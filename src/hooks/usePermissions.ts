import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PageKey =
  | 'dashboard'
  | 'workers'
  | 'zones'
  | 'users'
  | 'roles'
  | 'simulate'
  | 'operator-validation'
  | 'supervisor-validation';

interface PermRow {
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function usePermissions() {
  const { userRole } = useAuth();

  const { data: perms = [], isLoading } = useQuery({
    queryKey: ['role-permissions', userRole],
    queryFn: async () => {
      if (!userRole) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('page_key, can_view, can_edit, can_delete')
        .eq('role', userRole);
      if (error) throw error;
      return (data || []) as PermRow[];
    },
    enabled: !!userRole,
  });

  const permMap = new Map(perms.map(p => [p.page_key, p]));

  const canView = (page: PageKey): boolean => {
    const p = permMap.get(page);
    return p?.can_view ?? false;
  };

  const canEdit = (page: PageKey): boolean => {
    const p = permMap.get(page);
    return p?.can_edit ?? false;
  };

  const canDelete = (page: PageKey): boolean => {
    const p = permMap.get(page);
    return p?.can_delete ?? false;
  };

  return { canView, canEdit, canDelete, isLoading, perms };
}
