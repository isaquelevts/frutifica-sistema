import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUser } from './profileService';
import { UserRole } from '../../shared/types/types';
import { Save, ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userRegistrationSchema, type UserRegistrationFormData } from './schemas/userRegistrationSchema';

const UserRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UserRegistrationFormData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      cellId: '',
      role: UserRole.LEADER
    }
  });

  const onSubmit = async (data: UserRegistrationFormData) => {
    if (!user?.organizationId) return;

    try {
      const newUser = {
        id: crypto.randomUUID(),
        organizationId: user.organizationId,
        name: data.name,
        email: data.email,
        password: data.password,
        cellId: data.cellId || undefined,
        roles: [data.role]
      };
      await saveUser(newUser);
      queryClient.invalidateQueries({ queryKey: ['users', user.organizationId] });
      alert('Usuário cadastrado com sucesso!');
      reset();
      navigate('/leaders');
    } catch (error: any) {
      alert(error.message || 'Erro ao cadastrar usuário.');
    }
  };

  const loading = loadingCells;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-1" /> Voltar
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Líder</h2>
            <p className="text-sm text-slate-500">Crie uma conta de acesso para sua igreja.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                {...register('name')}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.name ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              />
              {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label>
              <input
                type="email"
                {...register('email')}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.email ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              />
              {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
              <input
                type="text"
                {...register('password')}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.password ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                placeholder="Ex: mudar123"
              />
              {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Vincular à Célula</label>
              <select
                {...register('cellId')}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Nenhuma (Apenas cadastro)</option>
                {cells.map(cell => (
                  <option key={cell.id} value={cell.id}>{cell.name} ({cell.leaderName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Acesso</label>
              <select
                {...register('role')}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={UserRole.LEADER}>Líder</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
            >
              <Save size={18} />
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistration;