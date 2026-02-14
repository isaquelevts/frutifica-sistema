import React, { useEffect, useState } from 'react';
import { getUsers, saveUser, updateUser, deleteUser } from '../settings/profileService';
import { getCells } from './cellService';
import { supabase } from '../../core/supabase/supabaseClient';
import { User, UserRole, Cell } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { UserPlus, Search, Edit2, Trash2, Mail, Lock, CakeSlice, ShieldCheck, User as UserIcon, Users, CheckCircle } from 'lucide-react';
import { useUsers } from '../../shared/hooks/useUsers';
import { useCells } from '../../shared/hooks/useCells';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userRegistrationSchema, type UserRegistrationFormData } from '../settings/schemas/userRegistrationSchema'; // Reusing schema

const ManageLeaders: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useUsers(currentUser?.organizationId);
  const { data: cells = [], isLoading: loadingCells } = useCells(currentUser?.organizationId);

  const loading = loadingUsers || loadingCells || isSubmitting;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Constants for Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdLeaderName, setCreatedLeaderName] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<UserRegistrationFormData>({
    resolver: zodResolver(userRegistrationSchema), // Using shared schema
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: UserRole.COLEADER,
      cellId: '',
      birthday: ''
    }
  });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCellName = (cellId?: string) => {
    if (!cellId) return 'Sem Célula';
    const cell = cells.find(c => c.id === cellId);
    return cell ? cell.name : 'Célula Excluída';
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    // Pega o primeiro papel relevante para edição simples
    const primaryRole = user.roles.includes(UserRole.ADMIN) ? UserRole.ADMIN :
      user.roles.includes(UserRole.COLEADER) ? UserRole.COLEADER :
        user.roles.includes(UserRole.INTRODUTOR) ? UserRole.INTRODUTOR : UserRole.LEADER;

    reset({
      name: user.name,
      email: user.email,
      password: '', // Don't show password for editing
      role: primaryRole,
      cellId: user.cellId || '',
      birthday: user.birthday || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(id);
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } catch (error) {
        console.error("Error deleting user", error);
        alert("Erro ao excluir usuário.");
      }
    }
  };

  const handleOpenModal = () => {
    setEditingUser(null);
    reset({
      name: '',
      email: '',
      password: '',
      role: UserRole.COLEADER,
      cellId: '',
      birthday: ''
    });
    setShowModal(true);
  };

  const onSubmit = async (data: UserRegistrationFormData) => {
    if (!currentUser?.organizationId) return;

    setIsSubmitting(true);

    try {
      // Converte o single-select para array de roles
      const roles = [data.role];

      if (editingUser) {
        // Editing existing user - just update profile
        const userData = {
          ...editingUser,
          name: data.name,
          email: data.email,
          roles: roles,
          cellId: data.cellId || undefined,
          birthday: data.birthday || undefined
        };
        await updateUser(userData);
      } else {
        // Creating new user - create in Supabase Auth first
        if (!data.password) {
          throw new Error('Senha é obrigatória para novos usuários.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (authError) throw new Error(`Erro ao criar conta: ${authError.message}`);
        if (!authData.user) throw new Error('Erro ao criar usuário');

        // Create profile
        const userData = {
          id: authData.user.id,
          organizationId: currentUser.organizationId,
          name: data.name,
          email: data.email,
          roles: roles,
          cellId: data.cellId || undefined,
          birthday: data.birthday || undefined
        };

        await saveUser(userData as any);
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });

      if (editingUser) {
        // Just close modal for edits
        setShowModal(false);
      } else {
        // Show success modal for new leaders
        setCreatedLeaderName(data.name);
        setShowModal(false);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("Error saving user", error);
      alert(error.message || 'Erro ao salvar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    handleOpenModal();
    setShowSuccessModal(false);
  };

  const getRoleBadge = (roles: UserRole[]) => {
    if (roles.includes(UserRole.ADMIN)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ShieldCheck size={12} /> Admin
        </span>
      );
    }
    if (roles.includes(UserRole.COLEADER)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
          <Users size={12} /> Co-Líder
        </span>
      );
    }
    if (roles.includes(UserRole.INTRODUTOR)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <UserIcon size={12} /> Introdutor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <UserIcon size={12} /> Líder
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciar Líderes</h1>
          <p className="text-slate-500">Controle de acesso e informações dos líderes.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Célula</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Função</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nascimento</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {getCellName(u.cellId)}
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(u.roles)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {u.birthday ? new Date(u.birthday).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingUser ? 'Editar Usuário' : 'Cadastrar Usuário'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input
                      type="text"
                      {...register('name')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.name ? 'border-red-500' : 'border-slate-300'} text-slate-900 font-medium outline-none focus:border-blue-500`}
                    />
                    {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input
                      type="email"
                      {...register('email')}
                      disabled={!!editingUser}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
                  </div>
                  {editingUser && (
                    <p className="text-xs text-slate-500 mt-1">O email não pode ser alterado após a criação da conta.</p>
                  )}
                </div>

                {/* Password field - only for new users (though schema allows it, logic hides/shows it) */}
                {!editingUser && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-500" size={18} />
                      <input
                        type="password"
                        {...register('password')}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.password ? 'border-red-500' : 'border-slate-300'} text-slate-900 font-medium outline-none focus:border-blue-500`}
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                      {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
                    </div>
                  </div>
                )}

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <div className="relative">
                    <CakeSlice className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input
                      type="date"
                      {...register('birthday')}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                  <select
                    {...register('role')}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium outline-none focus:border-blue-500"
                  >
                    <option value={UserRole.LEADER}>Líder</option>
                    <option value={UserRole.COLEADER}>Co-Líder</option>
                    <option value={UserRole.INTRODUTOR}>Introdutor</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Célula Vinculada</label>
                  <select
                    {...register('cellId')}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium outline-none focus:border-blue-500"
                  >
                    <option value="">Sem Célula (Apenas Acesso)</option>
                    {cells.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.leaderName}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {/* Simplified for UI - hook form handles value */}
                    Co-líderes podem ser vinculados a células existentes sem criar uma nova.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500 delay-150">
                <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                🎉 Líder Cadastrado!
              </h2>

              {/* Message */}
              <p className="text-slate-600 mb-1">
                <strong className="text-blue-600">{createdLeaderName}</strong> foi adicionado com sucesso!
              </p>
              <p className="text-sm text-slate-500 mb-8">
                O líder já pode acessar o sistema com as credenciais fornecidas.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleAddAnother}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
                >
                  + Adicionar Outro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLeaders;