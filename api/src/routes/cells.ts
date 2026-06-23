import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function mapCell(c: any) {
  return {
    id: c.id,
    name: c.name,
    leaderName: c.leaderName,
    leaderId: c.leaderId,
    dayOfWeek: c.dayOfWeek,
    time: c.time,
    address: c.address,
    active: c.active,
    generationId: c.generationId,
    organizationId: c.organizationId,
    createdAt: c.createdAt,
  };
}

// GET /api/cells?orgId=
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || req.user!.orgId!;
    const cells = await prisma.cell.findMany({ where: { organizationId: orgId } });
    res.json(cells.map(mapCell));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cells/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cell = await prisma.cell.findUnique({ where: { id: req.params.id } });
    if (!cell) { res.status(404).json({ message: 'Célula não encontrada' }); return; }
    res.json(mapCell(cell));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cells
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, leaderName, leaderId, dayOfWeek, time, address, active, generationId, organizationId } = req.body;
    const cell = await prisma.cell.create({
      data: {
        name,
        leaderName,
        leaderId,
        dayOfWeek,
        time,
        address,
        active: active ?? true,
        generationId: generationId || null,
        organizationId: organizationId || req.user!.orgId,
      },
    });
    res.status(201).json(mapCell(cell));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/cells/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, leaderName, leaderId, dayOfWeek, time, address, active, generationId } = req.body;
    const cell = await prisma.cell.update({
      where: { id: req.params.id },
      data: { name, leaderName, leaderId, dayOfWeek, time, address, active, generationId: generationId || null },
    });
    res.json(mapCell(cell));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cells/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { deleteRelated } = req.query;
    if (deleteRelated === 'true') {
      await prisma.report.deleteMany({ where: { cellId: req.params.id } });
      await prisma.member.deleteMany({ where: { cellId: req.params.id } });
    }
    await prisma.profile.updateMany({ where: { cellId: req.params.id }, data: { cellId: null } });
    await prisma.cell.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
