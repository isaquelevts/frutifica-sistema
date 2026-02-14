import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { saveOrganization } from '../settings/organizationService';
import { saveUser } from '../settings/profileService';
import { supabase } from '../../core/supabase/supabaseClient';
import { UserRole, Organization } from '../../shared/types/types';
import { Church, User as UserIcon, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from './schemas/registerSchema';

const Register: React.FC = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');

    try {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // 2. Create Organization (Tenant)
      const newOrgId = crypto.randomUUID();
      const newOrg: Organization = {
        id: newOrgId,
        name: data.orgName,
        createdAt: new Date().toISOString(),
        plan: 'pro',
        maxCells: 99999
      };
      await saveOrganization(newOrg);

      // 3. Create Admin Profile linked to Tenant
      const newUser = {
        id: authData.user.id, // Link to Auth ID
        organizationId: newOrgId,
        name: data.adminName,
        email: data.email,
        roles: [UserRole.ADMIN, UserRole.INTRODUTOR],
        cellId: undefined
      };

      await saveUser(newUser as any);

      // 4. Navigate (AuthContext listener will pick up the session)
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta da igreja.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Voltar para o início
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white mb-4">
              <Church size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Cadastre sua Igreja</h1>
            <p className="text-blue-100 mt-2">Comece a usar o Frutifica hoje mesmo</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Igreja</label>
                <div className="relative">
                  <Church className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    {...register('orgName')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.orgName ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                    placeholder="Ex: Igreja Batista Central"
                  />
                </div>
                {errors.orgName && <span className="text-red-500 text-xs mt-1">{errors.orgName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável (Admin)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    {...register('adminName')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.adminName ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                    placeholder="Seu nome"
                  />
                </div>
                {errors.adminName && <span className="text-red-500 text-xs mt-1">{errors.adminName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.email ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                    placeholder="admin@igreja.com"
                  />
                </div>
                {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    {...register('password')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.password ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                    placeholder="Criar senha"
                  />
                </div>
                {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 mt-2"
              >
                {isSubmitting ? 'Criando conta...' : 'Cadastrar Igreja'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;