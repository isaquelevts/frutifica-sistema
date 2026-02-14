import { Database } from './database.types';

type Tables = Database['public']['Tables'];

// Organizations
export type OrganizationRow = Tables['organizations']['Row'];
export type OrganizationInsert = Tables['organizations']['Insert'];
export type OrganizationUpdate = Tables['organizations']['Update'];

// Profiles
export type ProfileRow = Tables['profiles']['Row'];
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];

// Cells
export type CellRow = Tables['cells']['Row'];
export type CellInsert = Tables['cells']['Insert'];
export type CellUpdate = Tables['cells']['Update'];

// Members
export type MemberRow = Tables['members']['Row'];
export type MemberInsert = Tables['members']['Insert'];
export type MemberUpdate = Tables['members']['Update'];

// Reports
export type ReportRow = Tables['reports']['Row'];
export type ReportInsert = Tables['reports']['Insert'];
export type ReportUpdate = Tables['reports']['Update'];

// Generations
export type GenerationRow = Tables['generations']['Row'];
export type GenerationInsert = Tables['generations']['Insert'];
export type GenerationUpdate = Tables['generations']['Update'];

// Cultos
export type CultoRow = Tables['cultos']['Row'];
export type CultoInsert = Tables['cultos']['Insert'];
export type CultoUpdate = Tables['cultos']['Update'];

// Visitantes
export type VisitanteRow = Tables['visitantes']['Row'];
export type VisitanteInsert = Tables['visitantes']['Insert'];
export type VisitanteUpdate = Tables['visitantes']['Update'];
