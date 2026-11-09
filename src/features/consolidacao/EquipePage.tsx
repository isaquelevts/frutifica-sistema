import React, { useMemo, useState } from 'react';
import { Check, Copy, Eye, Loader2, Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useIsSuspended } from '../../shared/hooks/useIsSuspended';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Access, TeamMember } from './consolidacaoService';
import { useCreateMember, useSetAccess, useTeam } from './hooks';
import { ErrorBlock, FieldLabel, LoadingBlock, NativeSelect, PageHeader } from './components';

const ACCESS_INFO = [
  {
    id: 'consolidador', title: 'Consolidador', icon: <Eye className="size-4" />,
    text: 'Cadastra visitantes e acompanha as pessoas que estão com ele (e as sem responsável). Registra contatos, convites e próximos passos.',
  },
  {
    id: 'gestor', title: 'Gestor da consolidação', icon: <ShieldCheck className="size-4" />,
    text: 'Vê todas as pessoas e o painel com os números, distribui pessoas entre a equipe e libera acessos. Administradores já têm este acesso.',
  },
];

const AccessBadge: React.FC<{ m: TeamMember }> = ({ m }) => {
  if (m.isAdmin) return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Administrador</span>;
  if (m.access === 'gestor') return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Gestor</span>;
  if (m.access === 'consolidador') return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Consolidador</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Sem acesso</span>;
};

const NewMemberForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const create = useCreateMember();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState<Access>('consolidador');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TeamMember | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setResult(await create.mutateAsync({ name, email, access, password: password || undefined }));
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar o acesso.');
    }
  };

  if (result) {
    const msg = `Olá, ${result.name.split(' ')[0]}! Seu acesso à consolidação no Frutifica:\n${window.location.origin}\nEmail: ${result.email}${result.temporaryPassword ? `\nSenha: ${result.temporaryPassword}` : ''}`;
    return (
      <Card className="border-green-300">
        <CardContent className="space-y-3 p-5">
          <p className="font-semibold text-green-800">
            {result.alreadyExisted ? `${result.name} já tinha login — o acesso foi liberado.` : `Acesso criado para ${result.name}.`}
          </p>
          {result.temporaryPassword && (
            <p className="text-sm">Senha temporária: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{result.temporaryPassword}</code> — envie para a pessoa; ela não será mostrada de novo.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); } catch { /* sem clipboard */ } }}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar mensagem de acesso'}
            </Button>
            <Button size="sm" onClick={onClose}>Concluir</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Novo acesso</CardTitle>
          <CardDescription>Para quem ainda não tem login no Frutifica. A pessoa só verá a consolidação.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="m-name">Nome</FieldLabel>
            <Input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="m-email">Email (login)</FieldLabel>
            <Input id="m-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="m-access">Acesso</FieldLabel>
            <NativeSelect id="m-access" value={access} onChange={(e) => setAccess(e.target.value as Access)}>
              <option value="consolidador">Consolidador</option>
              <option value="gestor">Gestor da consolidação</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel htmlFor="m-pass" hint="(opcional)">Senha</FieldLabel>
            <Input id="m-pass" type="text" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Em branco = gerar automática" />
          </div>
          {error && <div className="sm:col-span-2"><ErrorBlock message={error} /></div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />} Criar acesso</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const EquipePage: React.FC = () => {
  const { user } = useAuth();
  const isSuspended = useIsSuspended();
  const { data: team = [], isLoading, error } = useTeam();
  const setAccess = useSetAccess();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyWithAccess, setOnlyWithAccess] = useState(true);
  const [rowError, setRowError] = useState('');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team
      .filter((m) => !onlyWithAccess || m.access !== 'nenhum' || !!q)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [team, search, onlyWithAccess]);

  const change = async (m: TeamMember, access: TeamMember['access']) => {
    if (access === 'nenhum' && !confirm(`Remover o acesso de ${m.name}? As pessoas que estão com ele(a) voltam para "sem responsável".`)) return;
    setRowError('');
    try { await setAccess.mutateAsync({ userId: m.id, access }); } catch (e: any) { setRowError(e.message); }
  };

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={(error as Error).message} />;

  const withAccess = team.filter((m) => m.access !== 'nenhum').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe da consolidação"
        description="Defina quem pode cadastrar e acompanhar visitantes, e quem vê o painel completo."
        actions={!showForm && <Button onClick={() => setShowForm(true)} disabled={isSuspended}><UserPlus /> Novo acesso</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {ACCESS_INFO.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 font-semibold">{a.icon} {a.title}</p>
            <p className="text-sm text-muted-foreground">{a.text}</p>
          </div>
        ))}
      </div>

      {showForm && <NewMemberForm onClose={() => setShowForm(false)} />}

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base">{withAccess} {withAccess === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}</CardTitle>
            <CardDescription>Líderes de célula e outros usuários já cadastrados também podem receber acesso.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="size-4" checked={onlyWithAccess} onChange={(e) => setOnlyWithAccess(e.target.checked)} />
              Só quem tem acesso
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 sm:w-60" placeholder="Buscar usuário" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rowError && <div className="px-6 pb-4"><ErrorBlock message={rowError} /></div>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Usuário</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-56 pr-6">Acesso à consolidação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{m.name}{m.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}</p>
                      <p className="text-xs text-muted-foreground">{m.email}{m.isCellLeader ? ' · líder de célula' : ''}</p>
                    </TableCell>
                    <TableCell><AccessBadge m={m} /></TableCell>
                    <TableCell className="pr-6">
                      {m.isAdmin ? (
                        <span className="text-sm text-muted-foreground">Acesso total</span>
                      ) : (
                        <NativeSelect
                          value={m.access}
                          disabled={isSuspended || setAccess.isPending || m.id === user?.id}
                          onChange={(e) => change(m, e.target.value as TeamMember['access'])}
                          className={cn(m.access === 'nenhum' && 'text-muted-foreground')}
                          aria-label={`Acesso de ${m.name}`}
                        >
                          <option value="nenhum">Sem acesso</option>
                          <option value="consolidador">Consolidador</option>
                          <option value="gestor">Gestor</option>
                        </NativeSelect>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {visible.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    {onlyWithAccess ? 'Ninguém com acesso ainda. Desmarque o filtro para liberar para usuários existentes, ou crie um novo acesso.' : 'Nenhum usuário encontrado.'}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipePage;
