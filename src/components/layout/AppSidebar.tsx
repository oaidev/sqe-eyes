import { useAuth } from '@/hooks/useAuth';
import { usePermissions, type PageKey } from '@/hooks/usePermissions';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Users, MapPin, Shield, ScanSearch, ClipboardCheck, LogOut, ChevronDown, KeyRound,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  pageKey: PageKey;
}

const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: 'Umum',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, pageKey: 'dashboard' },
    ],
  },
  {
    group: 'Admin — Konfigurasi',
    items: [
      { title: 'Kelola Pekerja', url: '/workers', icon: Users, pageKey: 'workers' },
      { title: 'Zona & Kamera', url: '/zones', icon: MapPin, pageKey: 'zones' },
      { title: 'Kelola Pengguna', url: '/users', icon: Shield, pageKey: 'users' },
      { title: 'Kelola Role', url: '/roles', icon: KeyRound, pageKey: 'roles' },
      { title: 'Simulasi Deteksi', url: '/simulate', icon: ScanSearch, pageKey: 'simulate' },
    ],
  },
  {
    group: 'Operator — Monitoring',
    items: [
      { title: 'Validasi Operator', url: '/operator-validation', icon: ClipboardCheck, pageKey: 'operator-validation' },
    ],
  },
  {
    group: 'Supervisor',
    items: [
      { title: 'Validasi Supervisor', url: '/supervisor-validation', icon: ClipboardCheck, pageKey: 'supervisor-validation' },
    ],
  },
];

export function AppSidebar() {
  const { user, userRole, signOut } = useAuth();
  const { canView } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNav = navItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canView(item.pageKey)),
    }))
    .filter((group) => group.items.length > 0);

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">COSMOS</h2>
          <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Computer Vision for Mining Operation & Safety</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredNav.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.url}
                      onClick={() => navigate(item.url)}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-xs font-medium truncate">{user?.email}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">
                  {userRole?.replace('_', ' ') || 'No Role'}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-56">
            <DropdownMenuItem onClick={() => { signOut(); navigate('/auth'); }}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
