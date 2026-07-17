import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { TargetAudience, Cell, CoLeader, UserRole, Generation } from '../../shared/types/types';
import { saveCell, getCellById, updateCell, saveCellWithLeader } from './cellService';
import { getGenerations } from '../generations/generationService';
import { Save, ArrowLeft, Users, Plus, Trash2, Mail, Phone, FileUp, Download, CheckCircle, AlertCircle, FileText, Upload, Lock, User as UserIcon, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { maskPhone } from '../../core/utils/mask';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useCell } from '../../shared/hooks/useCells';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cellSchema, type CellFormData } from './schemas/cellSchema';
import { apiFetch } from '../../core/api/client';

const CellRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { user, organization, isAdmin } = useAuth();
    const { cellId } = useParams<{ cellId?: string }>();
    const [testSendState, setTestSendState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });

    const handleTestSend = async () => {
        if (!cellId) return;
        setTestSendState({ status: 'loading' });
        try {
            const result = await apiFetch<{ ok: boolean; sentTo: string }>(`/api/whatsapp/leader/test-send/${cellId}`, {
                method: 'POST',
            });
            setTestSendState({ status: 'success', message: `Mensagem enviada para ${result.sentTo}` });
        } catch (err: any) {
            setTestSendState({ status: 'error', message: err.message || 'Erro ao enviar mensagem de teste' });
        }
    };
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    // Temp state for adding co-leader before pushing to array
    const [tempCoLeader, setTempCoLeader] = useState({ name: '', email: '', phone: '' });
    const [showCoLeaderForm, setShowCoLeaderForm] = useState(false);

    // CSV Import State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdCellName, setCreatedCellName] = useState('');

    // Erro de submissão (ex: email já em uso, limite de células do plano)
    const [submitError, setSubmitError] = useState('');

    // React Hook Form
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors, isSubmitting: isFormSubmitting }
    } = useForm<CellFormData>({
        resolver: zodResolver(cellSchema),
        defaultValues: {
            dayOfWeek: 'Quarta-feira',
            targetAudience: TargetAudience.MIXED,
            time: '20:00',
            coLeaders: []
        }
    });

    const { fields: coLeadersFields, append: appendCoLeader, remove: removeCoLeader } = useFieldArray({
        control,
        name: "coLeaders"
    });

    const { data: generations = [], isLoading: loadingGenerations } = useGenerations(user?.organizationId);
    const { data: cell, isLoading: loadingCell } = useCell(cellId);

    const loading = loadingGenerations || loadingCell || isFormSubmitting;

    // Tabs: 'form' or 'csv'
    const [activeTab, setActiveTab] = useState<'form' | 'csv'>('form');

    useEffect(() => {
        if (cellId && cell) {
            setIsEditing(true);
            reset({
                name: cell.name,
                leaderName: cell.leaderName,
                generationId: cell.generationId || '',
                whatsapp: cell.whatsapp,
                dayOfWeek: cell.dayOfWeek,
                targetAudience: cell.targetAudience,
                time: cell.time,
                address: cell.address,
                leaderEmail: '',
                leaderPassword: '',
                leaderBirthday: '',
                coLeaders: cell.coLeaders || []
            });
        } else if (cellId && !loadingCell && !cell) {
            navigate('/cells');
        }
    }, [cellId, cell, loadingCell, navigate, reset]);

    // Co-Leader handlers
    const handleTempCoLeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTempCoLeader(prev => ({ ...prev, [name]: value }));
    };

    const addCoLeaderToFieldArray = () => {
        if (!tempCoLeader.name) return;

        appendCoLeader({
            id: crypto.randomUUID(),
            name: tempCoLeader.name,
            email: tempCoLeader.email,
            phone: tempCoLeader.phone
        });

        setTempCoLeader({ name: '', email: '', phone: '' });
        setShowCoLeaderForm(false);
    };

    const onSubmit = async (data: CellFormData) => {
        if (!user?.organizationId) return;
        setSubmitError('');

        try {
            if (isEditing && cellId) {
                const cellData = {
                    ...data,
                    organizationId: user.organizationId,
                    active: cell?.active ?? true,
                    id: cellId
                };
                // Adapting to Any because cellService expects legacy types not fully matched by Zod schema
                await updateCell(cellData as any);
                queryClient.invalidateQueries({ queryKey: ['cells'] });
                navigate('/cells');
            } else {
                if (!data.leaderEmail || !data.leaderPassword) {
                    setSubmitError('Email e senha são obrigatórios para cadastrar um novo líder.');
                    return;
                }

                // Célula + líder numa transação só. Se qualquer parte falhar,
                // nada é criado — antes a célula ficava órfã quando o líder falhava.
                await saveCellWithLeader({
                    name: data.name,
                    leaderName: data.leaderName,
                    leaderPhone: data.whatsapp,
                    targetAudience: data.targetAudience,
                    dayOfWeek: data.dayOfWeek,
                    time: data.time,
                    address: data.address,
                    generationId: data.generationId || null,
                    leaderEmail: data.leaderEmail,
                    leaderPassword: data.leaderPassword,
                    leaderBirthday: data.leaderBirthday || undefined,
                });

                queryClient.invalidateQueries({ queryKey: ['cells'] });

                setCreatedCellName(data.name);
                setShowSuccessModal(true);
            }
        } catch (error: any) {
            console.error('Error saving cell and leader', error);
            setSubmitError(error.message || 'Erro ao salvar célula e líder. Verifique os dados e tente novamente.');
        }
    };

    const handleAddAnother = () => {
        reset({
            name: '',
            leaderName: '',
            generationId: '',
            whatsapp: '',
            dayOfWeek: 'Quarta-feira',
            targetAudience: TargetAudience.MIXED,
            time: '20:00',
            address: '',
            leaderEmail: '',
            leaderPassword: '',
            leaderBirthday: '',
            coLeaders: []
        });
        setShowSuccessModal(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- CSV LOGIC ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCsvFile(e.target.files[0]);
            setImportStatus('idle');
            setImportMessage('');
        }
    };

    const downloadTemplate = () => {
        const headers = "Nome da Célula,Líder,Whatsapp,Dia (Ex: Quarta-feira),Horário (Ex: 20:00),Endereço,Rede/Geração,Público (Misto/Homens/Mulheres/Jovens/Crianças)";
        const example = "Célula Ágape,João Silva,11999999999,Terça-feira,19:30,Rua das Flores 123,Judá,Misto";
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_importacao_celulas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processCSV = async () => {
        if (!csvFile || !user?.organizationId) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            try {
                const lines = text.split('\n');
                let successCount = 0;

                // Skip header (index 0)
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Simple CSV split
                    const cols = line.split(',');

                    if (cols.length < 2) continue; // Require at least name and leader

                    const [name, leaderName, whatsapp, day, time, address, generationName, audienceStr] = cols.map(c => c.trim());

                    // Match generation name to generationId
                    const matchedGen = generations.find(g => g.name.toLowerCase() === (generationName || '').toLowerCase());

                    // Map Audience
                    let targetAudience = TargetAudience.MIXED;
                    const audLower = audienceStr?.toLowerCase() || '';
                    if (audLower.includes('homem') || audLower.includes('homens')) targetAudience = TargetAudience.MEN;
                    else if (audLower.includes('mulher') || audLower.includes('mulheres')) targetAudience = TargetAudience.WOMEN;
                    else if (audLower.includes('jovem') || audLower.includes('jovens')) targetAudience = TargetAudience.YOUTH;
                    else if (audLower.includes('criança') || audLower.includes('kids')) targetAudience = TargetAudience.KIDS;
                    else if (audLower.includes('casal') || audLower.includes('casais')) targetAudience = TargetAudience.COUPLES;
                    else if (audLower.includes('familia')) targetAudience = TargetAudience.FAMILY;

                    const newCell: Cell = {
                        id: crypto.randomUUID(),
                        organizationId: user.organizationId!,
                        name: name || 'Célula Sem Nome',
                        leaderName: leaderName || 'Sem Líder',
                        whatsapp: whatsapp || '',
                        dayOfWeek: day || 'Quarta-feira',
                        time: time || '20:00',
                        address: address || '',
                        generationId: matchedGen?.id,
                        targetAudience: targetAudience,
                        coLeaders: [],
                        active: true
                    };

                    await saveCell(newCell);
                    successCount++;
                }

                queryClient.invalidateQueries({ queryKey: ['cells'] });
                setImportStatus('success');
                setImportMessage(`${successCount} células importadas com sucesso!`);
                setTimeout(() => navigate('/cells'), 2000);

            } catch (error) {
                setImportStatus('error');
                setImportMessage('Erro ao processar arquivo. Verifique o formato.');
            }
        };
        reader.readAsText(csvFile);
    };


    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/cells')}
                className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft size={18} className="mr-1" /> Voltar para lista
            </button>

            {/* Tabs (Only if not editing) */}
            {!isEditing && (
                <div className="flex gap-4 mb-6 border-b border-border">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`pb-3 px-2 text-sm font-medium transition-colors relative ${activeTab === 'form' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <span className="flex items-center gap-2"><FileText size={16} /> Cadastro Manual</span>
                        {activeTab === 'form' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('csv')}
                        className={`pb-3 px-2 text-sm font-medium transition-colors relative ${activeTab === 'csv' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <span className="flex items-center gap-2"><FileUp size={16} /> Importar CSV</span>
                        {activeTab === 'csv' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>
            )}

            {activeTab === 'form' ? (
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/50">
                        <h2 className="text-xl font-bold text-foreground">
                            {isEditing ? 'Editar Célula' : 'Cadastrar Nova Célula'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Gestão completa da célula e estrutura de liderança.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                        {submitError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        {/* Section: Basic Info */}
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Informações da Célula</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-foreground mb-1">Nome da Célula</label>
                                    <input
                                        type="text"
                                        {...register('name')}
                                        className={`w-full px-4 py-2 rounded-lg bg-card border ${errors.name ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all`}
                                        placeholder="Ex: Águias de Cristo"
                                    />
                                    {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Geração / Rede</label>
                                    <select
                                        {...register('generationId')}
                                        className="w-full px-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                                    >
                                        <option value="">Sem geração definida</option>
                                        {generations.map(gen => (
                                            <option key={gen.id} value={gen.id}>{gen.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Vincule esta célula a uma geração/rede ministerial. <a href="/#/generations" className="text-primary hover:underline">Gerenciar gerações</a>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Público Alvo</label>
                                    <select
                                        {...register('targetAudience')}
                                        className="w-full px-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                                    >
                                        {Object.values(TargetAudience).map(audience => (
                                            <option key={audience} value={audience}>{audience}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section: Leadership */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                                <Users size={16} className="text-primary" />
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Liderança</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Main Leader */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Líder Principal</label>
                                        <input
                                            type="text"
                                            {...register('leaderName')}
                                            className={`w-full px-4 py-2 rounded-lg bg-card border ${errors.leaderName ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all`}
                                            placeholder="Ex: Pr. João"
                                        />
                                        {errors.leaderName && <span className="text-red-500 text-xs mt-1">{errors.leaderName.message}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">WhatsApp do Líder</label>
                                        <input
                                            type="tel"
                                            {...register('whatsapp')}
                                            onChange={(e) => {
                                                const masked = maskPhone(e.target.value);
                                                setValue('whatsapp', masked);
                                            }}
                                            className="w-full px-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                                            placeholder="(11) 99999-9999"
                                        />
                                        {isEditing && isAdmin && (
                                            <div className="mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleTestSend}
                                                    disabled={testSendState.status === 'loading'}
                                                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                                                >
                                                    {testSendState.status === 'loading' ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <MessageCircle size={14} />
                                                    )}
                                                    Testar mensagem no WhatsApp
                                                </button>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Envia agora, pro número já salvo, a pergunta que o líder recebe toda semana. Salve a célula antes de testar se acabou de alterar o número.
                                                </p>
                                                {testSendState.status === 'success' && (
                                                    <p className="text-xs text-green-600 mt-1">✅ {testSendState.message}</p>
                                                )}
                                                {testSendState.status === 'error' && (
                                                    <p className="text-xs text-red-600 mt-1">❌ {testSendState.message}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Leader Account Section - Only for new cells */}
                                {!isEditing && (
                                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lock size={16} className="text-primary" />
                                            <h4 className="text-sm font-bold text-primary">Conta de Acesso do Líder</h4>
                                        </div>
                                        <p className="text-xs text-primary mb-4">
                                            Crie uma conta para que o líder possa acessar o sistema e gerenciar sua célula.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Email de Acesso *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                                                    <input
                                                        type="email"
                                                        {...register('leaderEmail')}
                                                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border ${errors.leaderEmail ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                                                        placeholder="lider@email.com"
                                                    />
                                                </div>
                                                {errors.leaderEmail && <span className="text-red-500 text-xs mt-1">{errors.leaderEmail.message}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Senha *</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                                                    <input
                                                        type="password"
                                                        {...register('leaderPassword')}
                                                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border ${errors.leaderPassword ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none`}
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                </div>
                                                {errors.leaderPassword && <span className="text-red-500 text-xs mt-1">{errors.leaderPassword.message}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">Data de Nascimento</label>
                                                <div className="relative">
                                                    <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                                                    <input
                                                        type="date"
                                                        {...register('leaderBirthday')}
                                                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Co-Leaders List */}
                                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold text-foreground">Co-Líderes e Acessos</h4>
                                        {!showCoLeaderForm && (
                                            <button
                                                type="button"
                                                onClick={() => setShowCoLeaderForm(true)}
                                                className="text-xs flex items-center gap-1 bg-card border border-input text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted"
                                            >
                                                <Plus size={14} /> Adicionar Co-Líder
                                            </button>
                                        )}
                                    </div>

                                    {coLeadersFields.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {coLeadersFields.map((leader, index) => (
                                                <div key={leader.id} className="bg-card p-3 rounded-lg border border-border shadow-sm flex justify-between items-start group">
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-foreground text-sm truncate">{leader.name}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                            <Mail size={12} /> <span className="truncate">{leader.email || '-'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                            <Phone size={12} /> <span>{leader.phone || '-'}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCoLeader(index)}
                                                        className="text-muted-foreground hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !showCoLeaderForm && <p className="text-sm text-muted-foreground italic mb-4">Nenhum co-líder cadastrado.</p>
                                    )}

                                    {/* Add Co-Leader Sub-Form */}
                                    {showCoLeaderForm && (
                                        <div className="bg-card p-4 rounded-lg border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                                            <h5 className="text-sm font-semibold text-primary mb-3">Novo Co-Líder</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={tempCoLeader.name}
                                                        onChange={handleTempCoLeaderChange}
                                                        placeholder="Nome Completo"
                                                        className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={tempCoLeader.email}
                                                        onChange={handleTempCoLeaderChange}
                                                        placeholder="Email (para acesso)"
                                                        className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={tempCoLeader.phone}
                                                        onChange={(e) => setTempCoLeader(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                                                        placeholder="Telefone"
                                                        className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-input focus:border-ring outline-none text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCoLeaderForm(false)}
                                                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addCoLeaderToFieldArray}
                                                    className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90"
                                                >
                                                    Adicionar à Lista
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section: Time & Location */}
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Logística</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Dia da Célula</label>
                                    <select
                                        {...register('dayOfWeek')}
                                        className="w-full px-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                                    >
                                        <option value="Segunda-feira">Segunda-feira</option>
                                        <option value="Terça-feira">Terça-feira</option>
                                        <option value="Quarta-feira">Quarta-feira</option>
                                        <option value="Quinta-feira">Quinta-feira</option>
                                        <option value="Sexta-feira">Sexta-feira</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                    </select>
                                </div>

                                <div className="min-w-0 w-full">
                                    <label className="block text-sm font-medium text-foreground mb-1">Horário</label>
                                    <input
                                        type="time"
                                        {...register('time')}
                                        className="w-full px-4 py-2 rounded-lg bg-card border border-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all min-w-0"
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        {...register('address')}
                                        className={`w-full px-4 py-2 rounded-lg bg-card border ${errors.address ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all`}
                                        placeholder="Rua, Número, Bairro"
                                    />
                                    {errors.address && <span className="text-red-500 text-xs mt-1">{errors.address.message}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/cells')}
                                disabled={loading}
                                className="px-6 py-2 rounded-lg text-muted-foreground hover:bg-muted font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                {loading ? 'Salvando...' : (isEditing ? 'Atualizar Dados' : 'Salvar Célula e Líder')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // CSV IMPORT TAB (copied from previous logic)
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden p-6 md:p-10">
                    <div className="text-center max-w-lg mx-auto">
                        <div className="w-16 h-16 bg-primary/15 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileUp size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Importar Células via CSV</h2>
                        <p className="text-muted-foreground mb-8">
                            Carregue um arquivo .csv com a lista de suas células para cadastrá-las em massa.
                        </p>

                        <div className="bg-muted/50 border-2 border-dashed border-input rounded-xl p-8 hover:bg-muted transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
                            {csvFile ? (
                                <div className="flex flex-col items-center text-green-600">
                                    <CheckCircle size={40} className="mb-2" />
                                    <p className="font-bold text-lg">{csvFile.name}</p>
                                    <p className="text-sm">{(csvFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground">
                                    <Upload size={40} className="mb-2" />
                                    <p className="font-medium text-muted-foreground">Clique para selecionar o arquivo</p>
                                    <p className="text-xs mt-1">Formatos aceitos: .csv</p>
                                </div>
                            )}
                        </div>

                        {importStatus === 'success' && (
                            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center justify-center gap-2 border border-green-200">
                                <CheckCircle size={20} />
                                {importMessage}
                            </div>
                        )}
                        {importStatus === 'error' && (
                            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center justify-center gap-2 border border-red-200">
                                <AlertCircle size={20} />
                                {importMessage}
                            </div>
                        )}

                        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-input text-foreground font-medium rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <Download size={18} /> Baixar Modelo
                            </button>
                            <button
                                onClick={processCSV}
                                disabled={!csvFile}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Processar Importação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-card rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center">
                            {/* Success Icon */}
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500 delay-150">
                                <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                🎉 Parabéns!
                            </h2>

                            {/* Message */}
                            <p className="text-muted-foreground mb-1">
                                A célula <strong className="text-primary">{createdCellName}</strong> foi criada com sucesso!
                            </p>
                            <p className="text-sm text-muted-foreground mb-8">
                                O líder já pode acessar o sistema com as credenciais fornecidas.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate('/cells')}
                                    className="flex-1 px-6 py-3 bg-muted text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
                                >
                                    ← Voltar para Lista
                                </button>
                                <button
                                    onClick={handleAddAnother}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-lg hover:from-primary hover:to-primary/70 transition-all shadow-lg shadow-primary/30"
                                >
                                    + Adicionar Outra
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CellRegistration;