export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            cells: {
                Row: {
                    active: boolean | null
                    address: string | null
                    co_leaders: Json | null
                    created_at: string | null
                    day_of_week: string | null
                    generation_id: string | null
                    id: string
                    leader_name: string | null
                    name: string
                    organization_id: string | null
                    target_audience: string | null
                    time: string | null
                    whatsapp: string | null
                }
                Insert: {
                    active?: boolean | null
                    address?: string | null
                    co_leaders?: Json | null
                    created_at?: string | null
                    day_of_week?: string | null
                    generation_id?: string | null
                    id?: string
                    leader_name?: string | null
                    name: string
                    organization_id?: string | null
                    target_audience?: string | null
                    time?: string | null
                    whatsapp?: string | null
                }
                Update: {
                    active?: boolean | null
                    address?: string | null
                    co_leaders?: Json | null
                    created_at?: string | null
                    day_of_week?: string | null
                    generation_id?: string | null
                    id?: string
                    leader_name?: string | null
                    name?: string
                    organization_id?: string | null
                    target_audience?: string | null
                    time?: string | null
                    whatsapp?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "cells_generation_id_fkey"
                        columns: ["generation_id"]
                        isOneToOne: false
                        referencedRelation: "generations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "cells_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            cultos: {
                Row: {
                    created_at: string | null
                    criado_por: string | null
                    data: string
                    hora: string | null
                    id: string
                    observacoes: string | null
                    organization_id: string | null
                    tipo: string | null
                }
                Insert: {
                    created_at?: string | null
                    criado_por?: string | null
                    data: string
                    hora?: string | null
                    id?: string
                    observacoes?: string | null
                    organization_id?: string | null
                    tipo?: string | null
                }
                Update: {
                    created_at?: string | null
                    criado_por?: string | null
                    data?: string
                    hora?: string | null
                    id?: string
                    observacoes?: string | null
                    organization_id?: string | null
                    tipo?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "cultos_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            generations: {
                Row: {
                    active: boolean | null
                    color: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    leader_id: string | null
                    name: string
                    organization_id: string
                    updated_at: string | null
                }
                Insert: {
                    active?: boolean | null
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    leader_id?: string | null
                    name: string
                    organization_id: string
                    updated_at?: string | null
                }
                Update: {
                    active?: boolean | null
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    leader_id?: string | null
                    name?: string
                    organization_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "generations_leader_id_fkey"
                        columns: ["leader_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "generations_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            members: {
                Row: {
                    active: boolean | null
                    attendance_count: number | null
                    cell_id: string | null
                    created_at: string | null
                    email: string | null
                    first_visit_date: string | null
                    id: string
                    name: string
                    organization_id: string | null
                    phone: string | null
                    type: string | null
                }
                Insert: {
                    active?: boolean | null
                    attendance_count?: number | null
                    cell_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_visit_date?: string | null
                    id?: string
                    name: string
                    organization_id?: string | null
                    phone?: string | null
                    type?: string | null
                }
                Update: {
                    active?: boolean | null
                    attendance_count?: number | null
                    cell_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_visit_date?: string | null
                    id?: string
                    name?: string
                    organization_id?: string | null
                    phone?: string | null
                    type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "members_cell_id_fkey"
                        columns: ["cell_id"]
                        isOneToOne: false
                        referencedRelation: "cells"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "members_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organizations: {
                Row: {
                    created_at: string | null
                    id: string
                    max_cells: number | null
                    name: string
                    plan: string | null
                    subscription_status: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    max_cells?: number | null
                    name: string
                    plan?: string | null
                    subscription_status?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    max_cells?: number | null
                    name?: string
                    plan?: string | null
                    subscription_status?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    birthday: string | null
                    cell_id: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    name: string | null
                    organization_id: string | null
                    roles: string[] | null
                }
                Insert: {
                    birthday?: string | null
                    cell_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id: string
                    name?: string | null
                    organization_id?: string | null
                    roles?: string[] | null
                }
                Update: {
                    birthday?: string | null
                    cell_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    name?: string | null
                    organization_id?: string | null
                    roles?: string[] | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            reports: {
                Row: {
                    attendance_list: string[] | null
                    cell_id: string | null
                    conversions: number | null
                    conversions_list: string[] | null
                    created_at: string | null
                    date: string | null
                    happened: boolean | null
                    id: string
                    new_visitors_list: Json | null
                    notes: string | null
                    organization_id: string | null
                    participants: number | null
                    type: string | null
                    visitors: number | null
                }
                Insert: {
                    attendance_list?: string[] | null
                    cell_id?: string | null
                    conversions?: number | null
                    conversions_list?: string[] | null
                    created_at?: string | null
                    date?: string | null
                    happened?: boolean | null
                    id?: string
                    new_visitors_list?: Json | null
                    notes?: string | null
                    organization_id?: string | null
                    participants?: number | null
                    type?: string | null
                    visitors?: number | null
                }
                Update: {
                    attendance_list?: string[] | null
                    cell_id?: string | null
                    conversions?: number | null
                    conversions_list?: string[] | null
                    created_at?: string | null
                    date?: string | null
                    happened?: boolean | null
                    id?: string
                    new_visitors_list?: Json | null
                    notes?: string | null
                    organization_id?: string | null
                    participants?: number | null
                    type?: string | null
                    visitors?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "reports_cell_id_fkey"
                        columns: ["cell_id"]
                        isOneToOne: false
                        referencedRelation: "cells"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "reports_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            visitantes: {
                Row: {
                    atualizado_em: string | null
                    birthday: string | null
                    celula_destino_id: string | null
                    celula_origem_id: string | null
                    criado_em: string | null
                    culto_id: string | null
                    data_integracao: string | null
                    data_primeira_visita: string | null
                    email: string | null
                    endereco: string | null
                    id: string
                    ja_participa_celula: boolean | null
                    nome: string
                    observacoes: string | null
                    organization_id: string | null
                    presencas_na_celula: number | null
                    primeira_vez: boolean | null
                    proxima_acao: string | null
                    proxima_acao_data: string | null
                    responsavel_id: string | null
                    status_kanban: string | null
                    tags: string[] | null
                    telefone: string | null
                    tipo_origem: string | null
                    ultimo_contato: string | null
                }
                Insert: {
                    atualizado_em?: string | null
                    birthday?: string | null
                    celula_destino_id?: string | null
                    celula_origem_id?: string | null
                    criado_em?: string | null
                    culto_id?: string | null
                    data_integracao?: string | null
                    data_primeira_visita?: string | null
                    email?: string | null
                    endereco?: string | null
                    id?: string
                    ja_participa_celula?: boolean | null
                    nome: string
                    observacoes?: string | null
                    organization_id?: string | null
                    presencas_na_celula?: number | null
                    primeira_vez?: boolean | null
                    proxima_acao?: string | null
                    proxima_acao_data?: string | null
                    responsavel_id?: string | null
                    status_kanban?: string | null
                    tags?: string[] | null
                    telefone?: string | null
                    tipo_origem?: string | null
                    ultimo_contato?: string | null
                }
                Update: {
                    atualizado_em?: string | null
                    birthday?: string | null
                    celula_destino_id?: string | null
                    celula_origem_id?: string | null
                    criado_em?: string | null
                    culto_id?: string | null
                    data_integracao?: string | null
                    data_primeira_visita?: string | null
                    email?: string | null
                    endereco?: string | null
                    id?: string
                    ja_participa_celula?: boolean | null
                    nome?: string
                    observacoes?: string | null
                    organization_id?: string | null
                    presencas_na_celula?: number | null
                    primeira_vez?: boolean | null
                    proxima_acao?: string | null
                    proxima_acao_data?: string | null
                    responsavel_id?: string | null
                    status_kanban?: string | null
                    tags?: string[] | null
                    telefone?: string | null
                    tipo_origem?: string | null
                    ultimo_contato?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "visitantes_celula_destino_id_fkey"
                        columns: ["celula_destino_id"]
                        isOneToOne: false
                        referencedRelation: "cells"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "visitantes_celula_origem_id_fkey"
                        columns: ["celula_origem_id"]
                        isOneToOne: false
                        referencedRelation: "cells"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "visitantes_culto_id_fkey"
                        columns: ["culto_id"]
                        isOneToOne: false
                        referencedRelation: "cultos"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "visitantes_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            auth_org: { Args: never; Returns: string }
            get_my_org_id: { Args: never; Returns: string }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const
