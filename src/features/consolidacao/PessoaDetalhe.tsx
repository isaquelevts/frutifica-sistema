import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Archive, Ban, CalendarClock, Check, CheckCircle2, Church, Clock, Heart, History,
  Home, Loader2, MessageCircle, MessageSquareText, Pencil, Phone, RotateCcw, Send, StickyNote, UserCheck,
  UserPlus, Users,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useIsSuspended } from '../../shared/hooks/useIsSuspended';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType, Outcome, PersonDetail, Stage } from './consolidacaoService';
import {
  useAddActivity, useArchivePerson, useAssign, useConsolidationAccess, usePerson, useResponsibles,
  useSetStage, useUpdatePerson,
} from './hooks';
import { ACTIVITY_LABELS, LOST_REASONS, OUTCOME_LABELS, STAGES, STAGE_ORDER } from './constants';
import { AlertIcons, ContactButtons, ErrorBlock, FieldLabel, LoadingBlock, NativeSelect, StageBadge, TypeBadge } from './components';
import { addDays, alertLabels, formatDate, formatDateTime, formatPhone, relativeDays, todayISO } from './utils';

const STAGE_DATE_FIELD: Record<Stage, keyof PersonDetail | null> = {
  novo: 'createdAt', contatado: 'contactedAt', convidado: 'invitedAt',
  em_celula: 'inCellAt', consolidado: 'consolidatedAt', sem_retorno: 'closedAt',
};

const ACTION_BUTTONS: { type: ActivityType; label: string; icon: React.ReactNode }[] = [
  { type: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle /> },
  { type: 'ligacao', label: 'Ligação', icon: <Phone /> },
  { type: 'visita', label: 'Visita', icon: <Home /> },
  { type: 'presencial', label: 'Presencial', icon: <Users /> },
  { type: 'convite_celula', label: 'Convite célula', icon: <Send /> },
  { type: 'convite_culto', label: 'Convite culto', icon: <Church /> },
  { type: 'nota', label: 'Anotação', icon: <StickyNote /> },
];

const CONTACT_TYPES: ActivityType[] = ['whatsapp', 'ligacao', 'visita', 'presencial'];

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  whatsapp: <MessageCircle className="size-4" />, ligacao: <Phone className="size-4" />, visita: <Home className="size-4" />,
  presencial: <Users className="size-4" />, convite_celula: <Send className="size-4" />, convite_culto: <Church className="size-4" />,
  nota: <StickyNote className="size-4" />, cadastro: <UserPlus className="size-4" />, etapa: <CheckCircle2 className="size-4" />,
  atribuicao: <UserCheck className="size-4" />,
};

// ─── Funil (stepper) ──────────────────────────────────────────────────────

const StageStepper: React.FC<{ person: PersonDetail; disabled: boolean; onSelect: (s: Stage) => void }> = ({ person, disabled, onSelect }) => {
  const closed = person.stage === 'sem_retorno';
  const currentIdx = STAGE_ORDER.indexOf(person.stage);
  return (
    <ol className="grid grid-cols-5 gap-1 sm:gap-2">
      {STAGE_ORDER.map((s, idx) => {
        const date = person[STAGE_DATE_FIELD[s]!] as string | null;
        const done = !closed ? idx <= currentIdx : !!date;
        const current = s === person.stage;
        return (
          <li key={s}>
            <button
              type="button"
              disabled={disabled || current}
              onClick={() => onSelect(s)}
              className={cn(
                'group flex w-full flex-col items-center gap-1.5 rounded-lg p-1.5 text-center transition-colors enabled:hover:bg-accent',
                current && 'bg-primary/5'
              )}
              title={current ? 'Etapa atual' : `Mover para "${STAGES[s].label}"`}
            >
              <span className={cn('h-1.5 w-full rounded-full', done ? 'bg-primary' : 'bg-muted')} />
              <span className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold',
                done ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
              )}>
                {done ? <Check className="size-4" /> : idx + 1}
              </span>
              <span className={cn('text-[11px] leading-tight sm:text-xs', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {STAGES[s].short}
              </span>
              <span className="hidden text-[10px] text-muted-foreground sm:block">{date ? formatDate(date) : ' '}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

// ─── Registrar acompanhamento ─────────────────────────────────────────────

const ActivityComposer: React.FC<{ person: PersonDetail; disabled: boolean }> = ({ person, disabled }) => {
  const { user } = useAuth();
  const { data: allCells = [] } = useCells(user?.organizationId);
  const cells = allCells.filter((c) => c.active !== false);
  const add = useAddActivity(person.id);

  const [type, setType] = useState<ActivityType>('whatsapp');
  const [outcome, setOutcome] = useState<Outcome>('respondeu');
  const [note, setNote] = useState('');
  const [cellId, setCellId] = useState(person.cell?.id || '');
  const [nextDate, setNextDate] = useState('');
  const [nextNote, setNextNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const isContact = CONTACT_TYPES.includes(type);

  const submit = async () => {
    setError(''); setOk('');
    if (type === 'nota' && !note.trim()) { setError('Escreva a anotação.'); return; }
    try {
      const before = person.stage;
      const updated = await add.mutateAsync({
        type,
        outcome: isContact ? outcome : null,
        note: note.trim() || undefined,
        cellId: type === 'convite_celula' && cellId ? cellId : undefined,
        ...(nextDate || nextNote ? { nextActionDate: nextDate || null, nextActionNote: nextNote || null } : {}),
      });
      setNote(''); setNextDate(''); setNextNote('');
      setOk(updated.stage !== before ? `Registrado. Etapa atualizada para "${STAGES[updated.stage].label}".` : 'Registrado.');
      setTimeout(() => setOk(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Não foi possível registrar.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><MessageSquareText className="size-4" /> Registrar acompanhamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {ACTION_BUTTONS.map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={() => setType(b.type)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition-colors [&_svg]:size-4',
                type === b.type ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-accent'
              )}
            >
              {b.icon}
              {b.label}
            </button>
          ))}
        </div>

        {isContact && (
          <div>
            <FieldLabel>Resultado</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    outcome === o ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent'
                  )}
                >
                  {OUTCOME_LABELS[o]}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'convite_celula' && (
          <div>
            <FieldLabel htmlFor="invite-cell">Célula</FieldLabel>
            <NativeSelect id="invite-cell" value={cellId} onChange={(e) => setCellId(e.target.value)}>
              <option value="">— escolher depois —</option>
              {cells.map((c) => <option key={c.id} value={c.id}>{c.name}{c.dayOfWeek ? ` · ${c.dayOfWeek}` : ''}{c.time ? ` ${c.time}` : ''}</option>)}
            </NativeSelect>
          </div>
        )}

        <div>
          <FieldLabel htmlFor="act-note">{type === 'nota' ? 'Anotação' : 'Como foi'}</FieldLabel>
          <Textarea id="act-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'nota' ? 'Escreva aqui...' : 'Ex.: Conversamos, pediu oração pela família, quer conhecer a célula'} />
        </div>

        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="size-4" /> Próximo passo <span className="font-normal text-muted-foreground">(opcional)</span></p>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {[{ l: 'Amanhã', d: 1 }, { l: 'Em 3 dias', d: 3 }, { l: 'Próxima semana', d: 7 }].map((q) => (
              <button key={q.d} type="button" onClick={() => setNextDate(addDays(todayISO(), q.d))}
                className={cn('rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent', nextDate === addDays(todayISO(), q.d) && 'border-primary text-primary')}>
                {q.l}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <Input type="date" value={nextDate} min={todayISO()} onChange={(e) => setNextDate(e.target.value)} aria-label="Data do próximo passo" />
            <Input value={nextNote} onChange={(e) => setNextNote(e.target.value)} placeholder="Ex.: Levar na célula de quinta" aria-label="Descrição do próximo passo" />
          </div>
        </div>

        {error && <ErrorBlock message={error} />}
        {ok && <p className="flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 className="size-4" /> {ok}</p>}

        <Button className="w-full sm:w-auto" onClick={submit} disabled={disabled || add.isPending}>
          {add.isPending && <Loader2 className="animate-spin" />} Registrar
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Linha do tempo ───────────────────────────────────────────────────────

function describe(a: Activity): string {
  if (a.type === 'etapa') {
    if (a.toStage === 'sem_retorno') return 'Marcado como sem retorno';
    if (a.fromStage === 'sem_retorno') return `Reaberto em "${STAGES[a.toStage!].label}"`;
    return `Etapa: ${a.fromStage ? STAGES[a.fromStage].short + ' → ' : ''}${STAGES[a.toStage!].label}`;
  }
  return ACTIVITY_LABELS[a.type];
}

const Timeline: React.FC<{ activities: Activity[] }> = ({ activities }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base"><History className="size-4" /> Histórico</CardTitle>
    </CardHeader>
    <CardContent>
      <ol className="relative space-y-4 border-l pl-5">
        {activities.map((a) => (
          <li key={a.id} className="relative">
            <span className={cn(
              'absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background',
              a.type === 'etapa' ? 'text-primary' : 'text-muted-foreground'
            )}>
              {ACTIVITY_ICONS[a.type]}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">{describe(a)}</span>
              {a.outcome && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-medium',
                  a.outcome === 'respondeu' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground')}>
                  {OUTCOME_LABELS[a.outcome]}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}{a.user?.name ? ` · ${a.user.name}` : ''}</p>
            {a.note && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{a.note}</p>}
          </li>
        ))}
      </ol>
    </CardContent>
  </Card>
);

// ─── Página ───────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value ? (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  ) : null;

const PessoaDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const access = useConsolidationAccess();
  const isGestor = access === 'gestor';
  const isSuspended = useIsSuspended();

  const { data: person, isLoading, error } = usePerson(id);
  const { data: responsibles = [] } = useResponsibles();
  const { data: allCells = [] } = useCells(user?.organizationId);
  const cells = allCells.filter((c) => c.active !== false);
  const setStage = useSetStage();
  const assign = useAssign();
  const archive = useArchivePerson();
  const update = useUpdatePerson(id || '');

  const [actionError, setActionError] = useState('');
  const [closing, setClosing] = useState(false);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [nextDate, setNextDate] = useState('');
  const [nextNote, setNextNote] = useState('');

  useEffect(() => {
    if (person) { setNextDate(person.nextActionDate || ''); setNextNote(person.nextActionNote || ''); }
  }, [person?.nextActionDate, person?.nextActionNote]);

  if (isLoading) return <LoadingBlock />;
  if (error || !person) return <ErrorBlock message={(error as Error)?.message || 'Pessoa não encontrada'} />;

  const run = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try { await fn(); } catch (e: any) { setActionError(e.message || 'Não foi possível salvar.'); }
  };

  const changeStage = (stage: Stage) => {
    if (!confirm(`Mover ${person.name} para "${STAGES[stage].label}"?`)) return;
    run(() => setStage.mutateAsync({ id: person.id, stage }));
  };

  const isMine = person.assignedTo?.id === user?.id;
  const closed = person.stage === 'sem_retorno';
  const busy = isSuspended || setStage.isPending;
  const alerts = alertLabels(person.alerts);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar" className="shrink-0">
            <ArrowLeft />
          </Button>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold leading-tight">{person.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <StageBadge stage={person.stage} />
              <TypeBadge type={person.type} />
              <AlertIcons alerts={person.alerts} withText showUnassigned />
            </div>
            <p className="text-sm text-muted-foreground">
              Visitou em {formatDate(person.visitDate)}{person.service ? ` · ${person.service}` : ''} · cadastrado por {person.createdBy?.name || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-11 lg:pl-0">
          <ContactButtons phone={person.phone} name={person.name} senderName={user?.name} size="sm" />
          <Button variant="outline" size="sm" asChild>
            <Link to={`/consolidacao/pessoas/${person.id}/editar`}><Pencil /> Editar</Link>
          </Button>
          {isGestor && (
            <Button
              variant="outline" size="sm" className="text-destructive" disabled={isSuspended}
              onClick={() => {
                if (!confirm(`Arquivar ${person.name}? A pessoa sai das listas e do painel.`)) return;
                run(async () => { await archive.mutateAsync(person.id); navigate('/consolidacao/pessoas'); });
              }}
            >
              <Archive /> Arquivar
            </Button>
          )}
        </div>
      </div>

      {actionError && <ErrorBlock message={actionError} />}

      {/* Funil */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Caminho da consolidação</p>
            {closed ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setStage.mutateAsync({ id: person.id, stage: person.contactedAt ? 'contatado' : 'novo' }))}>
                <RotateCcw /> Reabrir
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => setClosing((v) => !v)}>
                <Ban /> Sem retorno
              </Button>
            )}
          </div>
          {closed && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Encerrado em {formatDate(person.closedAt)}{person.lostReason ? ` — ${person.lostReason}` : ''}.
            </p>
          )}
          {closing && !closed && (
            <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FieldLabel htmlFor="lost">Motivo</FieldLabel>
                <NativeSelect id="lost" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
                  {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
                </NativeSelect>
              </div>
              <Button variant="destructive" disabled={busy} onClick={() => run(async () => {
                await setStage.mutateAsync({ id: person.id, stage: 'sem_retorno', lostReason });
                setClosing(false);
              })}>
                Confirmar
              </Button>
            </div>
          )}
          <StageStepper person={person} disabled={busy} onSelect={changeStage} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {!closed && <ActivityComposer person={person} disabled={isSuspended} />}
          <Timeline activities={person.activities} />
        </div>

        <div className="space-y-5">
          {/* Responsável */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Responsável</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isGestor ? (
                <NativeSelect
                  value={person.assignedTo?.id || ''}
                  disabled={isSuspended || assign.isPending}
                  onChange={(e) => run(() => assign.mutateAsync({ id: person.id, assignedToId: e.target.value || null }))}
                  aria-label="Responsável"
                >
                  <option value="">Sem responsável</option>
                  {responsibles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </NativeSelect>
              ) : (
                <p className="text-sm">{person.assignedTo?.name || <span className="italic text-muted-foreground">Sem responsável</span>}</p>
              )}
              {!isGestor && !person.assignedTo && (
                <Button className="w-full" disabled={isSuspended} onClick={() => run(() => assign.mutateAsync({ id: person.id, assignedToId: 'me' }))}>
                  <UserCheck /> Assumir acompanhamento
                </Button>
              )}
              {!isGestor && isMine && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={isSuspended}
                  onClick={() => confirm('Devolver esta pessoa para o gestor distribuir?') && run(() => assign.mutateAsync({ id: person.id, assignedToId: null }))}>
                  Devolver para o gestor
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Próximo passo */}
          <Card className={cn(person.alerts.nextActionOverdue && 'border-destructive/50')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4" /> Próximo passo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} aria-label="Data do próximo passo" />
              <Input value={nextNote} onChange={(e) => setNextNote(e.target.value)} placeholder="O que fazer" aria-label="Próximo passo" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" disabled={isSuspended || update.isPending ||
                  (nextDate === (person.nextActionDate || '') && nextNote === (person.nextActionNote || ''))}
                  onClick={() => run(() => update.mutateAsync({ nextActionDate: nextDate || null, nextActionNote: nextNote || null }))}>
                  Salvar
                </Button>
                {person.nextActionDate && (
                  <Button size="sm" variant="ghost" disabled={isSuspended}
                    onClick={() => run(() => update.mutateAsync({ nextActionDate: null, nextActionNote: null }))}>
                    <Check /> Feito
                  </Button>
                )}
              </div>
              {person.alerts.nextActionOverdue && <p className="text-xs font-medium text-destructive">Vencido {relativeDays(person.nextActionDate)}</p>}
            </CardContent>
          </Card>

          {/* Célula e retorno */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Integração</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <FieldLabel htmlFor="cell">Célula</FieldLabel>
                <NativeSelect id="cell" value={person.cell?.id || ''} disabled={isSuspended || update.isPending}
                  onChange={(e) => run(() => update.mutateAsync({ cellId: e.target.value || null }))}>
                  <option value="">—</option>
                  {cells.map((c) => <option key={c.id} value={c.id}>{c.name}{c.leaderName ? ` · ${c.leaderName}` : ''}</option>)}
                </NativeSelect>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={!!person.returnedAt} disabled={isSuspended || update.isPending}
                  onChange={(e) => run(() => update.mutateAsync({ returned: e.target.checked }))} />
                Voltou a um culto {person.returnedAt && <span className="text-muted-foreground">({formatDate(person.returnedAt)})</span>}
              </label>
            </CardContent>
          </Card>

          {/* Dados */}
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">Dados</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Telefone" value={formatPhone(person.phone)} />
                <InfoRow label="Email" value={person.email} />
                <InfoRow label="Nascimento" value={person.birthDate && formatDate(person.birthDate)} />
                <InfoRow label="Sexo" value={person.gender === 'F' ? 'Feminino' : person.gender === 'M' ? 'Masculino' : null} />
                <InfoRow label="Estado civil" value={person.maritalStatus} />
                <InfoRow label="Bairro" value={person.neighborhood} />
                <InfoRow label="Endereço" value={person.address} />
                <InfoRow label="Conheceu por" value={person.howFound} />
                <InfoRow label="Convidado por" value={person.invitedBy} />
                <InfoRow label="Observações" value={person.notes && <span className="whitespace-pre-wrap">{person.notes}</span>} />
              </dl>
              {person.prayerRequest && (
                <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm">
                  <p className="mb-1 flex items-center gap-1.5 font-medium text-primary"><Heart className="size-4" /> Pedido de oração</p>
                  <p className="whitespace-pre-wrap">{person.prayerRequest}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {alerts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Alertas aparecem quando: o primeiro contato passa de 48h, o próximo passo vence ou não há interação há 14 dias.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PessoaDetalhe;
