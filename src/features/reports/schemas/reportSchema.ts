
import { z } from 'zod';
import { CellType } from '../../../shared/types/types';

export const reportSchema = z.object({
    happened: z.boolean(),
    date: z.string().min(1, 'Data é obrigatória'),
    type: z.nativeEnum(CellType).optional(),
    notes: z.string().optional(),

    // Arrays controlled by useForm
    attendanceList: z.array(z.string()).optional().default([]),
    conversionsList: z.array(z.string()).optional().default([]),
    newVisitorsList: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Nome é obrigatório"),
        phone: z.string().min(1, "Telefone é obrigatório")
    })).optional().default([]),
});

export type ReportFormData = z.infer<typeof reportSchema>;
