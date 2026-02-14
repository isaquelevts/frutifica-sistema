import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/supabase/supabaseClient';
import { Church, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState<boolean | null>(null); // null = checking
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            setHasSession(!!data.session);
            if (!data.session) {
                console.error('No active session found for password reset');
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            setError('Ocorreu um erro ao atualizar a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white mb-4">
                            <Church size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
                        <p className="text-blue-100 mt-2">Crie uma nova senha para sua conta</p>
                    </div>

                    <div className="p-8">
                        {hasSession === null ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-600">Verificando autorização...</p>
                            </div>
                        ) : hasSession === false ? (
                            <div className="text-center py-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                                    <AlertCircle size={24} />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800 mb-2">Link Inválido</h2>
                                <p className="text-slate-600 mb-6">
                                    Este link de recuperação expirou ou é inválido. Por favor, solicite um novo link.
                                </p>
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
                                >
                                    Solicitar novo link
                                </button>
                            </div>
                        ) : success ? (
                            <div className="text-center py-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800 mb-2">Senha alterada!</h2>
                                <p className="text-slate-600 mb-6">
                                    Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes.
                                </p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 mt-2"
                                    >
                                        {loading ? 'Atualizando...' : 'Atualizar Senha'}
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

export default ResetPassword;
