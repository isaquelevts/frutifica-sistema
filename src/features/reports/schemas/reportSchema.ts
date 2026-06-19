import { z } from 'zod';
import { CellType } from '../../../shared/types/types';

export const reportSchema = z.object({
    type: z.nativeEnum(CellType),
    members: z.coerce.number().min(0, 'Número inválido'),
    visitors: z.coerce.number().min(0, 'Número inválido'),
    notes: z.string().optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;
