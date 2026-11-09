import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowRight, Clock, HeartHandshake, Hourglass, PhoneCall, Snowflake, UserPlus, UserX, Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useSummary } from './hooks';
import { ACTIVITY_LABELS, PERSON_TYPES, STAGES, STAGE_ORDER } from './constants';
import { AlertIcons, ErrorBlock, LoadingBlock, PageHeader, StageBadge } from './components';
import { addDays, formatDate, relativeDays, todayISO } from './utils';
import type { ActivityType, PersonType } from './consolidacaoService';

type Period = '7' | '30' | '90' | 'ano';
const PERIODS: { id: Period; label: string }[] = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
  { id: 'ano', label: 'Este ano' },
];

const funnelConfig = { count: { label: 'Pessoas', color: 'var(--chart-1)' } } satisfies ChartConfig;
const weeklyConfig = {
  cadastrados: { label: 'Cadastrados', color: 'var(--chart-2)' },
  contatados: { label: 'Contatados', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-5">
      <div className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
    </CardHeader>
  </Card>
);

const AlertTile: React.FC<{ label: string; count: number; icon: React.ReactNode; to: string; tone: 'red' | 'amber' | 'sky' | 'muted' }> = ({ label, count, icon, to, tone }) => {
  const tones = {
    red: 'text-destructive bg-destructive/10',
    amber: 'text-amber-700 bg-amber-100',
    sky: 'text-sky-700 bg-sky-100',
    muted: 'text-muted-foreground bg-muted',
  };
  return (
    <Link to={to} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4', count > 0 ? tones[tone] : tones.muted)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums leading-none">{count}</p>
          <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
        </div>
        <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
};

const BarList: React.FC<{ items: { label: string; count: number }[]; total: number }> = ({ items, total }) => (
  <ul className="space-y-2.5">
    {items.map((i) => (
      <li key={i.label} className="text-sm">
        <div className="mb-1 flex justify-between gap-2">
          <span className="truncate">{i.label}</span>
          <span className="tabular-nums text-muted-foreground">{i.count} · {pct(i.count, total)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-[var(--chart-1)]" style={{ width: `${pct(i.count, total)}%` }} />
        </div>
      </li>
    ))}
  </ul>
);

const PainelConsolidacao: React.FC = () => {
  const [period, setPeriod] = useState<Period>('30');
  const { from, to } = useMemo(() => {
    const today = todayISO();
    if (period === 'ano') return { from: `${today.slice(0, 4)}-01-01`, to: today };
    return { from: addDays(today, -(Number(period) - 1)), to: today };
  }, [period]);

  const { data, isLoading, error } = useSummary(from, to);

  if (isLoading) return <LoadingBlock label="Montando o painel..." />;
  if (error || !data) return <ErrorBlock message={(error as Error)?.message || 'Erro ao carregar o painel'} />;

  const { cohort, current, activities } = data;
  const funnel = cohort.funnel.map((f, idx) => ({
    name: STAGES[f.stage].short,
    count: f.count,
    rate: idx === 0 ? null : `${pct(f.count, cohort.total)}%`,
  }));
  const weekly = cohort.weekly.map((w) => ({ ...w, label: formatDate(w.week).slice(0, 5) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel da Consolidação"
        description={`Como está o acompanhamento de visitantes e novos convertidos · ${formatDate(from)} a ${formatDate(to)}`}
        actions={
          <>
            <div className="flex rounded-md border p-0.5" role="group" aria-label="Período">
              {PERIODS.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={cn('rounded px-3 py-1 text-sm', period === p.id ? 'bg-muted font-semibold' : 'text-muted-foreground')}>
                  {p.label}
                </button>
              ))}
            </div>
            <Button asChild><Link to="/consolidacao/nova"><UserPlus /> Cadastrar</Link></Button>
          </>
        }
      />

      {/* Indicadores do período */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Cadastrados no período" value={cohort.total} icon={<UserPlus className="size-4" />}
          sub={cohort.byType.map((t) => `${t.count} ${PERSON_TYPES[t.label as PersonType]?.toLowerCase() || t.label}`).join(' · ') || 'Nenhum cadastro'}
        />
        <Kpi
          label="Contatados em até 48h" value={`${pct(cohort.contactedWithinSla, cohort.total)}%`} icon={<PhoneCall className="size-4" />}
          sub={`${cohort.contactedWithinSla} de ${cohort.total} · ${cohort.contacted} contatados no total`}
        />
        <Kpi
          label="Tempo médio até 1º contato" icon={<Hourglass className="size-4" />}
          value={cohort.avgHoursToFirstContact === null ? '—' : cohort.avgHoursToFirstContact < 24 ? `${Math.round(cohort.avgHoursToFirstContact)}h` : `${(cohort.avgHoursToFirstContact / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`}
          sub="Do cadastro à primeira conversa"
        />
        <Kpi
          label="Em célula ou consolidados" value={cohort.inCell} icon={<HeartHandshake className="size-4" />}
          sub={`${pct(cohort.inCell, cohort.total)}% dos cadastrados · ${cohort.consolidated} consolidados`}
        />
      </div>

      {/* Situação agora */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Precisa de ação agora</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <AlertTile label="Aguardando 1º contato" count={current.waitingFirstContact} icon={<Clock />} tone="sky" to="/consolidacao/pessoas?filtro=abertos" />
          <AlertTile label="Sem contato há +48h" count={current.firstContactLate} icon={<AlertTriangle />} tone="red" to="/consolidacao/pessoas?filtro=atrasados" />
          <AlertTile label="Próximo passo vencido" count={current.nextActionOverdue} icon={<Clock />} tone="amber" to="/consolidacao/pessoas?filtro=vencidos" />
          <AlertTile label="Esfriando (14+ dias)" count={current.cooling} icon={<Snowflake />} tone="sky" to="/consolidacao/pessoas?filtro=esfriando" />
          <AlertTile label="Sem responsável" count={current.unassigned} icon={<UserX />} tone="amber" to="/consolidacao/pessoas?filtro=sem_responsavel" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil do período</CardTitle>
            <CardDescription>Dos cadastrados no período, quantos chegaram a cada etapa</CardDescription>
          </CardHeader>
          <CardContent>
            {cohort.total === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro no período.</p>
            ) : (
              <ChartContainer config={funnelConfig} className="aspect-auto h-[240px] w-full">
                <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap={8}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={84} tickLine={false} axisLine={false} />
                  <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent hideLabel={false} />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    <LabelList dataKey="rate" position="right" fill="var(--muted-foreground)" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastros por semana</CardTitle>
            <CardDescription>Pessoas cadastradas e quantas delas já foram contatadas</CardDescription>
          </CardHeader>
          <CardContent>
            {weekly.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro no período.</p>
            ) : (
              <>
                <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
                  {Object.entries(weeklyConfig).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm" style={{ background: v.color }} /> {v.label}
                    </span>
                  ))}
                </div>
                <ChartContainer config={weeklyConfig} className="aspect-auto h-[216px] w-full">
                  <BarChart data={weekly} barGap={2}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent labelFormatter={(l) => `Semana de ${l}`} />} />
                    <Bar dataKey="cadastrados" fill="var(--color-cadastrados)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="contatados" fill="var(--color-contatados)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Por responsável */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Equipe</CardTitle>
            <CardDescription>Carga e ritmo de cada consolidador</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild><Link to="/consolidacao/equipe"><Users /> Gerenciar acessos</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.byUser.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Ninguém na equipe ainda. <Link className="text-primary underline" to="/consolidacao/equipe">Libere o acesso</Link> para os consolidadores.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Consolidador</TableHead>
                    <TableHead className="text-right">Acompanhando</TableHead>
                    <TableHead className="text-right">Aguardando 1º contato</TableHead>
                    <TableHead className="text-right">Atrasados</TableHead>
                    <TableHead className="text-right">Contatos no período</TableHead>
                    <TableHead className="text-right">Consolidados</TableHead>
                    <TableHead className="pr-6">Última atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byUser.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-6 font-medium">
                        <Link className="hover:underline" to={`/consolidacao/pessoas?filtro=abertos&responsavel=${u.id}`}>{u.name}</Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.open}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.waitingFirstContact}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', u.late > 0 && 'font-semibold text-destructive')}>
                        {u.late > 0 && <AlertTriangle className="mr-1 inline size-3.5" aria-label="atrasados" />}{u.late}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.contactsInPeriod}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.consolidatedInPeriod}</TableCell>
                      <TableCell className="pr-6 text-sm text-muted-foreground">{u.lastActivityAt ? relativeDays(u.lastActivityAt) : 'nenhuma'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Atenção */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quem precisa de atenção</CardTitle>
            <CardDescription>Atrasados, passos vencidos, esfriando ou sem responsável — mais antigos primeiro</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.attention.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Tudo em dia. 🙌</p>
            ) : (
              <ul className="divide-y">
                {data.attention.map((p) => (
                  <li key={p.id}>
                    <Link to={`/consolidacao/pessoas/${p.id}`} className="flex flex-col gap-1.5 px-6 py-3 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.assignedTo?.name || 'Sem responsável'} · cadastrado {relativeDays(p.createdAt)} · último contato {relativeDays(p.lastContactAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StageBadge stage={p.stage} short />
                        <AlertIcons alerts={p.alerts} showUnassigned withText />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Situação geral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as pessoas por etapa</CardTitle>
              <CardDescription>{current.totalActive} pessoas cadastradas no total</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[...STAGE_ORDER, 'sem_retorno' as const].map((s) => (
                  <li key={s} className="flex items-center justify-between text-sm">
                    <StageBadge stage={s} />
                    <span className="font-semibold tabular-nums">{current.byStage[s] || 0}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como conheceram a igreja</CardTitle>
              <CardDescription>Cadastrados no período</CardDescription>
            </CardHeader>
            <CardContent>
              {cohort.byHowFound.length ? <BarList items={cohort.byHowFound} total={cohort.total} /> : <p className="text-sm text-muted-foreground">Sem dados.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividade da equipe</CardTitle>
              <CardDescription>
                {activities.total} registros no período · {activities.answered} contatos com resposta, {activities.unanswered} sem resposta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.byType.length ? (
                <BarList items={activities.byType.map((a) => ({ label: ACTIVITY_LABELS[a.label as ActivityType] || a.label, count: a.count }))} total={activities.total} />
              ) : <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PainelConsolidacao;
