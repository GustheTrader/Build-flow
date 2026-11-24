import { fetchAPI } from './api';

/** Builder modules API (backend/src/routes/builder.routes.ts and portal.routes.ts). */

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const schedule = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/schedule`),
  create: (pid: string, b: any) => fetchAPI(`/projects/${pid}/schedule`, json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/schedule/${id}`, json('PATCH', b)),
  remove: (id: string) => fetchAPI(`/schedule/${id}`, json('DELETE')),
};
export const dailyLogs = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/daily-logs`),
  create: (pid: string, b: any) => fetchAPI(`/projects/${pid}/daily-logs`, json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/daily-logs/${id}`, json('PATCH', b)),
  remove: (id: string) => fetchAPI(`/daily-logs/${id}`, json('DELETE')),
};
export const changeOrders = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/change-orders`),
  create: (pid: string, b: any) => fetchAPI(`/projects/${pid}/change-orders`, json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/change-orders/${id}`, json('PATCH', b)),
  setStatus: (id: string, status: string, extra: any = {}) => fetchAPI(`/change-orders/${id}/status`, json('POST', { status, ...extra })),
};
export const selections = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/selections`),
  create: (pid: string, b: any) => fetchAPI(`/projects/${pid}/selections`, json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/selections/${id}`, json('PATCH', b)),
  remove: (id: string) => fetchAPI(`/selections/${id}`, json('DELETE')),
};
export const leads = {
  list: () => fetchAPI('/leads'),
  get: (id: string) => fetchAPI(`/leads/${id}`),
  create: (b: any) => fetchAPI('/leads', json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/leads/${id}`, json('PATCH', b)),
  addActivity: (id: string, b: any) => fetchAPI(`/leads/${id}/activities`, json('POST', b)),
  convert: (id: string, b: any = {}) => fetchAPI(`/leads/${id}/convert`, json('POST', b)),
};
export const estimates = {
  list: (q: { leadId?: string; projectId?: string } = {}) => fetchAPI(`/estimates?${new URLSearchParams(q as Record<string, string>)}`),
  get: (id: string) => fetchAPI(`/estimates/${id}`),
  create: (b: any) => fetchAPI('/estimates', json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/estimates/${id}`, json('PATCH', b)),
  setStatus: (id: string, status: string) => fetchAPI(`/estimates/${id}/status`, json('POST', { status })),
};
export const portalAccess = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/portal-access`),
  create: (pid: string, b: any) => fetchAPI(`/projects/${pid}/portal-access`, json('POST', b)),
  revoke: (id: string) => fetchAPI(`/portal-access/${id}`, json('DELETE')),
};
export const punch = {
  list: (pid: string) => fetchAPI(`/projects/${pid}/punch`),
  setStatus: (id: string, status: 'open' | 'resolved') => fetchAPI(`/punch/${id}/status`, json('POST', { status })),
  remove: (id: string) => fetchAPI(`/punch/${id}`, json('DELETE')),
};
export const crew = {
  list: () => fetchAPI('/crew'),
  create: (b: any) => fetchAPI('/crew', json('POST', b)),
  update: (id: string, b: any) => fetchAPI(`/crew/${id}`, json('PATCH', b)),
  reset: (id: string) => fetchAPI(`/crew/${id}/reset`, json('POST')),
  remove: (id: string) => fetchAPI(`/crew/${id}`, json('DELETE')),
};
export const portal = {
  get: (token: string) => fetchAPI(`/portal/${encodeURIComponent(token)}`),
  decide: (token: string, coId: string, b: any) => fetchAPI(`/portal/${encodeURIComponent(token)}/change-orders/${coId}/decision`, json('POST', b)),
  choose: (token: string, selId: string, b: any) => fetchAPI(`/portal/${encodeURIComponent(token)}/selections/${selId}/choose`, json('POST', b)),
};

export const money = (n: number | undefined | null) => (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const shortDate = (d?: string) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '');
export const today = () => new Date().toISOString().slice(0, 10);

/** Uploaded photos are stored as /media/<id>.jpg; show them under whichever base this app is served from. */
export const mediaUrl = (url: string) => (url.startsWith('/media/') ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${url}` : url);
