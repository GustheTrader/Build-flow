import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { UserRole } from '../models/types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/** A service key (BUILDFLOW_API_KEY) lets Bot HQ's bots call the API as an admin; x-actor names the bot. */
function serviceKeyOk(given: string | undefined): boolean {
  const want = process.env.BUILDFLOW_API_KEY ?? '';
  if (!want || !given) return false;
  const a = Buffer.from(crypto.createHash('sha256').update(given).digest('hex'));
  const b = Buffer.from(crypto.createHash('sha256').update(want).digest('hex'));
  return crypto.timingSafeEqual(a, b);
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (serviceKeyOk(req.headers['x-api-key'] as string | undefined)) {
      req.user = { id: 'service:bot-hq', email: String(req.headers['x-actor'] ?? 'bot-hq').slice(0, 120), role: UserRole.ADMIN };
      return next();
    }
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
