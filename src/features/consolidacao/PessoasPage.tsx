import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Columns3, List, Search, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useIsSuspended } from '../../shared/hooks/useIsSuspended';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Person, Stage } from './consolidacaoService';
import { useConsolidationAccess, usePeople, useResponsibles, useSetStage } from './hooks';
import { PERSON_TYPES, STAGES, STAGE_ORDER } from './constants';
import { AlertIcons, ContactButtons, ErrorBlock, LoadingBlock, NativeSelect, PageHeader, StageBadge, TypeBadge } from './components';
import { formatDate, formatPhone, relativeDays } from './utils';

type QuickFilter = 'abertos' | 'meus' | 'sem_responsavel' | 'atrasados' | 'vencidos' | 'esfriando' | 'todos';

const QUICK_FILTERS: { id: QuickFilter; label: string; managerOnly?: boolean }[] = [
  { id: 'abertos', label: 'Em acompanhamento' },
  { id: 'meus', label: 'Comigo' },
  { id: 'sem_responsavel', label: 'Sem responsável' },
  { id: 'atrasados', label: 'Sem contato +48h' },
  { id: 'vencidos', label: 'Passo vencido' },
  { id: 'esfriando', label: 'Esfriando' },
  { id: 'todos', label: 'Todos' },
];

function matchesQuick(p: Person, f: QuickFilter, userId?: string): boolean {
  const open = p.stage !== 'consolidado' && p.stage !== 'sem_retorno';
  switch (f) {
    case 'abertos': return open;
    case 'meus': return p.assignedTo?.id === userId && open;
    case 'sem_responsavel': return !p.assignedTo && open;
    case 'atrasados': return p.alerts.firstContactLate;
    case 'vencidos': return p.alerts.nextActionOverdue;
    case 'esfriando': return p.alerts.cooling;
    default: return true;
  }
}

/** Prioridade na fila: alertas primeiro, depois mais antigos aguardando. */
function urgency(p: Person): number {
  return (p.alerts.firstContactLate ? 4 : 0) + (p.alerts.nextActionOverdue ? 3 : 0) + (p.alerts.cooling ? 1 : 0);
}

const PessoasPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = useConsolidationAccess();
  const isGestor = access === 'gestor';
  const isSuspended = useIsSuspended();
  const [params, setParams] = useSearchParams();

  const { data: people = [], isLoading, error } = usePeople();
  const { data: responsibles = [] } = useResponsibles();
  const setStage = useSetStage();

  const quick = (params.get('filtro') as QuickFilter) || (isGestor ? 'abertos' : 'meus');
  const view = params.get('ver') === 'quadro' ? 'quadro' : 'lista';
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>(params.get('responsavel') || '');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [moveError, setMoveError] = useState('');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const c = {} as Record<QuickFilter, number>;
    QUICK_FILTERS.forEach((f) => { c[f.id] = people.filter((p) => matchesQuick(p, f.id, user?.id)).length; });
    return c;
  }, [people, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return people
      .filter((p) => matchesQuick(p, view === 'quadro' && quick === 'abertos' ? 'todos' : quick, user?.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (qDigits.length >= 3 && p.phone?.includes(qDigits)))
      .filter((p) => !stageFilter || p.stage === stageFilter)
      .filter((p) => !typeFilter || p.type === typeFilter)
      .filter((p) => !ownerFilter || (ownerFilter === 'none' ? !p.assignedTo : p.assignedTo?.id === ownerFilter))
      .sort((a, b) => urgency(b) - urgency(a) || a.createdAt.localeCompare(b.createdAt) * (quick === 'todos' ? -1 : 1));
  }, [people, search, stageFilter, typeFilter, ownerFilter, quick, view, user?.id]);

  const handleDrop = async (stage: Stage) => {
    setOverStage(null);
    const person = people.find((p) => p.id === dragId);
    setDragId(null);
    if (!person || person.stage === stage || isSuspended) return;
    let lostReason: string | undefined;
    if (stage === 'sem_retorno') {
      const r = window.prompt(`Por que ${person.name} ficou sem retorno? (opcional)`);
      if (r === null) return;
      lostReason = r;
    }
    setMoveError('');
    try {
      await setStage.mutateAsync({ id: person.id, stage, lostReason });
    } catch (e: any) {
      setMoveError(e.message || 'Não foi possível mover.');
    }
  };

  if (isLoading) return <LoadingBlock label="Carregando pessoas..." />;
  if (error) return <ErrorBlock message={(error as Error).message} />;

  const boardStages: Stage[] = [...STAGE_ORDER, 'sem_retorno'];

  return (
    <div className="space-y-5">
      <PageHeader
        title={isGestor ? 'Pessoas em acompanhamento' : 'Minha fila'}
        description={isGestor ? 'Visitantes e novos convertidos de toda a equipe.' : 'Pessoas com você e as que ainda estão sem responsável.'}
        actions={
          <Button asChild size="lg" disabled={isSuspended}>
            <Link to="/consolidacao/nova"><UserPlus /> Cadastrar pessoa</Link>
          </Button>
        }
      />

      {/* Filtros rápidos */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setParam('filtro', f.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              quick === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'
            )}
          >
            {f.label}
            <span className={cn('rounded-full px-1.5 text-xs tabular-nums', quick === f.id ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground')}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          {view === 'lista' && (
            <NativeSelect className="lg:w-44" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Etapa">
              <option value="">Todas as etapas</option>
              {[...STAGE_ORDER, 'sem_retorno' as Stage].map((s) => <option key={s} value={s}>{STAGES[s].label}</option>)}
            </NativeSelect>
          )}
          <NativeSelect className="lg:w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tipo">
            <option value="">Todos os tipos</option>
            {Object.entries(PERSON_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect>
          {isGestor && (
            <NativeSelect className="lg:w-44" value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setParam('responsavel', e.target.value || null); }} aria-label="Responsável">
              <option value="">Todos responsáveis</option>
              <option value="none">Sem responsável</option>
              {responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </NativeSelect>
          )}
          <div className="flex rounded-md border p-0.5">
            <button
              onClick={() => setParam('ver', null)}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1 text-sm', view === 'lista' ? 'bg-muted font-semibold' : 'text-muted-foreground')}
            >
              <List className="size-4" /> Lista
            </button>
            <button
              onClick={() => setParam('ver', 'quadro')}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1 text-sm', view === 'quadro' ? 'bg-muted font-semibold' : 'text-muted-foreground')}
            >
              <Columns3 className="size-4" /> Quadro
            </button>
          </div>
        </div>
      </div>

      {moveError && <ErrorBlock message={moveError} />}

      {people.length === 0 ? (
        <Card>
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>Nenhuma pessoa cadastrada ainda</EmptyTitle>
              <EmptyDescription>Cadastre os visitantes e novos convertidos do último culto para começar o acompanhamento.</EmptyDescription>
            </EmptyHeader>
            <Button asChild><Link to="/consolidacao/nova"><UserPlus /> Cadastrar a primeira pessoa</Link></Button>
          </Empty>
        </Card>
      ) : view === 'lista' ? (
        filtered.length === 0 ? (
          <Card><p className="p-10 text-center text-muted-foreground">Ninguém neste filtro. 🎉</p></Card>
        ) : (
          <>
            {/* Celular: cartões */}
            <div className="space-y-2 md:hidden">
              {filtered.map((p) => (
                <Card key={p.id} className="cursor-pointer p-4 active:bg-accent" onClick={() => navigate(`/consolidacao/pessoas/${p.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StageBadge stage={p.stage} short />
                        <TypeBadge type={p.type} />
                      </div>
                    </div>
                    <ContactButtons phone={p.phone} name={p.name} senderName={user?.name} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Visitou {relativeDays(p.visitDate)}</span>
                    <span>Último contato: {relativeDays(p.lastContactAt)}</span>
                    {isGestor && <span>{p.assignedTo?.name || 'Sem responsável'}</span>}
                  </div>
                  {(p.nextActionDate || p.alerts.firstContactLate || p.alerts.nextActionOverdue || p.alerts.cooling) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AlertIcons alerts={p.alerts} withText />
                      {p.nextActionDate && !p.alerts.nextActionOverdue && (
                        <span className="text-xs text-muted-foreground">Próximo passo {formatDate(p.nextActionDate)}</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop: tabela */}
            <Card className="hidden overflow-hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Etapa</TableHead>
                    {isGestor && <TableHead>Responsável</TableHead>}
                    <TableHead>Visita</TableHead>
                    <TableHead>Último contato</TableHead>
                    <TableHead>Próximo passo</TableHead>
                    <TableHead className="w-24 text-right">Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/consolidacao/pessoas/${p.id}`)}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{p.name}</span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <TypeBadge type={p.type} />
                            {p.phone && <span className="text-xs text-muted-foreground">{formatPhone(p.phone)}</span>}
                            <AlertIcons alerts={p.alerts} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell><StageBadge stage={p.stage} /></TableCell>
                      {isGestor && (
                        <TableCell className={cn(!p.assignedTo && 'text-muted-foreground italic')}>
                          {p.assignedTo?.name || 'Sem responsável'}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(p.visitDate)}
                        <span className="block text-xs text-muted-foreground">{relativeDays(p.visitDate)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {relativeDays(p.lastContactAt)}
                        <span className="block text-xs text-muted-foreground">
                          {p.contactAttempts} {p.contactAttempts === 1 ? 'tentativa' : 'tentativas'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-sm">
                        {p.nextActionDate ? (
                          <>
                            <span className={cn(p.alerts.nextActionOverdue && 'font-semibold text-destructive')}>{formatDate(p.nextActionDate)}</span>
                            {p.nextActionNote && <span className="block truncate text-xs text-muted-foreground">{p.nextActionNote}</span>}
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right"><ContactButtons phone={p.phone} name={p.name} senderName={user?.name} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )
      ) : (
        /* Quadro (kanban) */
        <div className="-mx-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
          <div className="flex min-w-max gap-3">
            {boardStages.map((stage) => {
              const items = filtered.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => { e.preventDefault(); if (overStage !== stage) setOverStage(stage); }}
                  onDragLeave={() => setOverStage(null)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(stage); }}
                  className={cn(
                    'flex w-64 flex-col rounded-xl border bg-muted/40 transition-colors',
                    overStage === stage && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                    <StageBadge stage={stage} short />
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex max-h-[65vh] min-h-32 flex-col gap-2 overflow-y-auto p-2">
                    {items.map((p) => (
                      <div
                        key={p.id}
                        draggable={!isSuspended}
                        onDragStart={(e) => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); }}
                        onDragEnd={() => { setDragId(null); setOverStage(null); }}
                        onClick={() => navigate(`/consolidacao/pessoas/${p.id}`)}
                        className={cn(
                          'cursor-grab rounded-lg border bg-card p-3 shadow-xs transition hover:border-primary/40 active:cursor-grabbing',
                          dragId === p.id && 'opacity-50',
                          (p.alerts.firstContactLate || p.alerts.nextActionOverdue) && 'border-l-4 border-l-destructive'
                        )}
                      >
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <TypeBadge type={p.type} />
                          <AlertIcons alerts={p.alerts} />
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div className="min-w-0 text-[11px] leading-tight text-muted-foreground">
                            <p className="truncate">{p.assignedTo?.name || 'Sem responsável'}</p>
                            <p>Contato {relativeDays(p.lastContactAt)}</p>
                          </div>
                          <ContactButtons phone={p.phone} name={p.name} senderName={user?.name} />
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Arraste para cá</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Arraste os cartões entre as colunas para mudar a etapa. Tudo fica registrado no histórico da pessoa.</p>
        </div>
      )}
    </div>
  );
};

export default PessoasPage;
