import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const { reloadOrganization } = useAuth();

  useEffect(() => {
    // Force reload organization data in context to reflect new plan immediately
    reloadOrganization();
  }, [reloadOrganization]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Assinatura Confirmada!</h1>
        <p className="text-slate-600 mb-8">
          Parabéns! Sua igreja agora está no plano <span className="font-bold text-blue-600 uppercase">{plan || 'PRO'}</span>.
          Todos os recursos já foram desbloqueados.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          Ir para o Dashboard <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;