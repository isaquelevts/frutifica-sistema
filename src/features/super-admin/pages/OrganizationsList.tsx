import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Eye, Pause, Play, Trash2, Edit2, ChevronDown, Building2 } from 'lucide-react';
import { useOrganizationsWithStats, useSuspendOrganization, useReactivateOrganization, useDeleteOrganization, useUpdateOrganizationPlan, useUpdateOrganizationName } from '../hooks/useSuperAdmin';
import OrgStatusBadge from '../components/OrgStatusBadge';
import { Organization, PlanType } from '../../../shared/types/types';

type SortField = 'name' | 'createdAt' | 'cellCount';
type FilterStatus = 'all' | 'active' | 'suspended' | 'trialing' | 'canceled';
type FilterPlan = 'all' | 'free' | 'pro' | 'enterprise';

const PLAN_MAX_CELLS: Record<PlanType, number> = { free: 3, pro: 99999, enterprise: 99999 };

const OrganizationsList: React.FC = () => {
  const navigate = useNavigate();
  const { data: orgs = [], isLoading } = useOrganizationsWithStats();
  const suspendMutation = useSuspendOrganization();
  const reactivateMutation = useReactivateOrganization();
  const deleteMutation = useDeleteOrganization();
  const updatePlanMutation = useUpdateOrganizationPlan();
  const updateNameMutation = useUpdateOrganizationName();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPlan, setFilterPlan] = useState<FilterPlan>('all');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [editPlanOrgId, setEditPlanOrgId] = useState<string | null>(null);
  const [editPlanValue, setEditPlanValue] = useState<PlanType>('free');
  const [editNameValue, setEditNameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const filtered = useMemo(() => {
    let result = [...orgs] as Array<Organization & { cellCount: number }>;

    if (search) {
      result = result.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filterStatus !== 'all') {
      result = result.filter(o => o.subscriptionStatus === filterStatus);
    }
    if (filterPlan !== 'all') {
      result = result.filter(o => o.plan === filterPlan);
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'cellCount') return b.cellCount - a.cellCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [orgs, search, filterStatus, filterPlan, sortBy]);

  const handleSuspend = async (orgId: string) => {
    if (!confirm('Confirmar suspensão desta igreja?')) return;
    await suspendMutation.mutateAsync(orgId);
  };

  const handleReactivate = async (orgId: string) => {
    await reactivateMutation.mutateAsync(orgId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmInput !== deleteConfirmName) return;
    setDeleteError('');
    try {
      await deleteMutation.mutateAsync(deleteConfirmId!);
      setDeleteConfirmId(null);
      setDeleteConfirmInput('');
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao excluir. Verifique se a função delete_organization_cascade está criada no Supabase.');
    }
  };

  const openEditOrg = (org: Organization) => {
    setEditPlanOrgId(org.id);
    setEditPlanValue(org.plan);
    setEditNameValue(org.name);
  };

  const handleSaveOrg = async () => {
    if (!editPlanOrgId) return;
    await Promise.all([
      updateNameMutation.mutateAsync({ orgId: editPlanOrgId, name: editNameValue.trim() }),
      updatePlanMutation.mutateAsync({
        orgId: editPlanOrgId,
        plan: editPlanValue,
        maxCells: PLAN_MAX_CELLS[editPlanValue],
      }),
    ]);
    setEditPlanOrgId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Igrejas Cadastradas</h1>
          <p className="text-slate-500 mt-1">{orgs.length} igrejas na plataforma</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativa</option>
            <option value="trialing">Trial</option>
            <option value="past_due">Inadimplente</option>
            <option value="suspended">Suspensa</option>
            <option value="canceled">Cancelada</option>
          </select>
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value as FilterPlan)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os planos</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortField)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Mais recentes</option>
            <option value="name">Nome</option>
            <option value="cellCount">Mais células</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Igreja</th>
                  <th className="px-6 py-3 text-left font-medium">Plano</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Células</th>
                  <th className="px-6 py-3 text-left font-medium">Cadastro</th>
                  <th className="px-6 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-blue-600" />
                        </div>
                        <Link to={`/super/organizations/${org.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {org.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium uppercase text-slate-600">{org.plan}</span>
                    </td>
                    <td className="px-6 py-4"><OrgStatusBadge status={org.subscriptionStatus} /></td>
                    <td className="px-6 py-4 text-slate-600">{org.cellCount}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(org.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/super/organizations/${org.id}`)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEditOrg(org)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        {org.subscriptionStatus === 'suspended' ? (
                          <button
                            onClick={() => handleReactivate(org.id)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reativar"
                          >
                            <Play size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(org.id)}
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Suspender"
                          >
                            <Pause size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => { setDeleteConfirmId(org.id); setDeleteConfirmName(org.name); setDeleteConfirmInput(''); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Nenhuma igreja encontrada com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Editar Igreja */}
      {editPlanOrgId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Editar Igreja</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Igreja</label>
                <input
                  type="text"
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome da Igreja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano</label>
                <select
                  value={editPlanValue}
                  onChange={e => setEditPlanValue(e.target.value as PlanType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free (3 células)</option>
                  <option value="pro">Pro (ilimitado)</option>
                  <option value="enterprise">Enterprise (ilimitado)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditPlanOrgId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancelar
              </button>
              <button
                onClick={handleSaveOrg}
                disabled={!editNameValue.trim() || updatePlanMutation.isPending || updateNameMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {(updatePlanMutation.isPending || updateNameMutation.isPending) ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Igreja</h3>
            <p className="text-sm text-slate-600 mb-4">
              Esta ação é <strong>irreversível</strong>. Todos os dados (células, membros, relatórios, usuários) serão permanentemente excluídos.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-700">
                Para confirmar, digite o nome da igreja: <strong>{deleteConfirmName}</strong>
              </p>
            </div>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={e => { setDeleteConfirmInput(e.target.value); setDeleteError(''); }}
              placeholder={deleteConfirmName}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeleteError(''); setDeleteConfirmInput(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmInput !== deleteConfirmName || deleteMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsList;
