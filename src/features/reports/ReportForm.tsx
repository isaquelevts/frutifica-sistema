import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Report } from '../../shared/types/types';
import { saveReport, updateReport, getReportByCellAndDate } from './reportService';
import { Save, AlertCircle, CheckCircle, ArrowRight, FileEdit, Users, UserPlus, PartyPopper } from 'lucide-react';
import { CellType } from '../../shared/types/types';
import { Report as ReportType } from '../../shared/types/types';
import { useCell } from '../../shared/hooks/useCells';
import { useReport } from '../../shared/hooks/useReports';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema, type ReportFormData } from './schemas/reportSchema';

function getLastCellDate(dayOfWeek: string): string {
  const dayMap: Record<string, number> = {
    'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2,
    'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
  };
  const targetDay = dayMap[dayOfWeek] ?? 3;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysAgo = today.getDay() - targetDay;
  if (daysAgo < 0) daysAgo += 7;
  const lastDate = new Date(today);
  lastDate.setDate(today.getDate() - daysAgo);
  return lastDate.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

const ReportForm: React.FC = () => {
  const { cellId, reportId } = useParams<{ cellId?: string; reportId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedStats, setSubmittedStats] = useState({ total: 0, visitors: 0 });
  const [duplicateReport, setDuplicateReport] = useState<ReportType | null>(null);
  const [weekReport, setWeekReport] = useState<ReportType | null | undefined>(undefined); // undefined=checking, null=not found

  const { data: report, isLoading: loadingReport } = useReport(reportId);
  const workingCellId = cellId || report?.cellId;
  const { data: cell, isLoading: loadingCell } = useCell(workingCellId);

  const cellDate = useMemo(() => {
    if (isEditing && report?.date) return report.date;
    if (!cell?.dayOfWeek) return new Date().toISOString().split('T')[0];
    return getLastCellDate(cell.dayOfWeek);
  }, [cell?.dayOfWeek, isEditing, report?.date]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: { members: 0, visitors: 0 }
  });

  useEffect(() => {
    if (reportId && report) {
      setIsEditing(true);
      reset({
        members: Math.max(0, (report.participants || 0) - (report.visitors || 0)),
        visitors: report.visitors || 0,
      });
    }
  }, [reportId, report, reset]);

  useEffect(() => {
    if (workingCellId && !loadingCell && !cell) navigate('/reports');
  }, [workingCellId, cell, loadingCell, navigate]);

  // Verifica ao carregar se já existe relatório dessa semana
  useEffect(() => {
    if (!isEditing && cell && cellDate) {
      getReportByCellAndDate(cell.id, cellDate).then(existing => {
        setWeekReport(existing || null);
      });
    }
  }, [cell, cellDate, isEditing]);

  const onSubmit = async (data: ReportFormData) => {
    if (!cell) return;

    if (!isEditing) {
      const existing = await getReportByCellAndDate(cell.id, cellDate);
      if (existing) { setDuplicateReport(existing); return; }
    }

    try {
      const totalParticipants = Number(data.members) + Number(data.visitors);

      const reportData: Report = {
        id: reportId || crypto.randomUUID(),
        organizationId: cell.organizationId,
        cellId: cell.id,
        cellName: cell.name,
        happened: true,
        type: CellType.NORMAL,
        participants: totalParticipants,
        visitors: Number(data.visitors),
        conversions: 0,
        attendanceList: [],
        newVisitorsList: [],
        conversionsList: [],
        date: cellDate,
        createdAt: isEditing ? (report?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      if (isEditing) {
        await updateReport(reportData);
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        navigate('/reports');
      } else {
        await saveReport(reportData);
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        setSubmittedStats({ total: totalParticipants, visitors: Number(data.visitors) });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      alert(`Erro ao enviar relatório: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  if ((loadingReport || loadingCell) && !cell) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!cell) return null;

  // Verificando se já existe relatório da semana
  if (!isEditing && weekReport === undefined) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Já enviou o relatório dessa semana
  if (!isEditing && weekReport) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-green-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Parabéns!</h2>
          <p className="text-green-100 mt-2 text-lg">Você já preencheu o sistema essa semana!</p>
          <p className="text-green-200 text-sm mt-1 capitalize">{formatDate(weekReport.date)}</p>
        </div>
        <div className="p-8 text-center space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-3xl font-bold text-slate-800">{weekReport.participants}</p>
              <p className="text-xs uppercase font-bold text-slate-400 mt-1">Total de Pessoas</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-3xl font-bold text-orange-500">{weekReport.visitors}</p>
              <p className="text-xs uppercase font-bold text-slate-400 mt-1">Visitantes</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/edit-report/${weekReport.id}`)}
            className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-3 px-6 rounded-xl transition-colors mt-2"
          >
            <FileEdit size={18} /> Editar relatório
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-400 p-6 text-white">
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Relatório' : 'Relatório Semanal'}</h2>
            <p className="opacity-90 mt-1 text-sm">{cell.name}</p>
            <p className="opacity-75 mt-0.5 text-sm capitalize">{formatDate(cellDate)}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Users size={16} /> Membros presentes
              </label>
              <input
                type="number"
                min="0"
                {...register('members')}
                onFocus={(e) => e.target.select()}
                className={`w-full px-4 py-3 rounded-lg bg-white border ${errors.members ? 'border-red-500' : 'border-slate-300'} text-slate-800 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.members && <span className="text-red-500 text-xs mt-1 block">{errors.members.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <UserPlus size={16} /> Visitantes
              </label>
              <input
                type="number"
                min="0"
                {...register('visitors')}
                onFocus={(e) => e.target.select()}
                className={`w-full px-4 py-3 rounded-lg bg-white border ${errors.visitors ? 'border-red-500' : 'border-slate-300'} text-slate-800 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.visitors && <span className="text-red-500 text-xs mt-1 block">{errors.visitors.message}</span>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="animate-btn-pulse flex items-center gap-2 bg-blue-600 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm disabled:opacity-70"
              >
                <Save size={18} />
                {isSubmitting ? 'Enviando...' : isEditing ? 'Atualizar' : 'Enviar Relatório'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal relatório duplicado */}
      {duplicateReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-amber-500 p-6 text-center text-white">
              <AlertCircle size={36} className="mx-auto mb-3" />
              <h2 className="text-xl font-bold">Relatório já enviado!</h2>
              <p className="text-amber-100 text-sm mt-1">Já existe um relatório para esta semana.</p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button
                onClick={() => navigate(`/edit-report/${duplicateReport.id}`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <FileEdit size={18} /> Editar relatório existente
              </button>
              <button
                onClick={() => setDuplicateReport(null)}
                className="w-full py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-green-600 p-8 text-center text-white">
              <div className="w-16 h-16 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle size={32} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold">Relatório Enviado!</h2>
              <p className="text-green-100 mt-2">Parabéns pelo excelente trabalho.</p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-3xl font-bold text-slate-800">{submittedStats.total}</p>
                  <p className="text-xs uppercase font-bold text-slate-400 mt-1">Total de Pessoas</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-3xl font-bold text-orange-600">{submittedStats.visitors}</p>
                  <p className="text-xs uppercase font-bold text-slate-400 mt-1">Visitantes</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
                <div className="text-blue-200 absolute text-4xl font-serif">"</div>
                <p className="text-slate-700 italic text-center text-sm leading-relaxed px-2">
                  O que fizerem, façam-no de todo o coração como se estivessem a servir o Senhor.
                </p>
                <p className="text-center text-xs font-bold text-blue-600 mt-3 uppercase tracking-wider">Colossenses 3:23</p>
              </div>
              <button
                onClick={() => navigate('/ranking')}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Ver Reconhecimento <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportForm;
