import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Culto, Visitante } from '../../shared/types/types';
import { Calendar, Heart, UserPlus, Eye, X, RefreshCw, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCultos } from '../../shared/hooks/useCultos';
import { useVisitantes } from '../../shared/hooks/useVisitantes';

const CultReports: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: cultosData = [], isLoading: loadingCultos } = useCultos(user?.organizationId);
  const { data: allVisitantes = [], isLoading: loadingVisitantes } = useVisitantes(user?.organizationId);

  const loading = loadingCultos || loadingVisitantes;

  // Sorting cultos
  const cultos = useMemo(() => {
    return [...cultosData].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [cultosData]);

  // State for Modal
  const [selectedCulto, setSelectedCulto] = useState<Culto | null>(null);

  // Helper to get visitor count for a culto
  const getCultoStats = (cultoId: string) => {
    const linked = allVisitantes.filter(v => v.cultoId === cultoId);
    const visitantes = linked.filter(v => v.tipoOrigem === 'visitante').length;
    const conversoes = linked.filter(v => v.tipoOrigem === 'convertido').length;
    const reconciliacoes = linked.filter(v => v.tipoOrigem === 'reconciliacao').length;
    return { visitantes, conversoes, reconciliacoes, total: linked.length };
  };

  const getCultoPeople = (cultoId: string) => {
    return allVisitantes.filter(v => v.cultoId === cultoId);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando relatórios de culto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios de Culto</h1>
        <p className="text-slate-500">Histórico de cultos e visitantes.</p>
      </div>

      {/* ACTION CARD */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 transform hover:scale-[1.01] transition-transform duration-300 border-2 border-white/20">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="bg-white/20 p-3 md:p-4 rounded-full backdrop-blur-sm shadow-inner shrink-0">
            <UserPlus className="w-8 h-8 md:w-12 md:h-12 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-bold mb-1 leading-tight">Registrar Visitante</h2>
            <p className="text-purple-100 text-sm md:text-lg opacity-90 leading-snug">Adicione pessoas que visitaram o culto.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/add-visitor')}
          className="flex items-center gap-2 md:gap-3 bg-white text-purple-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-lg hover:bg-purple-50 transition-all w-full md:w-auto justify-center group"
        >
          Adicionar Agora <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Data</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 hidden sm:table-cell">Tipo</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Resumo</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Obs</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cultos.map(c => {
              const stats = getCultoStats(c.id);
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{new Date(c.data).toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs text-slate-500 ml-1 hidden sm:inline">{c.hora}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize text-slate-700 hidden sm:table-cell">{c.tipo}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium" title="Total">
                        <User size={12} /> {stats.total}
                      </span>
                      {stats.conversoes > 0 && (
                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold" title="Conversões">
                          <Heart size={10} /> {stats.conversoes}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs hidden md:table-cell">{c.observacoes || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      onClick={() => setSelectedCulto(c)}
                      className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 font-medium"
                    >
                      <Eye size={16} /> <span className="hidden sm:inline">Ver Completo</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {cultos.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum culto registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MINI DASHBOARD MODAL */}
      {selectedCulto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  Relatório do Culto
                </h2>
                <p className="text-sm text-slate-500 mt-1 capitalize">
                  {new Date(selectedCulto.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {selectedCulto.tipo}
                </p>
              </div>
              <button
                onClick={() => setSelectedCulto(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {(() => {
                  const stats = getCultoStats(selectedCulto.id);
                  return (
                    <>
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                        <div className="inline-flex p-2 bg-blue-100 text-blue-600 rounded-full mb-2">
                          <UserPlus size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-blue-900">{stats.visitantes}</h3>
                        <p className="text-xs uppercase font-bold text-blue-400">Visitantes</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                        <div className="inline-flex p-2 bg-red-100 text-red-600 rounded-full mb-2">
                          <Heart size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-red-900">{stats.conversoes}</h3>
                        <p className="text-xs uppercase font-bold text-red-400">Conversões</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <div className="inline-flex p-2 bg-orange-100 text-orange-600 rounded-full mb-2">
                          <RefreshCw size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-orange-900">{stats.reconciliacoes}</h3>
                        <p className="text-[10px] sm:text-xs uppercase font-bold text-orange-400 w-full break-words leading-tight">Reconciliações</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* People List */}
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Pessoas Cadastradas</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-100">
                    {getCultoPeople(selectedCulto.id).map(person => (
                      <tr key={person.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${person.tipoOrigem === 'convertido' ? 'bg-red-100 text-red-600' :
                              person.tipoOrigem === 'reconciliacao' ? 'bg-orange-100 text-orange-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                              {person.tipoOrigem === 'convertido' ? <Heart size={16} /> :
                                person.tipoOrigem === 'reconciliacao' ? <RefreshCw size={16} /> :
                                  <UserPlus size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{person.nome}</p>
                              <p className="text-xs text-slate-500 capitalize">{person.tipoOrigem === 'convertido' ? 'Novo Convertido' : person.tipoOrigem}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1 text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded">
                            <Phone size={12} /> {person.telefone}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getCultoPeople(selectedCulto.id).length === 0 && (
                      <tr><td className="p-4 text-center text-slate-400 italic">Nenhuma pessoa registrada neste relatório.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedCulto.observacoes && (
                <div className="mt-6 bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-yellow-700 uppercase mb-1">Observações</h4>
                  <p className="text-sm text-yellow-900">{selectedCulto.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CultReports;