import { TooMany } from './repo';

/** A small in-memory brake on guessing (passwords, invite links): at most `max` tries per key in `windowMs`. */
const tries = new Map<string, { at: number; n: number }>();

export function throttle(key: string, max: number, windowMs: number) {
  const t = Date.now();
  const e = tries.get(key);
  if (!e || t - e.at > windowMs) tries.set(key, { at: t, n: 1 });
  else if (++e.n > max) throw new TooMany('Too many tries. Wait a few minutes and try again.');
  if (tries.size > 5000) tries.clear();
}
