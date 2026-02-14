import React, { useState, useMemo } from 'react';
import { updateVisitante } from './visitanteService';
import { Visitante, StatusKanban, Cell, TargetAudience, User } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { useVisitantes } from '../../shared/hooks/useVisitantes';
import { useCells } from '../../shared/hooks/useCells';
import { useUsers } from '../../shared/hooks/useUsers';
import { useQueryClient } from '@tanstack/react-query';
import {
    Phone, CheckCircle, Clock, User as UserIcon, X, Plus, Tag,
    MapPin, Star, Calendar, Trash2, Save, Search, Filter,
    MessageCircle, ArrowRight, Check
} from 'lucide-react';

const ConsolidationKanban: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: visitantes = [], isLoading: loadingVisitors } = useVisitantes(user?.organizationId);
    const { data: allCells = [], isLoading: loadingCells } = useCells(user?.organizationId);
    const { data: users = [], isLoading: loadingUsers } = useUsers(user?.organizationId);

    const cells = allCells.filter(c => c.active !== false);
    const isLoading = loadingVisitors || loadingCells || loadingUsers;

    // Drag & Drop
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [activeColumn, setActiveColumn] = useState<StatusKanban | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [onlyMyVisitors, setOnlyMyVisitors] = useState(false);

    // Modal State
    const [selectedVisitor, setSelectedVisitor] = useState<Visitante | null>(null);
    const [newTag, setNewTag] = useState('');

    // Next Action State (Modal)
    const [actionText, setActionText] = useState('');
    const [actionDate, setActionDate] = useState('');

    // --- Logic Helpers ---

    const calculateDaysSince = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getUrgencyColor = (visitor: Visitante) => {
        if (visitor.statusKanban === StatusKanban.INTEGRADO) return 'border-l-green-500';

        // Check if next action is overdue
        if (visitor.proximaAcaoData) {
            const actionDate = new Date(visitor.proximaAcaoData);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (actionDate < today) return 'border-l-red-500'; // Overdue
            if (actionDate.getTime() === today.getTime()) return 'border-l-orange-500'; // Today
        }

        const days = calculateDaysSince(visitor.criadoEm);
        if (days > 14 && visitor.statusKanban === StatusKanban.NOVO) return 'border-l-red-400';
        if (days > 7 && visitor.statusKanban === StatusKanban.NOVO) return 'border-l-yellow-400';

        return 'border-l-blue-500';
    };

    const formatPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

    const getResponsibleName = (id: string) => {
        const u = users.find(u => u.id === id);
        return u ? u.name.split(' ')[0] : 'Admin';
    };

    // --- Filtering Logic ---

    const filteredVisitantes = useMemo(() => {
        return visitantes.filter(v => {
            const matchesSearch = v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.telefone.includes(searchTerm);

            const matchesOwner = onlyMyVisitors ? v.responsavelId === user?.id : true;

            return matchesSearch && matchesOwner;
        });
    }, [visitantes, searchTerm, onlyMyVisitors, user]);


    // --- Drag & Drop Logic ---

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id); // Firefox compat
    };

    const handleDragOver = (e: React.DragEvent, status: StatusKanban) => {
        e.preventDefault();
        if (activeColumn !== status) setActiveColumn(status);
    };

    const handleDragLeave = () => {
        setActiveColumn(null);
    };

    const handleDrop = (e: React.DragEvent, targetStatus: StatusKanban) => {
        e.preventDefault();
        setActiveColumn(null);
        if (!draggedItem) return;

        const visitor = visitantes.find(v => v.id === draggedItem);
        if (visitor && visitor.statusKanban !== targetStatus) {
            // Logic: If moving to Integrated, maybe set dataIntegracao?
            const updates: Partial<Visitante> = { statusKanban: targetStatus };
            if (targetStatus === StatusKanban.INTEGRADO && !visitor.dataIntegracao) {
                updates.dataIntegracao = new Date().toISOString();
            }

            const updated = { ...visitor, ...updates };
            updateVisitanteAndState(updated);
        }
        setDraggedItem(null);
    };

    const updateVisitanteAndState = async (updated: Visitante) => {
        await updateVisitante(updated);
        queryClient.invalidateQueries({ queryKey: ['visitantes'] });
        if (selectedVisitor?.id === updated.id) {
            setSelectedVisitor(updated);
        }
    };


    // --- Smart Suggestion & Details Logic (Same as before) ---
    const calculateAge = (birthdayString?: string) => {
        if (!birthdayString) return null;
        const today = new Date();
        const birthDate = new Date(birthdayString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getRecommendedCells = (visitor: Visitante) => {
        const visitorAge = calculateAge(visitor.birthday);

        return cells.map(cell => {
            let score = 0;
            let reasons: string[] = [];
            if (visitorAge !== null) {
                if (visitorAge <= 12 && cell.targetAudience === TargetAudience.KIDS) {
                    score += 10;
                    reasons.push('Idade (Kids)');
                } else if (visitorAge >= 13 && visitorAge <= 25 && cell.targetAudience === TargetAudience.YOUTH) {
                    score += 10;
                    reasons.push('Idade (Jovens)');
                } else if (visitorAge > 25 && cell.targetAudience !== TargetAudience.KIDS && cell.targetAudience !== TargetAudience.YOUTH) {
                    score += 5;
                }
            }
            if (visitor.endereco && cell.address) {
                const visitorParts = visitor.endereco.toLowerCase().split(' ').filter(p => p.length > 3);
                const cellAddrLower = cell.address.toLowerCase();
                if (visitorParts.some(part => cellAddrLower.includes(part))) {
                    score += 8;
                    reasons.push('Proximidade');
                }
            }
            if (cell.targetAudience === TargetAudience.MIXED || cell.targetAudience === TargetAudience.FAMILY) score += 2;
            return { cell, score, reasons };
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    };

    const saveAction = () => {
        if (!selectedVisitor) return;
        const updated = { ...selectedVisitor, proximaAcao: actionText, proximaAcaoData: actionDate };
        updateVisitanteAndState(updated);
    };

    const completeAction = () => {
        if (!selectedVisitor) return;
        const updated = {
            ...selectedVisitor,
            ultimoContato: new Date().toISOString(), // Atualiza último contato para hoje
            proximaAcao: undefined, // Limpa ação
            proximaAcaoData: undefined
        };
        updateVisitanteAndState(updated);
        setActionText('');
        setActionDate('');
    };

    const clearAction = () => {
        if (!selectedVisitor) return;
        const updated = { ...selectedVisitor, proximaAcao: undefined, proximaAcaoData: undefined };
        updateVisitanteAndState(updated);
        setActionText(''); setActionDate('');
    };

    const addTag = () => {
        if (!selectedVisitor || !newTag.trim()) return;
        const currentTags = selectedVisitor.tags || [];
        if (!currentTags.includes(newTag.trim())) {
            updateVisitanteAndState({ ...selectedVisitor, tags: [...currentTags, newTag.trim()] });
        }
        setNewTag('');
    };
    const removeTag = (tag: string) => {
        if (!selectedVisitor) return;
        updateVisitanteAndState({ ...selectedVisitor, tags: selectedVisitor.tags.filter(t => t !== tag) });
    };
    const assignCell = (cellId: string) => {
        if (!selectedVisitor) return;
        updateVisitanteAndState({ ...selectedVisitor, celulaDestinoId: cellId, jaParticipaCelula: true });
    };

    // --- Render Components ---

    const renderCard = (v: Visitante) => {
        const daysSystem = calculateDaysSince(v.criadoEm);
        const borderClass = getUrgencyColor(v);

        // Calculate Next Action Status
        let actionStatus = 'none';
        if (v.proximaAcaoData) {
            const actionDate = new Date(v.proximaAcaoData);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (actionDate < today) actionStatus = 'overdue';
            else if (actionDate.getTime() === today.getTime()) actionStatus = 'today';
            else actionStatus = 'future';
        }

        return (
            <div
                key={v.id}
                draggable
                onDragStart={(e) => handleDragStart(e, v.id)}
                onClick={() => {
                    setSelectedVisitor(v);
                    setActionText(v.proximaAcao || '');
                    setActionDate(v.proximaAcaoData || '');
                    setNewTag('');
                }}
                className={`
            relative bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer 
            hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group
            border-l-4 ${borderClass}
        `}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-slate-800 line-clamp-1">{v.nome}</h4>
                        <p className="text-xs text-slate-500">
                            {v.tipoOrigem === 'convertido' ? '❤️ Novo Convertido' : '👋 Visitante'} • {daysSystem}d atrás
                        </p>
                    </div>
                    {/* Quick Actions (Visible on Hover/Mobile) */}
                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                            href={`https://wa.me/55${formatPhoneNumber(v.telefone)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100"
                            title="WhatsApp"
                        >
                            <MessageCircle size={14} />
                        </a>
                    </div>
                </div>

                {/* Tags */}
                {v.tags && v.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {v.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                {tag}
                            </span>
                        ))}
                        {v.tags.length > 2 && <span className="text-[10px] text-slate-400">+{v.tags.length - 2}</span>}
                    </div>
                )}

                {/* Action Alert */}
                {v.proximaAcao && (
                    <div className={`
                flex items-start gap-2 p-2 rounded-lg text-xs font-medium mb-3
                ${actionStatus === 'overdue' ? 'bg-red-50 text-red-700 border border-red-100' :
                            actionStatus === 'today' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                'bg-blue-50 text-blue-700 border border-blue-100'}
            `}>
                        <Clock size={12} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{v.proximaAcao}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5" title="Responsável">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                            {getResponsibleName(v.responsavelId).charAt(0)}
                        </div>
                        <span className="text-[10px] text-slate-500">{getResponsibleName(v.responsavelId)}</span>
                    </div>

                    {v.celulaDestinoId && (
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                            <CheckCircle size={10} /> Em Célula
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderColumn = (status: StatusKanban, title: string, icon: React.ReactNode, colorBase: string) => {
        const items = filteredVisitantes.filter(v => v.statusKanban === status);
        const isActive = activeColumn === status;

        return (
            <div
                className={`
            flex-1 min-w-[300px] flex flex-col h-full rounded-2xl border transition-colors duration-200
            ${isActive ? 'bg-slate-100 border-blue-300' : 'bg-slate-50/50 border-slate-200'}
        `}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
            >
                {/* Column Header */}
                <div className={`p-4 border-b border-slate-100 rounded-t-2xl ${colorBase} bg-opacity-10 flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-white shadow-sm ${colorBase.replace('bg-', 'text-')}`}>
                            {icon}
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
                    </div>
                    <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-100">
                        {items.length}
                    </span>
                </div>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {items.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-2">
                            <p className="text-sm font-medium">Vazio</p>
                            <p className="text-xs">Arraste cards para cá</p>
                        </div>
                    ) : (
                        items.map(renderCard)
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Carregando quadro Kanban...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        CRM de Consolidação
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        {visitantes.length} pessoas no total • {visitantes.filter(v => v.proximaAcao).length} ações pendentes
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar visitante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                        />
                    </div>

                    <button
                        onClick={() => setOnlyMyVisitors(!onlyMyVisitors)}
                        className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors
                    ${onlyMyVisitors ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}
                `}
                    >
                        <Filter size={16} />
                        {onlyMyVisitors ? 'Meus Visitantes' : 'Todos'}
                    </button>
                </div>
            </div>

            {/* KANBAN BOARD */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                {renderColumn(StatusKanban.NOVO, 'Novos', <UserIcon size={16} />, 'bg-blue-500')}
                {renderColumn(StatusKanban.CONTATO, 'Em Contato', <MessageCircle size={16} />, 'bg-orange-500')}
                {renderColumn(StatusKanban.INTEGRADO, 'Integrados', <CheckCircle size={16} />, 'bg-green-500')}
            </div>

            {/* --- DETAILS MODAL --- */}
            {selectedVisitor && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white w-full sm:w-[600px] h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl overflow-y-auto shadow-2xl animate-in slide-in-from-right sm:zoom-in duration-200 flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-800">{selectedVisitor.nome}</h2>
                                    {selectedVisitor.tipoOrigem === 'convertido' && (
                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Conversão</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-2">
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Phone size={14} /> {selectedVisitor.telefone}</span>
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><MapPin size={14} /> {selectedVisitor.endereco || 'Sem endereço'}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 flex-1">

                            {/* Status Bar */}
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-xs font-semibold text-slate-500 uppercase">Fase Atual</div>
                                <div className="flex gap-1">
                                    {Object.values(StatusKanban).map((status, idx) => (
                                        <div
                                            key={status}
                                            className={`
                                        h-2 w-8 rounded-full transition-colors
                                        ${Object.values(StatusKanban).indexOf(selectedVisitor.statusKanban) >= idx
                                                    ? (status === StatusKanban.INTEGRADO ? 'bg-green-500' : 'bg-blue-500')
                                                    : 'bg-slate-200'}
                                    `}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-bold text-slate-700 uppercase">{selectedVisitor.statusKanban}</span>
                            </div>

                            {/* NEXT ACTION SECTION */}
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                            <Clock size={16} /> Próxima Ação (Lembrete)
                                        </h3>
                                        <p className="text-xs text-orange-600 mt-1">
                                            O que precisa ser feito a seguir?
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={actionText}
                                        onChange={(e) => setActionText(e.target.value)}
                                        placeholder="Ex: Ligar para convidar para o culto..."
                                        className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-slate-800"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={actionDate}
                                            onChange={(e) => setActionDate(e.target.value)}
                                            className="flex-1 px-3 py-2 text-sm border border-orange-200 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-slate-800"
                                        />
                                        <button
                                            onClick={saveAction}
                                            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                                        >
                                            <Save size={14} /> Salvar
                                        </button>

                                        {selectedVisitor.proximaAcao && (
                                            <>
                                                <button
                                                    onClick={completeAction}
                                                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 border border-green-200 rounded-lg transition-colors"
                                                    title="Marcar como feita"
                                                >
                                                    <Check size={14} /> Feito
                                                </button>
                                                <button
                                                    onClick={clearAction}
                                                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir ação"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* TAGS SECTION */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                        <Tag size={16} className="text-blue-600" /> Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">
                                        {selectedVisitor.tags?.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100 group">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="text-blue-400 hover:text-red-500"><X size={10} /></button>
                                            </span>
                                        ))}
                                        {(!selectedVisitor.tags || selectedVisitor.tags.length === 0) && (
                                            <p className="text-xs text-slate-400 italic">Sem tags.</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                            placeholder="Nova tag..."
                                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-800"
                                        />
                                        <button onClick={addTag} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* INFO EXTRA */}
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Idade Estimada</p>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <Calendar size={14} className="text-slate-400" />
                                            {selectedVisitor.birthday
                                                ? `${calculateAge(selectedVisitor.birthday)} anos`
                                                : 'Não informado'
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Responsável</p>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <UserIcon size={14} className="text-slate-400" />
                                            {getResponsibleName(selectedVisitor.responsavelId)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CELL SUGGESTIONS */}
                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <Star size={16} className="text-yellow-500" /> Smart Match (Células)
                                </h3>

                                {!selectedVisitor.celulaDestinoId ? (
                                    <div className="space-y-2">
                                        {getRecommendedCells(selectedVisitor).map(({ cell, score, reasons }) => (
                                            <div key={cell.id} className="group flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-sm transition-all bg-white cursor-pointer" onClick={() => assignCell(cell.id)}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-700 text-sm">{cell.name}</h4>
                                                        {score >= 8 && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{cell.leaderName} • {cell.dayOfWeek} {cell.time}</p>
                                                    <div className="flex gap-1 mt-1">
                                                        {reasons.map((r, i) => <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">{r}</span>)}
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                                            </div>
                                        ))}
                                        {getRecommendedCells(selectedVisitor).length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Nenhuma recomendação automática.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle size={20} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-green-700 uppercase">Vinculado a</p>
                                                <p className="font-bold text-slate-800 text-sm">
                                                    {cells.find(c => c.id === selectedVisitor.celulaDestinoId)?.name || 'Célula Desconhecida'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateVisitanteAndState({ ...selectedVisitor, celulaDestinoId: undefined, jaParticipaCelula: false })}
                                            className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                                        >
                                            Desvincular
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsolidationKanban;