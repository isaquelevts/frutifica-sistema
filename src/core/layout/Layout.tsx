import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, PlusCircle, Menu, Church, Trophy, LogOut, UserCog, Home, AlertTriangle, UserCheck, HeartHandshake, Calendar, ClipboardList, Briefcase, List, CreditCard, Sparkles, Network } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../../shared/types/types';

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
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, organization } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (roles?: UserRole[]) => {
    if (!roles || roles.length === 0) return 'Usuário';
    if (roles.includes(UserRole.ADMIN)) return 'Administrador';
    if (roles.includes(UserRole.LEADER)) return 'Líder';
    if (roles.includes(UserRole.COLEADER)) return 'Co-Líder';
    if (roles.includes(UserRole.INTRODUTOR)) return 'Introdutor';
    return 'Membro';
  };

  const hasRole = (role: UserRole) => user?.roles?.includes(role) || false;
  const isConsolidationTeam = isAdmin || hasRole(UserRole.INTRODUTOR);
  // Check plan logic removed


  // BUILD MENU STRUCTURE
  let menuStructure: MenuGroup[] = [];

  if (isAdmin || isConsolidationTeam) {
    // 1. Dashboard Global (Always first)
    const dashboardItems = [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> }
    ];
    menuStructure.push({ items: dashboardItems });

    // 2. Células Section
    if (isAdmin) {
      menuStructure.push({
        title: 'CÉLULAS',
        items: [
          { path: '/cells', label: 'Gerenciar Células', icon: <Users size={20} /> },
          { path: '/leaders', label: 'Gerenciar Líderes', icon: <UserCog size={20} /> },
          { path: '/import', label: 'Importação em Massa', icon: <FileText size={20} /> },
          { path: '/generations', label: 'Gerações / Redes', icon: <Network size={20} /> },
          { path: '/all-members', label: 'Membros Gerais', icon: <List size={20} /> },
          { path: '/reports', label: 'Relatórios de Célula', icon: <FileText size={20} /> },
          { path: '/ranking', label: 'Reconhecimento', icon: <Trophy size={20} /> },
          { path: '/risk-monitoring', label: 'Células em Risco', icon: <AlertTriangle size={20} /> },
        ]
      });
    }

    // 3. Consolidação Section
    if (isConsolidationTeam) {
      menuStructure.push({
        title: 'CONSOLIDAÇÃO',
        items: [
          { path: '/consolidation', label: 'Dashboard', icon: <HeartHandshake size={20} /> },
          { path: '/cult-reports', label: 'Relatórios de Culto', icon: <Calendar size={20} /> },
          { path: '/kanban', label: 'CRM / Kanban', icon: <ClipboardList size={20} /> },
          { path: '/visitors', label: 'Visitantes', icon: <UserCheck size={20} /> },
        ]
      });
    }

    // 4. Configurações Section (Admin Only)
    if (isAdmin) {
      menuStructure.push({
        title: 'CONFIGURAÇÕES',
        items: [
          { path: '/register-cell', label: 'Nova Célula', icon: <PlusCircle size={20} /> },
        ]
      });
    }

  } else {
    // LEADER VIEW (Flat list, preserved as requested)
    menuStructure.push({
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/my-cell', label: 'Minha Célula', icon: <Home size={20} /> },
        { path: '/members', label: 'Membros', icon: <UserCheck size={20} /> },
        { path: '/reports', label: 'Meus Relatórios', icon: <FileText size={20} /> },
        { path: '/ranking', label: 'Reconhecimento', icon: <Trophy size={20} /> },
      ]
    });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Church className="text-blue-600 mr-2" size={24} />
          <span className="text-xl font-bold text-slate-800">Frutifica</span>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">


          {menuStructure.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              {group.title && (
                <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
              {user?.name.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-700 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{getRoleLabel(user?.roles)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            <Menu size={24} />
          </button>

          <div className="ml-auto">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;