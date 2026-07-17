import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { saveVisitante, updateVisitante } from './visitanteService';
import { Cell, Member, Visitante, StatusKanban } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useMembersByCell } from '../../shared/hooks/useMembers';
import { useVisitantes } from '../../shared/hooks/useVisitantes';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, User, MapPin, Phone, CakeSlice, Save, X, RefreshCw, Heart, UserPlus } from 'lucide-react';
import { maskPhone } from '../../core/utils/mask';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { visitorSchema, type VisitorFormData } from './schemas/visitorSchema';

const VisitorForm: React.FC = () => {
    const { visitorId } = useParams<{ visitorId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Data Hooks
    const { data: allCells = [], isLoading: loadingCells } = useCells(user?.organizationId);
    const { data: allVisitors = [], isLoading: loadingVisitors } = useVisitantes(user?.organizationId);

    const [isEditing, setIsEditing] = useState(false);

    // Form State (UI only)
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
    const [cellSearchTerm, setCellSearchTerm] = useState('');
    const [personSearchTerm, setPersonSearchTerm] = useState('');

    // React Hook Form
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<VisitorFormData>({
        resolver: zodResolver(visitorSchema),
        defaultValues: {
            nome: '',
            telefone: '',
            endereco: '',
            birthday: '',
            tipoOrigem: 'visitante',
            attendsCell: false,
            selectedCellId: undefined
        }
    });

    const attendsCell = watch('attendsCell');
    const tipoOrigem = watch('tipoOrigem');

    // Helper function to remove accents and special characters for search
    const normalizeText = (text: string) => {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    // Load visitor data if editing
    useEffect(() => {
        if (visitorId && allVisitors.length > 0) {
            const found = allVisitors.find(v => v.id === visitorId);
            if (found) {
                setIsEditing(true);
                reset({
                    nome: found.nome,
                    telefone: found.telefone,
                    endereco: found.endereco || '',
                    birthday: found.birthday || '',
                    tipoOrigem: found.tipoOrigem as any,
                    attendsCell: !!found.celulaOrigemId,
                    selectedCellId: found.celulaOrigemId
                });

                if (found.celulaOrigemId) {
                    const c = allCells.find(cell => cell.id === found.celulaOrigemId);
                    if (c) setSelectedCell(c);
                }
            } else {
                // Not found, maybe navigate back
                navigate('/visitors');
            }
        }
    }, [visitorId, allVisitors, allCells, reset, navigate]);

    // Hook for members of the selected cell
    const { data: cellMembers = [], isLoading: loadingMembers } = useMembersByCell(selectedCell?.id);

    // Suggested Members filtered by search term
    const suggestedMembers = useMemo(() => {
        if (selectedCell && personSearchTerm.length > 1) {
            const normalizedSearch = normalizeText(personSearchTerm);
            return cellMembers.filter(m =>
                normalizeText(m.name).includes(normalizedSearch)
            );
        }
        return [];
    }, [cellMembers, personSearchTerm, selectedCell]);

    const cells = useMemo(() => allCells.filter(c => c.active !== false), [allCells]);

    const filteredCells = useMemo(() => {
        if (cellSearchTerm.length > 0) {
            const term = normalizeText(cellSearchTerm);
            return cells.filter(c =>
                normalizeText(c.name).includes(term) ||
                normalizeText(c.leaderName).includes(term)
            );
        }
        return [];
    }, [cells, cellSearchTerm]);

    const handleSelectCell = (cell: Cell) => {
        setSelectedCell(cell);
        setValue('selectedCellId', cell.id);
        setCellSearchTerm('');
    };

    const handleSelectPerson = (member: Member) => {
        setValue('nome', member.name);
        setValue('telefone', member.phone);
        setValue('birthday', member.birthday || '');
        setPersonSearchTerm('');
    };

    const toggleAttendsCell = () => {
        const newState = !attendsCell;
        setValue('attendsCell', newState);
        if (!newState) {
            setSelectedCell(null);
            setValue('selectedCellId', undefined);
        }
    };

    const onSubmit = async (data: VisitorFormData) => {
        if (!user) return;

        const commonData = {
            nome: data.nome,
            telefone: data.telefone,
            endereco: data.endereco,
            birthday: data.birthday,
            jaParticipaCelula: data.attendsCell,
            celulaDestinoId: data.attendsCell ? data.selectedCellId : undefined,
            celulaOrigemId: data.attendsCell ? data.selectedCellId : undefined,
            tipoOrigem: data.tipoOrigem
        };

        try {
            if (isEditing && visitorId) {
                const existing = allVisitors.find(v => v.id === visitorId);
                if (existing) {
                    await updateVisitante({
                        ...existing,
                        ...commonData
                    });
                }
            } else {
                const newVisitor: Visitante = {
                    id: crypto.randomUUID(),
                    organizationId: user.organizationId,
                    ...commonData as any,
                    statusKanban: StatusKanban.NOVO,
                    responsavelId: user.id,
                    dataPrimeiraVisita: new Date().toISOString().split('T')[0],
                    primeiraVez: true,
                    presencasNaCelula: 0,
                    tags: [],
                    criadoEm: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString()
                };
                await saveVisitante(newVisitor);
            }
            queryClient.invalidateQueries({ queryKey: ['visitantes'] });
            navigate('/visitors');
        } catch (error) {
            console.error("Error saving visitor", error);
            alert("Erro ao salvar visitante.");
        }
    };

    const isLoading = loadingCells || loadingVisitors || (isEditing && loadingVisitors);

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground font-medium animate-pulse">Carregando ficha...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft size={18} className="mr-1" /> Voltar
                </button>
                <h1 className="text-2xl font-bold text-foreground">{isEditing ? 'Editar Ficha' : 'Nova Ficha de Visitante'}</h1>
                <p className="text-muted-foreground">Preencha os dados abaixo para o acompanhamento.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* SECTION 1: CELL ATTENDANCE */}
                <div className="bg-white rounded-xl shadow-sm border border-border">
                    <div className="p-6 border-b border-border bg-muted/50 rounded-t-xl">
                        <div className="flex items-center justify-between cursor-pointer" onClick={toggleAttendsCell}>
                            <label className="text-lg font-semibold text-foreground cursor-pointer">Frequenta alguma célula?</label>

                            <div className="relative inline-block w-14 align-middle select-none transition duration-200 ease-in pointer-events-none">
                                <input
                                    type="checkbox"
                                    checked={attendsCell}
                                    readOnly
                                    className="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-4 appearance-none"
                                    style={{
                                        right: attendsCell ? '0' : '50%',
                                        borderColor: attendsCell ? '#2563EB' : '#cbd5e1'
                                    }}
                                />
                                <label className={`toggle-label block overflow-hidden h-7 rounded-full ${attendsCell ? 'bg-primary' : 'bg-input'}`}></label>
                            </div>
                        </div>
                    </div>

                    {attendsCell && (
                        <div className="p-6 animate-in fade-in slide-in-from-top-2">
                            {!selectedCell ? (
                                <div className="relative">
                                    <label className="block text-sm font-medium text-foreground mb-2">Pesquisar Célula ou Líder</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
                                        <input
                                            type="text"
                                            value={cellSearchTerm}
                                            onChange={(e) => setCellSearchTerm(e.target.value)}
                                            placeholder="Digite o nome da célula ou líder..."
                                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-ring outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    {errors.selectedCellId && <span className="text-red-500 text-xs mt-1">{errors.selectedCellId.message}</span>}

                                    {filteredCells.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {filteredCells.map(cell => (
                                                <div
                                                    key={cell.id}
                                                    onClick={() => handleSelectCell(cell)}
                                                    className="p-3 hover:bg-primary/10 cursor-pointer border-b last:border-0 border-border"
                                                >
                                                    <p className="font-bold text-foreground">{cell.name}</p>
                                                    <p className="text-xs text-muted-foreground">Líder: {cell.leaderName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-primary uppercase mb-1">Célula Selecionada</p>
                                            <p className="font-bold text-foreground">{selectedCell.name}</p>
                                            <p className="text-sm text-muted-foreground">{selectedCell.leaderName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedCell(null); setValue('selectedCellId', undefined); }}
                                            className="text-muted-foreground hover:text-red-500"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-foreground mb-1">Conferir dados (Opcional)</label>
                                        <input
                                            type="text"
                                            value={personSearchTerm}
                                            onChange={(e) => setPersonSearchTerm(e.target.value)}
                                            placeholder="Pesquisar nome de quem já participa..."
                                            className="w-full px-4 py-2 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-ring outline-none"
                                        />
                                        {suggestedMembers.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-xl">
                                                {suggestedMembers.map(m => (
                                                    <div
                                                        key={m.id}
                                                        onClick={() => handleSelectPerson(m)}
                                                        className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 border-border"
                                                    >
                                                        <p className="font-medium text-foreground">{m.name}</p>
                                                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">Se a pessoa já for da célula, selecione para preencher os dados.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SECTION 2: PERSONAL DATA */}
                <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">Dados do Visitante</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    {...register('nome')}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.nome ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                    placeholder="Nome do visitante"
                                />
                                {errors.nome && <span className="text-red-500 text-xs mt-1">{errors.nome.message}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-foreground mb-1">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                    <input
                                        type="tel"
                                        {...register('telefone')}
                                        onChange={(e) => setValue('telefone', maskPhone(e.target.value))}
                                        className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.telefone ? 'border-red-500' : 'border-input'} text-foreground focus:ring-2 focus:ring-ring outline-none`}
                                        placeholder="(99) 99999-9999"
                                    />
                                    {errors.telefone && <span className="text-red-500 text-xs mt-1">{errors.telefone.message}</span>}
                                </div>
                            </div>

                            <div className="w-full min-w-0">
                                <label className="block text-sm font-medium text-foreground mb-1">Data de Nascimento</label>
                                <div className="relative">
                                    <CakeSlice className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                    <input
                                        type="date"
                                        {...register('birthday')}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-ring outline-none min-w-0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    {...register('endereco')}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-input text-foreground focus:ring-2 focus:ring-ring outline-none"
                                    placeholder="Rua, Número, Bairro"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: CLASSIFICATION */}
                <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Classificação</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className={`
                    cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${tipoOrigem === 'visitante' ? 'border-primary bg-primary/10' : 'border-border hover:border-border'}
                `}>
                            <input
                                type="radio"
                                {...register('tipoOrigem')}
                                value="visitante"
                                className="hidden"
                            />
                            <UserPlus size={24} className={tipoOrigem === 'visitante' ? 'text-primary' : 'text-muted-foreground'} />
                            <span className={`font-bold ${tipoOrigem === 'visitante' ? 'text-primary' : 'text-muted-foreground'}`}>Visitante</span>
                        </label>

                        <label className={`
                    cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${tipoOrigem === 'convertido' ? 'border-red-500 bg-red-50' : 'border-border hover:border-border'}
                `}>
                            <input
                                type="radio"
                                {...register('tipoOrigem')}
                                value="convertido"
                                className="hidden"
                            />
                            <Heart size={24} className={tipoOrigem === 'convertido' ? 'text-red-600' : 'text-muted-foreground'} />
                            <span className={`font-bold ${tipoOrigem === 'convertido' ? 'text-red-700' : 'text-muted-foreground'}`}>Novo Convertido</span>
                        </label>

                        <label className={`
                    cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${tipoOrigem === 'reconciliacao' ? 'border-orange-500 bg-orange-50' : 'border-border hover:border-border'}
                `}>
                            <input
                                type="radio"
                                {...register('tipoOrigem')}
                                value="reconciliacao"
                                className="hidden"
                            />
                            <RefreshCw size={24} className={tipoOrigem === 'reconciliacao' ? 'text-orange-600' : 'text-muted-foreground'} />
                            <span className={`font-bold ${tipoOrigem === 'reconciliacao' ? 'text-orange-700' : 'text-muted-foreground'}`}>Reconciliação</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary/90 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        <Save size={20} />
                        {isEditing ? 'Atualizar Ficha' : 'Salvar Visitante'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default VisitorForm;