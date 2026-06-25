import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireSuperAdmin, AuthRequest } from '../middleware/auth';

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

// GET /api/superadmin/stats
router.get('/stats', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [orgs, totalProfiles, totalCells, totalMembers, totalReports] = await Promise.all([
      prisma.organization.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.profile.count(),
      prisma.cell.count(),
      prisma.member.count(),
      prisma.report.count(),
    ]);

    const organizations = orgs.map(mapOrg);
    res.json({
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter((o) => o.subscriptionStatus !== 'suspended').length,
      suspendedOrganizations: organizations.filter((o) => o.subscriptionStatus === 'suspended').length,
      totalProfiles,
      totalCells,
      totalMembers,
      totalReports,
      organizations,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/organizations — com contagem de células
router.get('/organizations', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cells: true } } },
    });
    res.json(orgs.map((o) => ({ ...mapOrg(o), cellCount: o._count.cells })));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/organizations/:id — org + estatísticas
router.get('/organizations/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    const [org, cellCount, memberCount, reportCount, profiles] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.cell.count({ where: { organizationId: orgId } }),
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.report.count({ where: { organizationId: orgId } }),
      prisma.profile.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true, roles: true, createdAt: true, cellId: true },
      }),
    ]);

    if (!org) { res.status(404).json({ message: 'Organização não encontrada' }); return; }

    res.json({
      organization: mapOrg(org),
      cellCount,
      memberCount,
      reportCount,
      userCount: profiles.length,
      profiles: profiles.map((p) => ({ ...p, created_at: p.createdAt, cell_id: p.cellId })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/organizations/:id/cells
router.get('/organizations/:id/cells', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const cells = await prisma.cell.findMany({
      where: { organizationId: req.params.id },
      orderBy: { name: 'asc' },
    });
    res.json(cells);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/organizations/:id/generations
router.get('/organizations/:id/generations', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const generations = await prisma.generation.findMany({
      where: { organizationId: req.params.id },
      orderBy: { name: 'asc' },
    });
    res.json(generations);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/organizations/:id/reports-by-week
router.get('/organizations/:id/reports-by-week', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const reports = await prisma.report.findMany({
      where: {
        organizationId: req.params.id,
        date: { gte: twelveWeeksAgo.toISOString().split('T')[0] },
      },
      select: { id: true, date: true, participants: true, visitors: true },
      orderBy: { date: 'asc' },
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/superadmin/organizations/:id — nome / plano / status
router.put('/organizations/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan, maxCells, subscriptionStatus } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (plan !== undefined) data.plan = plan;
    if (maxCells !== undefined) data.maxCells = maxCells;
    if (subscriptionStatus !== undefined) data.subscriptionStatus = subscriptionStatus;

    const org = await prisma.organization.update({ where: { id: req.params.id }, data });
    res.json(mapOrg(org));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/superadmin/organizations/:id — cascata
router.delete('/organizations/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    await prisma.report.deleteMany({ where: { organizationId: orgId } });
    await prisma.member.deleteMany({ where: { organizationId: orgId } });
    await prisma.profile.deleteMany({ where: { organizationId: orgId } });
    await prisma.cell.deleteMany({ where: { organizationId: orgId } });
    await prisma.generation.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/superadmin/superadmins
router.get('/superadmins', requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const admins = await prisma.profile.findMany({
      where: { roles: { has: 'superadmin' } },
      select: { id: true, name: true, email: true, roles: true, createdAt: true },
    });
    res.json(admins.map((a) => ({ ...a, created_at: a.createdAt })));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/superadmin/superadmins — promove por email
router.post('/superadmins', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    const profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (!profile) { res.status(404).json({ message: 'Usuário não encontrado com esse email' }); return; }
    if (profile.roles.includes('superadmin')) { res.status(409).json({ message: 'Usuário já é superadmin' }); return; }
    await prisma.profile.update({
      where: { id: profile.id },
      data: { roles: [...profile.roles, 'superadmin'] },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/superadmin/superadmins/:id — remove o papel
router.delete('/superadmins/:id', requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!profile) { res.status(404).json({ message: 'Usuário não encontrado' }); return; }
    await prisma.profile.update({
      where: { id: profile.id },
      data: { roles: profile.roles.filter((r) => r !== 'superadmin') },
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
