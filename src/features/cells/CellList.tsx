import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateCell } from './cellService';
import { Cell, Generation } from '../../shared/types/types';
import { PlusCircle, MapPin, Calendar, Search, ToggleLeft, ToggleRight, Edit, ExternalLink } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useQueryClient } from '@tanstack/react-query';

const CellList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: generations = [], isLoading: loadingGenerations } = useGenerations(user?.organizationId);

  const isLoading = loadingCells || loadingGenerations;

  const toggleCellStatus = async (cell: Cell) => {
    const updatedCell = { ...cell, active: !cell.active };
    await updateCell(updatedCell);
    queryClient.invalidateQueries({ queryKey: ['cells'] });
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

              <div className="pt-2">
                <Link
                  to={`/edit-cell/${cell.id}`}
                  className="flex items-center justify-center gap-2 w-full text-center bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 font-medium py-2 rounded-lg transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
                >
                  <Edit size={16} />
                  Editar Informações
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CellList;