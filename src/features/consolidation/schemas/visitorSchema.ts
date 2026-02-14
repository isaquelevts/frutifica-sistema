import { z } from 'zod';

export const visitorSchema = z.object({
    nome: z.string().min(3, 'Nome é obrigatório'),
    telefone: z.string().min(1, 'Telefone é obrigatório'),
    endereco: z.string().optional(),
    birthday: z.string().optional(),
    tipoOrigem: z.enum(['visitante', 'convertido', 'reconciliacao']),
    attendsCell: z.boolean().default(false),
    selectedCellId: z.string().optional(),
}).refine(data => {
    if (data.attendsCell && !data.selectedCellId) {
        return false;
    }
    return true;
}, {
    message: "Selecione uma célula",
    path: ["selectedCellId"]
});

export type VisitorFormData = z.infer<typeof visitorSchema>;
