import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function mapMember(m: any) {
  return {
    id: m.id,
    name: m.name,
    cellId: m.cellId,
    organizationId: m.organizationId,
    active: m.active,
    createdAt: m.createdAt,
    type: 'Membro',
    phone: null,
    email: null,
    attendanceCount: 0,
    firstVisitDate: m.createdAt,
  };
}

// GET /api/members?orgId=
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || req.user!.orgId!;
    const members = await prisma.member.findMany({ where: { organizationId: orgId, active: true } });
    res.json(members.map(mapMember));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/members/cell/:cellId
router.get('/cell/:cellId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      where: { cellId: req.params.cellId, active: true },
    });
    res.json(members.map(mapMember));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/members
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, cellId, organizationId } = req.body;
    if (!name) { res.status(400).json({ message: 'Nome é obrigatório' }); return; }
    const member = await prisma.member.create({
      data: {
        name,
        cellId: cellId || null,
        organizationId: organizationId || req.user!.orgId,
        active: true,
      },
    });
    res.status(201).json(mapMember(member));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/members/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, cellId, active } = req.body;
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { name, cellId: cellId || null, active },
    });
    res.json(mapMember(member));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/members/:id — soft delete
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.member.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
