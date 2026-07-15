import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function mapReport(r: any) {
  return {
    id: r.id,
    cellId: r.cellId,
    cellName: r.cell?.name || null,
    organizationId: r.organizationId,
    participants: r.participants,
    visitors: r.visitors,
    date: r.date,
    createdAt: r.createdAt,
    happened: r.happened,
    notes: r.noReportReason,
    photoUrl: r.photoUrl,
    conversions: 0,
    attendanceList: [],
    conversionsList: [],
    newVisitorsList: [],
  };
}

// GET /api/reports?orgId=
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || req.user!.orgId!;
    const reports = await prisma.report.findMany({
      where: { organizationId: orgId },
      include: { cell: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(reports.map(mapReport));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/cell/:cellId/date/:date
router.get('/cell/:cellId/date/:date', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.findFirst({
      where: { cellId: req.params.cellId, date: req.params.date },
      include: { cell: { select: { name: true } } },
    });
    if (!report) { res.status(404).json(null); return; }
    res.json(mapReport(report));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { cell: { select: { name: true } } },
    });
    if (!report) { res.status(404).json({ message: 'Relatório não encontrado' }); return; }
    res.json(mapReport(report));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reports
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id, cellId, organizationId, participants, visitors, date } = req.body;
    const report = await prisma.report.create({
      data: {
        id: id || undefined,
        cellId: cellId || null,
        organizationId: organizationId || req.user!.orgId,
        participants: participants ?? 0,
        visitors: visitors ?? 0,
        date,
      },
      include: { cell: { select: { name: true } } },
    });
    res.status(201).json(mapReport(report));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/reports/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { participants, visitors, date } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { participants, visitors, date },
      include: { cell: { select: { name: true } } },
    });
    res.json(mapReport(report));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
