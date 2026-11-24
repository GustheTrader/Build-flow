import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { redisClient } from '../config/redis';
import { authenticate, authorize } from '../middleware/auth';
import { User, UserRole } from '../models/types';
import { throttle } from '../lib/throttle';

/**
 * Office accounts. Creating one needs office authority: the service key (how Bot HQ calls this) or a signed-in
 * admin. The one exception is setting up a brand-new install: with BUILDFLOW_BOOTSTRAP=1 and no accounts yet, the
 * first one can be made without signing in, and is always an admin. Crew accounts are separate (see crew.service.ts).
 */
const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = Object.values(UserRole) as string[];
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (res: Response, e: any) => (e?.status ? res.status(e.status).json({ error: e.message }) : (console.error('auth error:', e), res.status(500).json({ error: 'Something went wrong.' })));

const adminOrFirstSetup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.BUILDFLOW_BOOTSTRAP === '1' && (await redisClient.getClient().hLen('users:email')) === 0) {
      (req as any).bootstrap = true;
      return next();
    }
  } catch { /* fall through to the normal check */ }
  authenticate(req, res, () => authorize(UserRole.ADMIN)(req, res, next));
};

router.post('/register', adminOrFirstSetup, async (req, res) => {
  try {
    const email = clean(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Choose a password of 8 to 128 characters.' });
    const requested = clean(req.body?.role, 40) || UserRole.PROJECT_MANAGER;
    if (!ROLES.includes(requested)) return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}.` });
    const role = (req as any).bootstrap ? UserRole.ADMIN : (requested as UserRole);

    const redis = redisClient.getClient();
    if (await redis.hGet('users:email', email)) return res.status(400).json({ error: 'User already exists' });

    const user: User = {
      id: uuidv4(), email, password: await bcrypt.hash(password, 10),
      firstName: clean(req.body?.firstName, 80), lastName: clean(req.body?.lastName, 80), role, company: clean(req.body?.company, 120),
      createdAt: new Date(), updatedAt: new Date(),
    };
    // hSetNX: two requests with the same email at once can't both win.
    if (!(await redis.hSetNX('users:email', email, user.id))) return res.status(400).json({ error: 'User already exists' });
    await redis.hSet(`user:${user.id}`, { ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() } as any);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
    res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, token });
  } catch (e) { fail(res, e); }
});

// Same answer, and the same work, for an unknown email and a wrong password, and a brake on guessing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post('/login', async (req, res) => {
  try {
    const email = clean(req.body?.email, 200).toLowerCase();
    throttle(`office-login:${email}`, 10, 15 * 60_000);
    throttle('office-login:*', 200, 60_000);
    const redis = redisClient.getClient();
    const userId = email ? await redis.hGet('users:email', email) : null;
    const userData = userId ? await redis.hGetAll(`user:${userId}`) : null;
    const valid = await bcrypt.compare(typeof req.body?.password === 'string' ? req.body.password.slice(0, 128) : '', userData?.password || DUMMY_HASH);
    if (!userId || !userData?.password || !valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: userId, email: userData.email, role: userData.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
    res.json({ user: { id: userId, email: userData.email, firstName: userData.firstName, lastName: userData.lastName, role: userData.role }, token });
  } catch (e) { fail(res, e); }
});

export default router;
