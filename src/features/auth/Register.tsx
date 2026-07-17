import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { apiFetch } from '../../core/api/client';
import { Church, User as UserIcon, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from './schemas/registerSchema';

const Register: React.FC = () => {
  const [error, setError] = useState('');
  const { authenticateWithToken } = useAuth();
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
      const { token, user } = await apiFetch<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ orgName: data.orgName, name: data.adminName, email: data.email, password: data.password }),
      });
      await authenticateWithToken(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta da igreja.');
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Voltar para o início
        </Link>

        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white mb-4">
              <Church size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Cadastre sua Igreja</h1>
            <p className="text-primary-foreground/80 mt-2">Comece a usar o Frutifica hoje mesmo</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome da Igreja</label>
                <div className="relative">
                  <Church className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    {...register('orgName')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${errors.orgName ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                    placeholder="Ex: Igreja Batista Central"
                  />
                </div>
                {errors.orgName && <span className="text-red-500 text-xs mt-1">{errors.orgName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome do Responsável (Admin)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    {...register('adminName')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${errors.adminName ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                    placeholder="Seu nome"
                  />
                </div>
                {errors.adminName && <span className="text-red-500 text-xs mt-1">{errors.adminName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${errors.email ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                    placeholder="admin@igreja.com"
                  />
                </div>
                {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    {...register('password')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${errors.password ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                    placeholder="Criar senha"
                  />
                </div>
                {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 mt-2"
              >
                {isSubmitting ? 'Criando conta...' : 'Cadastrar Igreja'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
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