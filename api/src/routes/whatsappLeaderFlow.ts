import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import { EVOLUTION_URL, EVOLUTION_KEY, getDayNumber, toDateString, nowBRT } from './whatsapp';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads/reports');
const OPT_OUT_DAYS = 30;
const REMINDER_HOURS = 24;
const ABANDON_SESSION_HOURS = 48;

// ─────────────────────────────────────────────────────────────
// Envio de mensagens
// ─────────────────────────────────────────────────────────────
function toJid(phone: string): string {
  return phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
}

// Números de celular brasileiros podem estar registrados no WhatsApp com ou
// sem o nono dígito (contas mais antigas), então o remoteJid de uma mensagem
// recebida pode não bater com o formato que normalizamos ao salvar o
// telefone do líder. Gera as duas variações para casar em qualquer busca.
function brPhoneVariants(digits: string): string[] {
  if (!digits.startsWith('55') || digits.length < 12) return [digits];
  const ddd = digits.slice(2, 4);
  const rest = digits.slice(4);
  if (rest.length === 9 && rest[0] === '9') {
    return [digits, `55${ddd}${rest.slice(1)}`];
  }
  if (rest.length === 8) {
    return [digits, `55${ddd}9${rest}`];
  }
  return [digits];
}

async function sendText(instanceName: string, phone: string, text: string): Promise<boolean> {
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_KEY(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: toJid(phone), text }),
    });
    return resp.ok;
  } catch (e: any) {
    console.error(`[whatsapp-leader] Erro ao enviar texto para ${phone}: ${e.message}`);
    return false;
  }
}

type PromptButton = { id: string; label: string };

// A instância em uso não entrega mensagens de botão nativo de forma
// confiável (aceita a chamada mas não chega no WhatsApp), então as opções
// são sempre mandadas como texto numerado.
async function sendPrompt(instanceName: string, phone: string, text: string, buttons: PromptButton[]): Promise<void> {
  const options = buttons.map((b, i) => `${i + 1}. ${b.label}`).join('\n');
  await sendText(instanceName, phone, `${text}\n\n${options}\n\n_Responda com o número ou o texto da opção._`);
}

// ─────────────────────────────────────────────────────────────
// Interpretação de resposta (botão clicado ou texto digitado)
// ─────────────────────────────────────────────────────────────
function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchesOption(answer: string, buttonId: string, index: number, aliases: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  if (normalized === buttonId) return true;
  if (normalized === String(index + 1)) return true;
  return aliases.some((alias) => normalized === normalizeAnswer(alias) || normalized.includes(normalizeAnswer(alias)));
}

function extractDigits(text: string): number | null {
  const match = text.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

// ─────────────────────────────────────────────────────────────
// Parsing do payload do webhook da Evolution
// ─────────────────────────────────────────────────────────────
interface InboundMessage {
  phone: string;
  text: string | null;
  buttonId: string | null;
  hasImage: boolean;
  rawKey: any;
}

function parseInboundMessage(payload: any): InboundMessage | null {
  const data = payload?.data;
  if (!data || data.key?.fromMe) return null;

  const remoteJid: string | undefined = data.key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us')) return null; // ignora mensagens de grupo — o fluxo é só individual
  const phone = remoteJid.replace(/@.*/, '');

  const message = data.message || {};
  const buttonId: string | null =
    message.buttonsResponseMessage?.selectedButtonId ??
    message.templateButtonReplyMessage?.selectedId ??
    message.listResponseMessage?.singleSelectReply?.selectedRowId ??
    null;

  const text: string | null =
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.buttonsResponseMessage?.selectedDisplayText ??
    message.imageMessage?.caption ??
    null;

  const hasImage = !!message.imageMessage;

  return { phone, text, buttonId, hasImage, rawKey: data.key };
}

function answerFor(msg: InboundMessage): string {
  return msg.buttonId || msg.text || '';
}

// ─────────────────────────────────────────────────────────────
// Download de mídia (foto da célula) via Evolution API
// ─────────────────────────────────────────────────────────────
async function downloadInboundPhoto(instanceName: string, rawKey: any): Promise<string | null> {
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_KEY(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { key: rawKey } }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const base64: string | undefined = data?.base64;
    if (!base64) return null;

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const fileName = `${randomUUID()}.jpg`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), Buffer.from(base64, 'base64'));
    return `/uploads/reports/${fileName}`;
  } catch (e: any) {
    console.error(`[whatsapp-leader] Erro ao baixar foto: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Textos das mensagens
// ─────────────────────────────────────────────────────────────
const CONFIRM_BUTTONS: PromptButton[] = [
  { id: 'sim', label: '✅ Sim, aconteceu' },
  { id: 'nao', label: '❌ Não aconteceu' },
];

const YES_NO_BUTTONS: PromptButton[] = [
  { id: 'sim', label: 'Sim' },
  { id: 'nao', label: 'Não' },
];

const REASON_BUTTONS: PromptButton[] = [
  { id: 'feriado', label: 'Feriado/Viagem' },
  { id: 'poucos', label: 'Poucos membros disponíveis' },
  { id: 'outro', label: 'Outro motivo' },
  { id: 'nao_informar', label: 'Prefiro não informar' },
];

const OPT_OUT_BUTTONS: PromptButton[] = [
  { id: 'bloquear', label: 'Bloquear notificações' },
  { id: 'continuar', label: 'Continuar recebendo' },
];

function confirmationText(leaderName: string | null, cellName: string) {
  return `🌱 Olá, ${leaderName || 'líder'}! Sua célula "${cellName}" aconteceu essa semana?`;
}

// ─────────────────────────────────────────────────────────────
// Cron: disparo inicial, lembrete de 24h e opt-out
// ─────────────────────────────────────────────────────────────
export async function runLeaderReminderTick() {
  const configs = await prisma.whatsappConfig.findMany({
    where: { active: true, instanceName: { not: null } },
  });
  if (configs.length === 0) return { success: true, sent: 0 };

  const now = nowBRT();
  const isMorningTick = now.getHours() === 8;
  const todayWeekday = now.getDay();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const meetingDateStr = toDateString(yesterday);

  let sentCount = 0;

  for (const config of configs) {
    const instanceName = config.instanceName!;
    const cells = await prisma.cell.findMany({
      where: {
        organizationId: config.organizationId,
        active: true,
        leaderPhone: { not: null },
        whatsappNotificationsPaused: false,
      },
    });

    for (const cell of cells) {
      let session = await prisma.whatsappLeaderSession.findUnique({ where: { cellId: cell.id } });

      // 0) Sessão abandonada (líder parou de responder no meio da conversa) —
      // remove para não travar o disparo da semana seguinte nem o opt-out.
      if (session) {
        const hoursSinceUpdate = (now.getTime() - session.updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate >= ABANDON_SESSION_HOURS) {
          await prisma.whatsappLeaderSession.delete({ where: { id: session.id } });
          session = null;
        }
      }

      // 1) Disparo inicial — só na janela das 8h, 1 dia após o dia da célula
      if (isMorningTick && !session) {
        const cellDayNum = getDayNumber(cell.dayOfWeek || '');
        if (cellDayNum !== null && (cellDayNum + 1) % 7 === todayWeekday) {
          const existingReport = await prisma.report.findFirst({
            where: { cellId: cell.id, date: meetingDateStr },
            select: { id: true },
          });
          if (!existingReport) {
            await sendPrompt(instanceName, cell.leaderPhone!, confirmationText(cell.leaderName, cell.name), CONFIRM_BUTTONS);
            await prisma.whatsappLeaderSession.create({
              data: {
                organizationId: config.organizationId,
                cellId: cell.id,
                phone: cell.leaderPhone!,
                step: 'awaiting_confirmation',
                weekDate: meetingDateStr,
              },
            });
            sentCount++;
            continue;
          }
        }
      }

      // 2) Lembrete único de 24h sem resposta
      if (session && session.step === 'awaiting_confirmation' && !session.remindedAt) {
        const hoursSinceCreated = (now.getTime() - session.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreated >= REMINDER_HOURS) {
          await sendPrompt(instanceName, cell.leaderPhone!, `Oi ${cell.leaderName || ''}, só lembrando: sua célula aconteceu essa semana?`, CONFIRM_BUTTONS);
          await prisma.whatsappLeaderSession.update({ where: { id: session.id }, data: { remindedAt: now } });
          sentCount++;
          continue;
        }
      }

      // 3) Opt-out — líder sem interação há mais de 30 dias
      if (!session) {
        const referenceDate = cell.lastWhatsappInboundAt || cell.createdAt;
        const daysSinceReference = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceLastPrompt = cell.lastWhatsappOptOutPromptAt
          ? (now.getTime() - cell.lastWhatsappOptOutPromptAt.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        if (daysSinceReference >= OPT_OUT_DAYS && daysSinceLastPrompt >= OPT_OUT_DAYS) {
          await sendPrompt(
            instanceName,
            cell.leaderPhone!,
            'Notamos que faz um tempo que você não responde por aqui. Quer parar de receber essas mensagens semanais?',
            OPT_OUT_BUTTONS,
          );
          await prisma.whatsappLeaderSession.create({
            data: {
              organizationId: config.organizationId,
              cellId: cell.id,
              phone: cell.leaderPhone!,
              step: 'awaiting_optout',
              weekDate: meetingDateStr,
            },
          });
          await prisma.cell.update({ where: { id: cell.id }, data: { lastWhatsappOptOutPromptAt: now } });
          sentCount++;
        }
      }
    }
  }

  return { success: true, sent: sentCount };
}

// ─────────────────────────────────────────────────────────────
// POST /api/whatsapp/leader/test-send/:cellId
// Dispara a pergunta inicial imediatamente, ignorando o horário/dia da
// semana — só para testar o fluxo manualmente pelo admin.
// ─────────────────────────────────────────────────────────────
router.post('/test-send/:cellId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId!;
    const cell = await prisma.cell.findFirst({ where: { id: req.params.cellId, organizationId: orgId } });
    if (!cell) return res.status(404).json({ message: 'Célula não encontrada' });
    if (!cell.leaderPhone) return res.status(400).json({ message: 'Essa célula não tem WhatsApp do líder cadastrado' });

    const config = await prisma.whatsappConfig.findUnique({ where: { organizationId: orgId } });
    if (!config?.instanceName) return res.status(400).json({ message: 'WhatsApp não configurado para esta organização' });

    await prisma.whatsappLeaderSession.deleteMany({ where: { cellId: cell.id } });
    await sendPrompt(config.instanceName, cell.leaderPhone, confirmationText(cell.leaderName, cell.name), CONFIRM_BUTTONS);
    await prisma.whatsappLeaderSession.create({
      data: {
        organizationId: orgId,
        cellId: cell.id,
        phone: cell.leaderPhone,
        step: 'awaiting_confirmation',
        weekDate: toDateString(nowBRT()),
      },
    });

    res.json({ ok: true, sentTo: cell.leaderPhone });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Webhook — processa respostas do líder e avança a conversa
// ─────────────────────────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  res.status(200).json({ ok: true }); // responde já — Evolution não deve esperar processamento

  try {
    console.log(`[whatsapp-leader] Webhook recebido: ${JSON.stringify(req.body).slice(0, 1000)}`);

    const inbound = parseInboundMessage(req.body);
    if (!inbound) {
      console.log('[whatsapp-leader] Payload ignorado (não é mensagem de entrada válida)');
      return;
    }
    console.log(`[whatsapp-leader] Mensagem de ${inbound.phone}: texto="${inbound.text}" buttonId="${inbound.buttonId}"`);
    const phoneVariants = brPhoneVariants(inbound.phone);

    const cell = await prisma.cell.findFirst({ where: { leaderPhone: { in: phoneVariants } } });
    if (cell) {
      await prisma.cell.update({ where: { id: cell.id }, data: { lastWhatsappInboundAt: new Date() } });
    }

    const session = await prisma.whatsappLeaderSession.findFirst({
      where: { phone: { in: phoneVariants } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!session) {
      console.log(`[whatsapp-leader] Nenhuma sessão ativa encontrada pro telefone ${inbound.phone}`);
      return;
    }

    const instanceConfig = await prisma.whatsappConfig.findUnique({ where: { organizationId: session.organizationId } });
    const instanceName = instanceConfig?.instanceName;
    if (!instanceName) {
      console.log(`[whatsapp-leader] Organização ${session.organizationId} sem instanceName configurado`);
      return;
    }

    await handleStep(session, inbound, instanceName);
  } catch (e: any) {
    console.error(`[whatsapp-leader] Erro no webhook: ${e.message}`);
  }
});

async function handleStep(
  session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappLeaderSession.findFirst>>>,
  inbound: InboundMessage,
  instanceName: string,
) {
  const phone = session.phone;
  const answer = answerFor(inbound);
  const cell = await prisma.cell.findUnique({ where: { id: session.cellId } });
  if (!cell) {
    await prisma.whatsappLeaderSession.delete({ where: { id: session.id } }).catch(() => {});
    return;
  }

  switch (session.step) {
    case 'awaiting_confirmation': {
      if (matchesOption(answer, 'sim', 0, ['sim', 'aconteceu'])) {
        await prisma.whatsappLeaderSession.update({
          where: { id: session.id },
          data: { step: 'awaiting_participants' },
        });
        await sendText(instanceName, phone, 'Que bom! 🙌 Quantas pessoas participaram (incluindo visitantes)?');
      } else if (matchesOption(answer, 'nao', 1, ['nao', 'não'])) {
        await prisma.whatsappLeaderSession.update({
          where: { id: session.id },
          data: { step: 'awaiting_no_reason' },
        });
        await sendPrompt(instanceName, phone, 'Sem problemas. Algum motivo específico?', REASON_BUTTONS);
      } else {
        await sendPrompt(instanceName, phone, confirmationText(cell.leaderName, cell.name), CONFIRM_BUTTONS);
      }
      break;
    }

    case 'awaiting_participants': {
      const n = extractDigits(answer);
      if (n === null) {
        await sendText(instanceName, phone, 'Não entendi. Envie apenas o número de participantes (ex: 12).');
        return;
      }
      await prisma.whatsappLeaderSession.update({
        where: { id: session.id },
        data: { step: 'awaiting_visitors_flag', draftParticipants: n },
      });
      await sendPrompt(instanceName, phone, 'Teve algum visitante novo?', YES_NO_BUTTONS);
      break;
    }

    case 'awaiting_visitors_flag': {
      if (matchesOption(answer, 'sim', 0, ['sim'])) {
        await prisma.whatsappLeaderSession.update({ where: { id: session.id }, data: { step: 'awaiting_visitors_count' } });
        await sendText(instanceName, phone, 'Quantos visitantes?');
      } else if (matchesOption(answer, 'nao', 1, ['nao', 'não'])) {
        await prisma.whatsappLeaderSession.update({
          where: { id: session.id },
          data: { step: 'awaiting_photo_flag', draftVisitors: 0 },
        });
        await sendPrompt(instanceName, phone, 'Você tirou foto da célula?', YES_NO_BUTTONS);
      } else {
        await sendPrompt(instanceName, phone, 'Teve algum visitante novo?', YES_NO_BUTTONS);
      }
      break;
    }

    case 'awaiting_visitors_count': {
      const n = extractDigits(answer);
      if (n === null) {
        await sendText(instanceName, phone, 'Não entendi. Envie apenas o número de visitantes (ex: 2).');
        return;
      }
      await prisma.whatsappLeaderSession.update({
        where: { id: session.id },
        data: { step: 'awaiting_photo_flag', draftVisitors: n },
      });
      await sendPrompt(instanceName, phone, 'Você tirou foto da célula?', YES_NO_BUTTONS);
      break;
    }

    case 'awaiting_photo_flag': {
      if (matchesOption(answer, 'sim', 0, ['sim'])) {
        await prisma.whatsappLeaderSession.update({ where: { id: session.id }, data: { step: 'awaiting_photo' } });
        await sendText(instanceName, phone, 'Envie a foto da célula 📷');
      } else if (matchesOption(answer, 'nao', 1, ['nao', 'não'])) {
        await finalizeReport(session, null, instanceName, phone);
      } else {
        await sendPrompt(instanceName, phone, 'Você tirou foto da célula?', YES_NO_BUTTONS);
      }
      break;
    }

    case 'awaiting_photo': {
      if (inbound.hasImage) {
        const photoUrl = await downloadInboundPhoto(instanceName, inbound.rawKey);
        await finalizeReport(session, photoUrl, instanceName, phone);
      } else if (matchesOption(answer, 'pular', -1, ['pular', 'nao', 'não'])) {
        await finalizeReport(session, null, instanceName, phone);
      } else {
        await sendText(instanceName, phone, 'Envie a foto da célula, ou digite "pular" para continuar sem foto.');
      }
      break;
    }

    case 'awaiting_no_reason': {
      const reason = REASON_BUTTONS.find((b, i) => matchesOption(answer, b.id, i, [b.label]));
      const reasonLabel = reason ? reason.label : (answer.trim() || 'Não informado');
      await prisma.report.create({
        data: {
          cellId: cell.id,
          organizationId: session.organizationId,
          date: session.weekDate,
          happened: false,
          noReportReason: reasonLabel,
        },
      });
      await prisma.whatsappLeaderSession.delete({ where: { id: session.id } });
      await sendText(instanceName, phone, 'Tudo bem! Te chamamos de novo semana que vem 💪');
      break;
    }

    case 'awaiting_optout': {
      if (matchesOption(answer, 'bloquear', 0, ['bloquear'])) {
        await prisma.cell.update({ where: { id: cell.id }, data: { whatsappNotificationsPaused: true } });
        await prisma.whatsappLeaderSession.delete({ where: { id: session.id } });
        await sendText(instanceName, phone, 'Ok, não vamos mais te enviar essas mensagens. Você pode reativar quando quiser pelo site.');
      } else {
        await prisma.whatsappLeaderSession.delete({ where: { id: session.id } });
        await sendText(instanceName, phone, 'Combinado, vamos continuar te chamando toda semana 🙏');
      }
      break;
    }

    default:
      await prisma.whatsappLeaderSession.delete({ where: { id: session.id } }).catch(() => {});
  }
}

async function finalizeReport(
  session: { id: string; cellId: string; organizationId: string; weekDate: string; draftParticipants: number | null; draftVisitors: number | null },
  photoUrl: string | null,
  instanceName: string,
  phone: string,
) {
  await prisma.report.create({
    data: {
      cellId: session.cellId,
      organizationId: session.organizationId,
      date: session.weekDate,
      happened: true,
      participants: session.draftParticipants ?? 0,
      visitors: session.draftVisitors ?? 0,
      photoUrl,
    },
  });
  await prisma.whatsappLeaderSession.delete({ where: { id: session.id } });
  await sendText(instanceName, phone, '✅ Relatório registrado! Deus abençoe sua célula essa semana 🙏');
}

export default router;
