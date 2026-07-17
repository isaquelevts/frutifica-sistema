import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateCell } from './cellService';
import { Cell, TargetAudience } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { MapPin, User, Calendar, MessageCircle, Flag, FileText, Edit, Save, X, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { maskPhone } from '../../core/utils/mask';
import { useCell } from '../../shared/hooks/useCells';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cellSchema, type CellFormData } from './schemas/cellSchema';

const MyCell: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: cell, isLoading: loadingCell } = useCell(user?.cellId);
  const { data: generations = [], isLoading: loadingGenerations } = useGenerations(user?.organizationId);

  // Temp Co-Leader State
  const [tempCoLeader, setTempCoLeader] = useState({ name: '', email: '', phone: '' });
  const [showCoLeaderForm, setShowCoLeaderForm] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CellFormData>({
    resolver: zodResolver(cellSchema),
    defaultValues: {
      name: '',
      leaderName: '',
      generationId: '',
      dayOfWeek: 'Quarta-feira',
      time: '',
      whatsapp: '',
      targetAudience: TargetAudience.MIXED,
      address: '',
      leaderEmail: '',
      leaderPassword: '',
      leaderBirthday: '',
      coLeaders: []
    }
  });

  const { fields: coLeadersFields, append: appendCoLeader, remove: removeCoLeader } = useFieldArray({
    control,
    name: "coLeaders"
  });

  const loading = loadingCell || loadingGenerations || isSubmitting;

  useEffect(() => {
    if (cell) {
      reset({
        name: cell.name,
        leaderName: cell.leaderName,
        generationId: cell.generationId || '',
        dayOfWeek: cell.dayOfWeek,
        time: cell.time,
        whatsapp: cell.whatsapp || '',
        targetAudience: cell.targetAudience,
        address: cell.address,
        coLeaders: cell.coLeaders || []
      });
    }
  }, [cell, reset]);

  const handleTempCoLeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTempCoLeader(prev => ({ ...prev, [name]: value }));
  };

  const addCoLeaderToFieldArray = () => {
    if (!tempCoLeader.name) return;
    appendCoLeader({
      id: crypto.randomUUID(),
      name: tempCoLeader.name,
      email: tempCoLeader.email,
      phone: tempCoLeader.phone
    });
    setTempCoLeader({ name: '', email: '', phone: '' });
    setShowCoLeaderForm(false);
  };

  const onSubmit = async (data: CellFormData) => {
    if (!cell) return;

    try {
      const updatedCell: Cell = {
        ...cell,
        name: data.name,
        leaderName: data.leaderName,
        dayOfWeek: data.dayOfWeek,
        time: data.time,
        whatsapp: data.whatsapp,
        targetAudience: data.targetAudience,
        address: data.address,
        coLeaders: data.coLeaders // Zod guarantees this structure
      };

      await updateCell(updatedCell);
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['cell', cell.id] });
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar célula:", error);
      alert("Erro ao salvar as alterações.");
    }
  };

  const handleCancel = () => {
    if (cell) {
      reset({
        name: cell.name,
        leaderName: cell.leaderName,
        generationId: cell.generationId || '',
        dayOfWeek: cell.dayOfWeek,
        time: cell.time,
        whatsapp: cell.whatsapp || '',
        targetAudience: cell.targetAudience,
        address: cell.address,
        coLeaders: cell.coLeaders || []
      });
    }
    setIsEditing(false);
  };


  if (!user?.cellId) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-2">Você não está vinculado a uma célula</h2>
        <p className="text-muted-foreground">Entre em contato com o administrador para vincular seu usuário à sua célula.</p>
      </div>
    );
  }

  if (!cell) {
    return <div className="p-8 text-center text-muted-foreground">Carregando informações da célula...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minha Célula</h1>
          <p className="text-muted-foreground">Informações e cadastro da sua célula.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 bg-card border border-input text-foreground px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors shadow-sm font-medium"
              >
                <Edit size={18} />
                Editar Dados
              </button>
              <Link
                to={`/report/${cell.id}`}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md font-medium"
              >
                <FileText size={20} />
                Relatório
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 bg-card border border-input text-foreground px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors shadow-sm font-medium disabled:opacity-50"
              >
                <X size={18} />
                Cancelar
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md font-medium disabled:opacity-50"
              >
                <Save size={20} />
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Header - Always Visible */}
        <div className="bg-gradient-to-r from-primary to-indigo-700 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="w-full">
              {isEditing ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-primary-foreground/80 text-xs uppercase font-bold">Nome da Célula</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full text-2xl font-bold bg-white/10 border border-white/30 rounded px-2 py-1 text-white focus:outline-none focus:bg-white/20"
                    />
                    {errors.name && <span className="text-red-200 text-xs">{errors.name.message}</span>}
                  </div>
                  <div>
                    <label className="text-primary-foreground/80 text-xs uppercase font-bold">Líder (Nome de Exibição)</label>
                    <input
                      type="text"
                      {...register('leaderName')}
                      className="w-full bg-white/10 border border-white/30 rounded px-2 py-1 text-white focus:outline-none focus:bg-white/20"
                    />
                    {errors.leaderName && <span className="text-red-200 text-xs">{errors.leaderName.message}</span>}
                  </div>
                </div>
              ) : (
                <>
                  <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm">
                    {generations.find(g => g.id === cell.generationId)?.name || ''}
                  </div>
                  <h2 className="text-3xl font-bold mb-1">{cell.name}</h2>
                  <p className="text-primary-foreground/80 flex items-center gap-2">
                    <User size={16} /> Líder: {cell.leaderName}
                  </p>
                </>
              )}
            </div>

            {!isEditing && (
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 hidden sm:block">
                <div className="text-center">
                  <span className="block text-2xl font-bold">{cell.dayOfWeek.split('-')[0]}</span>
                  <span className="text-xs uppercase opacity-80">{cell.time}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Details Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Detalhes</h3>

            <div className="space-y-4">
              {/* Day & Time */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg mt-0.5">
                  <Calendar size={20} />
                </div>
                <div className="w-full">
                  <p className="text-sm font-medium text-muted-foreground">Dia e Horário</p>
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <div className="w-1/2">
                        <select
                          {...register('dayOfWeek')}
                          className="w-full bg-card border border-input rounded px-2 py-1 text-sm text-foreground"
                        >
                          <option value="Segunda-feira">Segunda</option>
                          <option value="Terça-feira">Terça</option>
                          <option value="Quarta-feira">Quarta</option>
                          <option value="Quinta-feira">Quinta</option>
                          <option value="Sexta-feira">Sexta</option>
                          <option value="Sábado">Sábado</option>
                          <option value="Domingo">Domingo</option>
                        </select>
                      </div>
                      <div className="w-1/2">
                        <input
                          type="time"
                          {...register('time')}
                          className="w-full bg-card border border-input rounded px-2 py-1 text-sm text-foreground"
                        />
                        {errors.time && <span className="text-red-500 text-xs">{errors.time.message}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground font-medium">{cell.dayOfWeek} às {cell.time}</p>
                  )}
                </div>
              </div>

              {/* Whatsapp */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg mt-0.5">
                  <MessageCircle size={20} />
                </div>
                <div className="w-full">
                  <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                  {isEditing ? (
                    <input
                      type="text"
                      {...register('whatsapp')}
                      onChange={(e) => setValue('whatsapp', maskPhone(e.target.value))}
                      className="mt-1 w-full bg-card border border-input rounded px-2 py-1 text-sm text-foreground"
                      placeholder="(99) 99999-9999"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{cell.whatsapp}</p>
                  )}
                </div>
              </div>

              {/* Target Audience */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mt-0.5">
                  <Flag size={20} />
                </div>
                <div className="w-full">
                  <p className="text-sm font-medium text-muted-foreground">Público Alvo</p>
                  {isEditing ? (
                    <select
                      {...register('targetAudience')}
                      className="mt-1 w-full bg-card border border-input rounded px-2 py-1 text-sm text-foreground"
                    >
                      {Object.values(TargetAudience).map(audience => (
                        <option key={audience} value={audience}>{audience}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-foreground font-medium">{cell.targetAudience}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 pt-4">Localização</h3>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg mt-0.5">
                <MapPin size={20} />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      {...register('address')}
                      className="mt-1 w-full bg-card border border-input rounded px-2 py-1 text-sm text-foreground"
                    />
                    {errors.address && <span className="text-red-500 text-xs">{errors.address.message}</span>}
                  </>
                ) : (
                  <p className="text-foreground font-medium text-lg">{cell.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Co-Leaders Column */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-semibold text-foreground">Co-Líderes</h3>
              {isEditing && !showCoLeaderForm && (
                <button
                  onClick={() => setShowCoLeaderForm(true)}
                  className="text-xs flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/15 transition-colors"
                >
                  <Plus size={14} /> Adicionar
                </button>
              )}
            </div>

            <div className="space-y-3">
              {coLeadersFields.length === 0 && !showCoLeaderForm && (
                <p className="text-muted-foreground italic text-sm">Nenhum co-líder cadastrado.</p>
              )}

              {coLeadersFields.map((leader, index) => (
                <div key={leader.id} className="bg-muted/50 p-3 rounded-lg border border-border flex justify-between items-start group">
                  <div className="overflow-hidden">
                    <p className="font-bold text-foreground text-sm truncate">{leader.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Mail size={12} /> <span className="truncate">{leader.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Phone size={12} /> <span>{leader.phone || '-'}</span>
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeCoLeader(index)}
                      className="text-muted-foreground hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {/* Add Co-Leader Form */}
              {isEditing && showCoLeaderForm && (
                <div className="bg-card p-4 rounded-lg border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <h5 className="text-sm font-semibold text-primary mb-3">Novo Co-Líder</h5>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="name"
                      value={tempCoLeader.name}
                      onChange={handleTempCoLeaderChange}
                      placeholder="Nome Completo"
                      className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                    />
                    <input
                      type="email"
                      name="email"
                      value={tempCoLeader.email}
                      onChange={handleTempCoLeaderChange}
                      placeholder="Email"
                      className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={tempCoLeader.phone}
                      onChange={(e) => setTempCoLeader(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                      placeholder="Telefone"
                      className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowCoLeaderForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={addCoLeaderToFieldArray}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCell;