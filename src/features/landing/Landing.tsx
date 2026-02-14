import React from 'react';
import { Link } from 'react-router-dom';
import { Church, Sparkles, BarChart3, Users, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <header className="fixed w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Church size={24} />
            </div>
            <span className="text-xl font-bold text-slate-800">Frutifica</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 -z-10 opacity-10 transform translate-x-1/3 -translate-y-1/4">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-[800px] h-[800px] text-blue-600 fill-current">
            <path d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.2,22.9,71.2,35.2C60.2,47.5,49.5,58.5,37.1,66.1C24.7,73.7,10.6,77.9,-2.4,82.1C-15.4,86.3,-27.3,90.4,-38.6,85.2C-49.9,80,-60.6,65.4,-69.5,50.6C-78.4,35.8,-85.5,20.8,-85.1,6.1C-84.7,-8.6,-76.8,-23,-66.8,-35.1C-56.8,-47.2,-44.7,-57,-32.1,-65.1C-19.5,-73.2,-6.4,-79.6,5.3,-88.7L17,-97.8L44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-6 animate-fade-in-up">
            <Sparkles size={14} />
            <span>Potencializado por Inteligência Artificial</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
            Gestão de Células <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simples e Inteligente</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Elimine planilhas complicadas. Acompanhe o crescimento da sua igreja, gerencie líderes e receba insights estratégicos com o Frutifica.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-lg transition-colors"
            >
              Acessar Sistema
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 grayscale opacity-70">
            <div className="flex items-center gap-2"><CheckCircle size={16} /> Relatórios Semanais</div>
            <div className="flex items-center gap-2"><CheckCircle size={16} /> Ranking de Células</div>
            <div className="flex items-center gap-2"><CheckCircle size={16} /> Gestão de Membros</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Tudo o que sua liderança precisa</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              Ferramentas desenvolvidas pensadas na rotina de pastores e líderes de célula.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Relatórios em Segundos</h3>
              <p className="text-slate-600 leading-relaxed">
                Líderes enviam relatórios semanais direto pelo celular. O sistema compila tudo em gráficos fáceis de entender.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-50 to-transparent w-24 h-24 rounded-bl-full -mr-4 -mt-4"></div>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 relative z-10">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Insights com IA</h3>
              <p className="text-slate-600 leading-relaxed">
                Nossa inteligência artificial analisa os dados da sua igreja e sugere ações para melhorar a retenção e o crescimento.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Engajamento Total</h3>
              <p className="text-slate-600 leading-relaxed">
                Ranking de células e acompanhamento de visitantes para motivar sua liderança a alcançar mais vidas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Church size={24} className="text-slate-200" />
            <span className="text-xl font-bold text-slate-200">Frutifica</span>
          </div>
          <div className="text-sm">
            &copy; {new Date().getFullYear()} Frutifica. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;