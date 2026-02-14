import React from 'react';
import { Visitante, Culto, StatusKanban, Cell } from '../../shared/types/types';
import { UserPlus, Heart, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { useVisitantes } from '../../shared/hooks/useVisitantes';
import { useCultos } from '../../shared/hooks/useCultos';
import { useCells } from '../../shared/hooks/useCells';

const ConsolidationDashboard: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();

   const { data: visitantes = [], isLoading: loadingVisitors } = useVisitantes(user?.organizationId);
   const { data: cultos = [], isLoading: loadingCultos } = useCultos(user?.organizationId);
   const { data: allCells = [], isLoading: loadingCells } = useCells(user?.organizationId);

   const cells = allCells.filter(c => c.active !== false);
   const isLoading = loadingVisitors || loadingCultos || loadingCells;

   // Metrics
   const totalVisitantes = visitantes.filter(v => v.tipoOrigem === 'visitante').length;
   const totalConverts = visitantes.filter(v => v.tipoOrigem === 'convertido').length;

   const inNovo = visitantes.filter(v => v.statusKanban === StatusKanban.NOVO).length;
   const inContato = visitantes.filter(v => v.statusKanban === StatusKanban.CONTATO).length;
   const inIntegrado = visitantes.filter(v => v.statusKanban === StatusKanban.INTEGRADO).length;

   const totalPeople = visitantes.length;
   const integrationRate = totalPeople > 0 ? Math.round((inIntegrado / totalPeople) * 100) : 0;

   if (isLoading) {
      return (
         <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-slate-500 font-medium animate-pulse">Carregando painel de consolidação...</p>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-6">

         {/* HEADER ACTION CARD */}
         <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 transform hover:scale-[1.01] transition-transform duration-300 border-2 border-white/20">
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
               <div className="bg-white/20 p-3 md:p-4 rounded-full backdrop-blur-sm shadow-inner shrink-0">
                  <UserPlus className="w-8 h-8 md:w-12 md:h-12 text-white" />
               </div>
               <div>
                  <h2 className="text-xl md:text-3xl font-bold mb-1 leading-tight">Cadastrar Novo Visitante</h2>
                  <p className="text-blue-100 text-sm md:text-lg opacity-90 leading-snug">Registre novos contatos para acompanhamento.</p>
               </div>
            </div>
            <button
               onClick={() => navigate('/add-visitor')}
               className="flex items-center gap-2 md:gap-3 bg-white text-blue-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-lg hover:bg-blue-50 transition-all w-full md:w-auto justify-center group"
            >
               Adicionar Agora <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>

         <div className="flex justify-between items-center mt-8">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Consolidação</h1>
               <p className="text-slate-500">Visão geral do funil de integração.</p>
            </div>
         </div>

         {/* KPI Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><UserPlus size={20} /></div>
                  <p className="text-sm font-medium text-slate-500">Total Visitantes</p>
               </div>
               <h3 className="text-2xl font-bold text-slate-800">{totalVisitantes}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Heart size={20} /></div>
                  <p className="text-sm font-medium text-slate-500">Total Decisões</p>
               </div>
               <h3 className="text-2xl font-bold text-slate-800">{totalConverts}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowRight size={20} /></div>
                  <p className="text-sm font-medium text-slate-500">Taxa Integração</p>
               </div>
               <h3 className="text-2xl font-bold text-slate-800">{integrationRate}%</h3>
            </div>
         </div>

         {/* Funnel / Status */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6">Funil de Consolidação</h3>

               <div className="space-y-4">
                  {/* Stage: NOVO */}
                  <div className="relative">
                     <div className="flex justify-between items-end mb-1">
                        <span className="font-semibold text-slate-700">Novos (Aguardando Contato)</span>
                        <span className="font-bold text-slate-800">{inNovo}</span>
                     </div>
                     <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalPeople ? (inNovo / totalPeople) * 100 : 0}%` }}></div>
                     </div>
                  </div>

                  {/* Stage: CONTATO */}
                  <div className="relative">
                     <div className="flex justify-between items-end mb-1">
                        <span className="font-semibold text-slate-700">Em Contato / Visita</span>
                        <span className="font-bold text-slate-800">{inContato}</span>
                     </div>
                     <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${totalPeople ? (inContato / totalPeople) * 100 : 0}%` }}></div>
                     </div>
                  </div>

                  {/* Stage: INTEGRADO */}
                  <div className="relative">
                     <div className="flex justify-between items-end mb-1">
                        <span className="font-semibold text-slate-700">Integrados na Célula</span>
                        <span className="font-bold text-slate-800">{inIntegrado}</span>
                     </div>
                     <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalPeople ? (inIntegrado / totalPeople) * 100 : 0}%` }}></div>
                     </div>
                  </div>
               </div>

               <div className="mt-6 pt-6 border-t border-slate-100">
                  <Link to="/kanban" className="text-blue-600 font-medium hover:underline flex items-center gap-1 justify-center">
                     Gerenciar no Kanban <ArrowRight size={16} />
                  </Link>
               </div>
            </div>

            {/* Recent Cults */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-4">Últimos Cultos</h3>
               <div className="space-y-3">
                  {cultos.slice(-3).reverse().map(c => {
                     // Calculate count locally since we removed totalPresentes
                     const linked = visitantes.filter(v => v.cultoId === c.id);
                     return (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                           <div>
                              <p className="font-bold text-slate-700 text-sm">{new Date(c.data).toLocaleDateString('pt-BR')}</p>
                              <p className="text-xs text-slate-500 capitalize">{c.tipo}</p>
                           </div>
                           <div className="text-right">
                              <span className="block font-bold text-slate-800">+{linked.length}</span>
                              <span className="text-[10px] uppercase text-slate-400">Novos</span>
                           </div>
                        </div>
                     );
                  })}
                  {cultos.length === 0 && <p className="text-slate-400 text-sm">Nenhum culto registrado.</p>}
               </div>
               <Link to="/cult-reports" className="block text-center text-sm text-blue-600 mt-4 hover:underline">Ver todos</Link>
            </div>
         </div>
      </div>
   );
};

export default ConsolidationDashboard;