
import { z } from 'zod';

const diasValidos = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const importRowSchema = z.object({
    geracao: z.string().min(1, 'Nome da geração é obrigatório'),
    cor_geracao: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato #RRGGBB)').optional().default('#6B7280'),
    celula: z.string().min(1, 'Nome da célula é obrigatório'),
    dia_semana: z.string().refine(val => diasValidos.includes(val), {
        message: `Dia inválido. Use: ${diasValidos.join(', ')}`,
    }),
    horario: z.string().min(1, 'Horário é obrigatório'),
    endereco: z.string().optional().default(''),
    publico_alvo: z.string().optional().default(''),
    lider_nome: z.string().min(1, 'Nome do líder é obrigatório'),
    lider_email: z.string().email('Email do líder inválido'),
    lider_telefone: z.string().optional().default(''),
    senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().default(''),
});

export const importFileSchema = z.array(importRowSchema).min(1, 'O CSV deve ter pelo menos 1 linha de dados');

export type ImportRow = z.infer<typeof importRowSchema>;
