export type AppRole = 'admin' | 'operator' | 'supervisor' | 'safety_manager';
export type PermAction = 'view' | 'edit' | 'delete';

export type PageKey =
  | 'dashboard'
  | 'workers'
  | 'zones'
  | 'ppe-rules'
  | 'access-rules'
  | 'users'
  | 'live-cameras'
  | 'events'
  | 'alerts'
  | 'validations'
  | 'exit-permits'
  | 'compliance'
  | 'violations'
  | 'reports';

type PermSet = PermAction[];

const FULL: PermSet = ['view', 'edit', 'delete'];
const VIEW_ONLY: PermSet = ['view'];
const EDIT: PermSet = ['view', 'edit'];
const NONE: PermSet = [];

const permissionMatrix: Record<PageKey, Record<AppRole, PermSet>> = {
  dashboard:      { admin: VIEW_ONLY, operator: VIEW_ONLY, supervisor: VIEW_ONLY, safety_manager: VIEW_ONLY },
  workers:        { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: NONE },
  zones:          { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: NONE },
  'ppe-rules':    { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: NONE },
  'access-rules': { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: NONE },
  users:          { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: NONE },
  'live-cameras': { admin: FULL, operator: VIEW_ONLY, supervisor: NONE, safety_manager: NONE },
  events:         { admin: FULL, operator: VIEW_ONLY, supervisor: NONE, safety_manager: NONE },
  alerts:         { admin: FULL, operator: EDIT, supervisor: NONE, safety_manager: NONE },
  validations:    { admin: FULL, operator: NONE, supervisor: EDIT, safety_manager: NONE },
  'exit-permits': { admin: FULL, operator: NONE, supervisor: EDIT, safety_manager: NONE },
  compliance:     { admin: VIEW_ONLY, operator: NONE, supervisor: NONE, safety_manager: VIEW_ONLY },
  violations:     { admin: VIEW_ONLY, operator: NONE, supervisor: NONE, safety_manager: VIEW_ONLY },
  reports:        { admin: FULL, operator: NONE, supervisor: NONE, safety_manager: EDIT },
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
