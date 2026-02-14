import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../../shared/hooks/useReports';
import { useCells } from '../../shared/hooks/useCells';
import { deleteReport, decrementAttendance } from './reportService';
import { Report } from '../../shared/types/types';
import { FileText, Calendar, Users, XCircle, CheckCircle, Edit2, Search, Filter, X, Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const ReportsList: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports = [], isLoading: loadingReports } = useReports(user?.organizationId);
  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);

  const isLoading = loadingReports || loadingCells;

  const allReports = useMemo(() => {
    const enriched = reports.map(r => ({
      ...r,
      cellName: cells.find(c => c.id === r.cellId)?.name || 'Célula desconhecida'
    }));

    let data = enriched;
    if (!isAdmin && user?.cellId) {
      data = data.filter(r => r.cellId === user.cellId);
    }

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, cells, isAdmin, user]);

  const filteredReports = useMemo(() => {
    let result = allReports;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(r => r.cellName.toLowerCase().includes(lowerTerm));
    }

    if (startDate) {
      result = result.filter(r => new Date(r.date) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter(r => new Date(r.date) <= new Date(endDate));
    }

    return result;
  }, [searchTerm, startDate, endDate, allReports]);

  const handleDelete = async (report: Report) => {
    if (!window.confirm('Tem certeza que deseja apagar este relatório? As presenças contadas serão removidas.')) {
      return;
    }

    try {
      if (report.happened && report.attendanceList && report.attendanceList.length > 0) {
        await decrementAttendance(report.attendanceList);
      }
      await deleteReport(report.id);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      alert('Relatório removido com sucesso.');
    } catch (error) {
      console.error('Erro ao deletar relatório:', error);
      alert('Ocorreu um erro ao tentar apagar o relatório.');
    }
  };


  // Apply Filters

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Relatórios</h1>
          <p className="text-slate-500">Visualize e gerencie os relatórios enviados.</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">

        {/* Search (Admin mostly) */}
        {isAdmin && (
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por nome da célula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Date Filters - Responsive Fix */}
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="flex-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Data Inicial"
            />
          </div>
          <div className="hidden sm:flex items-center text-slate-400">-</div>
          <div className="flex-1">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Data Final"
            />
          </div>
        </div>

        {/* Clear Button */}
        {(startDate || endDate || searchTerm) && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium text-sm"
          >
            <X size={16} /> Limpar
          </button>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Data</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Célula</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Participantes</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Visitantes</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum relatório encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    {/* Data */}
                    <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="font-medium">
                          {new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Célula */}
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {report.cellName}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      {report.happened ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} /> Realizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={12} /> Não Realizada
                        </span>
                      )}
                    </td>

                    {/* Stats */}
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {report.happened ? (
                        <div className="flex items-center gap-1">
                          <Users size={16} className="text-slate-400" />
                          {report.participants}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {report.happened ? report.visitors : '-'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          to={`/edit-report/${report.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Edit2 size={16} />
                          <span>Editar</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(report)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                        >
                          <Trash2 size={16} />
                          <span>Remover</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500">
            Nenhum relatório encontrado.
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={14} />
                  {new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                {report.happened ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 uppercase">
                    Realizada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 uppercase">
                    Off
                  </span>
                )}
              </div>

              <h3 className="font-bold text-lg text-slate-800 mb-4">{report.cellName}</h3>

              {report.happened && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="block font-bold text-slate-700 text-lg">{report.participants}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Presentes</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="block font-bold text-orange-600 text-lg">{report.visitors}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Visitantes</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="block font-bold text-red-600 text-lg">{report.conversions || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Conversões</span>
                  </div>
                </div>
              )}

              {!report.happened && report.notes && (
                <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700 mb-4 italic border border-red-100">
                  "{report.notes}"
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-4">
                <Link
                  to={`/edit-report/${report.id}`}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Edit2 size={16} /> Editar
                </Link>
                <button
                  onClick={() => handleDelete(report)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} /> Remover
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportsList;