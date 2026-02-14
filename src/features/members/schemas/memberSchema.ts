import { z } from 'zod';
import { MemberType } from '../../../shared/types/types';

export const memberSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    phone: z.string().min(1, 'Telefone é obrigatório'),
    birthday: z.string().optional(),
    type: z.nativeEnum(MemberType),
    attendanceCount: z.coerce.number().min(0, 'Número de presenças deve ser positivo').default(0),
});

export type MemberFormData = z.infer<typeof memberSchema>;
