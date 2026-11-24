import express, { Router, Request, Response, NextFunction } from 'express';
import * as C from '../services/crew.service';
import type { CrewMember } from '../models/builder.types';

/**
 * The field API, mounted at /field/api. Public: sign in and accept an invite. Everything else needs a crew token
 * (Authorization: Bearer ...), which only works for the jobs that person is assigned to and never shows money.
 */
const router = Router();

type Authed = Request & { crew?: CrewMember };
type H = (req: Authed, res: Response) => Promise<unknown>;
const h = (fn: H) => (req: Authed, res: Response, next: NextFunction) => {
  fn(req, res).then((out) => { if (!res.headersSent) res.json(out ?? { ok: true }); }).catch((e: any) => {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  });
};
const noStore = (_req: Request, res: Response, next: NextFunction) => { res.setHeader('Cache-Control', 'no-store'); next(); };
router.use(noStore);

router.post('/login', h(async (req) => C.loginCrew(req.body?.email, req.body?.password)));
router.post('/join', h(async (req) => C.joinCrew(req.body?.code, req.body?.password)));

// Everything below needs a crew sign-in.
router.use((req: Authed, res, next) => {
  C.crewFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')).then((c) => { req.crew = c; next(); })
    .catch((e: any) => res.status(e?.status ?? 401).json({ error: e?.message ?? 'Sign in to continue.' }));
});

router.get('/me', h(async (req) => ({ crew: C.publicCrew(req.crew!) })));
router.get('/jobs', h(async (req) => ({ jobs: await C.fieldJobs(req.crew!, typeof req.query.today === 'string' ? req.query.today : undefined) })));
router.get('/jobs/:id', h(async (req) => C.fieldJob(req.crew!, req.params.id)));
router.patch('/schedule/:id', h(async (req) => C.fieldUpdateItem(req.crew!, req.params.id, req.body ?? {})));
router.post('/jobs/:id/daily-logs', h(async (req, res) => { res.status(201); return { log: await C.fieldCreateLog(req.crew!, req.params.id, req.body ?? {}) }; }));
router.post('/jobs/:id/punch', h(async (req, res) => { res.status(201); return { item: await C.fieldCreatePunch(req.crew!, req.params.id, req.body ?? {}) }; }));
router.post('/punch/:id/resolve', h(async (req) => ({ item: await C.fieldResolvePunch(req.crew!, req.params.id) })));
// The phone sends one already-shrunk JPEG per request as the raw body.
router.post('/photos', express.raw({ type: 'image/jpeg', limit: '4mb' }), h(async (req, res) => { res.status(201); return C.savePhoto(req.crew!, req.body); }));

export default router;
