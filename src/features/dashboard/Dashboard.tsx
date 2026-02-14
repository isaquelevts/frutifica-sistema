import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell as RechartsCell, Legend } from 'recharts';
import { Sparkles, Users, TrendingUp, CalendarCheck, Target, Filter, X, FileText, ArrowRight, Heart, UserCheck, UserPlus, Cake, ShieldCheck, MapPin, PieChart as PieIcon, Lock } from 'lucide-react';
import { useCells } from '../../shared/hooks/useCells';
import { useReports } from '../../shared/hooks/useReports';
import { useMembers } from '../../shared/hooks/useMembers';
import { useUsers } from '../../shared/hooks/useUsers';


import { Cell, Report, Member, MemberType, User, TargetAudience } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import L from 'leaflet';

type TimeFilter = 'week' | 'month' | 'year' | 'custom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7675'];

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  // Data Hooks
  const { data: allCells = [], isLoading: loadingCells } = useCells(user?.organizationId);
  const { data: allReports = [], isLoading: loadingReports } = useReports(user?.organizationId);
  const { data: allMembers = [], isLoading: loadingMembers } = useMembers(user?.organizationId);
  const { data: allUsers = [], isLoading: loadingUsers } = useUsers(user?.organizationId);

  const isLoading = loadingCells || loadingReports || loadingMembers || loadingUsers;

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
      const reportDate = new Date(report.date);

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

      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59); // End of day
        return reportDate >= start && reportDate <= end;
      }

      return true; // If custom but dates not selected, show all (or handle as empty)
    });

    setFilteredCells(cellsToUse);
    setFilteredReports(reportsToUse);

  }, [allCells, allReports, isAdmin, user, selectedCellId, audienceFilter, timeFilter, customStartDate, customEndDate, allMembers]);

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

  const activeMemberIds = new Set<string>();
  const activeVisitorIds = new Set<string>();

  filteredReports.forEach(report => {
    if (report.happened && report.attendanceList) {
      report.attendanceList.forEach(id => {
        const member = allMembers.find(m => m.id === id);
        if (member) {
          if (member.type === MemberType.MEMBER) {
            activeMemberIds.add(id);
          } else if (member.type === MemberType.VISITOR) {
            activeVisitorIds.add(id);
          }
        }
      });
    }
  });

  const totalActiveMembers = activeMemberIds.size;
  const totalActiveVisitors = activeVisitorIds.size;
  const totalConversions = filteredReports.reduce((acc, curr) => acc + (curr.conversions || 0), 0);

  const totalNewMembers = allMembers.filter(m => {
    if (m.type !== MemberType.MEMBER) return false;
    if (!m.promotionDate) return false;

    const visibleCellIds = new Set(filteredCells.map(c => c.id));
    if (!visibleCellIds.has(m.cellId)) return false;

    const promotionDate = new Date(m.promotionDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return promotionDate >= thirtyDaysAgo;
  }).length;

  // --- Birthdays Calculation ---
  const currentMonth = new Date().getMonth();

  interface BirthdayPerson {
    id: string;
    name: string;
    birthday: string;
    phone?: string;
    type: 'Membro' | 'Visitante' | 'Líder' | 'Admin';
    cellId?: string;
  }

  let birthdays: BirthdayPerson[] = [];

  const visibleCellIds = new Set(filteredCells.map(c => c.id));

  const memberBirthdays = allMembers.filter(m => {
    if (!m.birthday) return false;
    if (!visibleCellIds.has(m.cellId)) return false;

    const monthPart = parseInt(m.birthday.split('-')[1], 10) - 1;
    return monthPart === currentMonth;
  }).map(m => ({
    id: m.id,
    name: m.name,
    birthday: m.birthday!,
    phone: m.phone,
    type: m.type as any,
    cellId: m.cellId
  }));

  birthdays = [...memberBirthdays];

  if (isAdmin) {
    const userBirthdays = allUsers.filter(u => {
      if (!u.birthday) return false;
      if (selectedCellId !== 'all' && u.cellId !== selectedCellId) return false;
      const monthPart = parseInt(u.birthday.split('-')[1], 10) - 1;
      return monthPart === currentMonth;
    }).map(u => ({
      id: u.id,
      name: u.name,
      birthday: u.birthday!,
      phone: '',
      type: 'Líder' as any,
      cellId: u.cellId
    }));

    birthdays = [...birthdays, ...userBirthdays];
  }

  birthdays.sort((a, b) => {
    const dayA = parseInt(a.birthday.split('-')[2], 10);
    const dayB = parseInt(b.birthday.split('-')[2], 10);
    return dayA - dayB;
  });

  // --- Charts Data ---

  // Bar & Line Data
  const chartData = filteredReports
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      name: new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      membros: r.participants - r.visitors,
      visitantes: r.visitors,
      total: r.participants
    }));

  // Pie Chart Data (Audience Distribution)
  const audienceStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    filteredCells.forEach(cell => {
      // Only count active cells for distribution
      if (cell.active !== false) {
        const key = cell.targetAudience;
        stats[key] = (stats[key] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [filteredCells]);

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
            className="flex items-center gap-2 md:gap-3 bg-white text-blue-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-lg hover:bg-blue-50 transition-all w-full md:w-auto justify-center group"
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Filter size={20} />
            <h2>Filtros</h2>
          </div>

          {/* Mobile Select Filter */}
          <div className="block md:hidden w-full">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="year">Este Ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Desktop Button Filters */}
          <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFilter === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFilter === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFilter === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Ano
            </button>
            <button
              onClick={() => setTimeFilter('custom')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFilter === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Personalizado
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {isAdmin && (
            <>
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Célula</label>
                <select
                  value={selectedCellId}
                  onChange={(e) => setSelectedCellId(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas as Células</option>
                  {allCells.map(cell => (
                    <option key={cell.id} value={cell.id}>{cell.name} - {cell.leaderName}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-1/3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Público Alvo</label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os Públicos</option>
                  {Object.values(TargetAudience).map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {timeFilter === 'custom' && (
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
              <div className="flex gap-2 w-full md:w-auto">
                <div className="w-1/2 md:w-auto">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Início</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-1/2 md:w-auto">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fim</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-slate-500 hover:text-red-500 text-sm font-medium px-3 py-2 h-10"
              >
                <X size={16} /> Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>

        {isAdmin && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {selectedCellId === 'all' ? 'Células Ativas' : 'Célula Selecionada'}
                </p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {totalCellsCount}
                </h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                {isAdmin ? <Users size={20} /> : <Target size={20} />}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Conversões</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalConversions}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Heart size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Novos Membros</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalNewMembers}</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserPlus size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Membros Ativos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalActiveMembers}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <UserCheck size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Visitantes</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalActiveVisitors}</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts - Takes up 2/3 */}
        <div className="lg:col-span-2 space-y-6">


          {/* Frequency Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Frequência no Período</h3>
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="membros" name="Membros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="visitantes" name="Visitantes" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p>Sem dados neste período.</p>
                </div>
              )}
            </div>
          </div>

          {/* Growth Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Tendência de Crescimento</h3>
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" strokeWidth={3} dot={{ strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Sem dados neste período
                </div>
              )}
            </div>
          </div>

          {/* Audience Pie Chart - FIXED */}
          {audienceStats.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <PieIcon size={20} className="text-green-600" /> Distribuição por Público
              </h3>
              <div className="h-96"> {/* Increased height for Legend */}
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={audienceStats}
                      cx="50%"
                      cy="40%" /* Moved up to make room for legend */
                      labelLine={false}
                      outerRadius={80} /* Smaller radius */
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {audienceStats.map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={80} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* --- MAP SECTION (Moved to Bottom) --- */}
          {filteredCells.some(c => c.lat && c.lng) && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 px-2">
                <MapPin className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-slate-800">Mapa das Células</h3>
              </div>
              <div ref={mapRef} className="w-full h-80 rounded-lg z-0 relative" />
            </div>
          )}
        </div>

        {/* Right Sidebar - Birthdays */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-pink-50/50 rounded-t-xl">
              <div className="flex items-center gap-2 text-pink-600">
                <Cake size={20} />
                <h3 className="font-bold">Aniversariantes do Mês</h3>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
              {birthdays.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Cake size={48} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum aniversariante encontrado neste mês.</p>
                  <Link to="/members" className="text-xs text-blue-500 mt-2 block hover:underline">
                    Cadastrar datas nos membros
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {birthdays.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                          {p.birthday.split('-')[2]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">
                              {p.type === 'Líder' ? (
                                <span className="flex items-center gap-1 text-purple-600 font-bold"><ShieldCheck size={10} /> Líder</span>
                              ) : p.type === 'Visitante' ? (
                                <span className="text-orange-500 font-medium">Visitante</span>
                              ) : (
                                <span>Membro</span>
                              )}
                            </p>
                            {isAdmin && p.cellId && p.type !== 'Líder' && !visibleCellIds.has(p.cellId) && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Outra Célula</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {p.phone && (
                        <a
                          href={`https://wa.me/55${p.phone.replace(/\D/g, '')}?text=Parabéns ${p.name}! Deus te abençoe!`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-500 hover:bg-green-50 p-2 rounded-full transition-colors"
                          title="Mandar Parabéns"
                        >
                          <UserCheck size={18} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;