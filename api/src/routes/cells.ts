import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { checkCellQuota } from '../lib/limits';
import { normalizePhone } from '../lib/phone';
import {
  requireAuth,
  requireAdmin,
  requireActiveOrg,
  assertOwnership,
  scopedOrgId,
  handleRouteError,
  AuthRequest,
} from '../middleware/auth';

const router = Router();

function mapCell(c: any) {
  return {
    id: c.id,
    name: c.name,
    leaderName: c.leaderName,
    leaderId: c.leaderId,
    leaderPhone: c.leaderPhone,
    targetAudience: c.targetAudience,
    dayOfWeek: c.dayOfWeek,
    time: c.time,
    address: c.address,
    active: c.active,
    generationId: c.generationId,
    organizationId: c.organizationId,
    createdAt: c.createdAt,
  };
}

/** Geração informada precisa pertencer à mesma org da célula. */
async function validateGeneration(
  req: AuthRequest,
  res: Response,
  generationId: string | null | undefined
): Promise<boolean> {
  if (!generationId) return true;
  const generation = await prisma.generation.findUnique({ where: { id: generationId } });
  return assertOwnership(req, res, generation, 'Geração não encontrada');
}

/**
 * Quem pode editar uma célula: admin/superadmin da org, ou o próprio líder dela
 * (a tela /my-cell depende disso). Confere `leaderId` e também `profile.cellId`,
 * porque células importadas via CSV nascem sem `leaderId` preenchido.
 */
async function canWriteCell(req: AuthRequest, cell: { id: string; leaderId?: string | null }) {
  const roles = req.user?.roles || [];
  if (roles.includes('admin') || roles.includes('superadmin')) return true;

  if (cell.leaderId && cell.leaderId === req.user!.userId) return true;

  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.userId },
    select: { cellId: true },
  });
  return profile?.cellId === cell.id;
}

// GET /api/cells
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = scopedOrgId(req);
    const cells = await prisma.cell.findMany({ where: { organizationId: orgId } });
    res.json(cells.map(mapCell));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/cells/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cell = await prisma.cell.findUnique({ where: { id: req.params.id } });
    if (!assertOwnership(req, res, cell, 'Célula não encontrada')) return;
    res.json(mapCell(cell));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/cells
router.post('/', requireAdmin, requireActiveOrg, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = scopedOrgId(req);
    const {
      name, leaderName, leaderId, leaderPhone, targetAudience,
      dayOfWeek, time, address, active, generationId,
    } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Nome da célula é obrigatório' });
      return;
    }

    const quota = await checkCellQuota(orgId);
    if (!quota.ok) {
      res.status(403).json({ message: quota.message, code: 'CELL_QUOTA_EXCEEDED' });
      return;
    }

    if (!(await validateGeneration(req, res, generationId))) return;

    const cell = await prisma.cell.create({
      data: {
        name,
        leaderName,
        leaderId,
        leaderPhone: normalizePhone(leaderPhone),
        targetAudience: targetAudience || null,
        dayOfWeek,
        time,
        address,
        active: active ?? true,
        generationId: generationId || null,
        organizationId: orgId,
      },
    });
    res.status(201).json(mapCell(cell));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/cells/with-leader — cria célula + conta do líder atomicamente.
// Substitui o par saveCell() + saveUser() que o CellRegistration fazia em
// sequência: quando o segundo falhava (email duplicado, por ex.) a célula do
// primeiro já tinha sido criada e ficava órfã.
router.post('/with-leader', requireAdmin, requireActiveOrg, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = scopedOrgId(req);
    const {
      name, leaderName, leaderPhone, targetAudience, dayOfWeek, time, address, generationId,
      leaderEmail, leaderPassword, leaderBirthday,
    } = req.body;

    if (!name || !leaderName) {
      res.status(400).json({ message: 'Nome da célula e do líder são obrigatórios' });
      return;
    }
    if (!leaderEmail) {
      res.status(400).json({ message: 'Email do líder é obrigatório' });
      return;
    }
    if (leaderPassword && String(leaderPassword).length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    const normalizedEmail = String(leaderEmail).toLowerCase().trim();
    const existing = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'Este email já está cadastrado no sistema' });
      return;
    }

    const quota = await checkCellQuota(orgId);
    if (!quota.ok) {
      res.status(403).json({ message: quota.message, code: 'CELL_QUOTA_EXCEEDED' });
      return;
    }

    if (!(await validateGeneration(req, res, generationId))) return;

    // Sem senha informada, o líder recebe uma temporária e o admin repassa.
    // O caminho preferido é o convite (/api/invites), onde o líder define a
    // própria senha e nada trafega por WhatsApp.
    const generatedPassword = leaderPassword ? null : crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(leaderPassword || generatedPassword!, 12);

    const result = await prisma.$transaction(async (tx) => {
      const cell = await tx.cell.create({
        data: {
          name,
          leaderName,
          leaderPhone: normalizePhone(leaderPhone),
          targetAudience: targetAudience || null,
          dayOfWeek,
          time,
          address,
          active: true,
          generationId: generationId || null,
          organizationId: orgId,
        },
      });

      const profile = await tx.profile.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          name: leaderName,
          passwordHash,
          roles: ['leader'],
          cellId: cell.id,
          organizationId: orgId,
          birthday: leaderBirthday || null,
        },
      });

      const linked = await tx.cell.update({
        where: { id: cell.id },
        data: { leaderId: profile.id },
      });

      return { cell: linked, profile };
    });

    res.status(201).json({
      cell: mapCell(result.cell),
      leader: {
        id: result.profile.id,
        email: result.profile.email,
        name: result.profile.name,
      },
      temporaryPassword: generatedPassword ?? undefined,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// PUT /api/cells/:id — admin da org, ou o próprio líder da célula
router.put('/:id', requireAuth, requireActiveOrg, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.cell.findUnique({ where: { id: req.params.id } });
    if (!assertOwnership(req, res, existing, 'Célula não encontrada')) return;

    if (!(await canWriteCell(req, existing!))) {
      res.status(403).json({ message: 'Você só pode editar a sua própria célula' });
      return;
    }

    const {
      name, leaderName, leaderId, leaderPhone, targetAudience,
      dayOfWeek, time, address, active, generationId,
    } = req.body;

    if (!(await validateGeneration(req, res, generationId))) return;

    // Líder edita a logística da própria célula, mas não reatribui a liderança
    // nem move a célula de rede — isso é decisão do admin.
    const isAdmin = (req.user?.roles || []).some((r) => r === 'admin' || r === 'superadmin');

    const cell = await prisma.cell.update({
      where: { id: req.params.id },
      data: {
        name,
        leaderName,
        leaderPhone: leaderPhone !== undefined ? normalizePhone(leaderPhone) : undefined,
        targetAudience: targetAudience || null,
        dayOfWeek,
        time,
        address,
        ...(isAdmin
          ? { leaderId, active, generationId: generationId || null }
          : {}),
      },
    });
    res.json(mapCell(cell));
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// DELETE /api/cells/:id
router.delete('/:id', requireAdmin, requireActiveOrg, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.cell.findUnique({ where: { id: req.params.id } });
    if (!assertOwnership(req, res, existing, 'Célula não encontrada')) return;

    const { deleteRelated } = req.query;
    const cellId = req.params.id;

    await prisma.$transaction(async (tx) => {
      if (deleteRelated === 'true') {
        await tx.report.deleteMany({ where: { cellId } });
        await tx.member.deleteMany({ where: { cellId } });
      }
      await tx.profile.updateMany({ where: { cellId }, data: { cellId: null } });
      await tx.cell.delete({ where: { id: cellId } });
    });

    res.status(204).send();
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;
