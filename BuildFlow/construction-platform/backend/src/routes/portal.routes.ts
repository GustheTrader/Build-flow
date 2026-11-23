import { Router, Request, Response, NextFunction } from 'express';
import * as B from '../services/builder.service';

/**
 * Client portal (no sign-in): a homeowner opens /portal/<token>. The token is a long random secret from a portal
 * link; only its hash is stored. Everything here is scoped to that one job and shows only client-visible items.
 */
const router = Router();

// Small per-address limit so links can't be guessed by brute force.
const hits = new Map<string, { at: number; n: number }>();
router.use((req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 60_000) hits.set(ip, { at: now, n: 1 });
  else if (++h.n > 120) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  if (hits.size > 5000) hits.clear();
  next();
});

const h = (fn: (req: Request, a: Awaited<ReturnType<typeof B.resolvePortal>>) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  B.resolvePortal(req.params.token).then((a) => fn(req, a)).then((out) => res.json(out)).catch((e: any) => {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  });
};

router.get('/:token', h(async (_req, a) => B.portalOverview(a)));
router.post('/:token/change-orders/:id/decision', h(async (req, a) => ({ changeOrder: await B.portalDecide(a, req.params.id, req.body ?? {}) })));
router.post('/:token/selections/:id/choose', h(async (req, a) => ({ selection: await B.portalChoose(a, req.params.id, req.body ?? {}) })));

export default router;
