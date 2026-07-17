import React, { useState, useMemo } from 'react';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';
import { useAuth } from '../../core/auth/AuthContext';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import { isReportRealized } from '../../shared/utils/reportStatus';

interface RankedCell {
  cellId: string;
  cellName: string;
  leaderName: string;
  totalParticipants: number;
  totalVisitors: number;
  avgAttendance: number;
  reportsCount: number;
  score: number;
}

type TimeRange = 'week' | 'month' | 'year';

const Ranking: React.FC = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: reports = [], isLoading: loadingReports } = useReports(user?.organizationId);

  const isLoading = loadingCells || loadingReports;

  const rankedCells = useMemo(() => {
    if (isLoading) return [];

    const now = new Date();

    const isInRange = (dateString: string) => {
      const date = new Date(dateString);
      if (timeRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return date >= oneWeekAgo;
      }
      if (timeRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= startOfMonth;
      }
      if (timeRange === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfYear;
      }
      return true;
    };

    const filteredReports = reports.filter(r => isReportRealized(r) && isInRange(r.date));

    const stats = cells.filter(c => c.active !== false).map(cell => {
      const cellReports = filteredReports.filter(r => r.cellId === cell.id);

      const totalParticipants = cellReports.reduce((sum, r) => sum + (r.participants || 0), 0);
      const totalVisitors = cellReports.reduce((sum, r) => sum + (r.visitors || 0), 0);
      const reportsCount = cellReports.length;
      const avgAttendance = reportsCount > 0 ? Math.round(totalParticipants / reportsCount) : 0;
      const score = (totalParticipants * 1) + (totalVisitors * 2);

      return {
        cellId: cell.id,
        cellName: cell.name,
        leaderName: cell.leaderName,
        totalParticipants,
        totalVisitors,
        avgAttendance,
        reportsCount,
        score
      };
    });

    return stats.sort((a, b) => b.score - a.score);
  }, [cells, reports, timeRange, isLoading]);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-muted-foreground';
      case 2: return 'text-amber-700';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Carregando reconhecimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconhecimento</h1>
          <p className="text-muted-foreground">Celebrando o crescimento e a frutificação das células.</p>
        </div>

        <div className="flex bg-muted p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'week' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Semanal
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'month' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'year' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Anual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rankedCells.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border border-border">
            Nenhum dado encontrado para o período selecionado.
          </div>
        ) : (
          rankedCells.map((item, index) => (
            <div key={item.cellId} className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col lg:flex-row items-center gap-4 transition-transform hover:scale-[1.01]">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center font-bold text-xl rounded-full bg-muted/50 ${getMedalColor(index)}`}>
                  {index < 3 ? <Trophy size={24} fill="currentColor" /> : `#${index + 1}`}
                </div>

                <div className="flex-1 lg:min-w-[200px]">
                  <h3 className="text-lg font-bold text-foreground">{item.cellName}</h3>
                  <p className="text-sm text-muted-foreground">{item.leaderName}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 lg:gap-8 w-full justify-between lg:justify-end items-center border-t lg:border-t-0 border-border pt-4 lg:pt-0">
                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground font-semibold">
                    <Users size={16} />
                    {item.avgAttendance}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Média</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground font-semibold">
                    <Users size={16} />
                    {item.totalParticipants}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Membros</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-orange-600 font-semibold">
                    <TrendingUp size={16} />
                    {item.totalVisitors}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Visitantes</p>
                </div>

                <div className="text-center pl-4 border-l border-border hidden sm:block">
                  <span className="block text-2xl font-bold text-foreground">{item.score}</span>
                  <p className="text-xs text-muted-foreground uppercase">Pontos</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Ranking;