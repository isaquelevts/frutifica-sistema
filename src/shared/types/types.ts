/**
 * @deprecated This file contains legacy hand-written types.
 * Prefer auto-generated types from `core/supabase/types.ts` and `core/supabase/database.types.ts`.
 * This file will be removed in Etapa 4 (feature-based restructuring).
 */

export enum TargetAudience {
  MEN = 'Homens',
  WOMEN = 'Mulheres',
  YOUTH = 'Jovens',
  KIDS = 'Crianças',
  MIXED = 'Misto',
  COUPLES = 'Casais',
  FAMILY = 'Família'
}

export enum CellType {
  NORMAL = 'Célula Comum',
  FRIEND_DAY = 'Célula do Amigo',
  FELLOWSHIP = 'Célula de Comunhão',
  JOINT = 'Juntamos com outra célula'
}

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  LEADER = 'leader',
  COLEADER = 'coleader',
  INTRODUTOR = 'introdutor'
}

export enum TipoCulto {
  DOMINGO = 'domingo',
  JOVENS = 'jovens',
  MULHERES = 'mulheres',
  HOMENS = 'homens',
  ESPECIAL = 'especial'
}

export enum StatusKanban {
  NOVO = 'novo',
  CONTATO = 'contato',
  INTEGRADO = 'integrado'
}

export enum TipoContato {
  WHATSAPP = 'whatsapp',
  LIGACAO = 'ligacao',
  VISITA = 'visita',
  OUTRO = 'outro'
}

export enum MemberType {
  MEMBER = 'Membro',
  VISITOR = 'Visitante'
}

export type PlanType = 'free' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string; // Nome da Igreja
  slug?: string;
  createdAt: string;
  plan: PlanType;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'suspended';
  subscriptionId?: string; // Stripe Subscription ID
  maxCells?: number; // Limit based on plan
}

export interface User {
  id: string;
  organizationId: string; // Multi-tenant link
  name: string;
  email: string;
  password?: string;
  roles: UserRole[];
  cellId?: string;
  birthday?: string;
}

export interface CoLeader {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Generation {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  leaderId?: string;
  leaderName?: string; // For display purposes
  color?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cell {
  id: string;
  organizationId: string; // Multi-tenant link
  name: string;
  leaderName: string;
  coLeaders: CoLeader[];
  leaderId?: string;
  generationId?: string; // Links to generations table
  whatsapp: string;
  dayOfWeek: string;
  targetAudience: TargetAudience;
  time: string;
  address: string;
  lat?: number;
  lng?: number;
  active: boolean;
}

export interface Member {
  id: string;
  organizationId: string; // Multi-tenant link
  cellId: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  type: MemberType;
  attendanceCount: number;
  firstVisitDate: string;
  conversionDate?: string;
  promotionDate?: string;
  createdAt: string;
  active: boolean;
}

export interface Report {
  id: string;
  organizationId: string; // Multi-tenant link
  cellId: string;
  cellName: string;
  happened: boolean;
  type?: CellType;

  participants: number;
  visitors: number;
  conversions: number;

  attendanceList?: string[];
  conversionsList?: string[];
  newVisitorsList?: Partial<Member>[];

  date: string;
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCells: number;
  totalReports: number;
  avgAttendance: number;
  totalVisitors: number;
}

export interface Culto {
  id: string;
  organizationId: string; // Multi-tenant link
  data: string;
  hora: string;
  tipo: TipoCulto;
  observacoes?: string;
  criadoPor: string;
  criadoEm: string;
}

export interface Visitante {
  id: string;
  organizationId: string; // Multi-tenant link
  nome: string;
  telefone: string;
  endereco?: string;
  email?: string;
  birthday?: string;
  cultoId?: string;
  dataPrimeiraVisita: string;
  primeiraVez: boolean;
  tipoOrigem: 'convertido' | 'visitante' | 'reconciliacao';
  celulaOrigemId?: string;
  jaParticipaCelula?: boolean;

  statusKanban: StatusKanban;
  responsavelId: string;

  ultimoContato?: string;
  proximaAcao?: string;
  proximaAcaoData?: string;

  celulaDestinoId?: string;
  dataIntegracao?: string;

  presencasNaCelula: number;

  observacoes?: string;
  tags: string[];

  criadoEm: string;
  atualizadoEm: string;
}

export interface ContatoVisitante {
  id: string;
  organizationId: string; // Multi-tenant link
  visitanteId: string;
  usuarioId: string;
  data: string;
  tipo: TipoContato;
  descricao: string;
  proximaAcao?: string;
  proximaAcaoData?: string;
  criadoEm: string;
}