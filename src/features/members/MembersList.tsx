import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { Member, MemberType } from '../../shared/types/types';
import { saveMember, updateMember, deleteMember } from './memberService';
import { Plus, Search, Edit2, Trash2, Phone, Star, ShieldCheck, MessageCircle, Cake } from 'lucide-react';
import { maskPhone } from '../../core/utils/mask';
import { useMembersByCell } from '../../shared/hooks/useMembers';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSchema, type MemberFormData } from './schemas/memberSchema';

const MembersList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: members = [], isLoading } = useMembersByCell(user?.cellId);

  // Modal/Form State
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      type: MemberType.MEMBER,
      attendanceCount: 0
    }
  });

  const watcherType = watch('type');

  useEffect(() => {
    if (showForm) {
      if (editingMember) {
        reset({
          name: editingMember.name,
          phone: editingMember.phone,
          birthday: editingMember.birthday || '',
          type: editingMember.type,
          attendanceCount: editingMember.attendanceCount
        });
      } else {
        reset({
          name: '',
          phone: '',
          birthday: '',
          type: MemberType.MEMBER,
          attendanceCount: 0
        });
      }
    }
  }, [showForm, editingMember, reset]);


  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este membro?')) {
      await deleteMember(id);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  };

  const onSubmit = async (data: MemberFormData) => {
    if (!user?.cellId || !user?.organizationId) return;

    // Lógica de promoção automática
    let finalType = data.type;
    if (data.type === MemberType.VISITOR && Number(data.attendanceCount) >= 3) {
      finalType = MemberType.MEMBER;
    }

    const memberData = {
      name: data.name,
      phone: data.phone,
      birthday: data.birthday,
      type: finalType,
      attendanceCount: Number(data.attendanceCount)
    };

    if (editingMember) {
      await updateMember({
        ...editingMember,
        ...memberData
      });
    } else {
      await saveMember({
        id: crypto.randomUUID(),
        organizationId: user.organizationId,
        cellId: user.cellId,
        ...memberData,
        firstVisitDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        active: true
      });
    }

    setShowForm(false);
    setEditingMember(null);
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user?.cellId) {
    return <div className="p-8 text-center">Você não está vinculado a uma célula.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando membros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Membros da Célula</h1>
          <p className="text-slate-500">Gerencie os participantes e visitantes.</p>
        </div>
        <button
          onClick={() => {
            setEditingMember(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Membro
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(member => (
          <div key={member.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${member.type === MemberType.MEMBER ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{member.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.type === MemberType.MEMBER ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                        <ShieldCheck size={10} /> Membro
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
                        <Star size={10} /> Visitante
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Freq: {member.attendanceCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                {/* WhatsApp Action */}
                {member.phone && (
                  <a
                    href={`https://wa.me/55${formatPhoneNumber(member.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
                <button
                  onClick={() => handleEdit(member)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-2">
              <div className="flex items-center text-sm text-slate-500 gap-2">
                <Phone size={14} />
                {member.phone || <span className="italic text-slate-300">Sem telefone</span>}
              </div>
              {member.birthday && (
                <div className="flex items-center text-sm text-slate-500 gap-2">
                  <Cake size={14} />
                  {new Date(member.birthday).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </div>
              )}
            </div>

            {member.type === MemberType.VISITOR && (
              <div className="mt-2 text-[10px] text-orange-400 text-center bg-orange-50 py-1 rounded">
                Falta(m) {Math.max(0, 3 - member.attendanceCount)} presença(s) para virar membro.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editingMember ? 'Editar Membro' : 'Novo Membro'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-50 border ${errors.name ? 'border-red-500' : 'border-slate-300'} outline-none focus:border-blue-500 text-slate-800`}
                />
                {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  {...register('phone')}
                  onChange={(e) => setValue('phone', maskPhone(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-50 border ${errors.phone ? 'border-red-500' : 'border-slate-300'} outline-none focus:border-blue-500 text-slate-800`}
                  placeholder="(99) 99999-9999"
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento (Opcional)</label>
                <input
                  type="date"
                  {...register('birthday')}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    {...register('type')}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                  >
                    <option value={MemberType.MEMBER}>Membro</option>
                    <option value={MemberType.VISITOR}>Visitante</option>
                  </select>
                </div>
                {watcherType === MemberType.VISITOR && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Presenças</label>
                    <input
                      type="number"
                      min="0"
                      {...register('attendanceCount')}
                      className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">3 presenças vira membro.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersList;