import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CellType, Report, Member, MemberType } from '../../shared/types/types';
import { saveReport, updateReport } from './reportService';
import { saveMember, incrementAttendance } from '../members/memberService';
import { Save, AlertCircle, Calendar, UserPlus, CheckSquare, User, UserCheck, Heart, CheckCircle, ArrowRight, Plus, X, Phone } from 'lucide-react';
import { maskPhone } from '../../core/utils/mask';
import { useCell } from '../../shared/hooks/useCells';
import { useReport } from '../../shared/hooks/useReports';
import { useMembersByCell } from '../../shared/hooks/useMembers';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema, type ReportFormData } from './schemas/reportSchema';

const ReportForm: React.FC = () => {
  const { cellId, reportId } = useParams<{ cellId?: string; reportId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Queries
  const { data: report, isLoading: loadingReport } = useReport(reportId);
  const workingCellId = cellId || report?.cellId;
  const { data: cell, isLoading: loadingCell } = useCell(workingCellId);
  const { data: existingMembers = [], isLoading: loadingMembers } = useMembersByCell(workingCellId);


  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedStats, setSubmittedStats] = useState({
    participants: 0,
    visitors: 0,
    conversions: 0
  });

  // New Member Modal State (Separate functionality, kept as state for simplicity as it creates a member separately)
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [newMemberData, setNewMemberData] = useState({ name: '', phone: '' });

  // Temp Visitor State (for adding loop)
  const [tempVisitor, setTempVisitor] = useState({ name: '', phone: '' });
  const [isAddingVisitor, setIsAddingVisitor] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting: isFormSubmitting }
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      happened: true,
      type: CellType.NORMAL,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      attendanceList: [],
      conversionsList: [],
      newVisitorsList: []
    }
  });

  const { fields: newVisitorsFields, append: appendVisitor, remove: removeVisitor } = useFieldArray({
    control,
    name: "newVisitorsList"
  });

  const happened = watch('happened');
  const attendanceList = watch('attendanceList') || [];
  const conversionsList = watch('conversionsList') || [];

  const loading = loadingReport || loadingCell || loadingMembers || isFormSubmitting;

  useEffect(() => {
    if (reportId && report) {
      setIsEditing(true);
      reset({
        happened: report.happened,
        type: report.type || CellType.NORMAL,
        date: report.date,
        notes: report.notes || '',
        attendanceList: report.attendanceList || [],
        conversionsList: report.conversionsList || [],
        newVisitorsList: report.newVisitorsList ? report.newVisitorsList.map(v => ({
          id: v.id || crypto.randomUUID(),
          name: v.name,
          phone: v.phone
        })) : []
      });
    } else if (reportId && !loadingReport && !report) {
      navigate('/reports');
    }
  }, [reportId, report, loadingReport, navigate, reset]);

  useEffect(() => {
    if (workingCellId && !loadingCell && !cell) {
      navigate('/cells');
    }
  }, [workingCellId, cell, loadingCell, navigate]);


  // Roll Call Logic
  const toggleAttendance = (memberId: string) => {
    const current = new Set(attendanceList);
    if (current.has(memberId)) {
      current.delete(memberId);
      // Remove from conversions too if present
      if (conversionsList.includes(memberId)) {
        toggleConversion(memberId);
      }
    } else {
      current.add(memberId);
    }
    setValue('attendanceList', Array.from(current), { shouldDirty: true });
  };

  // Conversion Logic
  const toggleConversion = (memberId: string) => {
    const current = new Set(conversionsList);
    if (current.has(memberId)) {
      current.delete(memberId);
    } else {
      current.add(memberId);
    }
    setValue('conversionsList', Array.from(current), { shouldDirty: true });
  };

  // Visitor Logic
  const handleTempVisitorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempVisitor(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addVisitorToForm = () => {
    if (!tempVisitor.name) return;
    if (!tempVisitor.phone) {
      alert("O telefone é obrigatório para diferenciar cada pessoa.");
      return;
    }

    // Check duplication in existing members
    const exists = existingMembers.some(m => m.phone === tempVisitor.phone);
    if (exists) {
      alert("Já existe um membro cadastrado com este telefone.");
      return;
    }

    appendVisitor({
      id: crypto.randomUUID(),
      name: tempVisitor.name,
      phone: tempVisitor.phone
    });

    setTempVisitor({ name: '', phone: '' });
    setIsAddingVisitor(false); // Close form
  };

  const handleSaveNewMember = async () => {
    if (!newMemberData.name || !newMemberData.phone) {
      alert("Nome e Telefone são obrigatórios.");
      return;
    }
    if (!cell) return;

    const newMemberId = crypto.randomUUID() as string;
    const newMember: Member = {
      id: newMemberId,
      organizationId: cell.organizationId,
      cellId: cell.id,
      name: newMemberData.name,
      phone: newMemberData.phone,
      type: MemberType.MEMBER, // Default to member
      attendanceCount: 0,
      firstVisitDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      active: true
    };

    await saveMember(newMember);

    // Invalidate members query
    queryClient.invalidateQueries({ queryKey: ['members', 'cell', cell.id] });

    // Auto-select attendance
    setValue('attendanceList', [...attendanceList, newMemberId], { shouldDirty: true });

    setNewMemberData({ name: '', phone: '' });
    setShowNewMemberModal(false);
  };

  const onSubmit = async (data: ReportFormData) => {
    if (!cell) return;

    try {
      let membersCount = 0;
      let visitorsCount = 0;

      if (data.happened) {
        data.attendanceList.forEach(memberId => {
          const member = existingMembers.find(m => m.id === memberId);
          if (member) {
            if (member.type === MemberType.VISITOR) {
              visitorsCount++;
            } else {
              membersCount++;
            }
          }
        });
        visitorsCount += data.newVisitorsList.length;
      }

      const finalParticipants = membersCount + visitorsCount;
      const finalVisitors = visitorsCount;
      const finalConversions = data.conversionsList.length;

      const reportData: Report = {
        id: reportId || (crypto.randomUUID() as string),
        organizationId: cell.organizationId,
        cellId: cell.id,
        cellName: cell.name,
        happened: data.happened,
        type: data.happened ? data.type : undefined,

        participants: finalParticipants,
        visitors: finalVisitors,
        conversions: finalConversions,

        attendanceList: data.attendanceList,
        newVisitorsList: data.newVisitorsList.map(v => ({ id: v.id || crypto.randomUUID(), name: v.name, phone: v.phone })),
        conversionsList: data.conversionsList,

        date: data.date,
        notes: data.notes,
        createdAt: isEditing ? (report?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      if (isEditing) {
        await updateReport(reportData);
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        navigate('/reports');
      } else {
        await saveReport(reportData);

        if (data.newVisitorsList.length > 0) {
          for (const visitor of data.newVisitorsList) {
            const newMember: Member = {
              id: visitor.id as string || crypto.randomUUID(),
              organizationId: cell.organizationId,
              cellId: cell.id,
              name: visitor.name,
              phone: visitor.phone,
              type: MemberType.VISITOR,
              attendanceCount: 1,
              firstVisitDate: data.date,
              createdAt: new Date().toISOString(),
              active: true
            };
            await saveMember(newMember);
          }
        }

        if (data.attendanceList.length > 0) {
          await incrementAttendance(data.attendanceList);
        }

        queryClient.invalidateQueries({ queryKey: ['reports'] });
        queryClient.invalidateQueries({ queryKey: ['members'] });

        setSubmittedStats({
          participants: finalParticipants,
          visitors: finalVisitors,
          conversions: finalConversions
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("Error saving report", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error) || 'Erro desconhecido';
      alert(`Erro ao enviar relatório: ${msg}`);
    }
  };

  if (loading && !report && !cell) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!cell) return null;

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Relatório' : 'Relatório Semanal'}</h2>
            <p className="opacity-90 mt-1">Célula: {cell.name} • Líder: {cell.leaderName}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">

            {/* Section 1: Did it happen? */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-base font-medium text-slate-800">Houve célula essa semana?</label>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    id="happened-toggle"
                    {...register('happened')}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    style={{ right: happened ? '0' : '50%', borderColor: happened ? '#2563EB' : '#94A3B8' }}
                  />
                  <label
                    htmlFor="happened-toggle"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${happened ? 'bg-blue-600' : 'bg-slate-300'}`}
                  ></label>
                </div>
              </div>
            </div>

            {happened ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                  <div className="min-w-0 overflow-hidden">
                    <label className="block text-sm font-medium text-slate-800 mb-1">Data da Célula</label>
                    <div className="relative min-w-0">
                      <Calendar className="absolute left-3 top-2.5 text-slate-500" size={18} />
                      <input
                        type="date"
                        {...register('date')}
                        className={`w-full min-w-0 pl-10 pr-2 py-2 rounded-lg bg-white border ${errors.date ? 'border-red-500' : 'border-slate-300'} text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      />
                      {errors.date && <span className="text-red-500 text-xs mt-1">{errors.date.message}</span>}
                    </div>
                  </div>

                  <div className="min-w-0 overflow-hidden">
                    <label className="block text-sm font-medium text-slate-800 mb-1">Tipo de Reunião</label>
                    <select
                      {...register('type')}
                      className="w-full min-w-0 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      {Object.values(CellType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ROLL CALL SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-slate-800">Lista de Chamada</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewMemberModal(true)}
                      className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                    >
                      <Plus size={16} /> Novo Membro
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    {existingMembers.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 italic">
                        Nenhum membro cadastrado. Cadastre membros no menu "Membros" ou adicione visitantes abaixo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {existingMembers.map(member => {
                          const isPresent = attendanceList.includes(member.id);
                          return (
                            <div
                              key={member.id}
                              onClick={() => toggleAttendance(member.id)}
                              className={`
                                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none
                                ${isPresent
                                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                                  : 'bg-white border-slate-200 hover:bg-slate-100'}
                              `}
                            >
                              <div className={`
                                w-5 h-5 rounded flex items-center justify-center border transition-colors
                                ${isPresent ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}
                              `}>
                                {isPresent && <CheckSquare size={14} />}
                              </div>
                              <div>
                                <p className={`font-medium ${isPresent ? 'text-blue-900' : 'text-slate-800'}`}>
                                  {member.name}
                                </p>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  {member.type === MemberType.VISITOR ? 'Visitante' : 'Membro'} ({member.attendanceCount || 0}x)
                                </span>
                              </div>

                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-500 text-right">
                    Total selecionado: <span className="font-bold text-slate-800">{attendanceList.length}</span>
                  </div>
                </div>

                {/* NEW VISITORS SECTION - REDESIGNED AS CARD */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-slate-800">Novos Visitantes</h3>
                  </div>

                  {/* Visitor List (Added) */}
                  {newVisitorsFields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {newVisitorsFields.map((v, idx) => (
                        <div key={v.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-green-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full text-green-700">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{v.name}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Phone size={10} /> {v.phone}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // If this visitor was converted, remove from conversions list
                              if (v.id && conversionsList.includes(v.id)) {
                                toggleConversion(v.id);
                              }
                              removeVisitor(idx);
                            }}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Visitor Card - NEW DESIGN */}
                  {!isAddingVisitor ? (
                    <div
                      onClick={() => setIsAddingVisitor(true)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg flex items-center justify-between cursor-pointer transform hover:scale-[1.01] transition-transform duration-200 group border-2 border-white/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                          <UserPlus size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">Adicionar Visitante</h3>
                          <p className="text-green-100 text-sm opacity-90">Cadastre alguém que veio hoje.</p>
                        </div>
                      </div>
                      <div className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm group-hover:bg-green-50 transition-colors flex items-center gap-1">
                        Adicionar <Plus size={16} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
                      <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
                        <h4 className="font-bold text-green-800 flex items-center gap-2">
                          <UserPlus size={18} /> Cadastro Rápido
                        </h4>
                        <button onClick={() => setIsAddingVisitor(false)} type="button" className="text-green-700 hover:bg-green-100 p-1 rounded">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                              type="text"
                              name="name"
                              placeholder="Ex: João da Silva"
                              value={tempVisitor.name}
                              onChange={handleTempVisitorChange}
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (Obrigatório)</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                              type="tel"
                              name="phone"
                              placeholder="(99) 99999-9999"
                              value={tempVisitor.phone}
                              onChange={(e) => setTempVisitor(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingVisitor(false)}
                            className="flex-1 py-2 text-slate-500 font-medium hover:bg-slate-50 rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={addVisitorToForm}
                            className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-sm"
                          >
                            Adicionar na Lista
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONVERSION SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Heart className="text-red-500" size={20} />
                      <h3 className="text-lg font-bold text-slate-800">Houve Conversão?</h3>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-sm text-red-700 mb-3 font-medium">Selecione quem entregou a vida para Jesus:</p>

                    {(attendanceList.length === 0 && newVisitorsFields.length === 0) ? (
                      <p className="text-sm text-slate-500 italic">Marque a presença das pessoas acima primeiro.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* List from Attendance */}
                        {attendanceList.map((memberId: string) => {
                          const m = existingMembers.find(em => em.id === memberId);
                          if (!m) return null;
                          const isConverted = conversionsList.includes(memberId);
                          return (
                            <div
                              key={memberId}
                              onClick={() => toggleConversion(memberId)}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${isConverted ? 'bg-red-100 border-red-300' : 'bg-white border-red-100 hover:bg-white/80'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isConverted ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300'}`}>
                                {isConverted && <CheckSquare size={10} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium text-slate-800">{m.name}</span>
                            </div>
                          );
                        })}

                        {/* List from New Visitors */}
                        {newVisitorsFields.map(v => {
                          if (!v.id) return null;
                          const isConverted = conversionsList.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              onClick={() => v.id && toggleConversion(v.id)}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${isConverted ? 'bg-red-100 border-red-300' : 'bg-white border-red-100 hover:bg-white/80'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isConverted ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300'}`}>
                                {isConverted && <CheckSquare size={10} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium text-slate-800">{v.name} (Novo)</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Observações (Opcional)</label>
                  <textarea
                    rows={3}
                    {...register('notes')}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Testemunhos, pedidos de oração ou observações importantes..."
                  ></textarea>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="text-orange-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-orange-800">Célula não realizada</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Por favor, informe a data e o motivo pelo qual a célula não ocorreu.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="min-w-0 overflow-hidden">
                    <label className="block text-sm font-medium text-orange-800 mb-1">Data</label>
                    <input
                      type="date"
                      {...register('date')}
                      className={`w-full min-w-0 px-4 py-2 rounded-lg bg-white border ${errors.date ? 'border-orange-300 border-red-500' : 'border-orange-300'} text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none`}
                    />
                    {errors.date && <span className="text-red-500 text-xs mt-1">{errors.date.message}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-800 mb-1">Motivo / Justificativa *</label>
                    <textarea
                      rows={3}
                      {...register('notes')}
                      className="w-full px-4 py-2 rounded-lg bg-white border border-orange-300 text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-orange-300"
                      placeholder="Ex: Feriado, chuva intensa, liderança doente..."
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-8 rounded-lg transition-colors shadow-sm"
              >
                <Save size={18} />
                {isEditing ? 'Atualizar Relatório' : 'Enviar Relatório'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* NEW MEMBER MODAL */}
      {showNewMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Novo Membro</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newMemberData.name}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={newMemberData.phone}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNewMemberModal(false)}
                className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Salvar e Marcar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in zoom-in-95 duration-300">
            <div className="bg-green-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle size={32} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold">Relatório Enviado!</h2>
                <p className="text-green-100 mt-2">Parabéns pelo excelente trabalho.</p>
              </div>
            </div>

            <div className="p-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-3xl font-bold text-slate-800">{submittedStats.participants}</p>
                  <p className="text-xs uppercase font-bold text-slate-400 mt-1">Pessoas</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-3xl font-bold text-orange-600">{submittedStats.visitors}</p>
                  <p className="text-xs uppercase font-bold text-slate-400 mt-1">Visitantes</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-3xl font-bold text-red-600">{submittedStats.conversions}</p>
                  <p className="text-xs uppercase font-bold text-slate-400 mt-1">Conversões</p>
                </div>
              </div>

              {/* Scripture */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 relative">
                <div className="text-blue-200 absolute top-2 left-2 text-4xl font-serif">“</div>
                <p className="text-slate-700 italic text-center text-sm leading-relaxed relative z-10 px-2">
                  O que fizerem, façam-no de todo o coração como se estivessem a servir o Senhor e não os homens. Lembrem-se de que a recompensa vem do Senhor que vos fará ter parte na sua herança. É a Cristo, o verdadeiro Senhor, que estão a servir.
                </p>
                <p className="text-center text-xs font-bold text-blue-600 mt-3 uppercase tracking-wider">Colossenses 3:24-25</p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Voltar para o Dashboard <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportForm;