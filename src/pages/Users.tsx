import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Pencil, Loader2, Copy, Check, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'supervisor', label: 'Supervisor' },
] as const;

type AppRole = 'admin' | 'operator' | 'supervisor';

interface UserRow {
  id: string; email: string; full_name: string | null; role: AppRole | null;
  created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null;
}

async function invokeManageUsers(action: string, method: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/manage-users?action=${action}`;
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('operator');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('operator');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['manage-users'],
    queryFn: async () => { const res = await invokeManageUsers('list', 'GET'); return res.users as UserRow[]; },
  });

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const inviteMutation = useMutation({
    mutationFn: () => invokeManageUsers('invite', 'POST', { email: inviteEmail, role: inviteRole, full_name: inviteFullName || undefined }),
    onSuccess: (data) => {
      setInviteOpen(false);
      setCreatedCredentials({ email: inviteEmail, password: data.temp_password });
      setInviteEmail(''); setInviteFullName('');
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: string }) => invokeManageUsers('update-role', 'POST', { user_id, role }),
    onSuccess: () => { toast({ title: 'Role diperbarui' }); setEditingUser(null); queryClient.invalidateQueries({ queryKey: ['manage-users'] }); },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => invokeManageUsers('delete-user', 'POST', { user_id }),
    onSuccess: () => { toast({ title: 'User dihapus' }); setDeleteUserId(null); queryClient.invalidateQueries({ queryKey: ['manage-users'] }); },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  });

  const roleBadgeVariant = (role: string | null) => {
    if (!role) return 'outline' as const;
    switch (role) { case 'admin': return 'destructive' as const; case 'operator': return 'default' as const; default: return 'secondary' as const; }
  };

  const handleCopyPassword = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(createdCredentials.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout title="Kelola Pengguna">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari email atau nama..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Invite User</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Email</TableHead><TableHead>Nama</TableHead><TableHead>Role</TableHead><TableHead>Login Terakhir</TableHead><TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data pengguna</TableCell></TableRow>
                  ) : filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.full_name || '—'}</TableCell>
                      <TableCell><Badge variant={roleBadgeVariant(u.role)}>{u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Belum ada role'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('id-ID') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingUser(u); setEditRole(u.role || 'operator'); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteUserId(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@company.com" /></div>
            <div className="space-y-2">
              <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input value={inviteFullName} onChange={e => setInviteFullName(e.target.value)} maxLength={100} />
              <p className="text-xs text-muted-foreground text-right">{inviteFullName.length}/100</p>
            </div>
            <div className="space-y-2">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Batal</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}>{inviteMutation.isPending ? 'Membuat...' : 'Buat Akun'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Success Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={() => { setCreatedCredentials(null); setCopied(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Akun Berhasil Dibuat</DialogTitle>
            <DialogDescription>Berikan kredensial ini ke pengguna. Password hanya ditampilkan sekali.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium">{createdCredentials?.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Password Sementara</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono tracking-wider">{createdCredentials?.password}</code>
                <Button size="sm" variant="outline" onClick={handleCopyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setCreatedCredentials(null); setCopied(false); }}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ubah Role — {editingUser?.email}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Select value={editRole} onValueChange={v => setEditRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
            <Button onClick={() => editingUser && updateRoleMutation.mutate({ user_id: editingUser.id, role: editRole })} disabled={updateRoleMutation.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle><AlertDialogDescription>User akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
