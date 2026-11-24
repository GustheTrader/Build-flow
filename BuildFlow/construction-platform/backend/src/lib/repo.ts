import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';

/**
 * A small record store on Redis, in the same shape the existing services use: each record is a JSON string at
 * `<name>:<id>`, every id is in the set `<name>s:all`, and records that belong to a parent (a project, a lead) are
 * also in `<name>s:by:<parentId>`. Writes go through MULTI so the record and its index sets change together.
 */
export interface Stored { id: string; createdAt: string; updatedAt: string }

export class Repo<T extends Stored> {
  constructor(readonly name: string, private readonly parentField?: keyof T) {}

  private key = (id: string) => `${this.name}:${id}`;
  private allKey = () => `${this.name}s:all`;
  private byKey = (parentId: string) => `${this.name}s:by:${parentId}`;
  private parentOf = (r: T): string | undefined => (this.parentField ? (r[this.parentField] as unknown as string | undefined) : undefined);

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, id: string = uuidv4()): Promise<T> {
    const now = new Date().toISOString();
    const rec = { ...(data as object), id, createdAt: now, updatedAt: now } as T;
    const tx = redisClient.getClient().multi().set(this.key(id), JSON.stringify(rec)).sAdd(this.allKey(), id);
    const parent = this.parentOf(rec);
    if (parent) tx.sAdd(this.byKey(parent), id);
    await tx.exec();
    return rec;
  }

  async get(id: string): Promise<T | null> {
    const raw = await redisClient.getClient().get(this.key(id));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  /** Every record, or only those of one parent. Oldest first. */
  async list(parentId?: string): Promise<T[]> {
    const redis = redisClient.getClient();
    const ids = await redis.sMembers(parentId ? this.byKey(parentId) : this.allKey());
    if (!ids.length) return [];
    const raws = await redis.mGet(ids.map(this.key));
    return raws.filter((r): r is string => !!r).map((r) => JSON.parse(r) as T).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async update(id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const prev = await this.get(id);
    if (!prev) return null;
    const next = { ...prev, ...patch, id, createdAt: prev.createdAt, updatedAt: new Date().toISOString() } as T;
    const tx = redisClient.getClient().multi().set(this.key(id), JSON.stringify(next));
    const a = this.parentOf(prev), b = this.parentOf(next);
    if (a !== b) { if (a) tx.sRem(this.byKey(a), id); if (b) tx.sAdd(this.byKey(b), id); }
    await tx.exec();
    return next;
  }

  async remove(id: string): Promise<boolean> {
    const prev = await this.get(id);
    if (!prev) return false;
    const tx = redisClient.getClient().multi().del(this.key(id)).sRem(this.allKey(), id);
    const parent = this.parentOf(prev);
    if (parent) tx.sRem(this.byKey(parent), id);
    await tx.exec();
    return true;
  }

  /** The next number in a per-scope sequence (CO-0001 per project, EST-0001 overall). */
  async nextNumber(scope: string): Promise<number> {
    return redisClient.getClient().incr(`${this.name}s:seq:${scope}`);
  }
}

export class NotFound extends Error { readonly status = 404; }
export class BadRequest extends Error { readonly status = 400; }
export class Unauthorized extends Error { readonly status = 401; }
export class Forbidden extends Error { readonly status = 403; }
export class TooMany extends Error { readonly status = 429; }
