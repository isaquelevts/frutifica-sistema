import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { normalizePhone } from '../lib/phone';
import {
  requireAuth, requireActiveOrg, scopedOrgId, handleRouteError, AuthRequest,
} from '../middleware/auth';
import {
  Access, accessFromRoles, ROLE_CONSOLIDADOR, ROLE_GESTOR, CONSOLIDATION_ROLES,
  STAGES, CLOSED_STAGE, Stage, isValidStage, stageTransition, stageIndex,
  PERSON_TYPES, ACTIVITY_TYPES, CONTACT_TYPES, OUTCOMES,
  computeAlerts, todayBR, cleanStr, cleanDate, FIRST_CONTACT_SLA_HOURS,
} from '../lib/consolidation';

const router = Router();

// ─── Acesso ───────────────────────────────────────────────────────────────

interface ConsolidationRequest extends AuthRequest {
  cons?: { access: Exclude<Access, null>; userId: string; orgId: string };
}

/**
 * Lê os papéis do banco (e não do JWT) a cada requisição: quando o gestor
 * libera ou remove o acesso de alguém, vale na hora, sem esperar novo login.
 */
async function loadAccess(req: ConsolidationRequest, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.userId },
      select: { roles: true, organizationId: true },
    });
    const access = accessFromRoles(profile?.roles);
    if (!profile || !access) {
      res.status(403).json({ message: 'Você não tem acesso à consolidação' });
      return;
    }
    const orgId = profile.roles.includes('superadmin') ? scopedOrgId(req) : profile.organizationId;
    if (!orgId) {
      res.status(403).json({ message: 'Usuário sem organização vinculada' });
      return;
    }
    req.cons = { access, userId: req.user!.userId, orgId };
    next();
  } catch (err) {
    handleRouteError(res, err);
  }
}

function requireGestor(req: ConsolidationRequest, res: Response, next: NextFunction) {
  if (req.cons?.access === 'gestor') next();
  else res.status(403).json({ message: 'Apenas o gestor da consolidação pode fazer isso' });
}

router.use(requireAuth, loadAccess);

/** Filtro de visibilidade: consolidador vê o que é dele, o que cadastrou e o que está sem responsável. */
function visibleWhere(req: ConsolidationRequest): Prisma.ConsolidationPersonWhereInput {
  const { access, userId, orgId } = req.cons!;
  const base: Prisma.ConsolidationPersonWhereInput = { organizationId: orgId, active: true };
  if (access === 'gestor') return base;
  return { ...base, OR: [{ assignedToId: userId }, { createdById: userId }, { assignedToId: null }] };
}

async function findVisible(req: ConsolidationRequest, id: string) {
  return prisma.consolidationPerson.findFirst({ where: { ...visibleWhere(req), id } });
}

/** Confere que o responsável pertence à igreja e tem acesso à consolidação. */
async function validAssignee(orgId: string, assigneeId: string): Promise<boolean> {
  const p = await prisma.profile.findFirst({ where: { id: assigneeId, organizationId: orgId }, select: { roles: true } });
  return !!p && !!accessFromRoles(p.roles);
}

// ─── Serialização ─────────────────────────────────────────────────────────

const personInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  cell: { select: { id: true, name: true, leaderName: true } },
  _count: { select: { activities: { where: { type: { in: CONTACT_TYPES } } } } },
} satisfies Prisma.ConsolidationPersonInclude;

type PersonWithInclude = Prisma.ConsolidationPersonGetPayload<{ include: typeof personInclude }>;

function mapPerson(p: PersonWithInclude, now = new Date()) {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
    birthDate: p.birthDate,
    gender: p.gender,
    maritalStatus: p.maritalStatus,
    neighborhood: p.neighborhood,
    address: p.address,
    type: p.type,
    visitDate: p.visitDate,
    service: p.service,
    howFound: p.howFound,
    invitedBy: p.invitedBy,
    prayerRequest: p.prayerRequest,
    notes: p.notes,
    stage: p.stage,
    lostReason: p.lostReason,
    assignedTo: p.assignedTo,
    createdBy: p.createdBy,
    cell: p.cell,
    contactedAt: p.contactedAt,
    invitedAt: p.invitedAt,
    inCellAt: p.inCellAt,
    consolidatedAt: p.consolidatedAt,
    closedAt: p.closedAt,
    returnedAt: p.returnedAt,
    lastContactAt: p.lastContactAt,
    nextActionDate: p.nextActionDate,
    nextActionNote: p.nextActionNote,
    contactAttempts: p._count.activities,
    alerts: computeAlerts(p, now),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Campos de cadastro editáveis (não inclui etapa, responsável nem marcos). */
function personDataFromBody(body: any) {
  const type = PERSON_TYPES.includes(body.type) ? body.type : 'visitante';
  return {
    name: cleanStr(body.name, 120) || '',
    phone: normalizePhone(cleanStr(body.phone, 30)),
    email: cleanStr(body.email, 120)?.toLowerCase() ?? null,
    birthDate: cleanDate(body.birthDate),
    gender: ['M', 'F'].includes(body.gender) ? body.gender : null,
    maritalStatus: cleanStr(body.maritalStatus, 40),
    neighborhood: cleanStr(body.neighborhood, 120),
    address: cleanStr(body.address, 250),
    type,
    visitDate: cleanDate(body.visitDate) || todayBR(),
    service: cleanStr(body.service, 120),
    howFound: cleanStr(body.howFound, 80),
    invitedBy: cleanStr(body.invitedBy, 120),
    prayerRequest: cleanStr(body.prayerRequest, 2000),
    notes: cleanStr(body.notes, 2000),
  };
}

// ─── Sessão ───────────────────────────────────────────────────────────────

// GET /api/consolidacao/me — nível de acesso do usuário logado
router.get('/me', (req: ConsolidationRequest, res: Response) => {
  res.json({ access: req.cons!.access, userId: req.cons!.userId });
});

// GET /api/consolidacao/responsaveis — quem pode receber pessoas para acompanhar
router.get('/responsaveis', async (req: ConsolidationRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { organizationId: req.cons!.orgId, roles: { hasSome: ['admin', ...CONSOLIDATION_ROLES] } },
      select: { id: true, name: true, email: true, roles: true },
      orderBy: { name: 'asc' },
    });
    res.json(profiles.map((p) => ({ id: p.id, name: p.name || p.email, access: accessFromRoles(p.roles) })));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// ─── Pessoas ──────────────────────────────────────────────────────────────

// GET /api/consolidacao/pessoas
router.get('/pessoas', async (req: ConsolidationRequest, res: Response) => {
  try {
    const people = await prisma.consolidationPerson.findMany({
      where: visibleWhere(req),
      include: personInclude,
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    res.json(people.map((p) => mapPerson(p, now)));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// GET /api/consolidacao/pessoas/:id — com linha do tempo
router.get('/pessoas/:id', async (req: ConsolidationRequest, res: Response) => {
  try {
    const person = await prisma.consolidationPerson.findFirst({
      where: { ...visibleWhere(req), id: req.params.id },
      include: {
        ...personInclude,
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!person) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }
    res.json({
      ...mapPerson(person),
      activities: person.activities.map((a) => ({
        id: a.id,
        type: a.type,
        outcome: a.outcome,
        note: a.note,
        fromStage: a.fromStage,
        toStage: a.toStage,
        user: a.user,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /api/consolidacao/pessoas
router.post('/pessoas', requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const { access, userId, orgId } = req.cons!;
    const data = personDataFromBody(req.body);
    if (data.name.length < 2) {
      res.status(400).json({ message: 'Informe o nome da pessoa' });
      return;
    }

    // Evita cadastro duplicado da mesma pessoa (comum quando dois voluntários
    // registram o mesmo visitante na porta do culto).
    if (data.phone && !req.body.ignoreDuplicate) {
      const dup = await prisma.consolidationPerson.findFirst({
        where: { organizationId: orgId, active: true, phone: data.phone },
        select: { id: true, name: true },
      });
      if (dup) {
        res.status(409).json({
          message: `Já existe um cadastro com este telefone: ${dup.name}`,
          duplicate: dup,
        });
        return;
      }
    }

    // Responsável: gestor escolhe qualquer um da equipe; consolidador só a si mesmo ou "sem responsável".
    let assignedToId: string | null = null;
    const requested = req.body.assignedToId;
    if (requested === 'me') assignedToId = userId;
    else if (requested) {
      if (access !== 'gestor' && requested !== userId) {
        res.status(403).json({ message: 'Só o gestor pode atribuir pessoas a outro consolidador' });
        return;
      }
      if (!(await validAssignee(orgId, requested))) {
        res.status(400).json({ message: 'Responsável inválido' });
        return;
      }
      assignedToId = requested;
    }

    let cellId: string | null = cleanStr(req.body.cellId, 40);
    if (cellId) {
      const cell = await prisma.cell.findFirst({ where: { id: cellId, organizationId: orgId }, select: { id: true } });
      if (!cell) cellId = null;
    }

    const person = await prisma.$transaction(async (tx) => {
      const created = await tx.consolidationPerson.create({
        data: {
          ...data,
          organizationId: orgId,
          createdById: userId,
          assignedToId,
          cellId,
          stage: 'novo',
          nextActionDate: cleanDate(req.body.nextActionDate),
          nextActionNote: cleanStr(req.body.nextActionNote, 250),
        },
      });
      await tx.consolidationActivity.create({
        data: { organizationId: orgId, personId: created.id, userId, type: 'cadastro', toStage: 'novo' },
      });
      return tx.consolidationPerson.findUniqueOrThrow({ where: { id: created.id }, include: personInclude });
    });

    res.status(201).json(mapPerson(person));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// PUT /api/consolidacao/pessoas/:id — dados cadastrais, célula e próximo passo
router.put('/pessoas/:id', requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const existing = await findVisible(req, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }
    const data = personDataFromBody({ ...existing, ...req.body });
    if (data.name.length < 2) {
      res.status(400).json({ message: 'Informe o nome da pessoa' });
      return;
    }

    let cellId: string | null | undefined = undefined;
    if ('cellId' in req.body) {
      cellId = cleanStr(req.body.cellId, 40);
      if (cellId) {
        const cell = await prisma.cell.findFirst({ where: { id: cellId, organizationId: req.cons!.orgId }, select: { id: true } });
        if (!cell) cellId = null;
      }
    }

    const person = await prisma.consolidationPerson.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(cellId !== undefined ? { cellId } : {}),
        ...('nextActionDate' in req.body ? { nextActionDate: cleanDate(req.body.nextActionDate) } : {}),
        ...('nextActionNote' in req.body ? { nextActionNote: cleanStr(req.body.nextActionNote, 250) } : {}),
        ...('returned' in req.body ? { returnedAt: req.body.returned ? existing.returnedAt ?? new Date() : null } : {}),
      },
      include: personInclude,
    });
    res.json(mapPerson(person));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /api/consolidacao/pessoas/:id/etapa — move no funil
router.post('/pessoas/:id/etapa', requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const target = req.body.stage;
    if (!isValidStage(target)) {
      res.status(400).json({ message: 'Etapa inválida' });
      return;
    }
    const existing = await findVisible(req, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }
    if (existing.stage === target) {
      const same = await prisma.consolidationPerson.findUniqueOrThrow({ where: { id: existing.id }, include: personInclude });
      res.json(mapPerson(same));
      return;
    }

    const { userId, orgId } = req.cons!;
    const data = stageTransition(existing, target as Stage);
    if (target === CLOSED_STAGE) data.lostReason = cleanStr(req.body.lostReason, 250);

    const person = await prisma.$transaction(async (tx) => {
      await tx.consolidationActivity.create({
        data: {
          organizationId: orgId, personId: existing.id, userId, type: 'etapa',
          fromStage: existing.stage, toStage: target,
          note: target === CLOSED_STAGE ? cleanStr(req.body.lostReason, 250) : cleanStr(req.body.note, 500),
        },
      });
      return tx.consolidationPerson.update({ where: { id: existing.id }, data, include: personInclude });
    });
    res.json(mapPerson(person));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /api/consolidacao/pessoas/:id/atividades — registra contato, convite ou nota
router.post('/pessoas/:id/atividades', requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const { type } = req.body;
    if (!ACTIVITY_TYPES.includes(type)) {
      res.status(400).json({ message: 'Tipo de registro inválido' });
      return;
    }
    const outcome = OUTCOMES.includes(req.body.outcome) ? req.body.outcome : null;
    const note = cleanStr(req.body.note, 2000);
    if (type === 'nota' && !note) {
      res.status(400).json({ message: 'Escreva a anotação' });
      return;
    }

    const existing = await findVisible(req, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }
    const { userId, orgId } = req.cons!;
    const now = new Date();
    const isContact = CONTACT_TYPES.includes(type);

    // Avanço automático no funil: contato com resposta → "contatado";
    // convite para célula → "convidado". Nunca retrocede nem reabre encerrados.
    let target: Stage | null = null;
    const curIdx = stageIndex(existing.stage);
    if (existing.stage !== CLOSED_STAGE) {
      if (isContact && outcome === 'respondeu' && curIdx < stageIndex('contatado')) target = 'contatado';
      if (type === 'convite_celula' && curIdx < stageIndex('convidado')) target = 'convidado';
    }

    const update: Prisma.ConsolidationPersonUpdateInput = {
      ...(isContact || type.startsWith('convite') ? { lastContactAt: now } : {}),
      ...(target ? stageTransition(existing, target, now) : {}),
    };
    if ('nextActionDate' in req.body) update.nextActionDate = cleanDate(req.body.nextActionDate);
    if ('nextActionNote' in req.body) update.nextActionNote = cleanStr(req.body.nextActionNote, 250);
    if (type === 'convite_celula' && req.body.cellId) {
      const cell = await prisma.cell.findFirst({ where: { id: req.body.cellId, organizationId: orgId }, select: { id: true } });
      if (cell) update.cell = { connect: { id: cell.id } };
    }

    const person = await prisma.$transaction(async (tx) => {
      await tx.consolidationActivity.create({
        data: { organizationId: orgId, personId: existing.id, userId, type, outcome, note, createdAt: now },
      });
      if (target) {
        await tx.consolidationActivity.create({
          data: {
            organizationId: orgId, personId: existing.id, userId, type: 'etapa',
            fromStage: existing.stage, toStage: target, createdAt: new Date(now.getTime() + 1),
          },
        });
      }
      return tx.consolidationPerson.update({ where: { id: existing.id }, data: update, include: personInclude });
    });
    res.status(201).json(mapPerson(person));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// PUT /api/consolidacao/pessoas/:id/responsavel
router.put('/pessoas/:id/responsavel', requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const { access, userId, orgId } = req.cons!;
    const existing = await findVisible(req, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }

    const requested: string | null = req.body.assignedToId === 'me' ? userId : req.body.assignedToId || null;
    if (access !== 'gestor') {
      // Consolidador pode "pegar" uma pessoa sem responsável ou devolver uma que é dele.
      const takingFree = requested === userId && !existing.assignedToId;
      const releasingOwn = requested === null && existing.assignedToId === userId;
      if (!takingFree && !releasingOwn) {
        res.status(403).json({ message: 'Só o gestor pode redistribuir pessoas entre consolidadores' });
        return;
      }
    }
    if (requested && !(await validAssignee(orgId, requested))) {
      res.status(400).json({ message: 'Responsável inválido' });
      return;
    }

    const person = await prisma.$transaction(async (tx) => {
      const assignee = requested ? await tx.profile.findUnique({ where: { id: requested }, select: { name: true } }) : null;
      await tx.consolidationActivity.create({
        data: {
          organizationId: orgId, personId: existing.id, userId, type: 'atribuicao',
          note: assignee ? `Responsável: ${assignee.name}` : 'Sem responsável',
        },
      });
      return tx.consolidationPerson.update({
        where: { id: existing.id },
        data: { assignedTo: requested ? { connect: { id: requested } } : { disconnect: true } },
        include: personInclude,
      });
    });
    res.json(mapPerson(person));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// DELETE /api/consolidacao/pessoas/:id — arquiva (apenas gestor)
router.delete('/pessoas/:id', requireGestor, requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const existing = await findVisible(req, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Pessoa não encontrada' });
      return;
    }
    await prisma.consolidationPerson.update({ where: { id: existing.id }, data: { active: false } });
    res.status(204).send();
  } catch (err) {
    handleRouteError(res, err);
  }
});

// ─── Painel do gestor ─────────────────────────────────────────────────────

/** Converte YYYY-MM-DD (horário de Brasília) em Date UTC no início/fim do dia. */
function brDayBoundary(date: string, end = false): Date {
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}-03:00`);
}

function weekStart(d: Date): string {
  const local = new Date(todayBR(d) + 'T12:00:00Z');
  const dow = local.getUTCDay(); // 0 = domingo
  local.setUTCDate(local.getUTCDate() - ((dow + 6) % 7)); // segunda-feira
  return local.toISOString().slice(0, 10);
}

// GET /api/consolidacao/resumo?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/resumo', requireGestor, async (req: ConsolidationRequest, res: Response) => {
  try {
    const { orgId } = req.cons!;
    const now = new Date();
    const to = cleanDate(req.query.to) || todayBR(now);
    const from = cleanDate(req.query.from) || todayBR(new Date(now.getTime() - 29 * 86400000));
    const fromDate = brDayBoundary(from);
    const toDate = brDayBoundary(to, true);

    const [people, activities, team] = await Promise.all([
      prisma.consolidationPerson.findMany({
        where: { organizationId: orgId, active: true },
        include: { assignedTo: { select: { id: true, name: true } } },
      }),
      prisma.consolidationActivity.findMany({
        where: { organizationId: orgId, createdAt: { gte: fromDate, lte: toDate }, person: { active: true } },
        select: { type: true, userId: true, createdAt: true, outcome: true },
      }),
      prisma.profile.findMany({
        where: { organizationId: orgId, roles: { hasSome: ['admin', ...CONSOLIDATION_ROLES] } },
        select: { id: true, name: true, email: true, roles: true },
      }),
    ]);

    // Coorte do período: quem foi cadastrado entre from e to.
    const cohort = people.filter((p) => p.createdAt >= fromDate && p.createdAt <= toDate);
    const reachedIncludingClosed = (field: 'contactedAt' | 'invitedAt' | 'inCellAt' | 'consolidatedAt') =>
      cohort.filter((p) => p[field]).length;

    const contactHours = cohort
      .filter((p) => p.contactedAt)
      .map((p) => (p.contactedAt!.getTime() - p.createdAt.getTime()) / 3600000);
    const contactedWithinSla = contactHours.filter((h) => h <= FIRST_CONTACT_SLA_HOURS).length;

    const funnel = [
      { stage: 'novo', count: cohort.length },
      { stage: 'contatado', count: reachedIncludingClosed('contactedAt') },
      { stage: 'convidado', count: reachedIncludingClosed('invitedAt') },
      { stage: 'em_celula', count: reachedIncludingClosed('inCellAt') },
      { stage: 'consolidado', count: reachedIncludingClosed('consolidatedAt') },
    ];

    // Situação atual (todas as pessoas ativas, independente do período).
    const open = people.filter((p) => p.stage !== CLOSED_STAGE && p.stage !== 'consolidado');
    const withAlerts = open.map((p) => ({ p, a: computeAlerts(p, now) }));
    const byStage = Object.fromEntries(
      [...STAGES, CLOSED_STAGE].map((s) => [s, people.filter((p) => p.stage === s).length])
    );

    const attention = withAlerts
      .filter(({ a }) => a.firstContactLate || a.nextActionOverdue || a.cooling || a.unassigned)
      .sort((x, y) => x.p.createdAt.getTime() - y.p.createdAt.getTime())
      .slice(0, 15)
      .map(({ p, a }) => ({
        id: p.id, name: p.name, phone: p.phone, stage: p.stage, type: p.type,
        assignedTo: p.assignedTo, createdAt: p.createdAt, lastContactAt: p.lastContactAt,
        nextActionDate: p.nextActionDate, alerts: a,
      }));

    // Por responsável.
    const contactActs = activities.filter((a) => CONTACT_TYPES.includes(a.type) || a.type.startsWith('convite'));
    const byUser = team.map((u) => {
      const mine = withAlerts.filter(({ p }) => p.assignedToId === u.id);
      const acts = contactActs.filter((a) => a.userId === u.id);
      const last = activities.filter((a) => a.userId === u.id).reduce<Date | null>(
        (acc, a) => (!acc || a.createdAt > acc ? a.createdAt : acc), null
      );
      return {
        id: u.id,
        name: u.name || u.email,
        access: accessFromRoles(u.roles),
        open: mine.length,
        waitingFirstContact: mine.filter(({ p }) => p.stage === 'novo').length,
        late: mine.filter(({ a }) => a.firstContactLate || a.nextActionOverdue).length,
        contactsInPeriod: acts.length,
        consolidatedInPeriod: people.filter(
          (p) => p.assignedToId === u.id && p.consolidatedAt && p.consolidatedAt >= fromDate && p.consolidatedAt <= toDate
        ).length,
        lastActivityAt: last,
      };
    }).filter((u) => u.open > 0 || u.contactsInPeriod > 0 || u.access !== 'gestor' || u.lastActivityAt);

    // Série semanal da coorte.
    const weeks = new Map<string, { week: string; cadastrados: number; contatados: number }>();
    for (const p of cohort) {
      const w = weekStart(p.createdAt);
      const row = weeks.get(w) || { week: w, cadastrados: 0, contatados: 0 };
      row.cadastrados += 1;
      if (p.contactedAt) row.contatados += 1;
      weeks.set(w, row);
    }

    const countBy = <T,>(items: T[], key: (i: T) => string | null) => {
      const m = new Map<string, number>();
      items.forEach((i) => { const k = key(i) || 'Não informado'; m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    res.json({
      period: { from, to },
      cohort: {
        total: cohort.length,
        byType: countBy(cohort, (p) => p.type),
        byHowFound: countBy(cohort, (p) => p.howFound),
        contacted: reachedIncludingClosed('contactedAt'),
        contactedWithinSla,
        avgHoursToFirstContact: contactHours.length
          ? Math.round((contactHours.reduce((s, h) => s + h, 0) / contactHours.length) * 10) / 10
          : null,
        invited: reachedIncludingClosed('invitedAt'),
        inCell: reachedIncludingClosed('inCellAt'),
        consolidated: reachedIncludingClosed('consolidatedAt'),
        closed: cohort.filter((p) => p.stage === CLOSED_STAGE).length,
        funnel,
        weekly: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)),
      },
      activities: {
        total: activities.filter((a) => !['etapa', 'atribuicao', 'cadastro'].includes(a.type)).length,
        byType: countBy(activities.filter((a) => !['etapa', 'atribuicao', 'cadastro'].includes(a.type)), (a) => a.type),
        answered: contactActs.filter((a) => a.outcome === 'respondeu').length,
        unanswered: contactActs.filter((a) => a.outcome === 'sem_resposta').length,
      },
      current: {
        totalActive: people.length,
        open: open.length,
        byStage,
        waitingFirstContact: open.filter((p) => p.stage === 'novo').length,
        firstContactLate: withAlerts.filter(({ a }) => a.firstContactLate).length,
        nextActionOverdue: withAlerts.filter(({ a }) => a.nextActionOverdue).length,
        cooling: withAlerts.filter(({ a }) => a.cooling).length,
        unassigned: withAlerts.filter(({ a }) => a.unassigned).length,
      },
      attention,
      byUser: byUser.sort((a, b) => b.open - a.open),
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// ─── Equipe (quem tem acesso) ─────────────────────────────────────────────

function teamMember(p: { id: string; name: string | null; email: string; roles: string[]; cellId: string | null }) {
  const isAdmin = p.roles.includes('admin') || p.roles.includes('superadmin');
  return {
    id: p.id,
    name: p.name || p.email,
    email: p.email,
    isAdmin,
    isCellLeader: p.roles.includes('leader') || p.roles.includes('coleader'),
    access: isAdmin ? 'gestor' : p.roles.includes(ROLE_GESTOR) ? 'gestor' : p.roles.includes(ROLE_CONSOLIDADOR) ? 'consolidador' : 'nenhum',
  };
}

// GET /api/consolidacao/equipe — todos os usuários da igreja com o nível de acesso
router.get('/equipe', requireGestor, async (req: ConsolidationRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { organizationId: req.cons!.orgId, NOT: { roles: { has: 'superadmin' } } },
      select: { id: true, name: true, email: true, roles: true, cellId: true },
      orderBy: { name: 'asc' },
    });
    res.json(profiles.map(teamMember));
  } catch (err) {
    handleRouteError(res, err);
  }
});

function withAccess(roles: string[], access: string): string[] {
  const base = roles.filter((r) => !CONSOLIDATION_ROLES.includes(r));
  if (access === 'gestor') return [...base, ROLE_GESTOR];
  if (access === 'consolidador') return [...base, ROLE_CONSOLIDADOR];
  return base;
}

// PUT /api/consolidacao/equipe/:userId { access: 'nenhum' | 'consolidador' | 'gestor' }
router.put('/equipe/:userId', requireGestor, requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const { access } = req.body;
    if (!['nenhum', 'consolidador', 'gestor'].includes(access)) {
      res.status(400).json({ message: 'Nível de acesso inválido' });
      return;
    }
    const target = await prisma.profile.findFirst({
      where: { id: req.params.userId, organizationId: req.cons!.orgId },
      select: { id: true, name: true, email: true, roles: true, cellId: true },
    });
    if (!target) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }
    if (target.roles.includes('admin') || target.roles.includes('superadmin')) {
      res.status(400).json({ message: 'Administradores já têm acesso total à consolidação' });
      return;
    }
    if (target.id === req.cons!.userId && access !== 'gestor') {
      res.status(400).json({ message: 'Você não pode remover o seu próprio acesso de gestor' });
      return;
    }

    // Login-only: quem só tinha papel de consolidação e perde o acesso fica sem papel nenhum.
    const roles = withAccess(target.roles, access);
    const updated = await prisma.profile.update({
      where: { id: target.id },
      data: { roles },
      select: { id: true, name: true, email: true, roles: true, cellId: true },
    });

    // Quem perde o acesso devolve as pessoas que acompanhava para a fila do gestor.
    if (access === 'nenhum') {
      await prisma.consolidationPerson.updateMany({
        where: { organizationId: req.cons!.orgId, assignedToId: target.id },
        data: { assignedToId: null },
      });
    }
    res.json(teamMember(updated));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /api/consolidacao/equipe — cria login só para a consolidação
router.post('/equipe', requireGestor, requireActiveOrg, async (req: ConsolidationRequest, res: Response) => {
  try {
    const name = cleanStr(req.body.name, 120);
    const email = cleanStr(req.body.email, 120)?.toLowerCase();
    const access = req.body.access === 'gestor' ? 'gestor' : 'consolidador';
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: 'Informe nome e um email válido' });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      if (existing.organizationId !== req.cons!.orgId) {
        res.status(409).json({ message: 'Este email já está cadastrado em outra igreja' });
        return;
      }
      const updated = await prisma.profile.update({
        where: { id: existing.id },
        data: { roles: withAccess(existing.roles, access) },
        select: { id: true, name: true, email: true, roles: true, cellId: true },
      });
      res.json({ ...teamMember(updated), alreadyExisted: true });
      return;
    }

    const password = cleanStr(req.body.password, 100);
    if (password && password.length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }
    const pwd = password || crypto.randomBytes(5).toString('hex');
    const created = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        passwordHash: await bcrypt.hash(pwd, 12),
        roles: withAccess([], access),
        organizationId: req.cons!.orgId,
      },
      select: { id: true, name: true, email: true, roles: true, cellId: true },
    });
    res.status(201).json({ ...teamMember(created), temporaryPassword: password ? undefined : pwd });
  } catch (err) {
    handleRouteError(res, err);
  }
});

export default router;
