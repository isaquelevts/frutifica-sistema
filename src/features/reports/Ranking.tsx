import React, { useState, useMemo } from 'react';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';
import { useMembers } from '../../shared/hooks/useMembers';
import { Cell } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { Trophy, Users, TrendingUp, Heart, ShieldCheck } from 'lucide-react';

interface RankedCell {
  cellId: string;
  cellName: string;
  leaderName: string;
  totalParticipants: number;
  totalVisitors: number;
  totalConverts: number;
  totalPromoted: number;
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
  const { data: allMembers = [], isLoading: loadingMembers } = useMembers(user?.organizationId);

  const isLoading = loadingCells || loadingReports || loadingMembers;

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

    const filteredReports = reports.filter(r => r.happened && isInRange(r.date));

    const stats = cells.filter(c => c.active !== false).map(cell => {
      const cellReports = filteredReports.filter(r => r.cellId === cell.id);

      const totalParticipants = cellReports.reduce((sum, r) => sum + (r.participants || 0), 0);
      const totalVisitors = cellReports.reduce((sum, r) => sum + (r.visitors || 0), 0);
      const totalConverts = cellReports.reduce((sum, r) => sum + (r.conversions || 0), 0);

      const totalPromoted = allMembers.filter(m =>
        m.cellId === cell.id &&
        m.promotionDate &&
        isInRange(m.promotionDate)
      ).length;

      const reportsCount = cellReports.length;
      const avgAttendance = reportsCount > 0 ? Math.round(totalParticipants / reportsCount) : 0;

      const score =
        (totalParticipants * 1) +
        (totalVisitors * 2) +
        (totalConverts * 5) +
        (totalPromoted * 10);

      return {
        cellId: cell.id,
        cellName: cell.name,
        leaderName: cell.leaderName,
        totalParticipants,
        totalVisitors,
        totalConverts,
        totalPromoted,
        avgAttendance,
        reportsCount,
        score
      };
    });

    return stats.sort((a, b) => b.score - a.score);
  }, [cells, reports, allMembers, timeRange, isLoading]);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-slate-400';
      case 2: return 'text-amber-700';
      default: return 'text-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando reconhecimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reconhecimento</h1>
          <p className="text-slate-500">Celebrando o crescimento e a frutificação das células.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Semanal
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Anual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rankedCells.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            Nenhum dado encontrado para o período selecionado.
          </div>
        ) : (
          rankedCells.map((item, index) => (
            <div key={item.cellId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-4 transition-transform hover:scale-[1.01]">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center font-bold text-xl rounded-full bg-slate-50 ${getMedalColor(index)}`}>
                  {index < 3 ? <Trophy size={24} fill="currentColor" /> : `#${index + 1}`}
                </div>

                <div className="flex-1 lg:min-w-[200px]">
                  <h3 className="text-lg font-bold text-slate-800">{item.cellName}</h3>
                  <p className="text-sm text-slate-500">{item.leaderName}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 lg:gap-8 w-full justify-between lg:justify-end items-center border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-slate-600 font-semibold">
                    <Users size={16} />
                    {item.avgAttendance}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Média</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-orange-600 font-semibold">
                    <TrendingUp size={16} />
                    {item.totalVisitors}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Visitantes</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
                    <Heart size={16} />
                    {item.totalConverts}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Conversões</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <div className="flex items-center justify-center gap-1 text-blue-600 font-semibold">
                    <ShieldCheck size={16} />
                    {item.totalPromoted}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Novos Membros</p>
                </div>

                <div className="text-center pl-4 border-l border-slate-100 hidden sm:block">
                  <span className="block text-2xl font-bold text-slate-700">{item.score}</span>
                  <p className="text-xs text-slate-400 uppercase">Pontos</p>
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