import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const EVOLUTION_URL = () => (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_KEY = () => process.env.EVOLUTION_API_KEY || '';

// ─────────────────────────────────────────────────────────────
// Helpers de data / dia da semana
// ─────────────────────────────────────────────────────────────
const DAY_MAP: Record<string, number> = {
  'domingo': 0,
  'segunda': 1, 'segunda-feira': 1,
  'terca': 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2,
  'quarta': 3, 'quarta-feira': 3,
  'quinta': 4, 'quinta-feira': 4,
  'sexta': 5, 'sexta-feira': 5,
  'sabado': 6, 'sábado': 6,
};

function getDayNumber(dayOfWeek: string): number | null {
  const normalized = dayOfWeek.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [key, val] of Object.entries(DAY_MAP)) {
    const normalizedKey = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (normalizedKey === normalized) return val;
  }
  return null;
}

function formatDatePtBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

function toDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// ─────────────────────────────────────────────────────────────
// Lógica de lembrete (reutilizada pelo cron e pela rota HTTP)
// ─────────────────────────────────────────────────────────────
export async function runReminder(opts: { organizationId?: string; force?: boolean } = {}) {
  const { organizationId: filterOrgId, force = false } = opts;

  const configs = await prisma.whatsappConfig.findMany({
    where: {
      active: true,
      groupJid: { not: null },
      instanceName: { not: null },
      ...(filterOrgId ? { organizationId: filterOrgId } : {}),
    },
  });

  if (configs.length === 0) {
    return { success: true, message: 'Nenhuma configuração ativa encontrada', results: [] };
  }

  const evolutionUrl = EVOLUTION_URL();
  const evolutionKey = EVOLUTION_KEY();

  // Janela de 7 dias (ontem até 7 dias atrás) em horário de Brasília
  const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const windowDates: { date: Date; dayNum: number; dateStr: string }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(nowBRT);
    d.setDate(d.getDate() - i);
    windowDates.push({ date: d, dayNum: d.getDay(), dateStr: toDateString(d) });
  }

  const results: { org: string; sent: boolean; pendingCount: number }[] = [];

  for (const config of configs) {
    const orgId = config.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const orgName = org?.name || 'Igreja';

    const cells = await prisma.cell.findMany({
      where: { organizationId: orgId, active: true },
      select: { id: true, name: true, leaderName: true, dayOfWeek: true },
    });
    if (cells.length === 0) continue;

    const pendingByDate: Map<string, { dateLabel: string; cells: string[] }> = new Map();

    for (const cell of cells) {
      const cellDayNum = getDayNumber(cell.dayOfWeek || '');
      if (cellDayNum === null) continue;

      for (const wd of windowDates) {
        if (wd.dayNum !== cellDayNum) continue;

        const report = await prisma.report.findFirst({
          where: { cellId: cell.id, date: wd.dateStr },
          select: { id: true },
        });

        if (!report) {
          if (!pendingByDate.has(wd.dateStr)) {
            pendingByDate.set(wd.dateStr, { dateLabel: formatDatePtBR(wd.date), cells: [] });
          }
          const leaderName = cell.leaderName ? ` – ${cell.leaderName}` : '';
          pendingByDate.get(wd.dateStr)!.cells.push(`• ${cell.name}${leaderName}`);
        }
      }
    }

    const hasPending = pendingByDate.size > 0;
    if (!hasPending && !force) {
      results.push({ org: orgName, sent: false, pendingCount: 0 });
      continue;
    }

    let message = `🔔 *Lembrete de Relatório*\n_${orgName}_\n\n`;
    if (hasPending) {
      message += `As seguintes células ainda não preencheram o relatório:\n\n`;
      const sortedDates = Array.from(pendingByDate.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [, { dateLabel, cells: cellLines }] of sortedDates) {
        const label = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        message += `📅 *${label}*\n`;
        message += cellLines.join('\n') + '\n\n';
      }
    } else {
      message += `✅ Todas as células preencheram o relatório! Nenhuma pendência esta semana.\n\n`;
    }
    message += `Acesse agora: https://sistemafrutifica.com`;

    let sent = false;
    try {
      const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${config.instanceName}`, {
        method: 'POST',
        headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: config.groupJid, text: message }),
      });
      sent = sendResponse.ok;
      if (!sent) {
        console.error(`[whatsapp] Erro ao enviar para org ${orgId}: ${sendResponse.status} ${await sendResponse.text()}`);
      }
    } catch (e: any) {
      console.error(`[whatsapp] Erro de rede ao enviar para org ${orgId}: ${e.message}`);
    }

    results.push({ org: orgName, sent, pendingCount: pendingByDate.size });
  }

  return { success: true, results };
}

// ─────────────────────────────────────────────────────────────
// GET /api/whatsapp/config — lê config da org do usuário
// ─────────────────────────────────────────────────────────────
router.get('/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const config = await prisma.whatsappConfig.findUnique({ where: { organizationId: orgId } });
    if (!config) return res.json(null);
    res.json({
      id: config.id,
      organizationId: config.organizationId,
      instanceName: config.instanceName,
      groupJid: config.groupJid,
      groupName: config.groupName,
      active: config.active,
      connected: config.connected,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/whatsapp/config — salva grupo + ativação
// ─────────────────────────────────────────────────────────────
router.put('/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const { groupJid, groupName, active } = req.body;
    await prisma.whatsappConfig.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, groupJid: groupJid || null, groupName: groupName || null, active: !!active },
      update: { groupJid: groupJid || null, groupName: groupName || null, active: !!active },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/whatsapp/setup — cria instância Evolution + QR code
// ─────────────────────────────────────────────────────────────
router.post('/setup', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const evolutionUrl = EVOLUTION_URL();
    const evolutionKey = EVOLUTION_KEY();

    const instanceName = 'frutifica' + orgId.replace(/-/g, '').substring(0, 8);

    // Cria instância — ignora erro se já existir
    await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName, integration: 'WHATSAPP-BAILEYS' }),
    }).catch(() => {});

    const stateResp = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': evolutionKey },
    });
    const stateData = await stateResp.json().catch(() => ({})) as any;
    const state = stateData?.instance?.state ?? stateData?.state ?? 'close';

    await prisma.whatsappConfig.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, instanceName, connected: state === 'open' },
      update: { instanceName, connected: state === 'open' },
    });

    if (state === 'open') {
      return res.json({ connected: true, instanceName });
    }

    const qrResp = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': evolutionKey },
    });
    if (!qrResp.ok) {
      return res.json({ error: `Erro ao gerar QR code (${qrResp.status}): ${await qrResp.text()}` });
    }
    const qrData = await qrResp.json() as any;
    const qrCode = qrData.base64 ?? qrData.qrcode?.base64 ?? null;
    if (!qrCode) {
      return res.json({ error: 'QR code não retornado pela Evolution API.' });
    }
    res.json({ connected: false, instanceName, qrCode });
  } catch (err: any) {
    res.json({ error: err.message ?? 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/whatsapp/status — estado da conexão
// ─────────────────────────────────────────────────────────────
router.get('/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const config = await prisma.whatsappConfig.findUnique({ where: { organizationId: orgId } });
    if (!config?.instanceName) return res.json({ connected: false, state: 'not_configured' });

    const evolutionUrl = EVOLUTION_URL();
    const evolutionKey = EVOLUTION_KEY();

    const stateResp = await fetch(`${evolutionUrl}/instance/connectionState/${config.instanceName}`, {
      headers: { 'apikey': evolutionKey },
    });
    if (!stateResp.ok) return res.json({ connected: false, state: 'error' });

    const stateData = await stateResp.json() as any;
    const state = stateData?.instance?.state ?? stateData?.state ?? 'unknown';
    const connected = state === 'open';

    if (connected) {
      await prisma.whatsappConfig.update({ where: { organizationId: orgId }, data: { connected: true } });
    }
    res.json({ connected, state });
  } catch (err: any) {
    res.json({ connected: false, state: 'error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/whatsapp/groups — lista grupos do WhatsApp
// ─────────────────────────────────────────────────────────────
router.get('/groups', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const config = await prisma.whatsappConfig.findUnique({ where: { organizationId: orgId } });
    if (!config?.instanceName) {
      return res.json({ error: 'WhatsApp não configurado. Conecte primeiro escaneando o QR code.' });
    }

    const evolutionUrl = EVOLUTION_URL();
    const evolutionKey = EVOLUTION_KEY();

    const fetchUrl = `${evolutionUrl}/group/fetchAllGroups/${config.instanceName}?getParticipants=false`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return res.json({ error: `Evolution API retornou erro ${response.status}: ${await response.text()}` });
    }
    const groups = await response.json();
    const normalized = Array.isArray(groups)
      ? groups.map((g: any) => ({ id: g.id, subject: g.subject || g.name || g.id }))
      : [];
    res.json({ groups: normalized });
  } catch (err: any) {
    res.json({ error: err.message ?? 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/whatsapp/send-reminder
//   - manual (admin autenticado): dispara com force para a org do usuário
//   - cron (header x-cron-secret): dispara para todas as orgs ativas
// ─────────────────────────────────────────────────────────────
router.post('/send-reminder', async (req: Request, res: Response) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const incomingSecret = req.headers['x-cron-secret'];
    const isCronCall = cronSecret && incomingSecret === cronSecret;

    if (isCronCall) {
      const result = await runReminder({ force: false });
      return res.json(result);
    }

    // Chamada manual → exige admin
    return requireAdmin(req, res, async () => {
      const orgId = (req as AuthRequest).user!.orgId!;
      const result = await runReminder({ organizationId: orgId, force: true });
      res.json(result);
    });
  } catch (err: any) {
    res.json({ error: err.message ?? 'Erro interno' });
  }
});

export default router;
