import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteMember, updateMember } from './memberService';
import { deleteVisitante } from '../consolidation/visitanteService';
import { deleteUser, updateUser } from '../settings/profileService';
import { Member, Visitante, Cell, MemberType, User, UserRole } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { useMembers } from '../../shared/hooks/useMembers';
import { useVisitantes } from '../../shared/hooks/useVisitantes';
import { useCells } from '../../shared/hooks/useCells';
import { useUsers } from '../../shared/hooks/useUsers';
import { useQueryClient } from '@tanstack/react-query';
import { Search, User as UserIcon, Filter, ShieldCheck, Star, Users, Phone, MessageCircle, MapPin, Trash2, Edit2, X, Save, AlertTriangle, Cake, Mail } from 'lucide-react';
import { maskPhone } from '../../core/utils/mask';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSchema, type MemberFormData } from './schemas/memberSchema';
import { userRegistrationSchema, type UserRegistrationFormData } from '../settings/schemas/userRegistrationSchema';

interface CombinedPerson {
    id: string;
    name: string;
    type: 'Membro' | 'Visitante' | 'Líder';
    cellName: string;
    cellId?: string;
    phone: string;
    status?: string;
    source: 'member' | 'visitor' | 'leader';
    originalData?: Member | Visitante | User;
    birthday?: string;
}

const GlobalMembers: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const queryClient = useQueryClient();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [cellFilter, setCellFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    // Modal State
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const [showLeaderModal, setShowLeaderModal] = useState(false);
    const [editingLeader, setEditingLeader] = useState<User | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [personToDelete, setPersonToDelete] = useState<CombinedPerson | null>(null);

    // Data Fetching
    const { data: members = [], isLoading: loadingMembers } = useMembers(user?.organizationId);
    const { data: visitantes = [], isLoading: loadingVisitors } = useVisitantes(user?.organizationId);
    const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);
    const { data: usersData = [], isLoading: loadingUsers } = useUsers(user?.organizationId);

    const isLoading = loadingMembers || loadingVisitors || loadingCells || loadingUsers;

    // --- Forms Setup ---

    // Member Form
    const {
        register: registerMember,
        handleSubmit: handleSubmitMember,
        reset: resetMember,
        setValue: setValueMember,
        formState: { errors: errorsMember, isSubmitting: sendingMember }
    } = useForm<MemberFormData>({
        resolver: zodResolver(memberSchema),
        defaultValues: {
            name: '',
            phone: '',
            birthday: '',
            type: MemberType.MEMBER,
            cellId: '' // Will handle optionality via useEffect
        }
    });

    // Leader Form
    const {
        register: registerLeader,
        handleSubmit: handleSubmitLeader,
        reset: resetLeader,
        setValue: setValueLeader,
        formState: { errors: errorsLeader, isSubmitting: sendingLeader }
    } = useForm<UserRegistrationFormData>({
        resolver: zodResolver(userRegistrationSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: UserRole.LEADER,
            cellId: '',
            birthday: ''
        }
    });


    // --- Computed Data ---

    const allPeople = useMemo(() => {
        if (isLoading) return [];

        // 1. Get Cell Members
        const activeMembers = members.filter(m => m.active !== false);
        const memberMapped: CombinedPerson[] = activeMembers.map(m => {
            const cell = cells.find(c => c.id === m.cellId);
            return {
                id: m.id,
                name: m.name,
                type: m.type === MemberType.MEMBER ? 'Membro' : 'Visitante',
                cellName: cell ? cell.name : 'Sem Célula',
                cellId: m.cellId,
                phone: m.phone,
                status: 'Ativo',
                source: 'member',
                originalData: m,
                birthday: m.birthday
            };
        });

        // 2. Get Visitors (Consolidation)
        const visitorMapped: CombinedPerson[] = visitantes.map(v => {
            let cellName = '-';
            let cId = undefined;
            if (v.celulaDestinoId) {
                const cell = cells.find(c => c.id === v.celulaDestinoId);
                cellName = cell ? cell.name : '-';
                cId = v.celulaDestinoId;
            } else if (v.celulaOrigemId) {
                const cell = cells.find(c => c.id === v.celulaOrigemId);
                cellName = cell ? cell.name : '-';
                cId = v.celulaOrigemId;
            }

            return {
                id: v.id,
                name: v.nome,
                type: 'Visitante',
                cellName: cellName,
                cellId: cId,
                phone: v.telefone,
                status: v.statusKanban,
                source: 'visitor',
                originalData: v,
                birthday: v.birthday
            };
        });

        // 3. Get Leaders (Users)
        const leaderMapped: CombinedPerson[] = usersData
            .filter(u => u.roles.some(r => [UserRole.LEADER, UserRole.COLEADER, UserRole.ADMIN].includes(r)))
            .map(u => {
                const cell = cells.find(c => c.id === u.cellId);
                return {
                    id: u.id,
                    name: u.name,
                    type: 'Líder',
                    cellName: cell ? cell.name : 'Sem Célula (Admin/Staff)',
                    cellId: u.cellId,
                    phone: '',
                    status: 'Ativo',
                    source: 'leader',
                    originalData: u,
                    birthday: u.birthday
                };
            });

        return [...leaderMapped, ...memberMapped, ...visitorMapped];
    }, [members, visitantes, cells, usersData, isLoading]);

    const filteredPeople = useMemo(() => {
        let result = allPeople;

        if (searchTerm) {
            result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (cellFilter !== 'all') {
            result = result.filter(p => p.cellName === cellFilter);
        }

        if (typeFilter !== 'all') {
            result = result.filter(p => p.type === typeFilter);
        }

        return result;
    }, [searchTerm, cellFilter, typeFilter, allPeople]);

    const formatPhoneNumber = (phone: string) => {
        return phone.replace(/\D/g, '');
    };

    // --- Handlers ---

    const handleDeleteClick = (person: CombinedPerson) => {
        if (person.source === 'leader' && !isAdmin) {
            alert('Apenas administradores podem excluir líderes.');
            return;
        }
        setPersonToDelete(person);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (personToDelete) {
            try {
                if (personToDelete.source === 'member') {
                    await deleteMember(personToDelete.id);
                    queryClient.invalidateQueries({ queryKey: ['members'] });
                } else if (personToDelete.source === 'visitor') {
                    await deleteVisitante(personToDelete.id);
                    queryClient.invalidateQueries({ queryKey: ['visitantes'] });
                } else if (personToDelete.source === 'leader') {
                    await deleteUser(personToDelete.id);
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                }
                setShowDeleteModal(false);
                setPersonToDelete(null);
            } catch (error) {
                console.error("Error deleting person", error);
                alert("Erro ao excluir.");
            }
        }
    };

    const handleEdit = (person: CombinedPerson) => {
        if (person.source === 'leader') {
            if (!isAdmin) {
                alert('Apenas administradores podem editar líderes.');
                return;
            }
            const u = person.originalData as User;
            setEditingLeader(u);

            // Populate Leader Form
            // Find appropriate role (prioritize highest)
            const role = u.roles.includes(UserRole.ADMIN) ? UserRole.ADMIN :
                u.roles.includes(UserRole.COLEADER) ? UserRole.COLEADER : UserRole.LEADER;

            resetLeader({
                name: u.name,
                email: u.email,
                password: '', // Not changing password here
                role: role,
                cellId: u.cellId || '',
                birthday: u.birthday || ''
            });
            setShowLeaderModal(true);
            return;
        }

        if (person.source === 'visitor') {
            // Redirect to visitor edit page
            navigate(`/edit-visitor/${person.id}`);
        } else {
            // Member Editing
            const m = person.originalData as Member;
            setEditingMember(m);

            // Populate Member Form
            resetMember({
                name: m.name,
                phone: m.phone,
                birthday: m.birthday || '',
                type: m.type,
                cellId: m.cellId || ''
            });

            setShowMemberModal(true);
        }
    };

    // Submit Handlers
    const onMemberSubmit = async (data: MemberFormData) => {
        if (editingMember) {
            try {
                await updateMember({
                    ...editingMember,
                    name: data.name,
                    phone: data.phone,
                    birthday: data.birthday,
                    type: data.type,
                    cellId: data.cellId
                });
                queryClient.invalidateQueries({ queryKey: ['members'] });
                setShowMemberModal(false);
            } catch (error) {
                console.error("Error updating member", error);
                alert("Erro ao atualizar membro.");
            }
        }
    };

    const onLeaderSubmit = async (data: UserRegistrationFormData) => {
        if (editingLeader) {
            try {
                await updateUser({
                    ...editingLeader,
                    name: data.name,
                    roles: [data.role],
                    cellId: data.cellId || undefined,
                    birthday: data.birthday || undefined
                });
                queryClient.invalidateQueries({ queryKey: ['users'] });
                setShowLeaderModal(false);
            } catch (error) {
                console.error("Error updating leader", error);
                alert("Erro ao atualizar líder.");
            }
        }
    };

    // UI Helpers
    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'Líder':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        <ShieldCheck size={10} /> Líder
                    </span>
                );
            case 'Membro':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <UserIcon size={10} /> Membro
                    </span>
                );
            case 'Visitante':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-50 text-orange-700 border border-orange-100">
                        <Star size={10} /> Visitante
                    </span>
                );
            default:
                return null;
        }
    };

    const getAttendanceDisplay = (person: CombinedPerson) => {
        if (person.source === 'member') {
            const m = person.originalData as Member;
            return (
                <div className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                    FREQ: {m.attendanceCount || 0}
                </div>
            );
        }
        return null;
    };


    const getAvatarColor = (type: string) => {
        switch (type) {
            case 'Líder': return 'bg-purple-100 text-purple-600';
            case 'Membro': return 'bg-blue-100 text-blue-600';
            default: return 'bg-orange-100 text-orange-600';
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Carregando membros globais...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Membros Gerais</h1>
                <p className="text-slate-500">Visualização unificada de todos os membros, líderes e visitantes.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={cellFilter}
                            onChange={(e) => setCellFilter(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px] sm:max-w-none"
                        >
                            <option value="all">Todas as Células</option>
                            {cells.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            <option value="-">Sem Célula Vinculada</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos os Tipos</option>
                            <option value="Líder">Líderes</option>
                            <option value="Membro">Membros</option>
                            <option value="Visitante">Visitantes</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPeople.map((person, idx) => (
                    <div key={`${person.id}-${idx}`} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative ${person.type === 'Líder' ? 'border-l-4 border-l-purple-500' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(person.type)}`}>
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 line-clamp-1">{person.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {getTypeBadge(person.type)}
                                        {getAttendanceDisplay(person)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {(person.source !== 'leader' || isAdmin) && (
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white pl-2">
                                    {person.phone && (
                                        <a
                                            href={`https://wa.me/55${formatPhoneNumber(person.phone)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                            title="Conversar no WhatsApp"
                                        >
                                            <MessageCircle size={16} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleEdit(person)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(person)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-50 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Users size={14} className={person.cellName !== '-' && person.cellName !== 'Sem Célula' ? 'text-blue-500' : 'text-slate-300'} />
                                <span className={person.cellName === '-' || person.cellName.includes('Sem Célula') ? 'text-slate-400 italic' : 'font-medium'}>
                                    {person.cellName}
                                </span>
                            </div>
                            {person.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone size={14} className="text-slate-400" />
                                    <span>{person.phone}</span>
                                </div>
                            )}
                            {person.birthday && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Cake size={14} className="text-pink-400" />
                                    <span>{new Date(person.birthday).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {filteredPeople.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                        Nenhuma pessoa encontrada com os filtros atuais.
                    </div>
                )}
            </div>

            {/* EDIT MODAL FOR LEADERS */}
            {showLeaderModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Editar Líder</h2>
                            <button onClick={() => setShowLeaderModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitLeader(onLeaderSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        {...registerLeader('name')}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    />
                                    {errorsLeader.name && <span className="text-red-500 text-xs">{errorsLeader.name.message}</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Não editável)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        {...registerLeader('email')}
                                        disabled
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                                    <select
                                        {...registerLeader('role')}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    >
                                        <option value={UserRole.LEADER}>Líder</option>
                                        <option value={UserRole.COLEADER}>Co-Líder</option>
                                        <option value={UserRole.INTRODUTOR}>Introdutor</option>
                                        <option value={UserRole.ADMIN}>Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Célula</label>
                                    <select
                                        {...registerLeader('cellId')}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    >
                                        <option value="">Nenhuma</option>
                                        {cells.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <div className="relative">
                                    <Cake className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        {...registerLeader('birthday')}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowLeaderModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium shadow-sm"
                                    disabled={sendingLeader}
                                >
                                    <Save size={18} /> {sendingLeader ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL FOR MEMBERS */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Editar Membro</h2>
                            <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitMember(onMemberSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    {...registerMember('name')}
                                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                />
                                {errorsMember.name && <span className="text-red-500 text-xs">{errorsMember.name.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    {...registerMember('phone')}
                                    onChange={(e) => setValueMember('phone', maskPhone(e.target.value))}
                                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    placeholder="(99) 99999-9999"
                                />
                                {errorsMember.phone && <span className="text-red-500 text-xs">{errorsMember.phone.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <div className="relative">
                                    <Cake className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        {...registerMember('birthday')}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                    <select
                                        {...registerMember('type')}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    >
                                        <option value={MemberType.MEMBER}>Membro</option>
                                        <option value={MemberType.VISITOR}>Visitante</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Célula</label>
                                    <select
                                        {...registerMember('cellId')}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-slate-800"
                                    >
                                        {cells.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowMemberModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                                    disabled={sendingMember}
                                >
                                    <Save size={18} /> {sendingMember ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Registro?</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Tem certeza que deseja excluir <strong>{personToDelete?.name}</strong>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalMembers;