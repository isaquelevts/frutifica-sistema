import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, Layout, UserCheck, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { usePlatformStats, useOrganizationsWithStats } from '../hooks/useSuperAdmin';
import OrgStatusBadge from '../components/OrgStatusBadge';

const PIE_COLORS = { free: '#94a3b8', pro: '#3b82f6', enterprise: '#6366f1' };

const SuperAdminDashboard: React.FC = () => {
  const { data: stats, isLoading: loadingStats } = usePlatformStats();
  const { data: orgsWithStats, isLoading: loadingOrgs } = useOrganizationsWithStats();

  if (loadingStats || loadingOrgs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Gráfico: igrejas cadastradas por mês (últimos 12 meses)
  const monthlyData = (() => {
    if (!stats?.organizations) return [];
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      map[key] = 0;
    }
    stats.organizations.forEach(org => {
      const d = new Date(org.createdAt);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([mes, igrejas]) => ({ mes, igrejas }));
  })();

  // Gráfico: top 10 igrejas por células
  const topOrgs = [...(orgsWithStats ?? [])]
    .sort((a, b) => (b as any).cellCount - (a as any).cellCount)
    .slice(0, 10)
    .map(o => ({ name: o.name.length > 18 ? o.name.substring(0, 18) + '…' : o.name, células: (o as any).cellCount }));

  // Gráfico: distribuição por plano
  const planData = (() => {
    if (!stats?.organizations) return [];
    const counts: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
    stats.organizations.forEach(o => { counts[o.plan] = (counts[o.plan] ?? 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  })();

  // Últimas 5 igrejas
  const recentOrgs = [...(orgsWithStats ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const metricCards = [
    { label: 'Total de Igrejas', value: stats?.totalOrganizations ?? 0, icon: <Building2 size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Igrejas Ativas', value: stats?.activeOrganizations ?? 0, icon: <TrendingUp size={20} />, color: 'text-green-600 bg-green-50' },
    { label: 'Total de Usuários', value: stats?.totalProfiles ?? 0, icon: <Users size={20} />, color: 'text-violet-600 bg-violet-50' },
    { label: 'Total de Células', value: stats?.totalCells ?? 0, icon: <Layout size={20} />, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total de Membros', value: stats?.totalMembers ?? 0, icon: <UserCheck size={20} />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Total de Relatórios', value: stats?.totalReports ?? 0, icon: <FileText size={20} />, color: 'text-pink-600 bg-pink-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard da Plataforma</h1>
        <p className="text-slate-500 mt-1">Visão geral de todas as igrejas cadastradas no Frutifica.</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{card.value.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Igrejas cadastradas por mês */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Igrejas Cadastradas por Mês</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="igrejas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 igrejas por células */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Top 10 Igrejas por Células</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topOrgs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="células" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por plano */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Distribuição por Plano</h2>
          {planData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name">
                    {planData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, String(name).toUpperCase()]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 justify-center mt-2">
                {planData.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[e.name as keyof typeof PIE_COLORS] ?? '#94a3b8' }} />
                    {e.name.toUpperCase()} ({e.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Últimas 5 igrejas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Últimas Igrejas Cadastradas</h2>
            <Link to="/super/organizations" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Igreja</th>
                  <th className="px-6 py-3 text-left font-medium">Plano</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Células</th>
                  <th className="px-6 py-3 text-left font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      <Link to={`/super/organizations/${org.id}`} className="hover:text-blue-600 transition-colors">
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600 uppercase text-xs font-medium">{org.plan}</td>
                    <td className="px-6 py-3"><OrgStatusBadge status={org.subscriptionStatus} /></td>
                    <td className="px-6 py-3 text-slate-600">{(org as any).cellCount}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {recentOrgs.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma igreja cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerta de orgs suspensas */}
      {(stats?.suspendedOrganizations ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {stats!.suspendedOrganizations} {stats!.suspendedOrganizations === 1 ? 'igreja suspensa' : 'igrejas suspensas'}
            </p>
            <Link to="/super/organizations" className="text-xs text-red-600 hover:underline mt-1 inline-block">
              Ver igrejas suspensas →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
