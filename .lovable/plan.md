

## 3 Perbaikan: Dynamic RBAC, Auto-enable View, Form Validation

### Scope

1. **Dynamic RBAC dari `role_permissions` table** — sidebar visibility & page access + hide edit/delete buttons based on `can_edit`/`can_delete`
2. **Auto-enable "Lihat" saat "Edit" atau "Hapus" di-enable** di Kelola Role
3. **Form validation** — nama hanya huruf & spasi, email format valid, SID alphanumeric + karakter khusus, nama lengkap hanya huruf & spasi

---

### 1. Dynamic RBAC — Replace hardcoded permissions with DB-driven

**Current state**: `src/lib/permissions.ts` has a hardcoded `permissionMatrix`. Sidebar in `AppSidebar.tsx` uses hardcoded `roles` array per nav item. Neither reads from `role_permissions` table.

**Plan**:

#### a. Create `usePermissions` hook (`src/hooks/usePermissions.ts`)
- Query `role_permissions` table filtered by current user's role
- Return helper functions: `canView(pageKey)`, `canEdit(pageKey)`, `canDelete(pageKey)`
- Cache with react-query key `['role-permissions', userRole]`

#### b. Update `src/lib/permissions.ts`
- Keep `canAccess` as a fallback but make it work with dynamic data
- Export a `canAccessWithPerms` function that takes permissions data

#### c. Update `AppSidebar.tsx`
- Use `usePermissions` hook instead of hardcoded `roles` arrays
- Show menu item if `canView(pageKey)` returns true
- Map URL paths to page keys (e.g., `/workers` → `workers`, `/` → `dashboard`)

#### d. Update `ProtectedRoute.tsx`
- Use `usePermissions` to check `canView` for route access

#### e. Hide edit/delete buttons based on permissions in each page:
- **Workers.tsx**: Hide Pencil button if `!canEdit('workers')`, hide Trash button if `!canDelete('workers')`, hide "Tambah Pekerja" and "Import CSV" if `!canEdit('workers')`
- **Zones.tsx**: Same pattern for zone edit/delete and camera edit/delete buttons
- **Users.tsx**: Hide Pencil and Trash buttons based on `canEdit('users')` / `canDelete('users')`

---

### 2. Auto-enable "Lihat" in Kelola Role

**File**: `src/pages/Roles.tsx` — `togglePerm` function

When toggling `can_edit` or `can_delete` ON, automatically set `can_view` to `true`. When toggling `can_view` OFF, automatically set `can_edit` and `can_delete` to `false`.

```tsx
const togglePerm = (role, page, field) => {
  const current = getPerm(role, page);
  const newValue = !current[field];
  const updated = { ...current, [field]: newValue };
  
  if (field === 'can_view' && !newValue) {
    updated.can_edit = false;
    updated.can_delete = false;
  }
  if ((field === 'can_edit' || field === 'can_delete') && newValue) {
    updated.can_view = true;
  }
  
  setLocalPerms(prev => ({ ...prev, [key]: updated }));
};
```

---

### 3. Form Validation

#### Workers.tsx (Tambah/Edit Pekerja)
- **Nama**: Only letters, spaces, and common name characters (`.`, `'`, `-`). Regex: `/^[a-zA-Z\s.'\-]+$/`. Error: "Nama hanya boleh mengandung huruf"
- **SID**: Alphanumeric + special chars (`-`, `_`, `/`). Already flexible, add regex validation: `/^[a-zA-Z0-9\-_\/]+$/`. Error: "SID hanya boleh mengandung huruf, angka, dan karakter - _ /"
- Disable save button if validation fails, show inline error text

#### Users.tsx (Invite User)
- **Email**: Validate with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Error: "Format email tidak valid"
- **Nama Lengkap**: Same as worker nama — letters, spaces, `.`, `'`, `-` only. Error: "Nama hanya boleh mengandung huruf"
- Show inline error below each field

#### Zones.tsx
- **Nama Zona**: Letters, numbers, spaces, `-`. Regex: `/^[a-zA-Z0-9\s\-]+$/`. Error: "Nama zona hanya boleh mengandung huruf, angka, dan -"

Add a helper function `validateField(value, regex, errorMsg)` for consistency, or inline validation state per form.

---

### Files to modify
- `src/hooks/usePermissions.ts` — **NEW** — dynamic permissions hook
- `src/components/layout/AppSidebar.tsx` — use dynamic permissions for menu visibility
- `src/components/layout/ProtectedRoute.tsx` — use dynamic permissions for route guard
- `src/pages/Roles.tsx` — auto-enable view logic
- `src/pages/Workers.tsx` — hide buttons based on permissions + form validation
- `src/pages/Zones.tsx` — hide buttons based on permissions + form validation
- `src/pages/Users.tsx` — hide buttons based on permissions + form validation
- `src/lib/permissions.ts` — may simplify or keep as fallback

