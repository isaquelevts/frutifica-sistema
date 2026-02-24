import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { Church, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from './schemas/loginSchema';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');

    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        const roles = result.roles ?? [];
        if (roles.includes('superadmin' as any)) {
          navigate('/super');
        } else if (roles.includes('admin' as any)) {
          navigate('/dashboard');
        } else if (roles.includes('leader' as any) || roles.includes('coleader' as any)) {
          navigate('/my-cell');
        } else if (roles.includes('introdutor' as any)) {
          navigate('/consolidation');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Email ou senha incorretos.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar.');
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
            <h1 className="text-2xl font-bold text-white">Frutifica</h1>
            <p className="text-blue-100 mt-2">Gestão inteligente para sua igreja</p>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">Acesse sua conta</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.email ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                    placeholder="seu@email.com"
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
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 mt-2"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/forgot-password" university-id="forgot-password-link" className="text-sm text-blue-600 hover:underline">
                Esqueceu sua senha?
              </Link>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;