import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../core/auth/AuthContext';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useIsSuspended } from '../../shared/hooks/useIsSuspended';
import { useInvites, useCreateInvite, useRevokeInvite } from '../../shared/hooks/useInvites';
import { buildInviteUrl, type Invite, type InviteStatus } from './inviteService';
import { createInviteSchema, type CreateInviteFormData } from './schemas/inviteSchema';
import {
    Link2, Plus, Copy, Check, Trash2, Users, Network, Clock,
    Loader2, Ticket, AlertCircle,
} from 'lucide-react';

const STATUS_STYLES: Record<InviteStatus, { label: string; className: string }> = {
    active: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
    revoked: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
    expired: { label: 'Expirado', className: 'bg-amber-100 text-amber-700' },
    exhausted: { label: 'Esgotado', className: 'bg-muted text-muted-foreground' },
};

const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : null;

const InviteManager: React.FC = () => {
    const { user } = useAuth();
    const isSuspended = useIsSuspended();
    const { data: generations = [] } = useGenerations(user?.organizationId);
    const { data: invites = [], isLoading } = useInvites();
    const createMutation = useCreateInvite();
    const revokeMutation = useRevokeInvite();

    const [showForm, setShowForm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateInviteFormData>({
        resolver: zodResolver(createInviteSchema),
        defaultValues: { expiresInDays: '30' },
    });

    const onSubmit = async (data: CreateInviteFormData) => {
        setError('');
        try {
            await createMutation.mutateAsync({
                label: data.label || undefined,
                generationId: data.generationId || undefined,
                maxUses: data.maxUses ? Number(data.maxUses) : undefined,
                expiresInDays: data.expiresInDays ? Number(data.expiresInDays) : undefined,
            });
            reset({ expiresInDays: '30', label: '', generationId: '', maxUses: '' });
            setShowForm(false);
        } catch (err: any) {
            setError(err.message || 'Erro ao gerar o convite.');
        }
    };

    const handleCopy = async (invite: Invite) => {
        const url = buildInviteUrl(invite.token);
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // clipboard bloqueado (http, permissão) — fallback manual
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopiedId(invite.id);
        setTimeout(() => setCopiedId((id) => (id === invite.id ? null : id)), 2000);
    };

    const handleRevoke = async (invite: Invite) => {
        if (!confirm(`Cancelar este convite? Quem ainda não usou o link não conseguirá se cadastrar.`)) return;
        try {
            await revokeMutation.mutateAsync(invite.id);
        } catch (err: any) {
            setError(err.message || 'Erro ao cancelar o convite.');
        }
    };

    const activeInvites = invites.filter((i) => i.status === 'active');
    const inactiveInvites = invites.filter((i) => i.status !== 'active');

    return (
        <div className="max-w-5xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Ticket className="text-blue-600" size={26} /> Convites de Líderes
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gere um link, mande no grupo, e cada líder cadastra a própria célula.
                        Você não precisa criar nem distribuir senhas.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={isSuspended}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <Plus size={18} /> Gerar Convite
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Formulário */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
                    <h2 className="text-sm font-bold text-foreground mb-4">Novo Convite</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Identificação <span className="text-muted-foreground font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('label')}
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: Líderes da Rede Judá"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Só para você identificar o link na lista.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Geração / Rede <span className="text-muted-foreground font-normal">(opcional)</span>
                                </label>
                                <select
                                    {...register('generationId')}
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Sem geração definida</option>
                                    {generations.map((gen) => (
                                        <option key={gen.id} value={gen.id}>{gen.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    As células criadas por este link já entram nesta rede.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Limite de usos <span className="text-muted-foreground font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    {...register('maxUses')}
                                    className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.maxUses ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-blue-500 outline-none`}
                                    placeholder="Deixe vazio para ilimitado"
                                />
                                {errors.maxUses && <span className="text-red-500 text-xs mt-1">{errors.maxUses.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Expira em (dias)</label>
                                <input
                                    type="number"
                                    min={1}
                                    {...register('expiresInDays')}
                                    className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.expiresInDays ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-blue-500 outline-none`}
                                    placeholder="Deixe vazio para não expirar"
                                />
                                {errors.expiresInDays && <span className="text-red-500 text-xs mt-1">{errors.expiresInDays.message}</span>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); reset(); }}
                                className="px-5 py-2 rounded-lg text-muted-foreground hover:bg-muted font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {createMutation.isPending
                                    ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                                    : <><Link2 size={16} /> Gerar Link</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="text-blue-600 animate-spin" size={28} />
                </div>
            ) : invites.length === 0 ? (
                <div className="bg-white rounded-xl border border-border p-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ticket size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Nenhum convite ainda</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                        Em vez de cadastrar cada célula na mão, gere um link e mande no grupo dos líderes.
                        Cada um preenche a própria célula e define a própria senha.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={isSuspended}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Plus size={18} /> Gerar meu primeiro convite
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {activeInvites.length > 0 && (
                        <div className="space-y-3">
                            {activeInvites.map((invite) => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    copied={copiedId === invite.id}
                                    onCopy={() => handleCopy(invite)}
                                    onRevoke={() => handleRevoke(invite)}
                                    disabled={isSuspended}
                                />
                            ))}
                        </div>
                    )}

                    {inactiveInvites.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                Inativos
                            </h2>
                            <div className="space-y-3">
                                {inactiveInvites.map((invite) => (
                                    <InviteCard
                                        key={invite.id}
                                        invite={invite}
                                        copied={false}
                                        disabled
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface InviteCardProps {
    invite: Invite;
    copied: boolean;
    disabled?: boolean;
    onCopy?: () => void;
    onRevoke?: () => void;
}

const InviteCard: React.FC<InviteCardProps> = ({ invite, copied, disabled, onCopy, onRevoke }) => {
    const status = STATUS_STYLES[invite.status];
    const isActive = invite.status === 'active';
    const expiresAt = formatDate(invite.expiresAt);

    return (
        <div className={`bg-white rounded-xl border p-5 transition-opacity ${isActive ? 'border-border' : 'border-border opacity-60'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                            {status.label}
                        </span>
                        {invite.label && (
                            <span className="font-bold text-foreground truncate">{invite.label}</span>
                        )}
                        {invite.generationName && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Network size={11} /> {invite.generationName}
                            </span>
                        )}
                    </div>

                    <code className="block text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 truncate font-mono">
                        {buildInviteUrl(invite.token)}
                    </code>

                    <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            <Users size={12} />
                            {invite.uses}{invite.maxUses != null ? ` de ${invite.maxUses}` : ''} cadastro{invite.uses === 1 ? '' : 's'}
                        </span>
                        {expiresAt && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {invite.status === 'expired' ? 'Expirou' : 'Expira'} em {expiresAt}
                            </span>
                        )}
                    </div>
                </div>

                {isActive && !disabled && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onCopy}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                copied
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-white border-input text-foreground hover:bg-muted/50'
                            }`}
                        >
                            {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
                        </button>
                        <button
                            onClick={onRevoke}
                            title="Cancelar convite"
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteManager;
