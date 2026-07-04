import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import cellRoutes from './routes/cells';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import generationRoutes from './routes/generations';
import memberRoutes from './routes/members';
import organizationRoutes from './routes/organizations';
import superadminRoutes from './routes/superadmin';
import migrateRoutes from './routes/migrate';
import whatsappRoutes, { runReminder } from './routes/whatsapp';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Cron: envio automático de lembretes todo dia às 15h (horário de Brasília)
cron.schedule('0 15 * * *', async () => {
  console.log('[cron] Executando lembrete de WhatsApp...');
  try {
    const result = await runReminder({ force: false });
    console.log('[cron] Resultado:', JSON.stringify(result));
  } catch (err: any) {
    console.error('[cron] Erro no lembrete:', err.message);
  }
}, { timezone: 'America/Sao_Paulo' });

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
