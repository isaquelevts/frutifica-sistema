import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

function mapGeneration(g: any) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    color: g.color,
    active: g.active,
    leaderId: g.leaderId,
    leaderName: g.leader?.name || undefined,
    organizationId: g.organizationId,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

// GET /api/generations?orgId=
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || req.user!.orgId!;
    const generations = await prisma.generation.findMany({
      where: { organizationId: orgId },
      include: { cells: false },
    });
    res.json(generations.map(mapGeneration));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/generations/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const generation = await prisma.generation.findUnique({ where: { id: req.params.id } });
    if (!generation) { res.status(404).json({ message: 'Geração não encontrada' }); return; }
    res.json(mapGeneration(generation));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/generations
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id, name, description, color, active, leaderId, organizationId } = req.body;
    const generation = await prisma.generation.create({
      data: {
        id: id || undefined,
        name,
        description,
        color: color || '#3B82F6',
        active: active ?? true,
        leaderId: leaderId || null,
        organizationId: organizationId || req.user!.orgId!,
      },
    });
    res.status(201).json(mapGeneration(generation));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/generations/:id
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, active, leaderId } = req.body;
    const generation = await prisma.generation.update({
      where: { id: req.params.id },
      data: { name, description, color, active, leaderId: leaderId || null },
    });
    res.json(mapGeneration(generation));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/generations/:id
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.generation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
