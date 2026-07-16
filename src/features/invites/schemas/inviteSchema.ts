import { z } from 'zod';
import { TargetAudience } from '../../../shared/types/types';

/** Passo 1 — conta de acesso do líder (ele define a própria senha). */
export const inviteAccountSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

/** Passo 2 — dados da célula. */
export const inviteCellSchema = z.object({
    cellName: z.string().min(3, 'Nome da célula deve ter pelo menos 3 caracteres'),
    leaderName: z.string().min(3, 'Nome do líder deve ter pelo menos 3 caracteres'),
    whatsapp: z.string().optional(),
    dayOfWeek: z.string().min(1, 'Selecione o dia da semana'),
    targetAudience: z.nativeEnum(TargetAudience, { message: 'Selecione o público alvo' }),
    time: z.string().min(1, 'Informe o horário'),
    address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
});

/**
 * Formulário de geração de convite (lado do admin).
 *
 * Os campos numéricos ficam como string: input HTML devolve string, e z.coerce
 * faz o tipo de entrada virar `unknown`, o que quebra o zodResolver no zod v4.
 * A conversão para número acontece no submit.
 */
const optionalPositiveInt = (max: number, message: string) =>
    z
        .string()
        .optional()
        .refine(
            (v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= max),
            message
        );

export const createInviteSchema = z.object({
    label: z.string().optional(),
    generationId: z.string().optional(),
    maxUses: optionalPositiveInt(500, 'Informe um número entre 1 e 500'),
    expiresInDays: optionalPositiveInt(365, 'Informe um número entre 1 e 365'),
});

export type InviteAccountFormData = z.infer<typeof inviteAccountSchema>;
export type InviteCellFormData = z.infer<typeof inviteCellSchema>;
export type CreateInviteFormData = z.infer<typeof createInviteSchema>;
