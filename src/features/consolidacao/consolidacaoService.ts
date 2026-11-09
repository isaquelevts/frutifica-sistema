import { apiFetch, API_URL, getToken } from '../../core/api/client';
import { UserRole } from '../../shared/types/types';

// ─── Tipos ────────────────────────────────────────────────────────────────

export type Stage = 'novo' | 'contatado' | 'convidado' | 'em_celula' | 'consolidado' | 'sem_retorno';
export type PersonType = 'visitante' | 'novo_convertido' | 'reconciliacao';
export type ActivityType =
  | 'whatsapp' | 'ligacao' | 'visita' | 'presencial'
  | 'convite_celula' | 'convite_culto' | 'nota'
  | 'cadastro' | 'etapa' | 'atribuicao';
export type Outcome = 'respondeu' | 'sem_resposta' | 'numero_invalido';
export type Access = 'gestor' | 'consolidador';

export interface Alerts {
  firstContactLate: boolean;
  nextActionOverdue: boolean;
  cooling: boolean;
  unassigned: boolean;
}

export interface PersonRef { id: string; name: string | null }

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | null;
  maritalStatus: string | null;
  neighborhood: string | null;
  address: string | null;
  type: PersonType;
  visitDate: string;
  service: string | null;
  howFound: string | null;
  invitedBy: string | null;
  prayerRequest: string | null;
  notes: string | null;
  stage: Stage;
  lostReason: string | null;
  assignedTo: PersonRef | null;
  createdBy: PersonRef | null;
  cell: { id: string; name: string; leaderName: string | null } | null;
  contactedAt: string | null;
  invitedAt: string | null;
  inCellAt: string | null;
  consolidatedAt: string | null;
  closedAt: string | null;
  returnedAt: string | null;
  lastContactAt: string | null;
  nextActionDate: string | null;
  nextActionNote: string | null;
  contactAttempts: number;
  alerts: Alerts;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  outcome: Outcome | null;
  note: string | null;
  fromStage: Stage | null;
  toStage: Stage | null;
  user: PersonRef | null;
  createdAt: string;
}

export interface PersonDetail extends Person {
  activities: Activity[];
}

export interface PersonInput {
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  neighborhood?: string;
  address?: string;
  type: PersonType;
  visitDate?: string;
  service?: string;
  howFound?: string;
  invitedBy?: string;
  prayerRequest?: string;
  notes?: string;
  assignedToId?: string | null;
  cellId?: string | null;
  ignoreDuplicate?: boolean;
}

export interface ActivityInput {
  type: ActivityType;
  outcome?: Outcome | null;
  note?: string;
  cellId?: string;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
}

export interface Responsible { id: string; name: string; access: Access }

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isCellLeader: boolean;
  access: 'gestor' | 'consolidador' | 'nenhum';
  temporaryPassword?: string;
  alreadyExisted?: boolean;
}

export interface Summary {
  period: { from: string; to: string };
  cohort: {
    total: number;
    byType: { label: string; count: number }[];
    byHowFound: { label: string; count: number }[];
    contacted: number;
    contactedWithinSla: number;
    avgHoursToFirstContact: number | null;
    invited: number;
    inCell: number;
    consolidated: number;
    closed: number;
    funnel: { stage: Stage; count: number }[];
    weekly: { week: string; cadastrados: number; contatados: number }[];
  };
  activities: {
    total: number;
    byType: { label: string; count: number }[];
    answered: number;
    unanswered: number;
  };
  current: {
    totalActive: number;
    open: number;
    byStage: Record<Stage, number>;
    waitingFirstContact: number;
    firstContactLate: number;
    nextActionOverdue: number;
    cooling: number;
    unassigned: number;
  };
  attention: (Pick<Person, 'id' | 'name' | 'phone' | 'stage' | 'type' | 'assignedTo' | 'createdAt' | 'lastContactAt' | 'nextActionDate' | 'alerts'>)[];
  byUser: {
    id: string;
    name: string;
    access: Access | null;
    open: number;
    waitingFirstContact: number;
    late: number;
    contactsInPeriod: number;
    consolidatedInPeriod: number;
    lastActivityAt: string | null;
  }[];
}

/** Erro com o cadastro duplicado anexado (HTTP 409 no POST de pessoa). */
export class DuplicatePersonError extends Error {
  constructor(message: string, public duplicate: { id: string; name: string }) {
    super(message);
  }
}

// ─── Acesso ───────────────────────────────────────────────────────────────

export function consolidationAccess(roles: string[] = []): Access | null {
  if (
    roles.includes(UserRole.SUPERADMIN) ||
    roles.includes(UserRole.ADMIN) ||
    roles.includes(UserRole.CONSOLIDACAO_GESTOR)
  ) return 'gestor';
  if (roles.includes(UserRole.CONSOLIDADOR)) return 'consolidador';
  return null;
}

// ─── API ──────────────────────────────────────────────────────────────────

const BASE = '/api/consolidacao';
const json = (body: unknown) => JSON.stringify(body);

export const consolidacaoApi = {
  listPeople: () => apiFetch<Person[]>(`${BASE}/pessoas`),
  getPerson: (id: string) => apiFetch<PersonDetail>(`${BASE}/pessoas/${id}`),

  async createPerson(input: PersonInput): Promise<Person> {
    // apiFetch descarta o corpo do erro; aqui precisamos dele para oferecer o cadastro duplicado.
    const res = await fetch(`${API_URL}${BASE}/pessoas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: json(input),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data?.duplicate) throw new DuplicatePersonError(data.message, data.duplicate);
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data as Person;
  },

  updatePerson: (id: string, input: Partial<PersonInput> & { nextActionDate?: string | null; nextActionNote?: string | null; returned?: boolean }) =>
    apiFetch<Person>(`${BASE}/pessoas/${id}`, { method: 'PUT', body: json(input) }),
  setStage: (id: string, stage: Stage, lostReason?: string) =>
    apiFetch<Person>(`${BASE}/pessoas/${id}/etapa`, { method: 'POST', body: json({ stage, lostReason }) }),
  addActivity: (id: string, input: ActivityInput) =>
    apiFetch<Person>(`${BASE}/pessoas/${id}/atividades`, { method: 'POST', body: json(input) }),
  assign: (id: string, assignedToId: string | null) =>
    apiFetch<Person>(`${BASE}/pessoas/${id}/responsavel`, { method: 'PUT', body: json({ assignedToId }) }),
  archive: (id: string) => apiFetch<void>(`${BASE}/pessoas/${id}`, { method: 'DELETE' }),

  responsibles: () => apiFetch<Responsible[]>(`${BASE}/responsaveis`),
  summary: (from: string, to: string) => apiFetch<Summary>(`${BASE}/resumo?from=${from}&to=${to}`),

  team: () => apiFetch<TeamMember[]>(`${BASE}/equipe`),
  setAccess: (userId: string, access: TeamMember['access']) =>
    apiFetch<TeamMember>(`${BASE}/equipe/${userId}`, { method: 'PUT', body: json({ access }) }),
  createMember: (input: { name: string; email: string; access: Access; password?: string }) =>
    apiFetch<TeamMember>(`${BASE}/equipe`, { method: 'POST', body: json(input) }),
};
