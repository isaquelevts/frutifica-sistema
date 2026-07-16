import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Users, TrendingUp, TrendingDown, Filter, X, FileText, ArrowRight, UserCheck, MapPin, SlidersHorizontal, CheckCircle2, CircleDashed } from 'lucide-react';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';

import { Cell, Report, TargetAudience } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import L from 'leaflet';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type TimeFilter = 'week' | 'month' | 'year' | 'custom';

// Ancora meio-dia pra evitar que "YYYY-MM-DD" seja interpretado como UTC
// meia-noite e apareça um dia antes em fusos negativos (ex: Brasil).
function parseReportDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

const frequencyChartConfig = {
  membros: { label: 'Membros', color: '#2563eb' },
  visitantes: { label: 'Visitantes', color: '#93c5fd' },
} satisfies ChartConfig;

const growthChartConfig = {
  media: { label: 'Média de Participantes', color: 'var(--color-chart-3)' },
} satisfies ChartConfig;

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  // Data Hooks
  const { data: allCells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: allReports = [], isLoading: loadingReports } = useReports(user?.organizationId);

  const isLoading = loadingCells || loadingReports;

  // Filter State
  const [filteredCells, setFilteredCells] = useState<Cell[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);

  const [selectedCellId, setSelectedCellId] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter Logic
  useEffect(() => {
    let cellsToUse = allCells;
    let reportsToUse = allReports;

    // 1. Filter by User Role & Selected Cell
    if (!isAdmin) {
      if (user?.cellId) {
        cellsToUse = allCells.filter(c => c.id === user.cellId);
        // Reports are filtered later by cell ID logic
      } else {
        cellsToUse = [];
      }
    } else {
      // Admin Logic - Cell Filter
      if (selectedCellId !== 'all') {
        cellsToUse = allCells.filter(c => c.id === selectedCellId);
      }
    }

    // 2. Filter by Audience (New)
    if (audienceFilter !== 'all') {
      cellsToUse = cellsToUse.filter(c => c.targetAudience === audienceFilter);
    }

    // 3. Filter Reports based on resulting Cells
    // Only show reports that belong to the visible cells
    const visibleCellIds = new Set(cellsToUse.map(c => c.id));
    reportsToUse = allReports.filter(r => visibleCellIds.has(r.cellId));

    // 4. Filter by Time
    const now = new Date();
    reportsToUse = reportsToUse.filter(report => {
      if (!report.date) return false;
      const reportDate = parseReportDate(report.date);

      if (timeFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return reportDate >= oneWeekAgo && reportDate <= now;
      }

      if (timeFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return reportDate >= startOfMonth && reportDate <= endOfMonth;
      }

      if (timeFilter === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return reportDate >= startOfYear && reportDate <= endOfYear;
      }

      if (timeFilter === 'custom') {
        if (!customStartDate || !customEndDate) return false; // sem as duas datas, não mostra nada
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T23:59:59');
        return reportDate >= start && reportDate <= end;
      }

      return true;
    });

    setFilteredCells(cellsToUse);
    setFilteredReports(reportsToUse);

  }, [allCells, allReports, isAdmin, user, selectedCellId, audienceFilter, timeFilter, customStartDate, customEndDate]);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    // Only init map if we have cells with coordinates
    const mappableCells = filteredCells.filter(c => c.lat && c.lng && c.active !== false);

    // Always clean up previous map if exists to handle re-renders correctly when moving component
    if (leafletMap.current) {
      leafletMap.current.off();
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    if (mappableCells.length === 0 || !mapRef.current) return;

    // Init Map
    leafletMap.current = L.map(mapRef.current).setView([-23.5505, -46.6333], 12); // Sao Paulo default

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap.current);

    // Add markers
    const bounds = L.latLngBounds([]);

    mappableCells.forEach(cell => {
      if (cell.lat && cell.lng) {
        const marker = L.circleMarker([cell.lat, cell.lng], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(leafletMap.current!);

        marker.bindPopup(`
                <div class="font-sans">
                    <strong class="block text-sm text-slate-800">${cell.name}</strong>
                    <span class="text-xs text-slate-500">${cell.leaderName}</span><br/>
                    <span class="text-xs text-slate-500">${cell.dayOfWeek} às ${cell.time}</span>
                </div>
            `);

        bounds.extend([cell.lat, cell.lng]);
      }
    });

    // Fit bounds if we have markers
    if (mappableCells.length > 0) {
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [filteredCells]);




  const clearFilters = () => {
    setSelectedCellId('all');
    setAudienceFilter('all');
    setTimeFilter('week');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Stats Calculation
  const totalCellsCount = selectedCellId === 'all' && audienceFilter === 'all'
    ? filteredCells.filter(c => c.active !== false).length
    : filteredCells.length;

  const totalParticipants = filteredReports.filter(r => r.happened).reduce((acc, r) => acc + (r.participants || 0), 0);
  const totalVisitors = filteredReports.filter(r => r.happened).reduce((acc, r) => acc + (r.visitors || 0), 0);
  const totalReports = filteredReports.filter(r => r.happened).length;

  // --- Frequência no Período (agregada por data, sem mutar arrays) ---
  const frequencyData = useMemo(() => {
    const byDate = new Map<string, { participants: number; visitors: number }>();
    filteredReports.forEach(r => {
      if (!r.happened || !r.date) return;
      const bucket = byDate.get(r.date) || { participants: 0, visitors: 0 };
      bucket.participants += r.participants || 0;
      bucket.visitors += r.visitors || 0;
      byDate.set(r.date, bucket);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { participants, visitors }]) => ({
        name: parseReportDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        membros: Math.max(0, participants - visitors),
        visitantes: visitors,
        total: participants,
      }));
  }, [filteredReports]);

  // --- Tendência de Crescimento (média de participantes por semana, distinto da Frequência) ---
  function weekBucketKey(date: Date): string {
    const d = new Date(date);
    const dayIndex = (d.getDay() + 6) % 7; // 0 = segunda
    d.setDate(d.getDate() - dayIndex);
    return d.toISOString().split('T')[0];
  }

  const growthData = useMemo(() => {
    const happened = filteredReports.filter(r => r.happened && r.date);
    const useDailyBuckets = timeFilter === 'week';
    const byBucket = new Map<string, { sum: number; count: number }>();
    happened.forEach(r => {
      const bucketKey = useDailyBuckets ? r.date : weekBucketKey(parseReportDate(r.date));
      const entry = byBucket.get(bucketKey) || { sum: 0, count: 0 };
      entry.sum += r.participants || 0;
      entry.count += 1;
      byBucket.set(bucketKey, entry);
    });
    return Array.from(byBucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketKey, { sum, count }]) => ({
        name: parseReportDate(bucketKey).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        media: Math.round((sum / count) * 10) / 10,
      }));
  }, [filteredReports, timeFilter]);

  // Variação vs. o período anterior de mesmo tamanho (ex: semana passada vs esta semana)
  const growthTrendPct = useMemo(() => {
    if (timeFilter === 'custom') return null;

    const visibleCellIds = new Set(filteredCells.map(c => c.id));
    const now = new Date();
    let prevStart: Date, prevEnd: Date;

    if (timeFilter === 'week') {
      prevEnd = new Date(); prevEnd.setDate(now.getDate() - 7);
      prevStart = new Date(); prevStart.setDate(now.getDate() - 14);
    } else if (timeFilter === 'month') {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
    }

    const prevReports = allReports.filter(r => {
      if (!r.happened || !r.date || !visibleCellIds.has(r.cellId)) return false;
      const d = parseReportDate(r.date);
      return d >= prevStart && d <= prevEnd;
    });
    const currentReports = filteredReports.filter(r => r.happened);

    if (prevReports.length === 0 || currentReports.length === 0) return null;

    const prevAvg = prevReports.reduce((acc, r) => acc + (r.participants || 0), 0) / prevReports.length;
    const currentAvg = currentReports.reduce((acc, r) => acc + (r.participants || 0), 0) / currentReports.length;

    if (prevAvg <= 0) return null;
    return Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
  }, [allReports, filteredCells, filteredReports, timeFilter]);

  const activeFilterCount = [selectedCellId !== 'all', audienceFilter !== 'all', timeFilter !== 'week'].filter(Boolean).length;

  // --- Status de Preenchimento: células ativas do escopo atual x relatórios recebidos no período ---
  const fillStatus = useMemo(() => {
    const lastReportByCell = new Map<string, string>();
    filteredReports.forEach(r => {
      if (!r.date) return;
      const current = lastReportByCell.get(r.cellId);
      if (!current || r.date > current) lastReportByCell.set(r.cellId, r.date);
    });

    return filteredCells
      .filter(c => c.active !== false)
      .map(cell => {
        const lastDate = lastReportByCell.get(cell.id);
        return {
          cell,
          filled: !!lastDate,
          lastDate,
        };
      })
      .sort((a, b) => {
        if (a.filled === b.filled) return a.cell.name.localeCompare(b.cell.name);
        return a.filled ? 1 : -1; // pendentes primeiro
      });
  }, [filteredCells, filteredReports]);

  const filledCount = fillStatus.filter(s => s.filled).length;
  const pendingCount = fillStatus.length - filledCount;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando painel de controle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* LEADER QUICK ACTION */}
      {!isAdmin && user?.cellId && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 transform hover:scale-[1.01] transition-transform duration-300 border-2 border-white/20">
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="bg-white/20 p-3 md:p-4 rounded-full backdrop-blur-sm shadow-inner shrink-0">
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-bold mb-1 leading-tight">Enviar Relatório</h2>
              <p className="text-blue-100 text-sm md:text-lg opacity-90 leading-snug">Registre sua reunião semanal.</p>
            </div>
          </div>
          <Link
            to={`/report/${user.cellId}`}
            className="animate-btn-pulse flex items-center gap-2 md:gap-3 bg-white text-blue-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-lg w-full md:w-auto justify-center group"
          >
            Adicionar Agora <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdmin ? 'Visão Geral' : 'Meus Resultados'}
          </h1>
          <p className="text-slate-500">
            Mostrando dados de {filteredReports.length} relatórios.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Filter size={20} />
              <h2>Filtros</h2>
              {activeFilterCount > 0 && (
                <Badge className="text-xs font-bold">
                  {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-500">
                <X size={16} /> Limpar filtros
              </Button>
            )}
          </div>

          {/* Período */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <SlidersHorizontal size={12} /> Período
            </label>

            <ToggleGroup
              type="single"
              variant="outline"
              value={timeFilter}
              onValueChange={(value) => { if (value) setTimeFilter(value as TimeFilter); }}
              className="flex-wrap justify-start"
            >
              <ToggleGroupItem value="week">Esta Semana</ToggleGroupItem>
              <ToggleGroupItem value="month">Este Mês</ToggleGroupItem>
              <ToggleGroupItem value="year">Este Ano</ToggleGroupItem>
              <ToggleGroupItem value="custom">Personalizado</ToggleGroupItem>
            </ToggleGroup>

            {timeFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Início</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fim</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
                {(!customStartDate || !customEndDate) && (
                  <p className="text-xs text-amber-600 self-end pb-2">Escolha as duas datas para ver os relatórios do período.</p>
                )}
              </div>
            )}
          </div>

          {/* Escopo */}
          {isAdmin && (
            <div className="pt-1 border-t border-slate-100">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
                <Users size={12} /> Escopo
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Célula</label>
                  <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Células</SelectItem>
                      {allCells.map(cell => (
                        <SelectItem key={cell.id} value={cell.id}>{cell.name} - {cell.leaderName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Público Alvo</label>
                  <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Públicos</SelectItem>
                      {Object.values(TargetAudience).map(audience => (
                        <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>

        {isAdmin && (
          <Card>
            <CardContent className="p-6 flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {selectedCellId === 'all' ? 'Células Ativas' : 'Célula Selecionada'}
                </p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {totalCellsCount}
                </h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={20} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Participantes</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalParticipants}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <UserCheck size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Visitantes</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalVisitors}</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Relatórios</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalReports}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Frequency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Frequência no Período</CardTitle>
          </CardHeader>
          <CardContent>
            {frequencyData.length > 0 ? (
              <ChartContainer config={frequencyChartConfig} className="h-64 w-full">
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="membros" name="Membros" fill="var(--color-membros)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="visitantes" name="Visitantes" fill="var(--color-visitantes)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <p>Sem dados neste período.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Tendência de Crescimento</CardTitle>
            {growthTrendPct !== null && (
              <Badge variant={growthTrendPct >= 0 ? 'success' : 'destructive'} className="gap-1">
                {growthTrendPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {growthTrendPct >= 0 ? '+' : ''}{growthTrendPct}% vs. período anterior
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <ChartContainer config={growthChartConfig} className="h-64 w-full">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="media" name="Média de Participantes" stroke="var(--color-media)" strokeWidth={3} dot={{ strokeWidth: 2 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Sem dados neste período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status de Preenchimento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} className="text-blue-600" /> Status de Preenchimento
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="success">{filledCount} preenchidas</Badge>
              <Badge variant="warning">{pendingCount} pendentes</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {fillStatus.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Célula</TableHead>
                    <TableHead>Líder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Último Relatório</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fillStatus.map(({ cell, filled, lastDate }) => (
                    <TableRow key={cell.id}>
                      <TableCell className="font-medium">{cell.name}</TableCell>
                      <TableCell>{cell.leaderName}</TableCell>
                      <TableCell>
                        {filled ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 size={12} /> Preenchido
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <CircleDashed size={12} /> Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {lastDate ? parseReportDate(lastDate).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400">
                Nenhuma célula neste filtro.
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- MAP SECTION (Moved to Bottom) --- */}
        {filteredCells.some(c => c.lat && c.lng) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4 px-2">
                <MapPin className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-slate-800">Mapa das Células</h3>
              </div>
              <div ref={mapRef} className="w-full h-80 rounded-lg z-0 relative" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
