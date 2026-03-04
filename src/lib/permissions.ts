export type AppRole = 'admin' | 'operator' | 'supervisor';
export type PermAction = 'view' | 'edit' | 'delete';

export type PageKey =
  | 'dashboard'
  | 'workers'
  | 'zones'
  | 'users'
  | 'roles'
  | 'simulate'
  | 'operator-validation'
  | 'supervisor-validation';

type PermSet = PermAction[];

const FULL: PermSet = ['view', 'edit', 'delete'];
const VIEW_ONLY: PermSet = ['view'];
const EDIT: PermSet = ['view', 'edit'];
const NONE: PermSet = [];

const permissionMatrix: Record<PageKey, Record<AppRole, PermSet>> = {
  dashboard:              { admin: VIEW_ONLY, operator: VIEW_ONLY, supervisor: VIEW_ONLY },
  workers:                { admin: FULL, operator: NONE, supervisor: NONE },
  zones:                  { admin: FULL, operator: NONE, supervisor: NONE },
  users:                  { admin: FULL, operator: NONE, supervisor: NONE },
  roles:                  { admin: FULL, operator: NONE, supervisor: NONE },
  simulate:               { admin: FULL, operator: NONE, supervisor: NONE },
  'operator-validation':  { admin: FULL, operator: EDIT, supervisor: NONE },
  'supervisor-validation':{ admin: FULL, operator: NONE, supervisor: EDIT },
};

export function canAccess(role: AppRole | null, page: PageKey, action: PermAction = 'view'): boolean {
  if (!role) return false;
  const perms = permissionMatrix[page]?.[role];
  if (!perms) return false;
  return perms.includes(action);
}

export function getAllowedRolesForPage(page: PageKey): AppRole[] {
  const entry = permissionMatrix[page];
  if (!entry) return [];
  return (Object.keys(entry) as AppRole[]).filter((role) => entry[role].length > 0);
}
