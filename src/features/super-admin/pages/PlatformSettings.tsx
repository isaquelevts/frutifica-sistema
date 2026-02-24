import React, { useState } from 'react';
import { Shield, UserPlus, Trash2, AlertCircle, Check } from 'lucide-react';
import { useSuperAdmins, useAddSuperAdmin, useRemoveSuperAdmin } from '../hooks/useSuperAdmin';
import { useAuth } from '../../../core/auth/AuthContext';

const PlatformSettings: React.FC = () => {
  const { user } = useAuth();
  const { data: superAdmins = [], isLoading } = useSuperAdmins();
  const addSuperAdminMutation = useAddSuperAdmin();
  const removeSuperAdminMutation = useRemoveSuperAdmin();

  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess(false);
    try {
      await addSuperAdminMutation.mutateAsync(newEmail.trim());
      setNewEmail('');
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: any) {
      setAddError(err.message ?? 'Erro ao adicionar superadmin');
    }
  };

  const handleRemove = async (profileId: string) => {
    if (profileId === user?.id) {
      alert('Você não pode remover a si mesmo como superadmin.');
      return;
    }
    await removeSuperAdminMutation.mutateAsync(profileId);
    setRemoveConfirmId(null);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações da Plataforma</h1>
        <p className="text-slate-500 mt-1">Gerencie superadmins e configurações globais do Frutifica.</p>
      </div>

      {/* Planos e Limites */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Planos e Limites</h2>
          <p className="text-sm text-slate-500 mt-0.5">Tabela de referência dos planos disponíveis.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-medium">Plano</th>
                <th className="px-6 py-3 text-left font-medium">Máx. Células</th>
                <th className="px-6 py-3 text-left font-medium">Preço</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td className="px-6 py-4 font-semibold text-slate-800">FREE</td>
                <td className="px-6 py-4 text-slate-600">3</td>
                <td className="px-6 py-4 text-slate-600">R$ 0</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Ativo</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold text-slate-800">PRO</td>
                <td className="px-6 py-4 text-slate-600">Ilimitado</td>
                <td className="px-6 py-4 text-slate-600">R$ 29,90/mês</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Ativo</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold text-slate-800">ENTERPRISE</td>
                <td className="px-6 py-4 text-slate-600">Ilimitado</td>
                <td className="px-6 py-4 text-slate-600">Sob consulta</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Ativo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gerenciar Super Admins */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Shield size={18} className="text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-slate-800">Super Admins</h2>
            <p className="text-sm text-slate-500 mt-0.5">Usuários com acesso total à plataforma.</p>
          </div>
        </div>

        {/* Adicionar novo superadmin */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <form onSubmit={handleAddSuperAdmin} className="flex gap-3">
            <div className="flex-1 relative">
              <UserPlus size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={addSuperAdminMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {addSuperAdminMutation.isPending ? 'Adicionando...' : 'Adicionar SuperAdmin'}
            </button>
          </form>

          {addError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} /> {addError}
            </div>
          )}
          {addSuccess && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <Check size={14} /> SuperAdmin adicionado com sucesso!
            </div>
          )}
        </div>

        {/* Lista de superadmins */}
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {superAdmins.map((sa: any) => (
              <div key={sa.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm uppercase">
                    {sa.name?.substring(0, 2) ?? '??'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{sa.name}</p>
                    <p className="text-xs text-slate-500">{sa.email}</p>
                  </div>
                  {sa.id === user?.id && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Você</span>
                  )}
                </div>
                {sa.id !== user?.id && (
                  <button
                    onClick={() => setRemoveConfirmId(sa.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover superadmin"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {superAdmins.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">Nenhum superadmin encontrado.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Confirmar remoção */}
      {removeConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Remover SuperAdmin?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Este usuário perderá o acesso ao painel super admin. Você pode readicioná-lo a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirmId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemove(removeConfirmId)}
                disabled={removeSuperAdminMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {removeSuperAdminMutation.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings;
