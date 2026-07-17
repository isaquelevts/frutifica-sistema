import React, { useEffect, useState } from 'react';
import { getUsers, saveUser, updateUser, deleteUser } from '../settings/profileService';
import { getCells, updateCell } from './cellService';
import { User, UserRole, Cell } from '../../shared/types/types';
import { useAuth } from '../../core/auth/AuthContext';
import { UserPlus, Search, Edit2, Trash2, Mail, Lock, CakeSlice, ShieldCheck, User as UserIcon, Users, CheckCircle, Link2, Copy, Check, Phone } from 'lucide-react';
import { useUsers } from '../../shared/hooks/useUsers';
import { useCells } from '../../shared/hooks/useCells';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userRegistrationSchema, type UserRegistrationFormData } from '../settings/schemas/userRegistrationSchema'; // Reusing schema
import { maskPhone } from '../../core/utils/mask';

const ManageLeaders: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useUsers(currentUser?.organizationId);
  const { data: cells = [], isLoading: loadingCells } = useCells(currentUser?.organizationId);

  const loading = loadingUsers || loadingCells || isSubmitting;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Constants for Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdLeaderName, setCreatedLeaderName] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<UserRegistrationFormData>({
    resolver: zodResolver(userRegistrationSchema), // Using shared schema
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: UserRole.COLEADER,
      cellId: '',
      birthday: ''
    }
  });

  // O WhatsApp do líder vive em Cell.leaderPhone (usado pelo fluxo de
  // lembretes por WhatsApp), não no User — por isso é um campo local,
  // sincronizado com a célula selecionada, em vez de fazer parte do form.
  const watchedCellId = watch('cellId');
  const [leaderPhone, setLeaderPhone] = useState('');

  useEffect(() => {
    if (!watchedCellId) {
      setLeaderPhone('');
      return;
    }
    const selectedCell = cells.find(c => c.id === watchedCellId);
    setLeaderPhone(selectedCell?.whatsapp || '');
  }, [watchedCellId, cells]);

  const registerLink = currentUser?.organizationId
    ? `${window.location.href.split('#')[0]}#/cadastro-lider/${currentUser.organizationId}`
    : '';

  const handleCopyLink = () => {
    if (!registerLink) return;
    navigator.clipboard.writeText(registerLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCellName = (cellId?: string) => {
    if (!cellId) return 'Sem Célula';
    const cell = cells.find(c => c.id === cellId);
    return cell ? cell.name : 'Célula Excluída';
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    // Pega o primeiro papel relevante para edição simples
    const primaryRole = user.roles.includes(UserRole.ADMIN) ? UserRole.ADMIN :
      user.roles.includes(UserRole.COLEADER) ? UserRole.COLEADER :
        user.roles.includes(UserRole.INTRODUTOR) ? UserRole.INTRODUTOR : UserRole.LEADER;

    reset({
      name: user.name,
      email: user.email,
      password: '', // Don't show password for editing
      role: primaryRole,
      cellId: user.cellId || '',
      birthday: user.birthday || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(id);
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } catch (error) {
        console.error("Error deleting user", error);
        alert("Erro ao excluir usuário.");
      }
    }
  };

  const handleOpenModal = () => {
    setEditingUser(null);
    reset({
      name: '',
      email: '',
      password: '',
      role: UserRole.COLEADER,
      cellId: '',
      birthday: ''
    });
    setShowModal(true);
  };

  const onSubmit = async (data: UserRegistrationFormData) => {
    if (!currentUser?.organizationId) return;

    setIsSubmitting(true);

    try {
      // Converte o single-select para array de roles
      const roles = [data.role];

      if (editingUser) {
        // Editing existing user - just update profile
        const userData = {
          ...editingUser,
          name: data.name,
          email: data.email,
          roles: roles,
          cellId: data.cellId || undefined,
          birthday: data.birthday || undefined
        };
        await updateUser(userData);
      } else {
        // Creating new user via API (cria profile com senha hasheada)
        if (!data.password) {
          throw new Error('Senha é obrigatória para novos usuários.');
        }

        await saveUser({
          organizationId: currentUser.organizationId,
          name: data.name,
          email: data.email,
          password: data.password,
          roles: roles,
          cellId: data.cellId || undefined,
          birthday: data.birthday || undefined,
        } as any);
      }

      // Salva o WhatsApp na célula vinculada, se houver uma selecionada
      if (data.cellId) {
        const selectedCell = cells.find(c => c.id === data.cellId);
        if (selectedCell && selectedCell.whatsapp !== leaderPhone) {
          await updateCell({ ...selectedCell, whatsapp: leaderPhone });
          queryClient.invalidateQueries({ queryKey: ['cells'] });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });

      if (editingUser) {
        // Just close modal for edits
        setShowModal(false);
      } else {
        // Show success modal for new leaders
        setCreatedLeaderName(data.name);
        setShowModal(false);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("Error saving user", error);
      alert(error.message || 'Erro ao salvar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    handleOpenModal();
    setShowSuccessModal(false);
  };

  const getRoleBadge = (roles: UserRole[]) => {
    if (roles.includes(UserRole.ADMIN)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ShieldCheck size={12} /> Admin
        </span>
      );
    }
    if (roles.includes(UserRole.COLEADER)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
          <Users size={12} /> Co-Líder
        </span>
      );
    }
    if (roles.includes(UserRole.INTRODUTOR)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <UserIcon size={12} /> Introdutor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
        <UserIcon size={12} /> Líder
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Líderes</h1>
          <p className="text-muted-foreground">Controle de acesso e informações dos líderes.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Card de link de auto-cadastro */}
      {registerLink && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-primary flex-shrink-0">
            <Link2 size={20} />
            <span className="font-semibold text-sm">Link de Cadastro para Líderes</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate font-mono bg-white border border-border px-2 py-1 rounded">
              {registerLink}
            </p>
          </div>
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
              linkCopied
                ? 'bg-green-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
          >
            {linkCopied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Link</>}
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-input text-foreground rounded-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Nome</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Célula</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Função</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Nascimento</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {getCellName(u.cellId)}
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(u.roles)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {u.birthday ? new Date(u.birthday).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {editingUser ? 'Editar Usuário' : 'Cadastrar Usuário'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                    <input
                      type="text"
                      {...register('name')}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.name ? 'border-red-500' : 'border-input'} text-foreground font-medium outline-none focus:border-ring`}
                    />
                    {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                    <input
                      type="email"
                      {...register('email')}
                      disabled={!!editingUser}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-input text-foreground font-medium outline-none focus:border-ring disabled:bg-muted disabled:cursor-not-allowed"
                    />
                    {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
                  </div>
                  {editingUser && (
                    <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado após a criação da conta.</p>
                  )}
                </div>

                {/* Password field - only for new users (though schema allows it, logic hides/shows it) */}
                {!editingUser && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                      <input
                        type="password"
                        {...register('password')}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg bg-white border ${errors.password ? 'border-red-500' : 'border-input'} text-foreground font-medium outline-none focus:border-ring`}
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                      {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
                    </div>
                  </div>
                )}

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">Data de Nascimento</label>
                  <div className="relative">
                    <CakeSlice className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                    <input
                      type="date"
                      {...register('birthday')}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-input text-foreground font-medium outline-none focus:border-ring"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">Função</label>
                  <select
                    {...register('role')}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-input text-foreground font-medium outline-none focus:border-ring"
                  >
                    <option value={UserRole.LEADER}>Líder</option>
                    <option value={UserRole.COLEADER}>Co-Líder</option>
                    <option value={UserRole.INTRODUTOR}>Introdutor</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Célula Vinculada</label>
                  <select
                    {...register('cellId')}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-input text-foreground font-medium outline-none focus:border-ring"
                  >
                    <option value="">Sem Célula (Apenas Acesso)</option>
                    {cells.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.leaderName}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {/* Simplified for UI - hook form handles value */}
                    Co-líderes podem ser vinculados a células existentes sem criar uma nova.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">WhatsApp do Líder</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                    <input
                      type="tel"
                      value={leaderPhone}
                      onChange={(e) => setLeaderPhone(maskPhone(e.target.value))}
                      disabled={!watchedCellId}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-input text-foreground font-medium outline-none focus:border-ring disabled:bg-muted disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {watchedCellId
                      ? 'Usado nos lembretes semanais por WhatsApp.'
                      : 'Vincule a uma célula para adicionar o WhatsApp.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500 delay-150">
                <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🎉 Líder Cadastrado!
              </h2>

              {/* Message */}
              <p className="text-muted-foreground mb-1">
                <strong className="text-primary">{createdLeaderName}</strong> foi adicionado com sucesso!
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                O líder já pode acessar o sistema com as credenciais fornecidas.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 px-6 py-3 bg-muted text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleAddAnother}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-lg hover:from-primary hover:to-primary/70 transition-all shadow-lg shadow-primary/30"
                >
                  + Adicionar Outro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLeaders;