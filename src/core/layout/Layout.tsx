import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, PlusCircle, Church,
  Trophy, LogOut, UserCog, AlertTriangle, UserCheck,
  ClipboardList,
  Network, Building2, Settings, Shield, MessageCircle, Ticket
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../../shared/types/types';
import {
  Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarRail,
  SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  title?: string;
  items: MenuItem[];
  isSuperSection?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSuperAdmin, organization } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (roles?: UserRole[]) => {
    if (!roles || roles.length === 0) return 'Usuário';
    if (roles.includes(UserRole.SUPERADMIN)) return 'Super Admin';
    if (roles.includes(UserRole.ADMIN)) return 'Administrador';
    if (roles.includes(UserRole.LEADER)) return 'Líder';
    if (roles.includes(UserRole.COLEADER)) return 'Co-Líder';
    if (roles.includes(UserRole.INTRODUTOR)) return 'Introdutor';
    return 'Membro';
  };

  const isSuspended = organization?.subscriptionStatus === 'suspended';

  let menuStructure: MenuGroup[] = [];

  // ─── SEÇÃO SUPER ADMIN (somente para superadmin) ────────────────────────
  if (isSuperAdmin) {
    menuStructure.push({
      title: 'SUPER ADMIN',
      isSuperSection: true,
      items: [
        { path: '/super', label: 'Dashboard da Plataforma', icon: <Shield size={20} /> },
        { path: '/super/organizations', label: 'Igrejas Cadastradas', icon: <Building2 size={20} /> },
        { path: '/super/settings', label: 'Configurações', icon: <Settings size={20} /> },
      ]
    });
  }

  // ─── MENU NORMAL (admin) ────────────────────────────────────────────────
  if (isAdmin) {
    menuStructure.push({ items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> }
    ]});

    menuStructure.push({
      title: 'CÉLULAS',
      items: [
        { path: '/cells', label: 'Gerenciar Células', icon: <Users size={20} /> },
        { path: '/leaders', label: 'Gerenciar Líderes', icon: <UserCog size={20} /> },
        { path: '/invites', label: 'Convites de Líderes', icon: <Ticket size={20} /> },
        { path: '/import', label: 'Importação em Massa', icon: <FileText size={20} /> },
        { path: '/generations', label: 'Gerações / Redes', icon: <Network size={20} /> },
        { path: '/reports', label: 'Relatórios de Célula', icon: <FileText size={20} /> },
        { path: '/ranking', label: 'Reconhecimento', icon: <Trophy size={20} /> },
        { path: '/risk-monitoring', label: 'Células em Risco', icon: <AlertTriangle size={20} /> },
        { path: '/whatsapp-settings', label: 'WhatsApp', icon: <MessageCircle size={20} /> },
      ]
    });

    menuStructure.push({
      title: 'CONFIGURAÇÕES',
      items: [
        { path: '/register-cell', label: 'Nova Célula', icon: <PlusCircle size={20} /> },
      ]
    });

  } else {
    // ─── MENU LÍDER ─────────────────────────────────────────────────────────
    const reportPath = user?.cellId ? `/report/${user.cellId}` : '/reports';
    menuStructure.push({
      items: [
        { path: reportPath, label: 'Relatório', icon: <FileText size={20} /> },
        { path: '/ranking', label: 'Reconhecimento', icon: <Trophy size={20} /> },
        { path: '/reports', label: 'Meus Relatórios', icon: <ClipboardList size={20} /> },
      ]
    });
  }

  const isActive = (path: string) => {
    if (path === '/super') return location.pathname === '/super';
    if (path.startsWith('/super/')) return location.pathname.startsWith(path);
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path.startsWith('/report/')) return location.pathname.startsWith('/report/') || location.pathname.startsWith('/edit-report/');
    if (path === '/reports') return location.pathname === '/reports';
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Church className="text-primary shrink-0" size={24} />
            <span className="text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden">Frutifica</span>
            {isSuperAdmin && (
              <span className="ml-auto text-[10px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded group-data-[collapsible=icon]:hidden">SA</span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          {menuStructure.map((group, groupIndex) => (
            <SidebarGroup key={groupIndex}>
              {group.title && (
                <SidebarGroupLabel className={group.isSuperSection ? 'text-primary' : undefined}>
                  {group.title}
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                      className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                    >
                      <Link to={item.path}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold uppercase">
                {user?.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{getRoleLabel(user?.roles)}</p>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Sair"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {isSuspended && (
          <div className="bg-destructive text-white px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-2 shrink-0">
            <AlertTriangle size={16} />
            Sua conta está suspensa. Entre em contato com o suporte para reativar.
          </div>
        )}

        <header className="h-16 flex items-center gap-2 border-b border-border px-4 lg:px-8 shrink-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <div className="ml-auto flex items-center gap-3">
            {isSuspended && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full">
                <AlertTriangle size={12} /> Conta Suspensa
              </span>
            )}
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
