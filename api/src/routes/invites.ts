import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { checkCellQuota } from '../lib/limits';
import { normalizePhone } from '../lib/phone';
import { signToken } from '../lib/jwt';
import {
  requireAdmin,
  requireActiveOrg,
  assertOwnership,
  scopedOrgId,
  handleRouteError,
  AuthRequest,
} from '../middleware/auth';

const router = Router();

// Alfabeto sem caracteres ambíguos (0/O, 1/I/l) — o link é ditado por voz e
// digitado à mão com frequência.
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 10;

function generateToken(): string {
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

function mapInvite(i: any) {
  return {
    id: i.id,
    token: i.token,
    organizationId: i.organizationId,
    generationId: i.generationId,
    generationName: i.generation?.name ?? null,
    role: i.role,
    label: i.label,
    maxUses: i.maxUses,
    uses: i.uses,
    expiresAt: i.expiresAt,
    revokedAt: i.revokedAt,
    createdAt: i.createdAt,
    status: inviteStatus(i),
  };
}

type InviteStatus = 'active' | 'revoked' | 'expired' | 'exhausted';

function inviteStatus(i: any): InviteStatus {
  if (i.revokedAt) return 'revoked';
  if (i.expiresAt && new Date(i.expiresAt) < new Date()) return 'expired';
  if (i.maxUses != null && i.uses >= i.maxUses) return 'exhausted';
  return 'active';
}

const STATUS_MESSAGES: Record<Exclude<InviteStatus, 'active'>, string> = {
  revoked: 'Este convite foi cancelado pela liderança da igreja.',
  expired: 'Este convite expirou. Peça um link novo ao responsável.',
  exhausted: 'Este convite já atingiu o limite de cadastros.',
};

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS ADMIN
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/invites — lista os convites da própria org
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = scopedOrgId(req);
    const invites = await prisma.invite.findMany({
      where: { organizationId: orgId },
      include: { generation: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invites.map(mapInvite));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/invites — gera um link de convite
router.post('/', requireAdmin, requireActiveOrg, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = scopedOrgId(req);
    const { generationId, label, maxUses, expiresInDays } = req.body;

    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      res.status(400).json({ message: 'maxUses deve ser um inteiro maior que zero' });
      return;
    }
    if (expiresInDays != null && (!Number.isInteger(expiresInDays) || expiresInDays < 1)) {
      res.status(400).json({ message: 'expiresInDays deve ser um inteiro maior que zero' });
      return;
    }

    // Geração precisa ser da mesma org — senão dava para vincular células
    // da sua igreja a uma rede de outra.
    if (generationId) {
      const generation = await prisma.generation.findUnique({ where: { id: generationId } });
      if (!assertOwnership(req, res, generation, 'Geração não encontrada')) return;
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invite = await prisma.invite.create({
      data: {
        token: generateToken(),
        organizationId: orgId,
        generationId: generationId || null,
        label: label || null,
        maxUses: maxUses ?? null,
        expiresAt,
        createdBy: req.user!.userId,
      },
      include: { generation: { select: { name: true } } },
    });

    res.status(201).json(mapInvite(invite));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// DELETE /api/invites/:id — revoga (mantém histórico de uso)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
    if (!assertOwnership(req, res, invite, 'Convite não encontrado')) return;

    await prisma.invite.update({
      where: { id: req.params.id },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS PÚBLICAS — o token É a credencial
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/invites/token/:token — o líder abre o link e vê o que vai preencher
router.get('/token/:token', async (req: Request, res: Response) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token.toUpperCase() },
      include: {
        organization: { select: { name: true, subscriptionStatus: true } },
        generation: { select: { name: true } },
      },
    });

    if (!invite) {
      res.status(404).json({ message: 'Convite não encontrado.' });
      return;
    }

    const status = inviteStatus(invite);
    if (status !== 'active') {
      res.status(410).json({ message: STATUS_MESSAGES[status], status });
      return;
    }

    if (invite.organization.subscriptionStatus === 'suspended') {
      res.status(403).json({ message: 'Esta igreja está com o acesso suspenso.' });
      return;
    }

    // Nada de dado sensível: só o suficiente para montar a tela.
    res.json({
      organizationName: invite.organization.name,
      generationName: invite.generation?.name ?? null,
      role: invite.role,
      label: invite.label,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/invites/token/:token/accept
// Cria líder + célula + vínculo numa transação só, e já devolve o JWT.
router.post('/token/:token/accept', async (req: Request, res: Response) => {
  try {
    const {
      name, email, password,
      cellName, leaderName, leaderPhone, dayOfWeek, time, address, targetAudience,
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }
    if (!cellName || !dayOfWeek || !time || !address) {
      res.status(400).json({ message: 'Preencha os dados da célula' });
      return;
    }

    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token.toUpperCase() },
      include: { organization: { select: { subscriptionStatus: true } } },
    });

    if (!invite) {
      res.status(404).json({ message: 'Convite não encontrado.' });
      return;
    }

    const status = inviteStatus(invite);
    if (status !== 'active') {
      res.status(410).json({ message: STATUS_MESSAGES[status], status });
      return;
    }

    if (invite.organization.subscriptionStatus === 'suspended') {
      res.status(403).json({ message: 'Esta igreja está com o acesso suspenso.' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'Este email já está em uso. Faça login ou use outro.' });
      return;
    }

    const quota = await checkCellQuota(invite.organizationId);
    if (!quota.ok) {
      res.status(403).json({
        message: 'Esta igreja atingiu o limite de células do plano. Avise o responsável.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const profileId = crypto.randomUUID();

    // Tudo ou nada. Antes eram 3 requests do browser (register-leader → POST
    // /api/cells → PUT /api/users/:id); os dois últimos exigiam auth que o
    // recém-cadastrado não tinha, então o cadastro morria com o líder órfão.
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          id: profileId,
          email: normalizedEmail,
          name,
          passwordHash,
          roles: [invite.role],
          organizationId: invite.organizationId,
        },
      });

      const cell = await tx.cell.create({
        data: {
          name: cellName,
          leaderName: leaderName || name,
          leaderId: profile.id,
          leaderPhone: normalizePhone(leaderPhone),
          targetAudience: targetAudience || null,
          dayOfWeek,
          time,
          address,
          active: true,
          generationId: invite.generationId,
          organizationId: invite.organizationId,
        },
      });

      await tx.profile.update({
        where: { id: profile.id },
        data: { cellId: cell.id },
      });

      // Incremento condicional: se duas pessoas aceitarem o último uso ao mesmo
      // tempo, o updateMany com o filtro de uses faz a segunda afetar 0 linhas.
      if (invite.maxUses != null) {
        const claimed = await tx.invite.updateMany({
          where: { id: invite.id, uses: { lt: invite.maxUses } },
          data: { uses: { increment: 1 } },
        });
        if (claimed.count === 0) {
          throw new InviteExhaustedError();
        }
      } else {
        await tx.invite.update({
          where: { id: invite.id },
          data: { uses: { increment: 1 } },
        });
      }

      return { profile, cell };
    });

    const token = signToken({
      userId: result.profile.id,
      orgId: invite.organizationId,
      roles: result.profile.roles,
    });

    res.status(201).json({
      token,
      user: {
        id: result.profile.id,
        email: result.profile.email,
        name: result.profile.name,
        roles: result.profile.roles,
        cellId: result.cell.id,
        organizationId: result.profile.organizationId,
      },
      cell: { id: result.cell.id, name: result.cell.name },
    });
  } catch (err: any) {
    if (err instanceof InviteExhaustedError) {
      res.status(410).json({ message: STATUS_MESSAGES.exhausted, status: 'exhausted' });
      return;
    }
    handleRouteError(res, err);
  }
});

class InviteExhaustedError extends Error {}

export default router;
