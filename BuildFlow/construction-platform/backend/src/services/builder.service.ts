import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Repo, NotFound, BadRequest } from '../lib/repo';
import {
  canTransition, changeOrderTotals, checkDate, checkLines, checkPredecessors, checkStage, contractSummary,
  durationDays, estimateTotals, pipeline, reschedule, selectionSummary,
} from '../lib/builder-logic';
import type {
  ChangeOrder, ChangeOrderStatus, ClientAccess, DailyLog, Estimate, EstimateStatus, Lead, ScheduleItem, Selection, SelectionOption,
} from '../models/builder.types';
import { ProjectService } from './project.service';
import { ProjectStatus, ProjectType } from '../models/types';

/** Schedule, daily logs, change orders, selections, leads, estimates and client portal access. */

export const repos = {
  schedule: new Repo<ScheduleItem>('schedule', 'projectId'),
  logs: new Repo<DailyLog>('dailylog', 'projectId'),
  changeOrders: new Repo<ChangeOrder>('changeorder', 'projectId'),
  selections: new Repo<Selection>('selection', 'projectId'),
  leads: new Repo<Lead>('lead'),
  estimates: new Repo<Estimate>('estimate'),
  access: new Repo<ClientAccess>('portalaccess', 'projectId'),
};

const projects = new ProjectService();
const str = (v: unknown, field: string, max = 2000) => {
  if (typeof v !== 'string' || !v.trim()) throw new BadRequest(`${field} is required.`);
  return v.trim().slice(0, max);
};
const optStr = (v: unknown, max = 5000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const today = () => new Date().toISOString().slice(0, 10);

async function mustProject(projectId: string) {
  const p = await projects.getProject(projectId);
  if (!p) throw new NotFound('Job not found.');
  return p;
}
async function must<T>(p: Promise<T | null>, what: string): Promise<T> {
  const r = await p;
  if (!r) throw new NotFound(`${what} not found.`);
  return r;
}

// ---------- job summary (by number) ----------

/** One job at a glance, for RevOpt and the bots: contract, schedule progress, what's next, what's waiting. */
export async function jobSummary(projectId: string) {
  const p = await mustProject(projectId);
  const [sched, logs, cos, sels] = await Promise.all([repos.schedule.list(projectId), repos.logs.list(projectId), repos.changeOrders.list(projectId), repos.selections.list(projectId)]);
  const t = today();
  const progress = sched.length ? Math.round(sched.reduce((s, i) => s + (i.status === 'complete' ? 100 : i.progress), 0) / sched.length) : 0;
  const lastLog = logs.sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    job: { id: p.id, number: p.number, name: p.name, client: p.clientName, status: p.status, startDate: p.startDate, endDate: p.endDate },
    contract: contractSummary(Number(p.budget) || 0, cos),
    schedule: {
      items: sched.length, complete: sched.filter((i) => i.status === 'complete').length, progress,
      late: sched.filter((i) => i.status !== 'complete' && i.endDate < t).map((i) => ({ id: i.id, title: i.title, endDate: i.endDate })),
      next: sched.filter((i) => i.status !== 'complete').sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3).map((i) => ({ id: i.id, title: i.title, startDate: i.startDate, endDate: i.endDate, status: i.status })),
    },
    waitingOnClient: {
      changeOrders: cos.filter((c) => c.status === 'pending_client').map((c) => ({ id: c.id, number: c.number, title: c.title, total: changeOrderTotals(c).price })),
      selections: sels.filter((x) => !x.chosenOptionId).map((x) => ({ id: x.id, title: x.title, dueDate: x.dueDate })),
    },
    lastDailyLog: lastLog ? { date: lastLog.date, author: lastLog.author, workPerformed: lastLog.workPerformed.slice(0, 500) } : null,
  };
}

export async function jobByNumber(raw: string) {
  const p = await projects.getProjectByNumber(raw);
  if (!p) throw new NotFound(`No job ${String(raw).slice(0, 30)} in Build-flow.`);
  return jobSummary(p.id);
}

// ---------- schedule ----------

const withDuration = (i: ScheduleItem) => ({ ...i, durationDays: durationDays(i) });

export async function listSchedule(projectId: string) {
  await mustProject(projectId);
  return (await repos.schedule.list(projectId)).sort((a, b) => a.startDate.localeCompare(b.startDate)).map(withDuration);
}

async function applyReschedule(projectId: string) {
  const moved = reschedule(await repos.schedule.list(projectId));
  for (const m of moved) await repos.schedule.update(m.id, { startDate: m.startDate, endDate: m.endDate });
  return moved.map((m) => m.id);
}

export async function createScheduleItem(projectId: string, b: any) {
  await mustProject(projectId);
  const startDate = checkDate(b.startDate, 'startDate');
  const endDate = b.endDate ? checkDate(b.endDate, 'endDate') : startDate;
  if (endDate < startDate) throw new BadRequest('endDate is before startDate.');
  const id = uuidv4();
  const predecessorIds: string[] = Array.isArray(b.predecessorIds) ? b.predecessorIds.map(String) : [];
  checkPredecessors(await repos.schedule.list(projectId), id, predecessorIds);
  const item = await repos.schedule.create({
    projectId, title: str(b.title, 'title', 200), startDate, endDate, predecessorIds, lagDays: Math.max(0, num(b.lagDays)),
    assignees: Array.isArray(b.assignees) ? b.assignees.map(String).slice(0, 20) : [], status: 'not_started', progress: 0,
    visibleToClient: b.visibleToClient !== false, notes: optStr(b.notes),
  }, id);
  const moved = await applyReschedule(projectId);
  return { item: withDuration((await repos.schedule.get(item.id))!), moved };
}

export async function updateScheduleItem(id: string, b: any, actor?: string) {
  const cur = await must(repos.schedule.get(id), 'Schedule item');
  const patch: Partial<ScheduleItem> = {};
  if (b.title !== undefined) patch.title = str(b.title, 'title', 200);
  if (b.startDate !== undefined) patch.startDate = checkDate(b.startDate, 'startDate');
  if (b.endDate !== undefined) patch.endDate = checkDate(b.endDate, 'endDate');
  if (b.lagDays !== undefined) patch.lagDays = Math.max(0, num(b.lagDays));
  if (b.assignees !== undefined) patch.assignees = Array.isArray(b.assignees) ? b.assignees.map(String).slice(0, 20) : [];
  if (b.status !== undefined) { if (!['not_started', 'in_progress', 'complete'].includes(b.status)) throw new BadRequest('Unknown status.'); patch.status = b.status; if (b.status === 'complete') patch.progress = 100; }
  if (b.progress !== undefined) patch.progress = Math.min(100, Math.max(0, num(b.progress)));
  if (b.visibleToClient !== undefined) patch.visibleToClient = !!b.visibleToClient;
  if (b.notes !== undefined) patch.notes = optStr(b.notes);
  if (b.predecessorIds !== undefined) {
    const preds: string[] = Array.isArray(b.predecessorIds) ? b.predecessorIds.map(String) : [];
    patch.predecessorIds = preds;
    const others = (await repos.schedule.list(cur.projectId)).filter((i) => i.id !== id);
    checkPredecessors([...others, { ...cur, predecessorIds: preds }], id, preds);
  }
  // Moving the start keeps the duration unless an end date was given too.
  if (patch.startDate && !patch.endDate) patch.endDate = new Date(Date.parse(`${patch.startDate}T00:00:00Z`) + (durationDays(cur) - 1) * 86_400_000).toISOString().slice(0, 10);
  if ((patch.endDate ?? cur.endDate) < (patch.startDate ?? cur.startDate)) throw new BadRequest('endDate is before startDate.');
  if (actor) patch.updatedBy = actor;
  await repos.schedule.update(id, patch);
  const moved = await applyReschedule(cur.projectId);
  return { item: withDuration((await repos.schedule.get(id))!), moved };
}

export async function removeScheduleItem(id: string) {
  const cur = await must(repos.schedule.get(id), 'Schedule item');
  for (const other of await repos.schedule.list(cur.projectId)) {
    if (other.predecessorIds.includes(id)) await repos.schedule.update(other.id, { predecessorIds: other.predecessorIds.filter((p) => p !== id) });
  }
  await repos.schedule.remove(id);
}

// ---------- daily logs ----------

/** Photo links: https addresses, or our own uploads (/media/<32 hex>.jpg). */
export const PHOTO_URL = /^(https?:\/\/\S+|\/media\/[a-f0-9]{32}\.jpg)$/;
export function photoList(v: unknown): { url: string }[] {
  return Array.isArray(v) ? v.slice(0, 50).filter((p: any) => PHOTO_URL.test(String(p?.url ?? ''))).map((p: any) => ({ url: String(p.url) })) : [];
}

function logFields(b: any): Partial<DailyLog> {
  const out: Partial<DailyLog> = {};
  if (b.date !== undefined) out.date = checkDate(b.date, 'date');
  if (b.workPerformed !== undefined) out.workPerformed = str(b.workPerformed, 'workPerformed', 10000);
  if (b.weather !== undefined) out.weather = b.weather ? { conditions: optStr(b.weather.conditions, 100), highF: b.weather.highF === undefined ? undefined : num(b.weather.highF), lowF: b.weather.lowF === undefined ? undefined : num(b.weather.lowF), delay: !!b.weather.delay } : undefined;
  if (b.crew !== undefined) out.crew = Array.isArray(b.crew) ? b.crew.slice(0, 100).map((c: any) => ({ name: str(c?.name, 'crew name', 120), company: optStr(c?.company, 120), hours: c?.hours === undefined ? undefined : num(c.hours) })) : [];
  if (b.delays !== undefined) out.delays = optStr(b.delays);
  if (b.safety !== undefined) out.safety = optStr(b.safety);
  if (b.photos !== undefined) out.photos = photoList(b.photos).map((p) => ({ url: p.url, caption: optStr((b.photos as any[]).find((x) => x?.url === p.url)?.caption, 300) }));
  if (b.visibleToClient !== undefined) out.visibleToClient = !!b.visibleToClient;
  return out;
}

export async function listLogs(projectId: string) {
  await mustProject(projectId);
  return (await repos.logs.list(projectId)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
export async function createLog(projectId: string, b: any, author: string, id?: string) {
  await mustProject(projectId);
  const f = logFields({ date: today(), visibleToClient: false, crew: [], photos: [], ...b });
  return repos.logs.create({ projectId, author, date: f.date!, workPerformed: f.workPerformed ?? str(b.workPerformed, 'workPerformed'), weather: f.weather, crew: f.crew ?? [], delays: f.delays, safety: f.safety, photos: f.photos ?? [], visibleToClient: f.visibleToClient ?? false }, id);
}
export async function updateLog(id: string, b: any) { await must(repos.logs.get(id), 'Daily log'); return repos.logs.update(id, logFields(b)); }
export async function removeLog(id: string) { if (!(await repos.logs.remove(id))) throw new NotFound('Daily log not found.'); }

// ---------- change orders ----------

const withCoTotals = (c: ChangeOrder) => ({ ...c, totals: changeOrderTotals(c) });

export async function listChangeOrders(projectId: string) {
  await mustProject(projectId);
  return (await repos.changeOrders.list(projectId)).map(withCoTotals);
}
export async function createChangeOrder(projectId: string, b: any) {
  await mustProject(projectId);
  const n = await repos.changeOrders.nextNumber(projectId);
  return withCoTotals(await repos.changeOrders.create({
    projectId, number: `CO-${String(n).padStart(4, '0')}`, title: str(b.title, 'title', 200), description: optStr(b.description),
    lines: checkLines(b.lines ?? []), scheduleImpactDays: Math.max(0, Math.round(num(b.scheduleImpactDays))), status: 'draft',
  }));
}
export async function updateChangeOrder(id: string, b: any) {
  const co = await must(repos.changeOrders.get(id), 'Change order');
  if (!['draft', 'declined'].includes(co.status)) throw new BadRequest('Only draft or declined change orders can be edited. Move it back to draft first.');
  const patch: Partial<ChangeOrder> = {};
  if (b.title !== undefined) patch.title = str(b.title, 'title', 200);
  if (b.description !== undefined) patch.description = optStr(b.description);
  if (b.lines !== undefined) patch.lines = checkLines(b.lines);
  if (b.scheduleImpactDays !== undefined) patch.scheduleImpactDays = Math.max(0, Math.round(num(b.scheduleImpactDays)));
  return withCoTotals((await repos.changeOrders.update(id, patch))!);
}
export async function setChangeOrderStatus(id: string, to: ChangeOrderStatus, actor: { name: string; signatureName?: string; reason?: string }) {
  const co = await must(repos.changeOrders.get(id), 'Change order');
  if (!canTransition(co.status, to)) throw new BadRequest(`A ${co.status.replace('_', ' ')} change order cannot become ${to.replace('_', ' ')}.`);
  if (to === 'pending_client' && !co.lines.length) throw new BadRequest('Add at least one line before sending it to the client.');
  const now = new Date().toISOString();
  const patch: Partial<ChangeOrder> = { status: to };
  if (to === 'pending_client') { patch.sentAt = now; patch.decidedAt = undefined; patch.decidedBy = undefined; patch.signatureName = undefined; patch.declineReason = undefined; }
  if (to === 'approved' || to === 'declined') { patch.decidedAt = now; patch.decidedBy = actor.name; patch.signatureName = actor.signatureName; if (to === 'declined') patch.declineReason = optStr(actor.reason, 1000); }
  return withCoTotals((await repos.changeOrders.update(id, patch))!);
}
export async function contract(projectId: string) {
  const p = await mustProject(projectId);
  return contractSummary(Number(p.budget) || 0, await repos.changeOrders.list(projectId));
}

// ---------- selections ----------

const withSel = (s: Selection) => ({ ...s, ...selectionSummary(s) });
function options(v: unknown): SelectionOption[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 30).map((o: any) => ({ id: typeof o?.id === 'string' && o.id ? o.id : uuidv4(), name: str(o?.name, 'option name', 200), description: optStr(o?.description, 1000), price: num(o?.price), vendor: optStr(o?.vendor, 200), imageUrl: /^https?:\/\//.test(String(o?.imageUrl ?? '')) ? String(o.imageUrl) : undefined }));
}
export async function listSelections(projectId: string) { await mustProject(projectId); return (await repos.selections.list(projectId)).map(withSel); }
export async function createSelection(projectId: string, b: any) {
  await mustProject(projectId);
  return withSel(await repos.selections.create({ projectId, category: str(b.category, 'category', 100), title: str(b.title, 'title', 200), allowance: num(b.allowance), dueDate: b.dueDate ? checkDate(b.dueDate, 'dueDate') : undefined, options: options(b.options), status: 'pending' }));
}
export async function updateSelection(id: string, b: any) {
  await must(repos.selections.get(id), 'Selection');
  const patch: Partial<Selection> = {};
  if (b.category !== undefined) patch.category = str(b.category, 'category', 100);
  if (b.title !== undefined) patch.title = str(b.title, 'title', 200);
  if (b.allowance !== undefined) patch.allowance = num(b.allowance);
  if (b.dueDate !== undefined) patch.dueDate = b.dueDate ? checkDate(b.dueDate, 'dueDate') : undefined;
  if (b.options !== undefined) patch.options = options(b.options);
  if (b.status !== undefined) { if (!['pending', 'selected', 'approved', 'ordered'].includes(b.status)) throw new BadRequest('Unknown status.'); patch.status = b.status; }
  return withSel((await repos.selections.update(id, patch))!);
}
export async function chooseOption(id: string, optionId: string, by: string, notes?: string) {
  const s = await must(repos.selections.get(id), 'Selection');
  if (['approved', 'ordered'].includes(s.status)) throw new BadRequest('This selection is already approved.');
  if (!s.options.some((o) => o.id === optionId)) throw new BadRequest('That option is not on this selection.');
  return withSel((await repos.selections.update(id, { chosenOptionId: optionId, chosenBy: by, chosenAt: new Date().toISOString(), clientNotes: optStr(notes, 2000), status: 'selected' }))!);
}
export async function removeSelection(id: string) { if (!(await repos.selections.remove(id))) throw new NotFound('Selection not found.'); }

// ---------- leads ----------

export async function listLeads() { return (await repos.leads.list()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export async function leadPipeline() { return pipeline(await repos.leads.list()); }
export async function createLead(b: any, by: string) {
  return repos.leads.create({
    name: str(b.name, 'name', 200), contactName: optStr(b.contactName, 200), email: optStr(b.email, 200), phone: optStr(b.phone, 50), address: optStr(b.address, 300),
    source: optStr(b.source, 100), stage: b.stage ? checkStage(b.stage) : 'new', estimatedValue: b.estimatedValue === undefined ? undefined : num(b.estimatedValue),
    confidence: b.confidence === undefined ? undefined : Math.min(100, Math.max(0, num(b.confidence))), owner: optStr(b.owner, 120), notes: optStr(b.notes),
    activities: [{ at: new Date().toISOString(), type: 'created', note: 'Lead created', by }],
  });
}
export async function updateLead(id: string, b: any, by: string) {
  const l = await must(repos.leads.get(id), 'Lead');
  const patch: Partial<Lead> = {};
  for (const k of ['name', 'contactName', 'email', 'phone', 'address', 'source', 'owner', 'notes'] as const) if (b[k] !== undefined) (patch as any)[k] = k === 'name' ? str(b[k], 'name', 200) : optStr(b[k]);
  if (b.estimatedValue !== undefined) patch.estimatedValue = num(b.estimatedValue);
  if (b.confidence !== undefined) patch.confidence = Math.min(100, Math.max(0, num(b.confidence)));
  if (b.stage !== undefined && b.stage !== l.stage) { patch.stage = checkStage(b.stage); patch.activities = [...l.activities, { at: new Date().toISOString(), type: 'stage', note: `${l.stage} → ${patch.stage}`, by }]; }
  return repos.leads.update(id, patch);
}
export async function addLeadActivity(id: string, b: any, by: string) {
  const l = await must(repos.leads.get(id), 'Lead');
  return repos.leads.update(id, { activities: [...l.activities, { at: new Date().toISOString(), type: optStr(b.type, 40) ?? 'note', note: str(b.note, 'note', 4000), by }].slice(-500) });
}

/** A won lead becomes a job: the project is created (budget from the accepted estimate, else the lead's value). */
export async function convertLead(id: string, by: string, b: any = {}) {
  const l = await must(repos.leads.get(id), 'Lead');
  if (l.projectId) return { lead: l, projectId: l.projectId, created: false };
  const accepted = (await repos.estimates.list()).find((e) => e.leadId === id && e.status === 'accepted');
  const budget = accepted ? estimateTotals(accepted).total : (l.estimatedValue ?? 0);
  const project = await projects.createProject({
    name: optStr(b.projectName, 200) ?? l.name, description: l.notes ?? '', status: ProjectStatus.PLANNING, type: ProjectType.RENOVATION, clientName: l.contactName ?? l.name,
    budget, location: l.address ? ({ address: l.address } as any) : undefined, tags: ['from-lead'],
  } as any);
  if (accepted) await repos.estimates.update(accepted.id, { projectId: project.id });
  const lead = await repos.leads.update(id, { stage: 'won', projectId: project.id, activities: [...l.activities, { at: new Date().toISOString(), type: 'converted', note: `Converted to job ${project.name}`, by }] });
  return { lead, projectId: project.id, created: true };
}

// ---------- estimates ----------

const withEst = (e: Estimate) => ({ ...e, totals: estimateTotals(e) });
function sections(v: unknown): Estimate['sections'] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 50).map((s: any) => ({ name: str(s?.name, 'section name', 120), lines: checkLines(s?.lines ?? []).map((l: any) => ({ costCode: optStr(l.costCode, 40), description: l.description, quantity: l.quantity, unit: optStr(l.unit, 20), unitCost: l.unitCost, markupPct: l.markupPct })) }));
}
export async function listEstimates(filter: { leadId?: string; projectId?: string } = {}) {
  return (await repos.estimates.list()).filter((e) => (!filter.leadId || e.leadId === filter.leadId) && (!filter.projectId || e.projectId === filter.projectId)).map(withEst);
}
export async function getEstimate(id: string) { return withEst(await must(repos.estimates.get(id), 'Estimate')); }
export async function createEstimate(b: any) {
  if (b.leadId) await must(repos.leads.get(String(b.leadId)), 'Lead');
  if (b.projectId) await mustProject(String(b.projectId));
  const n = await repos.estimates.nextNumber('all');
  return withEst(await repos.estimates.create({ leadId: optStr(b.leadId, 64), projectId: optStr(b.projectId, 64), number: `EST-${String(n).padStart(4, '0')}`, title: str(b.title, 'title', 200), sections: sections(b.sections), taxRatePct: Math.max(0, num(b.taxRatePct)), validUntil: b.validUntil ? checkDate(b.validUntil, 'validUntil') : undefined, notes: optStr(b.notes), status: 'draft' }));
}
export async function updateEstimate(id: string, b: any) {
  const e = await must(repos.estimates.get(id), 'Estimate');
  if (e.status === 'accepted') throw new BadRequest('An accepted estimate cannot be edited.');
  const patch: Partial<Estimate> = {};
  if (b.title !== undefined) patch.title = str(b.title, 'title', 200);
  if (b.sections !== undefined) patch.sections = sections(b.sections);
  if (b.taxRatePct !== undefined) patch.taxRatePct = Math.max(0, num(b.taxRatePct));
  if (b.validUntil !== undefined) patch.validUntil = b.validUntil ? checkDate(b.validUntil, 'validUntil') : undefined;
  if (b.notes !== undefined) patch.notes = optStr(b.notes);
  return withEst((await repos.estimates.update(id, patch))!);
}
export async function setEstimateStatus(id: string, to: EstimateStatus, by: string) {
  const e = await must(repos.estimates.get(id), 'Estimate');
  if (!['draft', 'sent', 'accepted', 'declined'].includes(to)) throw new BadRequest('Unknown status.');
  if (e.status === 'accepted' && to !== 'accepted') throw new BadRequest('An accepted estimate stays accepted.');
  const updated = (await repos.estimates.update(id, { status: to }))!;
  // Accepting moves the lead to won and turns it into a job.
  let projectId = updated.projectId;
  if (to === 'accepted' && updated.leadId) {
    const l = await repos.leads.get(updated.leadId);
    if (l && l.stage !== 'proposal_sent' && l.stage !== 'won') await updateLead(l.id, { stage: 'proposal_sent' }, by);
    projectId = (await convertLead(updated.leadId, by)).projectId;
  } else if (to === 'sent' && updated.leadId) {
    const l = await repos.leads.get(updated.leadId);
    if (l && ['new', 'contacted', 'site_visit', 'estimating'].includes(l.stage)) await updateLead(l.id, { stage: 'proposal_sent' }, by);
  }
  return { ...withEst((await repos.estimates.get(id))!), projectId };
}

// ---------- client portal ----------

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function listAccess(projectId: string) { await mustProject(projectId); return (await repos.access.list(projectId)).map(({ tokenHash: _t, ...a }) => a); }
/** Creates a portal link. The token is returned once and only its hash is stored. */
export async function createAccess(projectId: string, b: any) {
  await mustProject(projectId);
  const token = crypto.randomBytes(24).toString('base64url');
  const a = await repos.access.create({ projectId, name: str(b.name, 'name', 120), email: optStr(b.email, 200), tokenHash: hash(token), revoked: false });
  const { tokenHash: _t, ...rest } = a;
  return { access: rest, token };
}
export async function revokeAccess(id: string) { const a = await must(repos.access.get(id), 'Portal access'); return repos.access.update(a.id, { revoked: true }); }

export async function resolvePortal(token: string): Promise<ClientAccess> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw new NotFound('This link is not valid.');
  const h = hash(token);
  const match = (await repos.access.list()).find((a) => crypto.timingSafeEqual(Buffer.from(a.tokenHash), Buffer.from(h)));
  if (!match || match.revoked) throw new NotFound('This link is not valid or was turned off.');
  repos.access.update(match.id, { lastSeenAt: new Date().toISOString() }).catch(() => {});
  return match;
}

/** What a homeowner sees: only client-visible schedule and logs, their selections, and change orders sent to them. */
export async function portalOverview(a: ClientAccess) {
  const p = await mustProject(a.projectId);
  const [schedule, logs, cos, sels] = await Promise.all([repos.schedule.list(a.projectId), repos.logs.list(a.projectId), repos.changeOrders.list(a.projectId), repos.selections.list(a.projectId)]);
  return {
    client: { name: a.name },
    job: { name: p.name, status: p.status, startDate: p.startDate, endDate: p.endDate },
    contract: contractSummary(Number(p.budget) || 0, cos),
    schedule: schedule.filter((i) => i.visibleToClient).sort((x, y) => x.startDate.localeCompare(y.startDate)).map((i) => ({ id: i.id, title: i.title, startDate: i.startDate, endDate: i.endDate, status: i.status, progress: i.progress })),
    dailyLogs: logs.filter((l) => l.visibleToClient).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 30).map((l) => ({ id: l.id, date: l.date, workPerformed: l.workPerformed, weather: l.weather, photos: l.photos })),
    changeOrders: cos.filter((c) => c.status !== 'draft' && c.status !== 'void').map((c) => ({ id: c.id, number: c.number, title: c.title, description: c.description, status: c.status, lines: c.lines.map((l) => ({ description: l.description, quantity: l.quantity, price: Math.round(l.quantity * l.unitCost * (1 + l.markupPct / 100) * 100) / 100 })), total: changeOrderTotals(c).price, scheduleImpactDays: c.scheduleImpactDays, decidedAt: c.decidedAt, signatureName: c.signatureName })),
    selections: sels.map((s) => ({ id: s.id, category: s.category, title: s.title, allowance: s.allowance, dueDate: s.dueDate, status: s.status, chosenOptionId: s.chosenOptionId, options: s.options, ...selectionSummary(s) })),
  };
}

export async function portalDecide(a: ClientAccess, changeOrderId: string, b: any) {
  const co = await must(repos.changeOrders.get(changeOrderId), 'Change order');
  if (co.projectId !== a.projectId || co.status !== 'pending_client') throw new NotFound('Change order not found.');
  const approve = b.decision === 'approve';
  if (!approve && b.decision !== 'decline') throw new BadRequest('decision must be approve or decline.');
  return setChangeOrderStatus(co.id, approve ? 'approved' : 'declined', { name: `${a.name} (client)`, signatureName: approve ? str(b.signatureName, 'Type your full name to sign', 120) : undefined, reason: b.reason });
}

export async function portalChoose(a: ClientAccess, selectionId: string, b: any) {
  const s = await must(repos.selections.get(selectionId), 'Selection');
  if (s.projectId !== a.projectId) throw new NotFound('Selection not found.');
  return chooseOption(s.id, str(b.optionId, 'optionId', 64), `${a.name} (client)`, b.notes);
}
