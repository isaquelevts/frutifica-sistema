import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { sendPasswordResetEmail } from '../lib/email';
import { requireAuth, AuthRequest } from '../middleware/auth';

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
  };
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email e senha são obrigatórios' });
      return;
    }

    const profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (!profile) {
      res.status(401).json({ message: 'Email ou senha incorretos' });
      return;
    }

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Email ou senha incorretos' });
      return;
    }

    const token = signToken({
      userId: profile.id,
      orgId: profile.organizationId,
      roles: profile.roles,
    });

    res.json({ token, user: mapProfile(profile) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register — cria organização + admin
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { orgName, name, email, password } = req.body;
    if (!orgName || !name || !email || !password) {
      res.status(400).json({ message: 'Todos os campos são obrigatórios' });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: 'Este email já está em uso' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const org = await prisma.organization.create({
      data: { name: orgName, plan: 'free', maxCells: 3, subscriptionStatus: 'active' },
    });

    const profile = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name,
        passwordHash,
        roles: ['admin'],
        organizationId: org.id,
      },
    });

    const token = signToken({ userId: profile.id, orgId: org.id, roles: profile.roles });
    res.status(201).json({ token, user: mapProfile(profile) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register-leader — público, requer orgId
router.post('/register-leader', async (req: Request, res: Response) => {
  try {
    const { orgId, name, email, password } = req.body;
    if (!orgId || !name || !email || !password) {
      res.status(400).json({ message: 'Todos os campos são obrigatórios' });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      res.status(404).json({ message: 'Organização não encontrada' });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: 'Este email já está em uso' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const profile = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name,
        passwordHash,
        roles: ['leader'],
        organizationId: orgId,
      },
    });

    res.status(201).json({ user: mapProfile(profile) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.user!.userId } });
    if (!profile) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }
    res.json({ user: mapProfile(profile) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email é obrigatório' });
      return;
    }

    const profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success to avoid email enumeration
    if (!profile) {
      res.json({ message: 'Se o email existir, você receberá as instruções em breve.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.profile.update({
      where: { id: profile.id },
      data: { resetToken: token, resetTokenExp: exp },
    });

    await sendPasswordResetEmail(profile.email, token);
    res.json({ message: 'Se o email existir, você receberá as instruções em breve.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
      return;
    }

    const profile = await prisma.profile.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!profile) {
      res.status(400).json({ message: 'Token inválido ou expirado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash, resetToken: null, resetTokenExp: null },
    });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
