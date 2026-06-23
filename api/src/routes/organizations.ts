import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

function mapOrg(o: any) {
  return {
    id: o.id,
    name: o.name,
    plan: o.plan,
    maxCells: o.maxCells,
    subscriptionStatus: o.subscriptionStatus,
    createdAt: o.createdAt,
  };
}

// GET /api/organizations — superadmin lista tudo
router.get('/', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(orgs.map(mapOrg));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/organizations/:id — público (para tela de cadastro de líder)
router.get('/:id', async (req, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
    if (!org) { res.status(404).json({ message: 'Organização não encontrada' }); return; }
    res.json(mapOrg(org));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/organizations/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan, maxCells, subscriptionStatus } = req.body;
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: { name, plan, maxCells, subscriptionStatus },
    });
    res.json(mapOrg(org));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
