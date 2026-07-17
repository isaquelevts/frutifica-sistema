import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';
import { Cell, Report } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { AlertTriangle, AlertCircle, Eye, TrendingDown, CheckCircle, Clock, Users, UserPlus } from 'lucide-react';
import { isReportRealized } from '../../shared/utils/reportStatus';

type RiskLevel = 'critical' | 'high_risk' | 'attention' | 'healthy';

interface CellRiskData {
  cell: Cell;
  lastReportDate: string | null;
  daysSinceLastReport: number;
  avgAttendance: number;
  visitorsLastMonth: number;
  riskScore: number;
  level: RiskLevel;
  reasons: string[];
}

// Ancora meio-dia pra evitar que "YYYY-MM-DD" seja interpretado como UTC
// meia-noite e caia um dia antes em fusos negativos (ex: Brasil).
function parseReportDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, n) => acc + n, 0) / nums.length;
}

const LEVEL_CONFIG: Record<RiskLevel, { label: string; badgeClass: string }> = {
  critical: { label: 'Crítico', badgeClass: 'bg-red-100 text-red-700' },
  high_risk: { label: 'Alto Risco', badgeClass: 'bg-orange-100 text-orange-700' },
  attention: { label: 'Atenção', badgeClass: 'bg-amber-100 text-amber-700' },
  healthy: { label: 'Saudável', badgeClass: 'bg-green-100 text-green-700' },
};

const RiskMonitoring: React.FC = () => {
  const { user } = useAuth();

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: reports = [], isLoading: loadingReports } = useReports(user?.organizationId);

  const isLoading = loadingCells || loadingReports;

  const riskData = useMemo(() => {
    if (isLoading) return [];

    const activeCells = cells.filter(c => c.active !== false);

    const analyzedData: CellRiskData[] = activeCells.map(cell => {
      const cellReports = reports
        .filter(r => r.cellId === cell.id && isReportRealized(r) && r.date)
        .sort((a, b) => b.date.localeCompare(a.date));

      const lastReport = cellReports[0];
      let daysSinceLastReport = 999;
      let lastReportDate: string | null = null;

      if (lastReport) {
        lastReportDate = lastReport.date;
        const diffTime = Math.abs(new Date().getTime() - parseReportDate(lastReport.date).getTime());
        daysSinceLastReport = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      const recentReports = cellReports.slice(0, 4);
      const avgAttendance = Math.round(average(recentReports.map(r => r.participants || 0)));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const visitorsLastMonth = cellReports
        .filter(r => parseReportDate(r.date) >= thirtyDaysAgo)
        .reduce((acc, r) => acc + (r.visitors || 0), 0);

      // ── Score de risco ponderado (0-100) ──────────────────────────
      const reasons: string[] = [];
      let score = 0;

      // 1. Atraso de relatório
      if (!lastReport) {
        score += 50;
        reasons.push('Nunca enviou relatório');
      } else if (daysSinceLastReport > 30) {
        score += 50;
        reasons.push(`Sem relatório há ${daysSinceLastReport} dias`);
      } else if (daysSinceLastReport > 14) {
        score += 35;
        reasons.push(`Atraso de ${daysSinceLastReport} dias no relatório`);
      } else if (daysSinceLastReport > 7) {
        score += 15;
        reasons.push(`${daysSinceLastReport} dias desde o último relatório`);
      }

      // 2. Frequência baixa (só penaliza quem já tem relatório)
      if (recentReports.length > 0) {
        if (avgAttendance < 3) {
          score += 30;
          reasons.push('Frequência muito baixa (média abaixo de 3)');
        } else if (avgAttendance <= 4) {
          score += 20;
          reasons.push('Frequência baixa');
        } else if (avgAttendance <= 7) {
          score += 10;
        }
      }

      // 3. Sem crescimento (últimos 2 relatórios vs. os 2 anteriores)
      if (cellReports.length >= 4) {
        const recent2 = average(cellReports.slice(0, 2).map(r => r.participants || 0));
        const previous2 = average(cellReports.slice(2, 4).map(r => r.participants || 0));
        const growth = recent2 - previous2;
        if (growth < -3) {
          score += 20;
          reasons.push('Queda de frequência nas últimas semanas');
        } else if (growth < 0) {
          score += 10;
          reasons.push('Leve queda de frequência');
        }
      }

      let level: RiskLevel = 'healthy';
      if (score >= 50) level = 'critical';
      else if (score >= 25) level = 'high_risk';
      else if (score >= 10) level = 'attention';

      if (reasons.length === 0) reasons.push('Dentro dos parâmetros');

      return {
        cell,
        lastReportDate,
        daysSinceLastReport,
        avgAttendance,
        visitorsLastMonth,
        riskScore: score,
        level,
        reasons,
      };
    });

    return analyzedData.sort((a, b) => b.riskScore - a.riskScore);
  }, [cells, reports, isLoading]);

  const criticalCount = riskData.filter(d => d.level === 'critical').length;
  const highRiskCount = riskData.filter(d => d.level === 'high_risk').length;
  const attentionCount = riskData.filter(d => d.level === 'attention').length;
  const healthyCount = riskData.filter(d => d.level === 'healthy').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Células em Risco</h1>
        <p className="text-muted-foreground">Ranking automático de células que precisam de atenção pastoral, com base em atraso de relatório, frequência e crescimento.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analisando células...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risco Crítico</p>
                <h3 className="text-2xl font-bold text-foreground">{criticalCount}</h3>
                <p className="text-xs text-red-500 font-medium">Ação imediata necessária</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risco Alto</p>
                <h3 className="text-2xl font-bold text-foreground">{highRiskCount}</h3>
                <p className="text-xs text-orange-500 font-medium">Acompanhar de perto</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <Eye size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Atenção</p>
                <h3 className="text-2xl font-bold text-foreground">{attentionCount}</h3>
                <p className="text-xs text-amber-500 font-medium">Vale um contato</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Células Saudáveis</p>
                <h3 className="text-2xl font-bold text-foreground">{healthyCount}</h3>
                <p className="text-xs text-green-500 font-medium">Dentro dos parâmetros</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Ranking de Risco</h2>
        </div>

        <div className="divide-y divide-border">
          {riskData.filter(d => d.level !== 'healthy').length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
              <p className="font-medium text-muted-foreground">Nenhuma célula em risco encontrada!</p>
              <p className="text-sm">Todas as células ativas estão reportando regularmente.</p>
            </div>
          ) : (
            riskData.filter(d => d.level !== 'healthy').map((data) => (
              <div key={data.cell.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">

                  {/* Left Column: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground">{data.cell.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${LEVEL_CONFIG[data.level].badgeClass}`}>
                        {LEVEL_CONFIG[data.level].label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground" title="Score de risco (0-100)">
                        {data.riskScore} pts
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Líder: <span className="font-medium text-foreground">{data.cell.leaderName}</span>
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {data.reasons.map((reason, i) => (
                        <div key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle size={14} />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Stats */}
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                        <Clock size={12} /> Último Rel.
                      </div>
                      <div className={`font-semibold ${data.daysSinceLastReport > 14 ? 'text-red-600' : 'text-foreground'}`}>
                        {data.daysSinceLastReport > 300 ? 'Nunca' : `${data.daysSinceLastReport} dias`}
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                        <Users size={12} /> Média Freq.
                      </div>
                      <div className="font-semibold text-foreground">
                        {data.avgAttendance}
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                        <UserPlus size={12} /> Visitantes (Mês)
                      </div>
                      <div className="font-semibold text-foreground">
                        {data.visitorsLastMonth}
                      </div>
                    </div>

                    <div className="pl-4 border-l border-border">
                      <Link
                        to={`/edit-cell/${data.cell.id}`}
                        className="text-primary hover:text-primary font-medium text-sm whitespace-nowrap"
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
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Células Saudáveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskData.filter(d => d.level === 'healthy').map(data => (
            <div key={data.cell.id} className="bg-white p-4 rounded-lg border border-border shadow-sm opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-foreground">{data.cell.name}</h4>
                  <p className="text-xs text-muted-foreground">{data.cell.leaderName}</p>
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
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
