import { BadRequest } from './repo';
import type { ChangeOrder, Estimate, LeadStage, PricedLine, ScheduleItem, Selection } from '../models/builder.types';
import { LEAD_STAGES } from '../models/builder.types';

/** Pure rules for the builder modules (no storage), so they can be tested on their own. */

const DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function checkDate(d: unknown, field: string): string {
  if (typeof d !== 'string' || !DATE_RE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) throw new BadRequest(`${field} must be a date (YYYY-MM-DD).`);
  return d;
}
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
export const durationDays = (i: Pick<ScheduleItem, 'startDate' | 'endDate'>) => daysBetween(i.startDate, i.endDate) + 1;

/** Throws if linking `id` to `predecessorIds` would make a loop or point outside the project. */
export function checkPredecessors(items: ScheduleItem[], id: string, predecessorIds: string[]) {
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const p of predecessorIds) {
    if (p === id) throw new BadRequest('An item cannot depend on itself.');
    if (!byId.has(p)) throw new BadRequest('A predecessor is not on this job’s schedule.');
  }
  // Walk up from each predecessor; reaching `id` means a cycle.
  const seen = new Set<string>();
  const stack = [...predecessorIds];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === id) throw new BadRequest('That link would make a loop in the schedule.');
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(byId.get(cur)?.predecessorIds ?? []));
  }
}

/**
 * Finish-to-start rescheduling after a change: every item that depends (directly or not) on a changed item starts
 * the day after its latest predecessor ends (plus lag), keeping its duration. Items are only pushed later, never
 * pulled earlier, so manual gaps are kept. Returns only the items whose dates changed.
 */
export function reschedule(items: ScheduleItem[]): ScheduleItem[] {
  const byId = new Map(items.map((i) => [i.id, { ...i }]));
  const order = topoOrder(items);
  const changed = new Set<string>();
  for (const id of order) {
    const it = byId.get(id)!;
    if (!it.predecessorIds.length) continue;
    const latestEnd = it.predecessorIds.map((p) => byId.get(p)!.endDate).sort().at(-1)!;
    const earliestStart = addDays(latestEnd, 1 + (it.lagDays || 0));
    if (it.startDate < earliestStart) {
      const dur = durationDays(it);
      it.startDate = earliestStart;
      it.endDate = addDays(earliestStart, dur - 1);
      changed.add(id);
    }
  }
  return [...changed].map((id) => byId.get(id)!);
}

function topoOrder(items: ScheduleItem[]): string[] {
  const indeg = new Map(items.map((i) => [i.id, 0]));
  const next = new Map<string, string[]>();
  for (const i of items) for (const p of i.predecessorIds) {
    if (!indeg.has(p)) continue;
    indeg.set(i.id, (indeg.get(i.id) ?? 0) + 1);
    next.set(p, [...(next.get(p) ?? []), i.id]);
  }
  const q = items.filter((i) => indeg.get(i.id) === 0).map((i) => i.id);
  const out: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(id);
    for (const n of next.get(id) ?? []) { indeg.set(n, indeg.get(n)! - 1); if (indeg.get(n) === 0) q.push(n); }
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function checkLines(lines: unknown): PricedLine[] {
  if (!Array.isArray(lines)) throw new BadRequest('lines must be a list.');
  return lines.map((l: any, i) => {
    const q = Number(l?.quantity), c = Number(l?.unitCost), m = Number(l?.markupPct ?? 0);
    if (!l?.description || !Number.isFinite(q) || !Number.isFinite(c) || !Number.isFinite(m)) throw new BadRequest(`Line ${i + 1} needs a description, quantity, unitCost and markupPct.`);
    return { ...l, description: String(l.description), quantity: q, unitCost: c, markupPct: m };
  });
}

export function lineTotals(lines: PricedLine[]) {
  const cost = round2(lines.reduce((s, l) => s + l.quantity * l.unitCost, 0));
  const price = round2(lines.reduce((s, l) => s + l.quantity * l.unitCost * (1 + l.markupPct / 100), 0));
  return { cost, markup: round2(price - cost), price };
}

export const changeOrderTotals = (co: Pick<ChangeOrder, 'lines'>) => lineTotals(co.lines);

/** The contract after change orders: original amount plus every approved change order. */
export function contractSummary(original: number, cos: ChangeOrder[]) {
  const approved = cos.filter((c) => c.status === 'approved');
  const approvedTotal = round2(approved.reduce((s, c) => s + changeOrderTotals(c).price, 0));
  const pendingTotal = round2(cos.filter((c) => c.status === 'pending_client').reduce((s, c) => s + changeOrderTotals(c).price, 0));
  return { original: round2(original), approvedChangeOrders: approvedTotal, pendingChangeOrders: pendingTotal, revised: round2(original + approvedTotal), scheduleImpactDays: approved.reduce((s, c) => s + (c.scheduleImpactDays || 0), 0) };
}

/** Who may move a change order where. The client decides only pending ones. */
export function canTransition(from: ChangeOrder['status'], to: ChangeOrder['status']): boolean {
  const ok: Record<string, string[]> = { draft: ['pending_client', 'void'], pending_client: ['approved', 'declined', 'draft', 'void'], declined: ['draft', 'void'], approved: ['void'], void: [] };
  return ok[from]?.includes(to) ?? false;
}

export function selectionSummary(s: Selection) {
  const chosen = s.options.find((o) => o.id === s.chosenOptionId);
  return { chosen: chosen ?? null, overage: chosen ? round2(chosen.price - s.allowance) : 0, overdue: !s.chosenOptionId && !!s.dueDate && s.dueDate < new Date().toISOString().slice(0, 10) };
}

export function estimateTotals(e: Pick<Estimate, 'sections' | 'taxRatePct'>) {
  const all = e.sections.flatMap((s) => s.lines);
  const t = lineTotals(all);
  const tax = round2(t.price * (e.taxRatePct || 0) / 100);
  return { ...t, tax, total: round2(t.price + tax), sections: e.sections.map((s) => ({ name: s.name, ...lineTotals(s.lines) })) };
}

export function checkStage(stage: unknown): LeadStage {
  if (!LEAD_STAGES.includes(stage as LeadStage)) throw new BadRequest(`stage must be one of ${LEAD_STAGES.join(', ')}.`);
  return stage as LeadStage;
}

/** Pipeline numbers: count and weighted value per stage. */
export function pipeline(leads: { stage: LeadStage; estimatedValue?: number; confidence?: number }[]) {
  return LEAD_STAGES.map((stage) => {
    const ls = leads.filter((l) => l.stage === stage);
    return { stage, count: ls.length, value: round2(ls.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)), weighted: round2(ls.reduce((s, l) => s + (l.estimatedValue ?? 0) * (l.confidence ?? 0) / 100, 0)) };
  });
}
