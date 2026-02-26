import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateCell, deleteCell } from './cellService';
import { Cell, Generation } from '../../shared/types/types';
import { PlusCircle, MapPin, Calendar, Search, ToggleLeft, ToggleRight, Edit, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useQueryClient } from '@tanstack/react-query';

const CellList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [deleteTarget, setDeleteTarget] = useState<Cell | null>(null);
  const [deleteRelated, setDeleteRelated] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: generations = [], isLoading: loadingGenerations } = useGenerations(user?.organizationId);

  const isLoading = loadingCells || loadingGenerations;

  const toggleCellStatus = async (cell: Cell) => {
    const updatedCell = { ...cell, active: !cell.active };
    await updateCell(updatedCell);
    queryClient.invalidateQueries({ queryKey: ['cells'] });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteConfirmName !== deleteTarget.name) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteCell(deleteTarget.id, deleteRelated);
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      setDeleteTarget(null);
      setDeleteConfirmName('');
      setDeleteRelated(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao excluir célula.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to remove accents and special characters for search
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD') // Decompose combined characters (e.g., 'á' -> 'a' + '´')
      .replace(/[\u0300-\u036f]/g, "") // Remove the diacritical marks
      .toLowerCase();
  };

  const filteredCells = cells.filter(cell => {
    const term = normalizeText(searchTerm);
    const cellName = normalizeText(cell.name);
    const leaderName = normalizeText(cell.leaderName);

    const matchesSearch = cellName.includes(term) || leaderName.includes(term);

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && cell.active !== false;
    if (statusFilter === 'inactive') return matchesSearch && cell.active === false;

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando células...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Células Cadastradas</h1>
          <p className="text-slate-500">Gerencie as células e mantenha os dados atualizados.</p>
        </div>
        <Link
          to="/register-cell"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusCircle size={18} />
          Nova Célula
        </Link>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome da célula ou líder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
      </div>

      {filteredCells.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 mb-4">Nenhuma célula encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCells.map(cell => (
            <div key={cell.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow ${cell.active === false ? 'opacity-75 bg-slate-50' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{cell.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{generations.find(g => g.id === cell.generationId)?.name || ''}</p>
                </div>
                <button
                  onClick={() => toggleCellStatus(cell)}
                  className={`text-2xl transition-colors ${cell.active !== false ? 'text-green-500' : 'text-slate-400'}`}
                  title={cell.active !== false ? 'Célula Ativa (Clique para desativar)' : 'Célula Inativa (Clique para ativar)'}
                >
                  {cell.active !== false ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {/* Leadership Section */}
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Liderança</p>
                <div className="space-y-2">
                  {/* Main Leader Card */}
                  <div className="flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center mr-3 font-bold text-xs">
                      L
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800">{cell.leaderName}</p>
                      <p className="text-xs text-slate-500 truncate">{cell.whatsapp}</p>
                    </div>
                  </div>

                  {/* Co-Leaders Cards */}
                  {cell.coLeaders && cell.coLeaders.map(co => (
                    <div key={co.id} className="flex items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mr-3 font-bold text-xs">
                        CL
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-800">{co.name}</p>
                        <p className="text-xs text-slate-500 truncate">{co.email || co.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-6 pt-4 border-t border-slate-100">
                <div className="flex items-center text-slate-600 text-sm">
                  <Calendar size={16} className="mr-2 text-slate-400" />
                  {cell.dayOfWeek} às {cell.time}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cell.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm hover:underline cursor-pointer"
                  title="Abrir no Google Maps"
                >
                  <MapPin size={16} className="mr-2 text-blue-500" />
                  <span className="truncate flex-1">{cell.address}</span>
                  <ExternalLink size={12} className="ml-1 opacity-50" />
                </a>
                {!cell.active && (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">INATIVA</span>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <Link
                  to={`/edit-cell/${cell.id}`}
                  className="flex items-center justify-center gap-2 flex-1 text-center bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 font-medium py-2 rounded-lg transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
                >
                  <Edit size={16} />
                  Editar
                </Link>
                <button
                  onClick={() => {
                    setDeleteTarget(cell);
                    setDeleteConfirmName('');
                    setDeleteRelated(false);
                    setDeleteError('');
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                  title="Excluir célula"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* MODAL DE EXCLUSÃO */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Excluir Célula</h2>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">
                Você está prestes a excluir permanentemente a célula{' '}
                <strong>"{deleteTarget.name}"</strong>.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={deleteRelated}
                onChange={(e) => setDeleteRelated(e.target.checked)}
                className="mt-0.5 accent-red-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Excluir também membros e relatórios</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Remove todos os membros cadastrados e relatórios enviados desta célula.
                </p>
              </div>
            </label>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Digite <strong>{deleteTarget.name}</strong> para confirmar:
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 text-slate-800"
                placeholder={deleteTarget.name}
              />
            </div>

            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-4">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmName !== deleteTarget.name || isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellList;