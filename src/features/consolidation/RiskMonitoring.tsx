import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';
import { Cell, Report } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { AlertTriangle, TrendingDown, CheckCircle, Clock, Users, UserPlus } from 'lucide-react';

interface CellRiskData {
  cell: Cell;
  lastReportDate: string | null;
  daysSinceLastReport: number;
  avgAttendance: number;
  visitorsLastMonth: number;
  status: 'critical' | 'high_risk' | 'healthy';
  reason: string;
}

const RiskMonitoring: React.FC = () => {
  const { user } = useAuth();

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: reports = [], isLoading: loadingReports } = useReports(user?.organizationId);

  const isLoading = loadingCells || loadingReports;

  const riskData = useMemo(() => {
    if (isLoading) return [];

    const activeCells = cells.filter(c => c.active !== false);

    const analyzedData: CellRiskData[] = activeCells.map(cell => {
      // 1. Get reports for this cell
      const cellReports = reports
        .filter(r => r.cellId === cell.id && r.happened)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 2. Calculate Last Report Logic
      const lastReport = cellReports[0];
      let daysSinceLastReport = 999;
      let lastReportDate = null;

      if (lastReport) {
        lastReportDate = lastReport.date;
        const diffTime = Math.abs(new Date().getTime() - new Date(lastReport.date).getTime());
        daysSinceLastReport = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // 3. Calculate Averages (Last 4 reports)
      const recentReports = cellReports.slice(0, 4);
      const totalParticipants = recentReports.reduce((acc, curr) => acc + (curr.participants || 0), 0);
      const avgAttendance = recentReports.length > 0 ? Math.round(totalParticipants / recentReports.length) : 0;

      // 4. Visitors in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const visitorsLastMonth = cellReports
        .filter(r => new Date(r.date) >= thirtyDaysAgo)
        .reduce((acc, curr) => acc + (curr.visitors || 0), 0);

      // 5. Determine Status
      let status: 'critical' | 'high_risk' | 'healthy' = 'healthy';
      let reason = 'Dentro dos parâmetros';

      if (daysSinceLastReport > 30) {
        status = 'critical';
        reason = lastReport ? `Sem relatório há ${daysSinceLastReport} dias` : 'Nunca enviou relatório';
      } else if (daysSinceLastReport > 14) {
        status = 'high_risk';
        reason = `Atraso de ${daysSinceLastReport} dias no relatório`;
      } else if (recentReports.length > 0 && avgAttendance < 3) {
        status = 'high_risk';
        reason = 'Média de frequência muito baixa';
      }

      return {
        cell,
        lastReportDate,
        daysSinceLastReport,
        avgAttendance,
        visitorsLastMonth,
        status,
        reason
      };
    });

    // Sort: Critical first, then High Risk, then Healthy
    analyzedData.sort((a, b) => {
      const score = (status: string) => {
        if (status === 'critical') return 3;
        if (status === 'high_risk') return 2;
        return 1;
      };
      return score(b.status) - score(a.status);
    });

    return analyzedData;
  }, [cells, reports, isLoading]);

  const criticalCount = riskData.filter(d => d.status === 'critical').length;
  const highRiskCount = riskData.filter(d => d.status === 'high_risk').length;
  const healthyCount = riskData.filter(d => d.status === 'healthy').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Monitoramento de Risco</h1>
        <p className="text-slate-500">Identificação automática de células que precisam de atenção pastoral.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Analisando células...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Risco Crítico</p>
                <h3 className="text-2xl font-bold text-slate-800">{criticalCount}</h3>
                <p className="text-xs text-red-500 font-medium">Ação imediata necessária</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Risco Alto</p>
                <h3 className="text-2xl font-bold text-slate-800">{highRiskCount}</h3>
                <p className="text-xs text-orange-500 font-medium">Acompanhar de perto</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Células Saudáveis</p>
                <h3 className="text-2xl font-bold text-slate-800">{healthyCount}</h3>
                <p className="text-xs text-green-500 font-medium">Dentro dos parâmetros</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Células em Alerta</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {riskData.filter(d => d.status !== 'healthy').length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
              <p className="font-medium text-slate-600">Nenhuma célula em risco encontrada!</p>
              <p className="text-sm">Todas as células ativas estão reportando regularmente.</p>
            </div>
          ) : (
            riskData.filter(d => d.status !== 'healthy').map((data) => (
              <div key={data.cell.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">

                  {/* Left Column: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-800">{data.cell.name}</h3>
                      {data.status === 'critical' && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded uppercase">Crítico</span>
                      )}
                      {data.status === 'high_risk' && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded uppercase">Atenção</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      Líder: <span className="font-medium text-slate-700">{data.cell.leaderName}</span>
                    </p>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                      <AlertTriangle size={14} />
                      {data.reason}
                    </div>
                  </div>

                  {/* Right Column: Stats */}
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1 text-xs uppercase tracking-wide">
                        <Clock size={12} /> Último Rel.
                      </div>
                      <div className={`font-semibold ${data.daysSinceLastReport > 14 ? 'text-red-600' : 'text-slate-700'}`}>
                        {data.daysSinceLastReport > 300 ? 'Nunca' : `${data.daysSinceLastReport} dias`}
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1 text-xs uppercase tracking-wide">
                        <Users size={12} /> Média Freq.
                      </div>
                      <div className="font-semibold text-slate-700">
                        {data.avgAttendance}
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1 text-xs uppercase tracking-wide">
                        <UserPlus size={12} /> Visitantes (Mês)
                      </div>
                      <div className="font-semibold text-slate-700">
                        {data.visitorsLastMonth}
                      </div>
                    </div>

                    <div className="pl-4 border-l border-slate-100">
                      <Link
                        to={`/edit-cell/${data.cell.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm whitespace-nowrap"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Healthy List Collapsed/Less Visible */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Células Saudáveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskData.filter(d => d.status === 'healthy').map(data => (
            <div key={data.cell.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-700">{data.cell.name}</h4>
                  <p className="text-xs text-slate-500">{data.cell.leaderName}</p>
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="mt-3 flex gap-3 text-xs text-slate-500">
                <span>Último: {data.daysSinceLastReport === 0 ? 'Hoje' : `${data.daysSinceLastReport}d atrás`}</span>
                <span>Freq: {data.avgAttendance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default RiskMonitoring;