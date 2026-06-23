import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

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
