import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLANS, checkout } from './stripeService';
import { useAuth } from '../../core/auth/AuthContext';
import { CheckCircle, ShieldCheck, Zap, ArrowLeft, Loader2 } from 'lucide-react';

const Pricing: React.FC = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'free' | 'pro' | 'enterprise') => {
    if (!user || !user.organizationId) return;

    setLoading(planType);
    try {
      const result = await checkout(planType, user.organizationId);
      if (result.success) {
        window.location.href = result.url;
      }
    } catch (error) {
      alert("Erro ao processar pagamento simulado.");
      setLoading(null);
    }
  };

  const currentPlan = organization?.plan || 'free';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" /> Voltar para Dashboard
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Planos para igrejas de todos os tamanhos
          </h2>
          <p className="mt-4 text-xl text-slate-600">
            Escolha o plano ideal para acompanhar o crescimento do seu ministério.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
          {/* FREE PLAN */}
          <div className="relative p-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900">{PLANS.FREE.name}</h3>
              <p className="mt-4 flex items-baseline text-slate-900">
                <span className="text-5xl font-extrabold tracking-tight">R$0</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">/mês</span>
              </p>
              <p className="mt-6 text-slate-500">Ideal para começar a organizar suas primeiras células.</p>

              <ul className="mt-6 space-y-4">
                {PLANS.FREE.features.map((feature) => (
                  <li key={feature} className="flex">
                    <CheckCircle className="flex-shrink-0 w-6 h-6 text-green-500" />
                    <span className="ml-3 text-slate-500">{feature}</span>
                  </li>
                ))}
                <li className="flex opacity-50">
                  <XCircleIcon /> <span className="ml-3 text-slate-400 decoration-slate-400 line-through">IA Insights</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('free')}
              disabled={currentPlan === 'free'}
              className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-xl text-center font-bold text-lg transition-colors
                ${currentPlan === 'free'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-slate-800 text-white hover:bg-slate-900'}
              `}
            >
              {currentPlan === 'free' ? 'Plano Atual' : 'Mudar para Grátis'}
            </button>
          </div>

          {/* PRO PLAN */}
          <div className="relative p-8 bg-white border-2 border-blue-600 rounded-2xl shadow-xl flex flex-col transform scale-105 z-10">
            <div className="absolute top-0 right-0 -mt-5 mr-5">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                Mais Popular
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900">{PLANS.PRO.name}</h3>
              <p className="mt-4 flex items-baseline text-slate-900">
                <span className="text-5xl font-extrabold tracking-tight">R$49</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">,90/mês</span>
              </p>
              <p className="mt-6 text-slate-500">Para igrejas em crescimento que precisam de dados inteligentes.</p>

              <ul className="mt-6 space-y-4">
                {PLANS.PRO.features.map((feature) => (
                  <li key={feature} className="flex">
                    <CheckCircle className="flex-shrink-0 w-6 h-6 text-blue-600" />
                    <span className="ml-3 text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('pro')}
              disabled={currentPlan === 'pro' || loading === 'pro'}
              className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-xl text-center font-bold text-lg transition-all shadow-lg hover:shadow-xl
                ${currentPlan === 'pro'
                  ? 'bg-blue-50 text-blue-600 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
              `}
            >
              {loading === 'pro' ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Processando...</span>
              ) : currentPlan === 'pro' ? (
                'Plano Atual'
              ) : (
                'Assinar Agora'
              )}
            </button>
          </div>

          {/* ENTERPRISE PLAN */}
          <div className="relative p-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900">{PLANS.ENTERPRISE.name}</h3>
              <p className="mt-4 flex items-baseline text-slate-900">
                <span className="text-5xl font-extrabold tracking-tight">R$99</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">,90/mês</span>
              </p>
              <p className="mt-6 text-slate-500">Gestão completa para grandes ministérios e múltiplas redes.</p>

              <ul className="mt-6 space-y-4">
                {PLANS.ENTERPRISE.features.map((feature) => (
                  <li key={feature} className="flex">
                    <CheckCircle className="flex-shrink-0 w-6 h-6 text-green-500" />
                    <span className="ml-3 text-slate-500">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('enterprise')}
              disabled={currentPlan === 'enterprise' || loading === 'enterprise'}
              className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-xl text-center font-bold text-lg transition-colors
                ${currentPlan === 'enterprise'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-purple-600 text-white hover:bg-purple-700'}
              `}
            >
              {loading === 'enterprise' ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Processando...</span>
              ) : currentPlan === 'enterprise' ? (
                'Plano Atual'
              ) : (
                'Falar com Consultor'
              )}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-500 text-sm">
          <p className="flex items-center justify-center gap-2">
            <ShieldCheck size={16} /> Pagamento seguro processado via Stripe. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const XCircleIcon = () => (
  <svg className="flex-shrink-0 w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default Pricing;