import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { Church, Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await resetPassword(email);
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || 'Ocorreu um erro ao tentar enviar o email.');
            }
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Link to="/login" className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-6 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Voltar para o login
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white mb-4">
                            <Church size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Recuperar Senha</h1>
                        <p className="text-blue-100 mt-2">Enviaremos um link de recuperação para o seu email</p>
                    </div>

                    <div className="p-8">
                        {success ? (
                            <div className="text-center py-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800 mb-2">Email enviado!</h2>
                                <p className="text-slate-600 mb-6">
                                    Verifique sua caixa de entrada (e a pasta de spam) para as instruções de recuperação.
                                </p>
                                <Link
                                    to="/login"
                                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
                                >
                                    Voltar para o Login
                                </Link>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="seu@email.com"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Enviando...' : (
                                            <>
                                                <Send size={18} />
                                                Enviar link de recuperação
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
