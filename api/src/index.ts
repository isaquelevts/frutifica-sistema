import 'dotenv/config';
import path from 'path';
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
import inviteRoutes from './routes/invites';
import superadminRoutes from './routes/superadmin';
import migrateRoutes from './routes/migrate';
import whatsappRoutes, { runReminder } from './routes/whatsapp';
import whatsappLeaderFlowRoutes, { runLeaderReminderTick } from './routes/whatsappLeaderFlow';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp/leader', whatsappLeaderFlowRoutes);

// Cron: envio automático de lembrete de grupo todo dia às 15h (horário de Brasília)
cron.schedule('0 15 * * *', async () => {
  console.log('[cron] Executando lembrete de WhatsApp (grupo)...');
  try {
    const result = await runReminder({ force: false });
    console.log('[cron] Resultado:', JSON.stringify(result));
  } catch (err: any) {
    console.error('[cron] Erro no lembrete:', err.message);
  }
}, { timezone: 'America/Sao_Paulo' });

// Cron: fluxo individual por líder — roda de hora em hora (disparo às 8h,
// lembrete de 24h e oferta de opt-out após 30 dias sem interação)
cron.schedule('0 * * * *', async () => {
  console.log('[cron] Executando fluxo de WhatsApp por líder...');
  try {
    const result = await runLeaderReminderTick();
    console.log('[cron] Resultado (líder):', JSON.stringify(result));
  } catch (err: any) {
    console.error('[cron] Erro no fluxo por líder:', err.message);
  }
}, { timezone: 'America/Sao_Paulo' });

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
