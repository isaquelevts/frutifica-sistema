import { z } from 'zod';
import { TargetAudience } from '../../../shared/types/types';

export const leaderStep1Schema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme a senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const leaderStep2Schema = z.object({
  cellName: z.string().min(3, 'Nome da célula deve ter pelo menos 3 caracteres'),
  leaderName: z.string().min(3, 'Nome do líder deve ter pelo menos 3 caracteres'),
  whatsapp: z.string().min(8, 'WhatsApp inválido'),
  dayOfWeek: z.string().min(1, 'Selecione o dia da semana'),
  targetAudience: z.nativeEnum(TargetAudience, {
    errorMap: () => ({ message: 'Selecione o público alvo' }),
  }),
  time: z.string().min(1, 'Informe o horário'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
});

export type LeaderStep1FormData = z.infer<typeof leaderStep1Schema>;
export type LeaderStep2FormData = z.infer<typeof leaderStep2Schema>;
