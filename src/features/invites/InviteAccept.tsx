import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    inviteAccountSchema,
    inviteCellSchema,
    type InviteAccountFormData,
    type InviteCellFormData,
} from './schemas/inviteSchema';
import { acceptInvite } from './inviteService';
import { useInvitePreview } from '../../shared/hooks/useInvites';
import { useAuth } from '../../core/auth/AuthContext';
import { TargetAudience } from '../../shared/types/types';
import { maskPhone } from '../../core/utils/mask';
import {
    Church, User as UserIcon, Lock, Mail, Phone,
    MapPin, Clock, Calendar, Users, CheckCircle,
    ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Network,
} from 'lucide-react';

const DAYS_OF_WEEK = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo',
];

const InviteAccept: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { authenticateWithToken } = useAuth();

    const [step, setStep] = useState<1 | 2 | 'success'>(1);
    const [accountData, setAccountData] = useState<InviteAccountFormData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [createdCellName, setCreatedCellName] = useState('');

    const { data: invite, isLoading, error } = useInvitePreview(token);

    const accountForm = useForm<InviteAccountFormData>({
        resolver: zodResolver(inviteAccountSchema),
    });

    const cellForm = useForm<InviteCellFormData>({
        resolver: zodResolver(inviteCellSchema),
        defaultValues: {
            targetAudience: TargetAudience.MIXED,
            dayOfWeek: '',
        },
    });

    const onAccountSubmit = (data: InviteAccountFormData) => {
        setAccountData(data);
        if (!cellForm.getValues('leaderName')) {
            cellForm.setValue('leaderName', data.name);
        }
        setStep(2);
    };

    const onCellSubmit = async (data: InviteCellFormData) => {
        if (!accountData || !token) return;
        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Uma chamada só: líder + célula + vínculo, transacional no servidor.
            // Já volta autenticado, sem passar pela tela de login.
            const result = await acceptInvite(token, {
                name: accountData.name,
                email: accountData.email,
                password: accountData.password,
                cellName: data.cellName,
                leaderName: data.leaderName,
                leaderPhone: data.whatsapp,
                dayOfWeek: data.dayOfWeek,
                time: data.time,
                address: data.address,
                targetAudience: data.targetAudience,
            });

            await authenticateWithToken(result.token, result.user);
            setCreatedCellName(result.cell.name);
            setStep('success');
        } catch (err: any) {
            setSubmitError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Carregando ───────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center">
                <Loader2 className="text-primary animate-spin" size={32} />
            </div>
        );
    }

    // ── Convite inválido / expirado / revogado / esgotado ─────────────────────
    if (error || !invite) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <Church className="text-muted-foreground mx-auto mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-foreground mb-2">Convite indisponível</h1>
                    <p className="text-muted-foreground mb-6">
                        {(error as Error)?.message || 'Este link de convite não é válido.'}
                    </p>
                    <Link to="/login" className="text-primary hover:underline font-medium">
                        Ir para o login
                    </Link>
                </div>
            </div>
        );
    }

    // ── Sucesso ──────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Tudo pronto! 🎉</h1>
                    <p className="text-muted-foreground mb-1">
                        Bem-vindo(a) ao <strong>Frutifica</strong>!
                    </p>
                    <p className="text-muted-foreground text-sm mb-8">
                        Sua conta e a célula <strong className="text-primary">{createdCellName}</strong> foram
                        criadas em <strong>{invite.organizationName}</strong>.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm"
                    >
                        Acessar o Sistema
                    </button>
                </div>
            </div>
        );
    }

    // ── Formulário ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Branding */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 mb-1">
                        <Church className="text-primary" size={26} />
                        <span className="text-xl font-bold text-foreground">Frutifica</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{invite.organizationName}</p>
                    {invite.generationName && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">
                            <Network size={12} /> {invite.generationName}
                        </span>
                    )}
                </div>

                <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                    {/* Cabeçalho do passo */}
                    <div className="bg-primary p-6 text-center">
                        <h1 className="text-xl font-bold text-white">
                            {step === 1 ? 'Criar Conta' : 'Dados da Célula'}
                        </h1>
                        <p className="text-primary-foreground/80 text-sm mt-1">
                            {step === 1
                                ? 'Passo 1 de 2 — Informações de acesso'
                                : 'Passo 2 de 2 — Informações da sua célula'}
                        </p>
                        <div className="mt-4 h-1.5 bg-primary/50 rounded-full">
                            <div
                                className="h-1.5 bg-card rounded-full transition-all duration-500"
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

                        {/* ── PASSO 1 — Conta ──────────────────────────────── */}
                        {step === 1 && (
                            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Seu Nome</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="text"
                                            {...accountForm.register('name')}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${accountForm.formState.errors.name ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Seu nome completo"
                                        />
                                    </div>
                                    {accountForm.formState.errors.name && (
                                        <span className="text-red-500 text-xs mt-1">{accountForm.formState.errors.name.message}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="email"
                                            {...accountForm.register('email')}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${accountForm.formState.errors.email ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                    {accountForm.formState.errors.email && (
                                        <span className="text-red-500 text-xs mt-1">{accountForm.formState.errors.email.message}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...accountForm.register('password')}
                                            className={`w-full pl-10 pr-10 py-2 rounded-lg bg-card border ${accountForm.formState.errors.password ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-muted-foreground"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {accountForm.formState.errors.password && (
                                        <span className="text-red-500 text-xs mt-1">{accountForm.formState.errors.password.message}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Confirmar Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            {...accountForm.register('confirmPassword')}
                                            className={`w-full pl-10 pr-10 py-2 rounded-lg bg-card border ${accountForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Repita a senha"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((v) => !v)}
                                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-muted-foreground"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {accountForm.formState.errors.confirmPassword && (
                                        <span className="text-red-500 text-xs mt-1">{accountForm.formState.errors.confirmPassword.message}</span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm mt-2"
                                >
                                    Continuar <ArrowRight size={18} />
                                </button>
                            </form>
                        )}

                        {/* ── PASSO 2 — Célula ─────────────────────────────── */}
                        {step === 2 && (
                            <form onSubmit={cellForm.handleSubmit(onCellSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Nome da Célula</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="text"
                                            {...cellForm.register('cellName')}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${cellForm.formState.errors.cellName ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Ex: Águias de Cristo"
                                        />
                                    </div>
                                    {cellForm.formState.errors.cellName && (
                                        <span className="text-red-500 text-xs mt-1">{cellForm.formState.errors.cellName.message}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Nome do Líder</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="text"
                                            {...cellForm.register('leaderName')}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${cellForm.formState.errors.leaderName ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Como aparece na liderança"
                                        />
                                    </div>
                                    {cellForm.formState.errors.leaderName && (
                                        <span className="text-red-500 text-xs mt-1">{cellForm.formState.errors.leaderName.message}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="tel"
                                            {...cellForm.register('whatsapp')}
                                            onChange={(e) => cellForm.setValue('whatsapp', maskPhone(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring outline-none"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Dia</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" size={18} />
                                            <select
                                                {...cellForm.register('dayOfWeek')}
                                                className={`w-full pl-10 pr-2 py-2 rounded-lg bg-card border ${cellForm.formState.errors.dayOfWeek ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            >
                                                <option value="">Selecione</option>
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <option key={day} value={day}>{day}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {cellForm.formState.errors.dayOfWeek && (
                                            <span className="text-red-500 text-xs mt-1">{cellForm.formState.errors.dayOfWeek.message}</span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <label className="block text-sm font-medium text-foreground mb-1">Horário</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" size={18} />
                                            <input
                                                type="time"
                                                {...cellForm.register('time')}
                                                className={`w-full pl-10 pr-2 py-2 rounded-lg bg-card border ${cellForm.formState.errors.time ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none min-w-0`}
                                            />
                                        </div>
                                        {cellForm.formState.errors.time && (
                                            <span className="text-red-500 text-xs mt-1">{cellForm.formState.errors.time.message}</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Público Alvo</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" size={18} />
                                        <select
                                            {...cellForm.register('targetAudience')}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring outline-none"
                                        >
                                            {Object.values(TargetAudience).map((audience) => (
                                                <option key={audience} value={audience}>{audience}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                        <input
                                            type="text"
                                            {...cellForm.register('address')}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg bg-card border ${cellForm.formState.errors.address ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                            placeholder="Rua, Número, Bairro"
                                        />
                                    </div>
                                    {cellForm.formState.errors.address && (
                                        <span className="text-red-500 text-xs mt-1">{cellForm.formState.errors.address.message}</span>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        disabled={isSubmitting}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted font-medium transition-colors disabled:opacity-50"
                                    >
                                        <ArrowLeft size={18} /> Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 size={18} className="animate-spin" /> Criando...</>
                                        ) : (
                                            <>Concluir Cadastro <CheckCircle size={18} /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                        Fazer login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default InviteAccept;
