import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Não autorizado' });
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const roles = req.user?.roles || [];
    if (roles.includes('admin') || roles.includes('superadmin')) {
      next();
    } else {
      res.status(403).json({ message: 'Acesso negado' });
    }
  });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.roles?.includes('superadmin')) {
      next();
    } else {
      res.status(403).json({ message: 'Acesso negado' });
    }
  });
}

/**
 * Bloqueia escrita quando a organização está suspensa.
 *
 * Até agora a suspensão só desabilitava botões no front (useIsSuspended),
 * o que qualquer cliente HTTP contornava. Encadeie DEPOIS de requireAuth /
 * requireAdmin em toda rota que grava dados.
 *
 * Superadmin passa sempre — precisa conseguir mexer em org suspensa.
 */
export async function requireActiveOrg(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.roles?.includes('superadmin')) {
    next();
    return;
  }

  const orgId = req.user?.orgId;
  if (!orgId) {
    res.status(403).json({ message: 'Usuário sem organização vinculada' });
    return;
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true },
    });

    if (!org) {
      res.status(403).json({ message: 'Organização não encontrada' });
      return;
    }

    if (org.subscriptionStatus === 'suspended') {
      res.status(403).json({
        message: 'Esta igreja está com o acesso suspenso. Entre em contato com o suporte.',
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export class OrgScopeError extends Error {}

/**
 * Traduz erros de rota em respostas HTTP adequadas.
 * Sem isso, OrgScopeError e violação de unicidade do Prisma viravam 500 genérico.
 */
export function handleRouteError(res: Response, err: any) {
  if (err instanceof OrgScopeError) {
    res.status(403).json({ message: err.message });
    return;
  }
  // P2002 = unique constraint. Acontece quando dois cadastros com o mesmo email
  // passam pela checagem prévia ao mesmo tempo.
  if (err?.code === 'P2002') {
    res.status(409).json({ message: 'Este email já está cadastrado no sistema' });
    return;
  }
  res.status(500).json({ message: err?.message || 'Erro interno' });
}

/**
 * Org do usuário autenticado, ignorando query string e body.
 *
 * Antes as rotas faziam `req.query.orgId || req.user.orgId`, o que deixava um
 * admin ler/escrever dados de outra igreja só trocando o parâmetro da URL.
 * O superadmin continua podendo passar ?orgId= explicitamente.
 */
export function scopedOrgId(req: AuthRequest): string {
  if (req.user?.roles?.includes('superadmin')) {
    const requested = (req.query.orgId as string) || (req.body?.organizationId as string);
    if (requested) return requested;
  }

  const orgId = req.user?.orgId;
  if (!orgId) throw new OrgScopeError('Usuário sem organização vinculada');
  return orgId;
}

/**
 * Confere que um recurso pertence à org do requisitante antes de ler/gravar.
 * Retorna true se pode seguir; já responde 404 caso contrário.
 */
export function assertOwnership(
  req: AuthRequest,
  res: Response,
  resource: { organizationId?: string | null } | null,
  notFoundMessage: string
): boolean {
  if (!resource) {
    res.status(404).json({ message: notFoundMessage });
    return false;
  }

  if (req.user?.roles?.includes('superadmin')) return true;

  if (resource.organizationId !== req.user?.orgId) {
    // 404 em vez de 403: não confirma a existência do recurso para quem não é dono.
    res.status(404).json({ message: notFoundMessage });
    return false;
  }

  return true;
}
