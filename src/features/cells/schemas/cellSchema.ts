
import { z } from 'zod';
import { TargetAudience } from '../../../shared/types/types';

export const cellSchema = z.object({
    name: z.string().min(1, 'Nome da célula é obrigatório'),
    generationId: z.string().optional(),
    targetAudience: z.nativeEnum(TargetAudience),
    leaderName: z.string().min(1, 'Nome do líder é obrigatório'),
    whatsapp: z.string().optional(),
    dayOfWeek: z.string().min(1, 'Dia da semana é obrigatório'),
    time: z.string().min(1, 'Horário é obrigatório'),
    address: z.string().min(1, 'Endereço é obrigatório'),

    // Leader Account (optional, for creation only)
    leaderEmail: z.string().email('Email inválido').optional().or(z.literal('')),
    leaderPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
    leaderBirthday: z.string().optional(),

    // Co-Leaders
    coLeaders: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido").optional().or(z.literal('')),
        phone: z.string().optional()
    }))
});

export type CellFormData = z.infer<typeof cellSchema>;
