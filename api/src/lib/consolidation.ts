/**
 * Regras de negócio da consolidação (acompanhamento de visitantes e novos convertidos).
 *
 * Papéis (ficam no array `profiles.roles`, somados aos papéis de célula):
 *  - consolidacao_gestor: vê e gerencia tudo, distribui pessoas e libera acesso à equipe.
 *  - consolidador: cadastra pessoas e acompanha as que estão com ele (ou sem responsável).
 *  - admin/superadmin: equivalem a gestor.
 */
import { Prisma } from '@prisma/client';

export const ROLE_CONSOLIDADOR = 'consolidador';
export const ROLE_GESTOR = 'consolidacao_gestor';
export const CONSOLIDATION_ROLES = [ROLE_CONSOLIDADOR, ROLE_GESTOR];

export type Access = 'gestor' | 'consolidador' | null;

export function accessFromRoles(roles: string[] = []): Access {
  if (roles.includes('superadmin') || roles.includes('admin') || roles.includes(ROLE_GESTOR)) return 'gestor';
  if (roles.includes(ROLE_CONSOLIDADOR)) return 'consolidador';
  return null;
}

// ─── Funil ────────────────────────────────────────────────────────────────

/** Etapas em ordem. `sem_retorno` fica fora da sequência (pessoa encerrada). */
export const STAGES = ['novo', 'contatado', 'convidado', 'em_celula', 'consolidado'] as const;
export const CLOSED_STAGE = 'sem_retorno';
export type Stage = (typeof STAGES)[number] | typeof CLOSED_STAGE;

export function isValidStage(s: any): s is Stage {
  return s === CLOSED_STAGE || (STAGES as readonly string[]).includes(s);
}

/** Marco (timestamp) atingido ao chegar em cada etapa. */
const STAGE_MILESTONE: Record<string, 'contactedAt' | 'invitedAt' | 'inCellAt' | 'consolidatedAt' | undefined> = {
  novo: undefined,
  contatado: 'contactedAt',
  convidado: 'invitedAt',
  em_celula: 'inCellAt',
  consolidado: 'consolidatedAt',
};

export const PERSON_TYPES = ['visitante', 'novo_convertido', 'reconciliacao'];

export const ACTIVITY_TYPES = [
  'whatsapp', 'ligacao', 'visita', 'presencial', // contatos
  'convite_celula', 'convite_culto',              // convites
  'nota',                                         // observação livre
];
/** Tipos gerados pelo sistema — não podem ser criados manualmente. */
export const SYSTEM_ACTIVITY_TYPES = ['cadastro', 'etapa', 'atribuicao'];
export const CONTACT_TYPES = ['whatsapp', 'ligacao', 'visita', 'presencial'];
export const OUTCOMES = ['respondeu', 'sem_resposta', 'numero_invalido'];

/**
 * Calcula os campos a gravar ao mover a pessoa para `target`.
 * Avançar preenche os marcos que faltam; voltar limpa os marcos posteriores,
 * para que o painel nunca mostre "consolidado" com a etapa em "contatado".
 */
export function stageTransition(
  current: { contactedAt: Date | null; invitedAt: Date | null; inCellAt: Date | null; consolidatedAt: Date | null },
  target: Stage,
  now = new Date()
): Prisma.ConsolidationPersonUpdateInput {
  if (target === CLOSED_STAGE) {
    return { stage: CLOSED_STAGE, closedAt: now };
  }

  const data: Prisma.ConsolidationPersonUpdateInput = { stage: target, closedAt: null, lostReason: null };
  const targetIdx = STAGES.indexOf(target);
  STAGES.forEach((s, idx) => {
    const field = STAGE_MILESTONE[s];
    if (!field) return;
    if (idx <= targetIdx) {
      if (!current[field]) (data as any)[field] = now;
    } else {
      (data as any)[field] = null;
    }
  });
  return data;
}

export function stageIndex(stage: string): number {
  return (STAGES as readonly string[]).indexOf(stage);
}

// ─── Datas ────────────────────────────────────────────────────────────────

/** Data de hoje (YYYY-MM-DD) no horário de Brasília. */
export function todayBR(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/** Prazo para o primeiro contato antes de a pessoa aparecer como atrasada. */
export const FIRST_CONTACT_SLA_HOURS = 48;
/** Sem nenhuma interação há este tempo (em etapas ativas) = "esfriando". */
export const COOLING_DAYS = 14;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface AlertFlags {
  firstContactLate: boolean;
  nextActionOverdue: boolean;
  cooling: boolean;
  unassigned: boolean;
}

export function computeAlerts(
  p: {
    stage: string;
    createdAt: Date;
    lastContactAt: Date | null;
    nextActionDate: string | null;
    assignedToId: string | null;
    updatedAt: Date;
  },
  now = new Date()
): AlertFlags {
  const open = p.stage !== CLOSED_STAGE && p.stage !== 'consolidado';
  const lastTouch = p.lastContactAt ?? p.createdAt;
  return {
    firstContactLate: p.stage === 'novo' && now.getTime() - p.createdAt.getTime() > FIRST_CONTACT_SLA_HOURS * HOUR,
    nextActionOverdue: open && !!p.nextActionDate && p.nextActionDate < todayBR(now),
    cooling: open && p.stage !== 'novo' && now.getTime() - lastTouch.getTime() > COOLING_DAYS * DAY,
    unassigned: open && !p.assignedToId,
  };
}

// ─── Saneamento de entrada ────────────────────────────────────────────────

export function cleanStr(v: any, max = 500): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export function cleanDate(v: any): string | null {
  const s = cleanStr(v, 10);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
