import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

function mapProfile(p: any) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    roles: p.roles,
    cellId: p.cellId,
    organizationId: p.organizationId,
    birthday: p.birthday,
    createdAt: p.createdAt,
  };
}

// GET /api/users?orgId=
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || req.user!.orgId!;
    const users = await prisma.profile.findMany({ where: { organizationId: orgId } });
    res.json(users.map(mapProfile));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!user) { res.status(404).json({ message: 'Usuário não encontrado' }); return; }
    res.json(mapProfile(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/by-email/:email
router.get('/by-email/:email', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.profile.findUnique({ where: { email: req.params.email.toLowerCase() } });
    if (!user) { res.status(404).json({ message: 'Usuário não encontrado' }); return; }
    res.json(mapProfile(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users — admin cria usuário com senha temporária
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, roles, cellId, organizationId, birthday, password } = req.body;
    if (!email || !name) {
      res.status(400).json({ message: 'Email e nome são obrigatórios' });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: 'Email já cadastrado' });
      return;
    }

    const pwd = password || crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(pwd, 12);

    const user = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name,
        passwordHash,
        roles: roles || ['leader'],
        cellId: cellId || null,
        organizationId: organizationId || req.user!.orgId,
        birthday: birthday || null,
      },
    });

    res.status(201).json({ ...mapProfile(user), temporaryPassword: password ? undefined : pwd });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, roles, cellId, birthday } = req.body;
    const user = await prisma.profile.update({
      where: { id: req.params.id },
      data: {
        name,
        email: email?.toLowerCase(),
        roles,
        cellId: cellId || null,
        birthday: birthday || null,
      },
    });
    res.json(mapProfile(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.profile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
