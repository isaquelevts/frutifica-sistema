import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitantes } from '../../shared/hooks/useVisitantes';
import { useCells } from '../../shared/hooks/useCells';
import { Visitante, StatusKanban, Cell } from '../../shared/types/types';
import { Search, Heart, User, Plus, MapPin, Edit2, RefreshCw, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';

const VisitorsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: visitantes = [], isLoading: loadingVisitors } = useVisitantes(user?.organizationId);
  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);

  const isLoading = loadingVisitors || loadingCells;

  const filtered = useMemo(() => {
    return visitantes.filter(v => v.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [visitantes, searchTerm]);

  const getStatusBadge = (status: StatusKanban) => {
    switch (status) {
      case StatusKanban.NOVO: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">Novo</span>;
      case StatusKanban.CONTATO: return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold uppercase">Em Contato</span>;
      case StatusKanban.INTEGRADO: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase">Integrado</span>;
    }
  };

  const getCellName = (cellId?: string) => {
    if (!cellId) return '-';
    const c = cells.find(cell => cell.id === cellId);
    return c ? c.name : '-';
  };

  const handleEdit = (visitorId: string) => {
    navigate(`/edit-visitor/${visitorId}`);
  };

  const handleNewVisitor = () => {
    navigate('/add-visitor');
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando visitantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Todos os Visitantes</h1>
        <p className="text-slate-500">Gerencie o banco de dados de pessoas.</p>
      </div>

      {/* ACTION CARD - BELOW TEXT */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 transform hover:scale-[1.01] transition-transform duration-300 border-2 border-white/20">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="bg-white/20 p-3 md:p-4 rounded-full backdrop-blur-sm shadow-inner shrink-0">
            <UserPlus className="w-8 h-8 md:w-12 md:h-12 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-bold mb-1 leading-tight">Novo Visitante</h2>
            <p className="text-blue-100 text-sm md:text-lg opacity-90 leading-snug">Cadastre visitantes para iniciar o acompanhamento.</p>
          </div>
        </div>
        <button
          onClick={handleNewVisitor}
          className="flex items-center gap-2 md:gap-3 bg-white text-blue-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-lg hover:bg-blue-50 transition-all w-full md:w-auto justify-center group"
        >
          Adicionar Agora <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-8">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Célula</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Origem</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Telefone</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Endereço</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{v.nome}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{getCellName(v.celulaDestinoId || v.celulaOrigemId)}</td>
                  <td className="px-6 py-4">
                    {v.tipoOrigem === 'convertido' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600"><Heart size={12} /> Conversão</span>
                    ) : v.tipoOrigem === 'reconciliacao' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-600"><RefreshCw size={12} /> Reconciliação</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><User size={12} /> Visitante</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(v.statusKanban)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.telefone}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-xs">{v.endereco || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(v.id)}
                      className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VisitorsList;