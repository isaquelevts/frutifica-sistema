import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  leaderStep1Schema,
  leaderStep2Schema,
  type LeaderStep1FormData,
  type LeaderStep2FormData,
} from './schemas/leaderRegisterSchema';
import { supabase } from '../../core/supabase/supabaseClient';
import { getOrganizationById } from '../settings/organizationService';
import { Organization, UserRole, TargetAudience } from '../../shared/types/types';
import {
  Church, User as UserIcon, Lock, Mail, Phone,
  MapPin, Clock, Calendar, Users, CheckCircle,
  ArrowLeft, ArrowRight, Loader2, Eye, EyeOff,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo',
];

const LeaderRegister: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 'success'>(1);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [step1Data, setStep1Data] = useState<LeaderStep1FormData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setOrgNotFound(true);
      setLoadingOrg(false);
      return;
    }
    // Tenta carregar o nome da organização para exibir na tela.
    // Se falhar (ex: RLS bloqueia anon), ainda permite o formulário —
    // o orgId do URL será validado de fato ao submeter.
    getOrganizationById(orgId)
      .then((org) => {
        if (org) setOrganization(org);
      })
      .catch(() => { /* sem org name, mas o form continua acessível */ })
      .finally(() => setLoadingOrg(false));
  }, [orgId]);

  const step1Form = useForm<LeaderStep1FormData>({
    resolver: zodResolver(leaderStep1Schema),
  });

  const step2Form = useForm<LeaderStep2FormData>({
    resolver: zodResolver(leaderStep2Schema),
    defaultValues: {
      targetAudience: TargetAudience.MIXED,
      dayOfWeek: '',
    },
  });

  const onStep1Submit = (data: LeaderStep1FormData) => {
    setStep1Data(data);
    if (!step2Form.getValues('leaderName')) {
      step2Form.setValue('leaderName', data.name);
    }
    setStep(2);
  };

  const onStep2Submit = async (data: LeaderStep2FormData) => {
    if (!step1Data || !orgId) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1Data.email,
        password: step1Data.password,
      });

      if (authError) {
        // Erros comuns do signUp com mensagem amigável
        if (authError.message?.toLowerCase().includes('already registered')) {
          throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
        }
        throw new Error(`Erro ao criar conta: ${authError.message}`);
      }

      if (!authData.user) throw new Error('Erro ao criar usuário. Tente novamente.');

      // Se o Supabase exige confirmação de email, session é null aqui.
      // Neste caso, não conseguimos inserir profile/célula via RLS pois auth.uid() é null.
      // Solução: desative "Confirm email" em Authentication → Settings no Supabase.
      if (!authData.session) {
        throw new Error(
          'Seu Supabase está com confirmação de email ativa. Desative a opção "Confirm email" em Authentication → Settings no painel do Supabase e tente novamente.'
        );
      }

      const userId = authData.user.id;

      // 2. Criar o perfil PRIMEIRO (sem cellId ainda)
      // O RLS da tabela 'cells' depende de get_my_org_id() que lê a tabela profiles.
      // O perfil precisa existir antes de inserir a célula.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        organization_id: orgId,
        name: step1Data.name,
        email: step1Data.email,
        roles: [UserRole.LEADER],
        cell_id: null,
      });
      if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);

      // 3. Criar a célula (perfil já existe, get_my_org_id() funciona)
      const cellId = crypto.randomUUID();
      const { error: cellError } = await supabase.from('cells').insert({
        id: cellId,
        organization_id: orgId,
        name: data.cellName,
        leader_name: data.leaderName,
        leader_id: userId,
        whatsapp: data.whatsapp,
        day_of_week: data.dayOfWeek,
        target_audience: data.targetAudience,
        time: data.time,
        address: data.address,
        active: true,
        co_leaders: [],
      });
      if (cellError) throw new Error(`Erro ao criar célula: ${cellError.message}`);

      // 4. Atualizar o perfil com o cellId
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cell_id: cellId })
        .eq('id', userId);
      if (updateError) throw new Error(`Erro ao vincular célula: ${updateError.message}`);

      setStep('success');
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingOrg) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="text-blue-600 animate-spin" size={32} />
      </div>
    );
  }

  // ── Org not found ────────────────────────────────────────────────────────
  if (orgNotFound) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Church className="text-slate-300 mx-auto mb-4" size={64} />
          <h1 className="text-2xl font-bold text-slate-700 mb-2">Link inválido</h1>
          <p className="text-slate-500 mb-6">Este link de cadastro não é válido ou expirou.</p>
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Cadastro realizado! 🎉</h1>
          <p className="text-slate-600 mb-1">
            Bem-vindo(a) ao <strong>Frutifica</strong>!
          </p>
          <p className="text-slate-500 text-sm mb-2">
            Sua conta e sua célula foram criadas com sucesso em{' '}
            <strong>{organization?.name}</strong>.
          </p>
          <p className="text-xs text-slate-400 mb-8">
            Se você recebeu um email de confirmação, verifique sua caixa de entrada antes de acessar.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm mb-3"
          >
            Acessar o Sistema
          </button>
          <Link to="/login" className="text-sm text-slate-500 hover:underline">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-1">
            <Church className="text-blue-600" size={26} />
            <span className="text-xl font-bold text-slate-700">Frutifica</span>
          </div>
          {organization && (
            <p className="text-slate-500 text-sm">{organization.name}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step Header */}
          <div className="bg-blue-600 p-6 text-center">
            <h1 className="text-xl font-bold text-white">
              {step === 1 ? 'Criar Conta' : 'Dados da Célula'}
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              {step === 1
                ? 'Passo 1 de 2 — Informações de acesso'
                : 'Passo 2 de 2 — Informações da sua célula'}
            </p>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-blue-500/50 rounded-full">
              <div
                className="h-1.5 bg-white rounded-full transition-all duration-500"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>

          <div className="p-8">
            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {submitError}
              </div>
            )}

            {/* ── ETAPA 1 — Conta ─────────────────────────────────────── */}
            {step === 1 && (
              <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      {...step1Form.register('name')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step1Form.formState.errors.name ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  {step1Form.formState.errors.name && (
                    <span className="text-red-500 text-xs mt-1">{step1Form.formState.errors.name.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="email"
                      {...step1Form.register('email')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step1Form.formState.errors.email ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {step1Form.formState.errors.email && (
                    <span className="text-red-500 text-xs mt-1">{step1Form.formState.errors.email.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...step1Form.register('password')}
                      className={`w-full pl-10 pr-10 py-2 rounded-lg bg-white border ${step1Form.formState.errors.password ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {step1Form.formState.errors.password && (
                    <span className="text-red-500 text-xs mt-1">{step1Form.formState.errors.password.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...step1Form.register('confirmPassword')}
                      className={`w-full pl-10 pr-10 py-2 rounded-lg bg-white border ${step1Form.formState.errors.confirmPassword ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {step1Form.formState.errors.confirmPassword && (
                    <span className="text-red-500 text-xs mt-1">{step1Form.formState.errors.confirmPassword.message}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  Próximo <ArrowRight size={18} />
                </button>
              </form>
            )}

            {/* ── ETAPA 2 — Célula ────────────────────────────────────── */}
            {step === 2 && (
              <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Célula</label>
                  <div className="relative">
                    <Church className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      {...step2Form.register('cellName')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step2Form.formState.errors.cellName ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Ex: Célula Bairro das Flores"
                    />
                  </div>
                  {step2Form.formState.errors.cellName && (
                    <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.cellName.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Líder</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      {...step2Form.register('leaderName')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step2Form.formState.errors.leaderName ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Nome do responsável pela célula"
                    />
                  </div>
                  {step2Form.formState.errors.leaderName && (
                    <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.leaderName.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="tel"
                      {...step2Form.register('whatsapp')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step2Form.formState.errors.whatsapp ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  {step2Form.formState.errors.whatsapp && (
                    <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.whatsapp.message}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                      <select
                        {...step2Form.register('dayOfWeek')}
                        className={`w-full pl-10 pr-3 py-2 rounded-lg bg-white border ${step2Form.formState.errors.dayOfWeek ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      >
                        <option value="">Selecione...</option>
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    {step2Form.formState.errors.dayOfWeek && (
                      <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.dayOfWeek.message}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                      <input
                        type="time"
                        {...step2Form.register('time')}
                        className={`w-full pl-10 pr-3 py-2 rounded-lg bg-white border ${step2Form.formState.errors.time ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      />
                    </div>
                    {step2Form.formState.errors.time && (
                      <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.time.message}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Público Alvo</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                    <select
                      {...step2Form.register('targetAudience')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step2Form.formState.errors.targetAudience ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                    >
                      {Object.values(TargetAudience).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  {step2Form.formState.errors.targetAudience && (
                    <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.targetAudience.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      {...step2Form.register('address')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${step2Form.formState.errors.address ? 'border-red-500' : 'border-slate-300'} text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Rua, número, bairro"
                    />
                  </div>
                  {step2Form.formState.errors.address && (
                    <span className="text-red-500 text-xs mt-1">{step2Form.formState.errors.address.message}</span>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
                  >
                    <ArrowLeft size={18} /> Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Criando conta...</>
                    ) : (
                      <>Finalizar Cadastro <CheckCircle size={18} /></>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Login link */}
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

export default LeaderRegister;
