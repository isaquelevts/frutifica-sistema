import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveGeneration, updateGeneration, deleteGeneration } from './generationService';
import { Generation, User, UserRole } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { useGenerations } from '../../shared/hooks/useGenerations';
import { useUsers } from '../../shared/hooks/useUsers';
import { useCells } from '../../shared/hooks/useCells';
import { useQueryClient } from '@tanstack/react-query';
import { Network, Plus, Edit2, Trash2, Users, X, Save, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generationSchema, type GenerationFormData } from './schemas/generationSchema';

const Generations: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [showModal, setShowModal] = useState(false);
    const [editingGeneration, setEditingGeneration] = useState<Generation | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [generationToDelete, setGenerationToDelete] = useState<Generation | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors }
    } = useForm<GenerationFormData>({
        resolver: zodResolver(generationSchema),
        defaultValues: {
            name: '',
            description: '',
            leaderId: '',
            color: '#3B82F6'
        }
    });

    const currentColor = watch('color');

    const { data: generationsRaw = [], isLoading: loadingGens } = useGenerations(user?.organizationId);
    const { data: usersData = [], isLoading: loadingUsers } = useUsers(user?.organizationId);
    const { data: cells = [], isLoading: loadingCells } = useCells(user?.organizationId);

    const isLoading = loadingGens || loadingUsers || loadingCells;

    const generations = useMemo(() => {
        return generationsRaw.map(gen => ({
            ...gen,
            cellCount: cells.filter(c => c.generationId === gen.id).length
        }));
    }, [generationsRaw, cells]);

    const leaders = useMemo(() => {
        return usersData.filter(u => u.roles.some(r => [UserRole.LEADER, UserRole.ADMIN].includes(r)));
    }, [usersData]);

    const colorOptions = [
        { value: '#3B82F6', label: 'Azul', class: 'bg-blue-500' },
        { value: '#10B981', label: 'Verde', class: 'bg-green-500' },
        { value: '#F59E0B', label: 'Laranja', class: 'bg-amber-500' },
        { value: '#EF4444', label: 'Vermelho', class: 'bg-red-500' },
        { value: '#8B5CF6', label: 'Roxo', class: 'bg-purple-500' },
        { value: '#EC4899', label: 'Rosa', class: 'bg-pink-500' },
        { value: '#06B6D4', label: 'Ciano', class: 'bg-cyan-500' },
        { value: '#F97316', label: 'Laranja Escuro', class: 'bg-orange-500' },
    ];

    useEffect(() => {
        if (!showModal) {
            setEditingGeneration(null);
            reset({
                name: '',
                description: '',
                leaderId: '',
                color: '#3B82F6'
            });
        }
    }, [showModal, reset]);


    const handleOpenModal = (generation?: Generation) => {
        if (generation) {
            setEditingGeneration(generation);
            reset({
                name: generation.name,
                description: generation.description || '',
                leaderId: generation.leaderId || '',
                color: generation.color || '#3B82F6'
            });
        }
        setShowModal(true);
    };

    const onSubmit = async (data: GenerationFormData) => {
        if (!user?.organizationId) return;

        try {
            const generationData: Generation = {
                id: editingGeneration?.id || crypto.randomUUID(),
                organizationId: user.organizationId,
                name: data.name,
                description: data.description,
                leaderId: data.leaderId || undefined,
                color: data.color,
                active: true
            };

            if (editingGeneration) {
                await updateGeneration(generationData);
            } else {
                await saveGeneration(generationData);
            }

            queryClient.invalidateQueries({ queryKey: ['generations'] });
            setShowModal(false);
        } catch (error: any) {
            console.error("Error saving generation", error);
            alert(error.message || 'Erro ao salvar geração.');
        }
    };

    const handleDeleteClick = (generation: Generation) => {
        setGenerationToDelete(generation);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!generationToDelete) return;

        try {
            await deleteGeneration(generationToDelete.id);
            queryClient.invalidateQueries({ queryKey: ['generations'] });
            setShowDeleteModal(false);
            setGenerationToDelete(null);
        } catch (error) {
            console.error("Error deleting generation", error);
            alert("Erro ao excluir geração. Verifique se não há células vinculadas.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Carregando gerações...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {generations.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <Network size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma geração cadastrada</h3>
                        <p className="text-slate-500 mb-6">
                            Crie gerações para organizar suas células em grupos ministeriais.
                        </p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={20} />
                            Criar Primeira Geração
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {generations.map((gen: any) => (
                            <div
                                key={gen.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                            >
                                <div
                                    className="h-2"
                                    style={{ backgroundColor: gen.color || '#3B82F6' }}
                                ></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-slate-800 mb-1">{gen.name}</h3>
                                            {gen.description && (
                                                <p className="text-sm text-slate-500 line-clamp-2">{gen.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(gen)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(gen)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        {gen.leaderName && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-medium">{gen.leaderName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Network size={14} className="text-slate-400" />
                                            <span className="text-slate-700 font-semibold">{gen.cellCount || 0} células</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal CRUD */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingGeneration ? 'Editar Geração' : 'Nova Geração'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nome da Geração *
                                </label>
                                <input
                                    type="text"
                                    {...register('name')}
                                    className={`w-full px-4 py-2 rounded-lg bg-white border ${errors.name ? 'border-red-500' : 'border-slate-300'} text-slate-900 outline-none focus:border-blue-500`}
                                    placeholder="Ex: Primeiro Amor, Geração de Samuel..."
                                />
                                {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Descrição
                                </label>
                                <textarea
                                    {...register('description')}
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 outline-none focus:border-blue-500 resize-none"
                                    rows={3}
                                    placeholder="Descreva o propósito ou características desta geração..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Líder da Geração
                                </label>
                                <select
                                    {...register('leaderId')}
                                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 outline-none focus:border-blue-500"
                                >
                                    <option value="">Sem líder definido</option>
                                    {leaders.map((leader) => (
                                        <option key={leader.id} value={leader.id}>
                                            {leader.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Cor de Identificação
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => setValue('color', color.value)}
                                            className={`h-12 rounded-lg ${color.class} ${currentColor === color.value
                                                ? 'ring-4 ring-offset-2 ring-slate-400'
                                                : 'opacity-70 hover:opacity-100'
                                                } transition-all`}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                                >
                                    <Save size={18} />
                                    Salvar Geração
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Geração?</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Tem certeza que deseja excluir <strong>{generationToDelete?.name}</strong>?
                                As células vinculadas não serão excluídas, mas perderão a vinculação.
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

export default Generations;
