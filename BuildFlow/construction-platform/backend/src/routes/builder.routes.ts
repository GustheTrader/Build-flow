import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as B from '../services/builder.service';

/**
 * Builder API (signed in): schedule, daily logs, change orders, selections, leads, estimates, client portal links.
 * Mounted at /api/v1. Errors with a `status` (NotFound, BadRequest) come back as { error } with that status.
 */
const router = Router();
// Only this router's own paths require sign-in, so unknown /api/v1 paths still fall through to a 404.
router.use(/^\/(projects\/[^/]+\/(schedule|daily-logs|change-orders|contract|selections|portal-access)|schedule|daily-logs|change-orders|selections|leads|estimates|portal-access|jobs)(\/|$)/, authenticate);

type H = (req: AuthRequest, res: Response) => Promise<unknown>;
const h = (fn: H) => (req: AuthRequest, res: Response, next: NextFunction) => {
  fn(req, res).then((out) => { if (!res.headersSent) res.json(out ?? { ok: true }); }).catch((e: any) => {
    if (e?.status) return res.status(e.status).json({ error: e.message });
    next(e);
  });
};
const who = (req: AuthRequest) => String(req.headers['x-actor'] ?? '').slice(0, 120) || req.user?.email || 'unknown';

// jobs at a glance: by number (JOB-1001, 1001) or id
router.get('/jobs/by-number/:number', h(async (req) => B.jobByNumber(req.params.number)));
router.get('/jobs/:id/summary', h(async (req) => B.jobSummary(req.params.id)));

// schedule
router.get('/projects/:pid/schedule', h(async (req) => ({ items: await B.listSchedule(req.params.pid) })));
router.post('/projects/:pid/schedule', h(async (req, res) => { res.status(201); return B.createScheduleItem(req.params.pid, req.body ?? {}); }));
router.patch('/schedule/:id', h(async (req) => B.updateScheduleItem(req.params.id, req.body ?? {})));
router.delete('/schedule/:id', h(async (req) => { await B.removeScheduleItem(req.params.id); return { ok: true }; }));

// daily logs
router.get('/projects/:pid/daily-logs', h(async (req) => ({ logs: await B.listLogs(req.params.pid) })));
router.post('/projects/:pid/daily-logs', h(async (req, res) => { res.status(201); return { log: await B.createLog(req.params.pid, req.body ?? {}, who(req)) }; }));
router.patch('/daily-logs/:id', h(async (req) => ({ log: await B.updateLog(req.params.id, req.body ?? {}) })));
router.delete('/daily-logs/:id', h(async (req) => { await B.removeLog(req.params.id); return { ok: true }; }));

// change orders
router.get('/projects/:pid/change-orders', h(async (req) => ({ changeOrders: await B.listChangeOrders(req.params.pid), contract: await B.contract(req.params.pid) })));
router.post('/projects/:pid/change-orders', h(async (req, res) => { res.status(201); return { changeOrder: await B.createChangeOrder(req.params.pid, req.body ?? {}) }; }));
router.patch('/change-orders/:id', h(async (req) => ({ changeOrder: await B.updateChangeOrder(req.params.id, req.body ?? {}) })));
router.post('/change-orders/:id/status', h(async (req) => ({ changeOrder: await B.setChangeOrderStatus(req.params.id, req.body?.status, { name: who(req), signatureName: req.body?.signatureName, reason: req.body?.reason }) })));
router.get('/projects/:pid/contract', h(async (req) => B.contract(req.params.pid)));

// selections
router.get('/projects/:pid/selections', h(async (req) => ({ selections: await B.listSelections(req.params.pid) })));
router.post('/projects/:pid/selections', h(async (req, res) => { res.status(201); return { selection: await B.createSelection(req.params.pid, req.body ?? {}) }; }));
router.patch('/selections/:id', h(async (req) => ({ selection: await B.updateSelection(req.params.id, req.body ?? {}) })));
router.post('/selections/:id/choose', h(async (req) => ({ selection: await B.chooseOption(req.params.id, String(req.body?.optionId ?? ''), who(req), req.body?.notes) })));
router.delete('/selections/:id', h(async (req) => { await B.removeSelection(req.params.id); return { ok: true }; }));

// leads
router.get('/leads', h(async () => ({ leads: await B.listLeads(), pipeline: await B.leadPipeline() })));
router.post('/leads', h(async (req, res) => { res.status(201); return { lead: await B.createLead(req.body ?? {}, who(req)) }; }));
router.get('/leads/:id', h(async (req) => ({ lead: await B.repos.leads.get(req.params.id), estimates: await B.listEstimates({ leadId: req.params.id }) })));
router.patch('/leads/:id', h(async (req) => ({ lead: await B.updateLead(req.params.id, req.body ?? {}, who(req)) })));
router.post('/leads/:id/activities', h(async (req) => ({ lead: await B.addLeadActivity(req.params.id, req.body ?? {}, who(req)) })));
router.post('/leads/:id/convert', h(async (req) => B.convertLead(req.params.id, who(req), req.body ?? {})));

// estimates
router.get('/estimates', h(async (req) => ({ estimates: await B.listEstimates({ leadId: req.query.leadId as string | undefined, projectId: req.query.projectId as string | undefined }) })));
router.post('/estimates', h(async (req, res) => { res.status(201); return { estimate: await B.createEstimate(req.body ?? {}) }; }));
router.get('/estimates/:id', h(async (req) => ({ estimate: await B.getEstimate(req.params.id) })));
router.patch('/estimates/:id', h(async (req) => ({ estimate: await B.updateEstimate(req.params.id, req.body ?? {}) })));
router.post('/estimates/:id/status', h(async (req) => ({ estimate: await B.setEstimateStatus(req.params.id, req.body?.status, who(req)) })));

// client portal links
router.get('/projects/:pid/portal-access', h(async (req) => ({ access: await B.listAccess(req.params.pid) })));
router.post('/projects/:pid/portal-access', h(async (req, res) => { res.status(201); return B.createAccess(req.params.pid, req.body ?? {}); }));
router.delete('/portal-access/:id', h(async (req) => { await B.revokeAccess(req.params.id); return { ok: true }; }));

export default router;
