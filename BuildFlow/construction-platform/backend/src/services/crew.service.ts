import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Repo, NotFound, BadRequest, Unauthorized, Forbidden, TooMany } from '../lib/repo';
import type { CrewMember, CrewRole, PunchItem } from '../models/builder.types';
import { ProjectService } from './project.service';
import * as B from './builder.service';

/**
 * The field team: crew accounts the owner creates, how they sign in, and the narrow slice of Build-flow they can
 * use from a phone. A crew member sees only the jobs they are assigned to, never contracts, estimates or prices,
 * and every change they make carries their name.
 */

export const crewRepo = new Repo<CrewMember>('crew');
export const punchRepo = new Repo<PunchItem>('punch', 'projectId');
const projects = new ProjectService();

const ROLES: CrewRole[] = ['crew', 'foreman'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const str = (v: unknown, field: string, max = 200) => { if (typeof v !== 'string' || !v.trim()) throw new BadRequest(`${field} is required.`); return v.trim().slice(0, max); };
const optStr = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const today = () => new Date().toISOString().slice(0, 10);

// ---------- sessions ----------

/** Crew tokens are signed with a key derived from (but different to) the office key, so neither works for the other. */
const secret = () => crypto.createHmac('sha256', config.jwt.secret).update('buildflow-crew-v1').digest('hex');
const SESSION_DAYS = 30;
export const signCrew = (c: CrewMember) => jwt.sign({ k: 'crew', id: c.id, v: c.tokenVersion }, secret(), { expiresIn: `${SESSION_DAYS}d` });

export const publicCrew = (c: CrewMember) => {
  const { passwordHash, inviteHash: _i, ...rest } = c;
  const expired = !!c.inviteExpiresAt && c.inviteExpiresAt < new Date().toISOString();
  return { ...rest, access: !c.active ? 'disabled' : passwordHash ? 'active' : expired ? 'expired' : 'invited' };
};

/** The crew member a token belongs to, if it is genuine, current and the account is on. */
export async function crewFromToken(token: string | undefined): Promise<CrewMember> {
  if (!token) throw new Unauthorized('Sign in to continue.');
  let p: any;
  try { p = jwt.verify(token, secret()); } catch { throw new Unauthorized('Your sign-in has expired. Sign in again.'); }
  if (p?.k !== 'crew') throw new Unauthorized('Sign in to continue.');
  const c = await crewRepo.get(String(p.id));
  if (!c || !c.active || c.tokenVersion !== p.v) throw new Unauthorized('Your access was turned off. Ask the office.');
  return c;
}

// A small in-memory brake on guessing: per email and overall.
const tries = new Map<string, { at: number; n: number }>();
function throttle(key: string, max: number, windowMs: number) {
  const t = Date.now();
  const e = tries.get(key);
  if (!e || t - e.at > windowMs) tries.set(key, { at: t, n: 1 });
  else if (++e.n > max) throw new TooMany('Too many tries. Wait a few minutes and try again.');
  if (tries.size > 5000) tries.clear();
}

// ---------- accounts (office) ----------

function newInvite() {
  const token = crypto.randomBytes(24).toString('base64url');
  return { token, hash: sha256(token), expires: new Date(Date.now() + 14 * 86_400_000).toISOString() };
}

async function checkJobs(v: unknown): Promise<string[]> {
  const ids = Array.isArray(v) ? [...new Set(v.map(String))].slice(0, 200) : [];
  for (const id of ids) if (!(await projects.getProject(id))) throw new BadRequest('One of the jobs does not exist.');
  return ids;
}

export async function listCrew() {
  return (await crewRepo.list()).map(publicCrew);
}

/** Creates the account and an invite. The invite token is returned once; only its hash is stored. */
export async function createCrew(b: any) {
  const email = str(b.email, 'email', 200).toLowerCase();
  if (!EMAIL.test(email)) throw new BadRequest('Enter a valid email address.');
  if ((await crewRepo.list()).some((c) => c.email === email)) throw new BadRequest('Someone on the crew already has that email.');
  const role: CrewRole = ROLES.includes(b.role) ? b.role : 'crew';
  const inv = newInvite();
  const crew = await crewRepo.create({ name: str(b.name, 'name', 120), email, phone: optStr(b.phone, 40), role, jobIds: await checkJobs(b.jobIds), active: true, inviteHash: inv.hash, inviteExpiresAt: inv.expires, tokenVersion: 0 });
  return { crew: publicCrew(crew), inviteToken: inv.token };
}

export async function updateCrew(id: string, b: any) {
  const c = await crewRepo.get(id);
  if (!c) throw new NotFound('Crew member not found.');
  const patch: Partial<CrewMember> = {};
  if (b.name !== undefined) patch.name = str(b.name, 'name', 120);
  if (b.phone !== undefined) patch.phone = optStr(b.phone, 40);
  if (b.role !== undefined) { if (!ROLES.includes(b.role)) throw new BadRequest('Unknown role.'); patch.role = b.role; }
  if (b.jobIds !== undefined) patch.jobIds = await checkJobs(b.jobIds);
  if (b.active !== undefined) { patch.active = !!b.active; if (!patch.active) patch.tokenVersion = c.tokenVersion + 1; }
  return publicCrew((await crewRepo.update(id, patch))!);
}

/** Lost phone or forgotten password: turns off the old sign-ins and makes a fresh invite link. */
export async function resetCrew(id: string) {
  const c = await crewRepo.get(id);
  if (!c) throw new NotFound('Crew member not found.');
  const inv = newInvite();
  const crew = await crewRepo.update(id, { passwordHash: undefined, inviteHash: inv.hash, inviteExpiresAt: inv.expires, tokenVersion: c.tokenVersion + 1, active: true });
  return { crew: publicCrew(crew!), inviteToken: inv.token };
}

export async function removeCrew(id: string) {
  if (!(await crewRepo.remove(id))) throw new NotFound('Crew member not found.');
}

// ---------- sign-in (public) ----------

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const checkPassword = (p: unknown) => {
  if (typeof p !== 'string' || p.length < 8) throw new BadRequest('Choose a password of at least 8 characters.');
  if (p.length > 128) throw new BadRequest('That password is too long.');
  return p;
};

/** First sign-in: the invite link plus a password of their own. */
export async function joinCrew(token: unknown, password: unknown) {
  throttle('join:*', 60, 60_000);
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw new BadRequest('This invite link is not valid.');
  const h = sha256(token);
  const c = (await crewRepo.list()).find((x) => x.inviteHash && same(x.inviteHash, h));
  if (!c || !c.active) throw new BadRequest('This invite link is not valid or was already used.');
  if (c.inviteExpiresAt && c.inviteExpiresAt < new Date().toISOString()) throw new BadRequest('This invite link has expired. Ask the office for a new one.');
  const passwordHash = await bcrypt.hash(checkPassword(password), 10);
  const next = (await crewRepo.update(c.id, { passwordHash, inviteHash: undefined, inviteExpiresAt: undefined, tokenVersion: c.tokenVersion + 1, lastSeenAt: new Date().toISOString() }))!;
  return { token: signCrew(next), crew: publicCrew(next) };
}

export async function loginCrew(email: unknown, password: unknown) {
  const e = typeof email === 'string' ? email.trim().toLowerCase() : '';
  throttle(`login:${e}`, 10, 15 * 60_000);
  throttle('login:*', 200, 60_000);
  const c = (await crewRepo.list()).find((x) => x.email === e);
  // Always do one password check, so an unknown email takes as long as a wrong password.
  const ok = await bcrypt.compare(typeof password === 'string' ? password.slice(0, 128) : '', c?.passwordHash ?? DUMMY_HASH);
  if (!c || !c.active || !c.passwordHash || !ok) throw new Unauthorized('Wrong email or password.');
  const next = (await crewRepo.update(c.id, { lastSeenAt: new Date().toISOString() }))!;
  return { token: signCrew(next), crew: publicCrew(next) };
}

// ---------- what a crew member can see and do (no money) ----------

async function assigned(c: CrewMember, projectId: string) {
  if (!c.jobIds.includes(projectId)) throw new Forbidden('That job is not assigned to you.');
  const p = await projects.getProject(projectId);
  if (!p) throw new NotFound('Job not found.');
  return p;
}

const jobCard = (p: any) => ({ id: p.id, number: p.number, name: p.name, status: p.status, address: p.location?.address ?? null });

const scheduleView = (i: any) => ({ id: i.id, title: i.title, startDate: i.startDate, endDate: i.endDate, status: i.status, progress: i.progress, assignees: i.assignees, notes: i.notes, updatedBy: i.updatedBy });

export async function fieldJobs(c: CrewMember, day?: string) {
  const t = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today();
  const out = [];
  for (const id of c.jobIds) {
    const p = await projects.getProject(id);
    if (!p) continue;
    const items = await B.repos.schedule.list(id);
    const open = items.filter((i) => i.status !== 'complete');
    out.push({
      ...jobCard(p),
      progress: items.length ? Math.round(items.reduce((s, i) => s + (i.status === 'complete' ? 100 : i.progress), 0) / items.length) : 0,
      today: open.filter((i) => i.startDate <= t && i.endDate >= t).length,
      late: open.filter((i) => i.endDate < t).length,
    });
  }
  return out;
}

export async function fieldJob(c: CrewMember, projectId: string) {
  const p = await assigned(c, projectId);
  const [items, logs, punch] = await Promise.all([B.repos.schedule.list(projectId), B.repos.logs.list(projectId), punchRepo.list(projectId)]);
  return {
    job: jobCard(p),
    me: { id: c.id, name: c.name, role: c.role },
    schedule: items.sort((a, b) => a.startDate.localeCompare(b.startDate)).map(scheduleView),
    logs: logs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map((l) => ({ id: l.id, date: l.date, author: l.author, workPerformed: l.workPerformed, weather: l.weather, crew: l.crew, delays: l.delays, photos: l.photos })),
    punch: punch.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
  };
}

/** Start/finish and progress only; dates and dependencies stay with the office. */
export async function fieldUpdateItem(c: CrewMember, itemId: string, b: any) {
  const item = await B.repos.schedule.get(itemId);
  if (!item) throw new NotFound('Schedule item not found.');
  await assigned(c, item.projectId);
  const patch: any = {};
  if (b.status !== undefined) patch.status = b.status;
  if (b.progress !== undefined) patch.progress = b.progress;
  if (b.status === 'in_progress' && b.progress === undefined && item.progress >= 100) patch.progress = 0;
  const r = await B.updateScheduleItem(itemId, patch, `${c.name} (field)`);
  return { item: scheduleView(r.item) };
}

const clientId = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : ID.test(String(v)) ? String(v) : (() => { throw new BadRequest('Bad clientId.'); })());

/** A daily log from the field. A repeated clientId (a retry after bad signal) returns the first one instead of a copy. */
export async function fieldCreateLog(c: CrewMember, projectId: string, b: any) {
  await assigned(c, projectId);
  const id = clientId(b.clientId);
  if (id) {
    const prev = await B.repos.logs.get(id);
    if (prev) { if (prev.projectId !== projectId) throw new BadRequest('That clientId is already used.'); return prev; }
  }
  const { visibleToClient: _v, author: _a, ...rest } = b;
  return B.createLog(projectId, { ...rest, visibleToClient: false }, c.name, id);
}

export async function fieldCreatePunch(c: CrewMember, projectId: string, b: any): Promise<PunchItem> {
  await assigned(c, projectId);
  const id = clientId(b.clientId);
  if (id) {
    const prev = await punchRepo.get(id);
    if (prev) { if (prev.projectId !== projectId) throw new BadRequest('That clientId is already used.'); return prev; }
  }
  return punchRepo.create({ projectId, title: str(b.title, 'title', 200), detail: optStr(b.detail), location: optStr(b.location, 200), photos: B.photoList(b.photos), status: 'open', createdBy: c.name }, id);
}

export async function fieldResolvePunch(c: CrewMember, id: string) {
  const it = await punchRepo.get(id);
  if (!it) throw new NotFound('Punch item not found.');
  await assigned(c, it.projectId);
  if (c.role !== 'foreman') throw new Forbidden('Only a foreman can close punch items.');
  return punchRepo.update(id, { status: 'resolved', resolvedBy: c.name, resolvedAt: new Date().toISOString() });
}

// ---------- punch list (office) ----------

export async function listPunch(projectId: string) { return (await punchRepo.list(projectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function setPunchStatus(id: string, status: unknown, actor: string) {
  if (status !== 'open' && status !== 'resolved') throw new BadRequest('status must be open or resolved.');
  if (!(await punchRepo.get(id))) throw new NotFound('Punch item not found.');
  return punchRepo.update(id, status === 'resolved' ? { status, resolvedBy: actor, resolvedAt: new Date().toISOString() } : { status, resolvedBy: undefined, resolvedAt: undefined });
}
export async function removePunch(id: string) { if (!(await punchRepo.remove(id))) throw new NotFound('Punch item not found.'); }

// ---------- photos ----------

const MEDIA_DIR = () => path.join(config.storage.path, 'media');
const MEDIA_ID = /^[a-f0-9]{32}$/;
const MAX_PHOTO = 4 * 1024 * 1024;
const uploads = new Map<string, { at: number; n: number }>();

/** Stores one JPEG (the field app shrinks photos before sending) and returns its address. Checks it really is a JPEG. */
export async function savePhoto(c: CrewMember, buf: unknown): Promise<{ url: string }> {
  if (!Buffer.isBuffer(buf) || buf.length < 100) throw new BadRequest('Send a JPEG photo.');
  if (buf.length > MAX_PHOTO) throw new BadRequest('That photo is too large (4 MB at most).');
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) throw new BadRequest('Only JPEG photos are accepted.');
  const t = Date.now();
  const u = uploads.get(c.id);
  if (!u || t - u.at > 3_600_000) uploads.set(c.id, { at: t, n: 1 });
  else if (++u.n > 200) throw new TooMany('That is a lot of photos for one hour. Try again later.');
  await fs.promises.mkdir(MEDIA_DIR(), { recursive: true, mode: 0o750 });
  const id = crypto.randomBytes(16).toString('hex');
  await fs.promises.writeFile(path.join(MEDIA_DIR(), `${id}.jpg`), buf, { mode: 0o640 });
  return { url: `/media/${id}.jpg` };
}

export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!MEDIA_ID.test(id)) return null;
  try { return await fs.promises.readFile(path.join(MEDIA_DIR(), `${id}.jpg`)); } catch { return null; }
}
