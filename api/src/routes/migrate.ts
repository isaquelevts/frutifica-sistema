import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { secret, organizations, profiles, cells, generations, members, reports } = req.body;

  if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) {
    res.status(401).json({ message: 'Segredo inválido' });
    return;
  }

  const result: Record<string, number> = {};

  try {
    // 1. Organizações
    if (organizations?.length) {
      await prisma.organization.createMany({
        data: organizations.map((o: any) => ({
          id: o.id,
          name: o.name,
          plan: o.plan || 'free',
          maxCells: o.max_cells ?? null,
          subscriptionStatus: o.subscription_status ?? 'active',
          createdAt: new Date(o.created_at),
        })),
        skipDuplicates: true,
      });
      result.organizations = organizations.length;
    }

    // 2. Gerações (sem leaderId ainda por causa da dependência circular)
    if (generations?.length) {
      await prisma.generation.createMany({
        data: generations.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description ?? null,
          color: g.color ?? '#3B82F6',
          active: g.active ?? true,
          leaderId: null,
          organizationId: g.organization_id,
          createdAt: new Date(g.created_at),
          updatedAt: new Date(g.updated_at ?? g.created_at),
        })),
        skipDuplicates: true,
      });
      result.generations = generations.length;
    }

    // 3. Células (sem leaderId ainda)
    if (cells?.length) {
      await prisma.cell.createMany({
        data: cells.map((c: any) => ({
          id: c.id,
          name: c.name,
          leaderName: c.leader_name ?? null,
          leaderId: null,
          dayOfWeek: c.day_of_week ?? null,
          time: c.time ?? null,
          address: c.address ?? null,
          active: c.active ?? true,
          generationId: c.generation_id ?? null,
          organizationId: c.organization_id ?? null,
          createdAt: new Date(c.created_at),
        })),
        skipDuplicates: true,
      });
      result.cells = cells.length;
    }

    // 4. Perfis (com password_hash do Supabase auth.users)
    if (profiles?.length) {
      await prisma.profile.createMany({
        data: profiles.map((p: any) => ({
          id: p.id,
          email: p.email,
          passwordHash: p.password_hash,
          name: p.name ?? null,
          roles: Array.isArray(p.roles) ? p.roles : ['leader'],
          cellId: p.cell_id ?? null,
          organizationId: p.organization_id ?? null,
          birthday: p.birthday ?? null,
          createdAt: new Date(p.created_at),
        })),
        skipDuplicates: true,
      });
      result.profiles = profiles.length;
    }

    // 5. Atualiza leaderId nas células e gerações
    if (cells?.length) {
      for (const c of cells) {
        if (c.leader_id) {
          await prisma.cell.update({ where: { id: c.id }, data: { leaderId: c.leader_id } }).catch(() => {});
        }
      }
    }
    if (generations?.length) {
      for (const g of generations) {
        if (g.leader_id) {
          await prisma.generation.update({ where: { id: g.id }, data: { leaderId: g.leader_id } }).catch(() => {});
        }
      }
    }

    // 6. Membros
    if (members?.length) {
      await prisma.member.createMany({
        data: members.map((m: any) => ({
          id: m.id,
          name: m.name,
          cellId: m.cell_id ?? null,
          organizationId: m.organization_id ?? null,
          active: m.active ?? true,
          createdAt: new Date(m.created_at),
        })),
        skipDuplicates: true,
      });
      result.members = members.length;
    }

    // 7. Relatórios
    if (reports?.length) {
      await prisma.report.createMany({
        data: reports.map((r: any) => ({
          id: r.id,
          cellId: r.cell_id ?? null,
          organizationId: r.organization_id ?? null,
          participants: r.participants ?? 0,
          visitors: r.visitors ?? 0,
          date: r.date ?? null,
          createdAt: new Date(r.created_at),
        })),
        skipDuplicates: true,
      });
      result.reports = reports.length;
    }

    res.json({ ok: true, imported: result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
