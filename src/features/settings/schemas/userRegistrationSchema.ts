import { z } from 'zod';
import { UserRole } from '../../../shared/types/types';

export const userRegistrationSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
    cellId: z.string().optional(),
    role: z.nativeEnum(UserRole),
    birthday: z.string().optional()
});

export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;
