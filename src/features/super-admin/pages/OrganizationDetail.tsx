import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Layout, FileText, UserCheck, BarChart2, Network } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrganizationDetail, useOrganizationCells, useOrganizationGenerations, useOrganizationReportsByWeek } from '../hooks/useSuperAdmin';
import OrgStatusBadge from '../components/OrgStatusBadge';

type Tab = 'overview' | 'cells' | 'users' | 'generations';

const OrganizationDetail: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: detail, isLoading } = useOrganizationDetail(orgId);
  const { data: cells = [], isLoading: loadingCells } = useOrganizationCells(activeTab === 'cells' ? orgId : undefined);
  const { data: generations = [], isLoading: loadingGenerations } = useOrganizationGenerations(activeTab === 'generations' ? orgId : undefined);
  const { data: weeklyReports = [] } = useOrganizationReportsByWeek(orgId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-16 text-slate-500">
        Igreja não encontrada.
        <Link to="/super/organizations" className="block text-blue-600 mt-2 hover:underline">← Voltar</Link>
      </div>
    );
  }

  const { organization: org, cellCount, memberCount, userCount, reportCount, profiles } = detail;

  // Processar relatórios por semana (últimas 12 semanas)
  const weeklyChartData = (() => {
    const map: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = `Sem ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      map[key] = 0;
    }
    weeklyReports.forEach((r: any) => {
      const d = new Date(r.date);
      const key = `Sem ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([semana, relatórios]) => ({ semana, relatórios }));
  })();

  const adminProfile = profiles.find(p => p.roles?.includes('admin'));

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart2 size={15} /> },
    { id: 'cells', label: 'Células', icon: <Layout size={15} /> },
    { id: 'users', label: 'Usuários', icon: <Users size={15} /> },
    { id: 'generations', label: 'Gerações', icon: <Network size={15} /> },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link to="/super/organizations" className="flex items-center text-slate-500 hover:text-slate-800 text-sm mb-4 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Voltar para lista
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{org.name}</h1>
                <OrgStatusBadge status={org.subscriptionStatus} />
                <span className="text-xs font-medium uppercase bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">{org.plan}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span>Cadastro: {new Date(org.createdAt).toLocaleDateString('pt-BR')}</span>
                {adminProfile && <span>Admin: {adminProfile.name} ({adminProfile.email})</span>}
                {org.maxCells && org.plan === 'free' && <span>Limite: {org.maxCells} células</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Células', value: cellCount, icon: <Layout size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Membros', value: memberCount, icon: <UserCheck size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Usuários', value: userCount, icon: <Users size={18} />, color: 'text-violet-600 bg-violet-50' },
          { label: 'Relatórios', value: reportCount, icon: <FileText size={18} />, color: 'text-orange-600 bg-orange-50' },
          { label: 'Líderes', value: profiles.filter(p => p.roles?.includes('leader')).length, icon: <Users size={18} />, color: 'text-teal-600 bg-teal-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aba: Visão Geral */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Relatórios por Semana (últimas 12 semanas)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="relatórios" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Indicador de saúde */}
          {cellCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Indicador de Atividade</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (reportCount / Math.max(cellCount, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {reportCount} relatórios / {cellCount} células
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aba: Células */}
      {activeTab === 'cells' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingCells ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr className="text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-medium">Nome</th>
                    <th className="px-6 py-3 text-left font-medium">Líder</th>
                    <th className="px-6 py-3 text-left font-medium">Dia</th>
                    <th className="px-6 py-3 text-left font-medium">Público</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cells.map((cell: any) => (
                    <tr key={cell.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800">{cell.name}</td>
                      <td className="px-6 py-3 text-slate-600">{cell.leader_name}</td>
                      <td className="px-6 py-3 text-slate-600">{cell.day_of_week}</td>
                      <td className="px-6 py-3 text-slate-600">{cell.target_audience}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cell.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {cell.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cells.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma célula cadastrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba: Usuários */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Nome</th>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Roles</th>
                  <th className="px-6 py-3 text-left font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{profile.name}</td>
                    <td className="px-6 py-3 text-slate-600">{profile.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(profile.roles ?? []).map((role: string) => (
                          <span key={role} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum usuário</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba: Gerações */}
      {activeTab === 'generations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingGenerations ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr className="text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-medium">Nome</th>
                    <th className="px-6 py-3 text-left font-medium">Líder</th>
                    <th className="px-6 py-3 text-left font-medium">Descrição</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {generations.map((gen: any) => (
                    <tr key={gen.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: gen.color ?? '#3b82f6' }} />
                          {gen.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{gen.leader?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{gen.description ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${gen.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {gen.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {generations.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma geração cadastrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationDetail;
