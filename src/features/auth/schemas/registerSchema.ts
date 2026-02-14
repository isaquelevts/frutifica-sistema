
import { z } from 'zod';

export const registerSchema = z.object({
    orgName: z.string().min(3, 'O nome da igreja deve ter pelo menos 3 caracteres'),
    adminName: z.string().min(3, 'O nome do responsável deve ter pelo menos 3 caracteres'),
    email: z.string().email('Digite um e-mail válido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
