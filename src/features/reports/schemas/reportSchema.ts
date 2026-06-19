import { z } from 'zod';

export const reportSchema = z.object({
    members: z.coerce.number().min(0, 'Número inválido'),
    visitors: z.coerce.number().min(0, 'Número inválido'),
});

export type ReportFormData = z.infer<typeof reportSchema>;
