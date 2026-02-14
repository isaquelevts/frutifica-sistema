import { z } from 'zod';

export const generationSchema = z.object({
    name: z.string().min(1, 'Nome da geração é obrigatório'),
    description: z.string().optional(),
    leaderId: z.string().optional(),
    color: z.string().default('#3B82F6')
});

export type GenerationFormData = z.infer<typeof generationSchema>;
