import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, ClipboardList, HardHat, ListChecks, MapPin, Plus, Trash2, WifiOff, X } from 'lucide-react';
import { ApiError, cachedGet, photoSrc } from './api';
import { discard, enqueue, retry, useOutbox, type Entry } from './outbox';
import { shrink } from './photo';
import { Err, Label, Panel, Sheet, fieldCls, fmtDay, localToday, primary, secondary, small } from './ui';

/**
 * One job on a phone. Today: what is on the schedule, with one-tap Start and Done. Log: a daily log with photos.
 * Punch: issues to fix. Everything entered is saved to the phone first and sent when there is signal.
 */
type Item = { id: string; title: string; startDate: string; endDate: string; status: 'not_started' | 'in_progress' | 'complete'; progress: number; assignees: string[]; notes?: string; updatedBy?: string; pending?: boolean };
type Log = { id: string; date: string; author: string; workPerformed: string; weather?: { conditions?: string; highF?: number; delay?: boolean }; crew?: { name: string; hours?: number }[]; delays?: string; photos: { url: string }[]; pending?: boolean; failed?: string };
type Punch = { id: string; title: string; detail?: string; location?: string; photos: { url: string }[]; status: 'open' | 'resolved'; createdBy: string; pending?: boolean; failed?: string };
type JobData = { job: { id: string; number?: string; name: string; status: string; address: string | null }; me: { id: string; name: string; role: 'crew' | 'foreman' }; schedule: Item[]; logs: Log[]; punch: Punch[] };
type Tab = 'today' | 'log' | 'punch';

// ---------- data: the server's copy, with what is still waiting to be sent laid over it ----------

function useJob(id: string) {
  const [data, setData] = useState<JobData | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const r = await cachedGet<JobData>(`job:${id}`, `/jobs/${id}`); setData(r.data); setOffline(r.offline); setError(null); }
    catch (e) { setError(e instanceof ApiError && e.status === 403 ? 'That job is not assigned to you.' : e instanceof Error ? e.message : 'Could not load this job'); }
  }, [id]);
  useEffect(() => { void load(); const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000); return () => clearInterval(t); }, [load]);
  return { data, offline, error, reload: load };
}

/** Preview addresses for photos that haven't been sent yet. Revoked when the entry goes. */
function usePreviews(entries: Entry[]) {
  const cache = useRef(new Map<string, string>());
  useEffect(() => {
    const live = new Set(entries.flatMap((e) => e.photos.map((_, i) => `${e.id}:${i}`)));
    for (const [k, url] of cache.current) if (!live.has(k)) { URL.revokeObjectURL(url); cache.current.delete(k); }
  }, [entries]);
  useEffect(() => () => { for (const url of cache.current.values()) URL.revokeObjectURL(url); cache.current.clear(); }, []);
  return (e: Entry) => e.photos.map((b, i) => { const k = `${e.id}:${i}`; if (!cache.current.has(k)) cache.current.set(k, URL.createObjectURL(b)); return { url: cache.current.get(k)! }; });
}

// ---------- screen ----------

export default function JobScreen({ onMenu }: { onMenu: () => void }) {
  const { id = '' } = useParams();
  const { data, offline, error, reload } = useJob(id);
  const { entries, sending, online, waiting, failed } = useOutbox();
  const previews = usePreviews(entries);
  const [tab, setTab] = useState<Tab>('today');
  const [syncOpen, setSyncOpen] = useState(false);
  const mine = entries.filter((e) => e.projectId === id);

  // When the queue settles, fetch the server's version so what was sent shows up properly.
  useEffect(() => { if (!sending) void reload(); }, [sending, entries.length, reload]);

  const view = useMemo(() => {
    if (!data) return null;
    const edits = new Map(mine.filter((e) => e.kind === 'item').map((e) => [e.payload.itemId as string, e.payload]));
    const schedule = data.schedule.map((i) => {
      const p = edits.get(i.id);
      return p ? { ...i, status: p.status ?? i.status, progress: p.status === 'complete' ? 100 : p.progress ?? i.progress, pending: true } : i;
    });
    const logIds = new Set(data.logs.map((l) => l.id));
    const logs: Log[] = [
      ...mine.filter((e) => e.kind === 'log' && !logIds.has(e.id)).map((e) => ({ id: e.id, date: e.payload.date, author: data.me.name, workPerformed: e.payload.workPerformed, weather: e.payload.weather, crew: e.payload.crew, delays: e.payload.delays, photos: previews(e), pending: true, failed: e.error })).reverse(),
      ...data.logs,
    ];
    const punchIds = new Set(data.punch.map((p) => p.id));
    const resolving = new Set(mine.filter((e) => e.kind === 'resolve').map((e) => e.payload.punchId as string));
    const punch: Punch[] = [
      ...mine.filter((e) => e.kind === 'punch' && !punchIds.has(e.id)).map((e) => ({ id: e.id, title: e.payload.title, detail: e.payload.detail, location: e.payload.location, photos: previews(e), status: 'open' as const, createdBy: data.me.name, pending: true, failed: e.error })).reverse(),
      ...data.punch.map((p) => (resolving.has(p.id) ? { ...p, status: 'resolved' as const, pending: true } : p)),
    ];
    return { ...data, schedule, logs, punch };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, entries]);

  if (error && !view) return <div className="mx-auto max-w-xl p-6"><Link to="/" state={{ stay: true }} className="text-sm text-blue-600">‹ Your jobs</Link><p className="mt-4 text-sm text-red-600" role="alert">{error}</p></div>;
  if (!view) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  const openPunch = view.punch.filter((p) => p.status === 'open').length;
  const pill = failed ? { cls: 'bg-red-100 text-red-800', text: `${failed} need${failed === 1 ? 's' : ''} attention` }
    : waiting ? { cls: 'bg-amber-100 text-amber-800', text: `${online ? 'Sending' : 'Offline'} · ${waiting} waiting` }
    : !online || offline ? { cls: 'bg-gray-100 text-gray-700', text: 'Offline' }
    : { cls: 'bg-green-100 text-green-800', text: 'All sent' };

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-xl flex-col">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 pb-3 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" state={{ stay: true }} className="inline-flex min-h-10 items-center gap-1 rounded-sm pr-3 text-sm text-gray-600 active:bg-gray-100"><ArrowLeft size={16} />Jobs</Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSyncOpen(true)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${pill.cls}`}>{(!online || offline) && <WifiOff size={12} />}{pill.text}</button>
            <button type="button" onClick={onMenu} className="min-h-10 rounded-sm px-3 text-sm text-gray-600 active:bg-gray-100">{view.me.name.split(' ')[0]}</button>
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2"><span className="num text-xs text-gray-500">{view.job.number}</span><h1 className="!text-[1.6rem] text-gray-900">{view.job.name}</h1></div>
        {view.job.address && <a className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(view.job.address)}`}><MapPin size={14} />{view.job.address}</a>}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'today' && <Today projectId={id} items={view.schedule} />}
        {tab === 'log' && <LogTab projectId={id} me={view.me} logs={view.logs} />}
        {tab === 'punch' && <PunchTab projectId={id} me={view.me} items={view.punch} />}
      </main>

      <nav className="grid shrink-0 grid-cols-3 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Job sections">
        {([['today', 'Today', ListChecks, 0], ['log', 'Daily log', ClipboardList, 0], ['punch', 'Punch list', HardHat, openPunch]] as const).map(([k, label, Icon, n]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${tab === k ? 'text-blue-700' : 'text-gray-500'}`}>
            <Icon size={20} />{label}
            {n > 0 && <span className="num absolute right-[calc(50%-1.6rem)] top-1.5 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{n}</span>}
            {tab === k && <span className="absolute inset-x-6 top-0 h-[2px] bg-blue-600" aria-hidden />}
          </button>
        ))}
      </nav>

      <SyncSheet open={syncOpen} onClose={() => setSyncOpen(false)} entries={entries} online={online} />
    </div>
  );
}

// ---------- Today ----------

function Today({ projectId, items }: { projectId: string; items: Item[] }) {
  const t = localToday();
  const open = items.filter((i) => i.status !== 'complete');
  const late = open.filter((i) => i.endDate < t);
  const active = open.filter((i) => i.endDate >= t && (i.status === 'in_progress' || (i.startDate <= t)));
  const soon = open.filter((i) => !late.includes(i) && !active.includes(i)).slice(0, 5);
  const done = items.filter((i) => i.status === 'complete').slice(-4).reverse();
  const overall = items.length ? Math.round(items.reduce((s, i) => s + (i.status === 'complete' ? 100 : i.progress), 0) / items.length) : 0;
  const set = (i: Item, status: Item['status'], progress?: number) => void enqueue({ kind: 'item', projectId, payload: { itemId: i.id, status, progress } });

  if (!items.length) return <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">Nothing is on the schedule for this job yet. The office adds it in Build-flow.</p>;
  return (
    <div className="space-y-5">
      <div><div className="flex items-baseline justify-between text-xs text-gray-500"><span className="label-mono">Job progress</span><span className="num text-gray-800">{overall}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100"><div className="h-1.5 bg-blue-500" style={{ width: `${overall}%` }} /></div></div>
      <Group title="Running late" tone="alert" items={late} set={set} />
      <Group title="On today" items={active} set={set} empty="Nothing scheduled for today." />
      <Group title="Coming up" items={soon} set={set} />
      {done.length > 0 && <Group title="Done recently" items={done} set={set} />}
    </div>
  );
}

function Group({ title, items, set, tone, empty }: { title: string; items: Item[]; set: (i: Item, s: Item['status'], p?: number) => void; tone?: 'alert'; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <section>
      <h2 className={`label-mono mb-2 ${tone === 'alert' ? '!text-red-600' : ''}`}>{title}</h2>
      {!items.length ? <p className="text-sm text-gray-500">{empty}</p> : (
        <ul className="space-y-2">{items.map((i) => <ItemCard key={i.id} i={i} set={set} />)}</ul>
      )}
    </section>
  );
}

function ItemCard({ i, set }: { i: Item; set: (i: Item, s: Item['status'], p?: number) => void }) {
  return (
    <li className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className={`font-medium ${i.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{i.title}</div><div className="mt-0.5 text-xs text-gray-500">{fmtDay(i.startDate)} – {fmtDay(i.endDate)}{i.assignees.length ? ` · ${i.assignees.join(', ')}` : ''}</div></div>
        <span className="num shrink-0 text-xs text-gray-500">{i.pending ? 'sending…' : i.status === 'complete' ? 'done' : `${i.progress}%`}</span>
      </div>
      {i.status !== 'not_started' && <div className="mt-2 h-1 overflow-hidden rounded bg-gray-100"><div className={`h-1 ${i.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${i.progress}%` }} /></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {i.status === 'not_started' && <button type="button" className={primary} onClick={() => set(i, 'in_progress', 0)}>Start</button>}
        {i.status === 'in_progress' && (<>
          {[25, 50, 75].map((p) => <button key={p} type="button" className={`${small} ${i.progress === p ? '!border-blue-500 !text-blue-700' : ''}`} onClick={() => set(i, 'in_progress', p)}>{p}%</button>)}
          <button type="button" className={`${primary} flex-1`} onClick={() => set(i, 'complete')}><CheckCircle2 size={18} />Done</button>
        </>)}
        {i.status === 'complete' && <button type="button" className={small} onClick={() => set(i, 'in_progress', 75)}>Reopen</button>}
      </div>
    </li>
  );
}

// ---------- photos ----------

function PhotoPicker({ photos, onChange }: { photos: Blob[]; onChange: (p: Blob[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = useMemo(() => photos.map((b) => URL.createObjectURL(b)), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError(null);
    try {
      const next = [...photos];
      for (const f of [...files].slice(0, 12 - photos.length)) next.push(await shrink(f));
      onChange(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add that photo'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative h-20 w-20"><img src={u} alt="" className="h-20 w-20 rounded-sm border border-gray-200 object-cover" /><button type="button" aria-label="Remove photo" className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-gray-50" onClick={() => onChange(photos.filter((_, j) => j !== i))}><X size={14} /></button></div>
        ))}
        {photos.length < 12 && <button type="button" disabled={busy} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-gray-300 text-xs text-gray-500 active:bg-gray-100" onClick={() => input.current?.click()}><Camera size={20} />{busy ? 'Preparing…' : 'Photo'}</button>}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void add(e.target.files)} />
      <Err text={error} />
    </div>
  );
}

const Thumbs = ({ photos }: { photos: { url: string }[] }) => (photos.length ? <div className="mt-2 flex flex-wrap gap-2">{photos.map((p) => <a key={p.url} href={photoSrc(p.url)} target="_blank" rel="noreferrer"><img src={photoSrc(p.url)} alt="" loading="lazy" className="h-16 w-16 rounded-sm border border-gray-200 object-cover" /></a>)}</div> : null);

/** A form's text kept on the phone, so a call or a lock screen doesn't lose it. */
function useDraft<T extends object>(key: string, initial: T) {
  const k = `bf-draft:${key}`;
  const [v, setV] = useState<T>(() => { try { const raw = localStorage.getItem(k); return raw ? { ...initial, ...JSON.parse(raw) } : initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }, [k, v]);
  return [v, setV, () => { setV(initial); try { localStorage.removeItem(k); } catch { /* ignore */ } }] as const;
}

// ---------- Daily log ----------

const WEATHER = ['', 'Sunny', 'Partly cloudy', 'Cloudy', 'Rain', 'Snow', 'Windy', 'Hot', 'Cold'];

function LogTab({ projectId, me, logs }: { projectId: string; me: JobData['me']; logs: Log[] }) {
  const blank = { date: localToday(), conditions: '', highF: '', weatherDelay: false, work: '', delays: '', safety: '', crew: [{ name: me.name, hours: '8' }] as { name: string; hours: string }[] };
  const [d, setD, resetDraft] = useDraft(`log:${projectId}`, blank);
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await enqueue({
      kind: 'log', projectId, photos,
      payload: {
        date: d.date, workPerformed: d.work.trim(), delays: d.delays.trim() || undefined, safety: d.safety.trim() || undefined,
        weather: d.conditions || d.highF || d.weatherDelay ? { conditions: d.conditions || undefined, highF: d.highF === '' ? undefined : Number(d.highF), delay: d.weatherDelay } : undefined,
        crew: d.crew.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hours: c.hours === '' ? undefined : Number(c.hours) })),
      },
    });
    resetDraft(); setPhotos([]); setSaved(true); setTimeout(() => setSaved(false), 4000);
  };
  const setCrew = (i: number, patch: Partial<{ name: string; hours: string }>) => setD({ ...d, crew: d.crew.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  return (
    <div className="space-y-5">
      <Panel title="Today's log">
        <div className="space-y-4">
          {saved && <p className="rounded-sm bg-green-100 px-3 py-2 text-sm text-green-800" role="status">Saved on this phone. It sends as soon as there is signal.</p>}
          <Label text="What got done"><textarea className={`${fieldCls} min-h-28 py-2`} rows={4} value={d.work} onChange={(e) => setD({ ...d, work: e.target.value })} placeholder="Framed the north wall, set the headers…" /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label text="Weather"><select className={fieldCls} value={d.conditions} onChange={(e) => setD({ ...d, conditions: e.target.value })}>{WEATHER.map((w) => <option key={w} value={w}>{w || '—'}</option>)}</select></Label>
            <Label text="High °F"><input className={fieldCls} type="number" inputMode="numeric" value={d.highF} onChange={(e) => setD({ ...d, highF: e.target.value })} /></Label>
          </div>
          <label className="flex min-h-10 items-center gap-3 text-sm text-gray-700"><input type="checkbox" className="h-5 w-5" checked={d.weatherDelay} onChange={(e) => setD({ ...d, weatherDelay: e.target.checked })} />Weather stopped work</label>
          <div>
            <div className="mb-1.5 text-xs text-gray-500">Who was on site</div>
            <div className="space-y-2">
              {d.crew.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input className={fieldCls} aria-label="Name" value={c.name} onChange={(e) => setCrew(i, { name: e.target.value })} placeholder="Name" />
                  <input className={`${fieldCls} !w-24`} aria-label="Hours" type="number" inputMode="decimal" value={c.hours} onChange={(e) => setCrew(i, { hours: e.target.value })} placeholder="Hrs" />
                  {d.crew.length > 1 && <button type="button" aria-label="Remove" className="px-2 text-gray-400 active:text-red-600" onClick={() => setD({ ...d, crew: d.crew.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>}
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm text-blue-600" onClick={() => setD({ ...d, crew: [...d.crew, { name: '', hours: '8' }] })}><Plus size={16} />Add someone</button>
          </div>
          <Label text="Delays (if any)"><input className={fieldCls} value={d.delays} onChange={(e) => setD({ ...d, delays: e.target.value })} /></Label>
          <Label text="Safety notes (if any)"><input className={fieldCls} value={d.safety} onChange={(e) => setD({ ...d, safety: e.target.value })} /></Label>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <button type="button" className={`${primary} w-full`} disabled={!d.work.trim()} onClick={() => void save()}>Save log</button>
        </div>
      </Panel>

      <section>
        <h2 className="label-mono mb-2">Recent logs</h2>
        {!logs.length ? <p className="text-sm text-gray-500">No logs yet.</p> : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium text-gray-900">{fmtDay(l.date)}{l.weather?.conditions ? <span className="font-normal text-gray-500"> · {l.weather.conditions}{l.weather.highF !== undefined ? ` ${l.weather.highF}°` : ''}</span> : null}</span><span className="text-xs text-gray-500">{l.pending ? (l.failed ? 'not sent' : 'waiting to send') : l.author}</span></div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{l.workPerformed}</p>
                {l.failed && <p className="mt-1 text-xs text-red-600">{l.failed}</p>}
                <Thumbs photos={l.photos} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Punch list ----------

function PunchTab({ projectId, me, items }: { projectId: string; me: JobData['me']; items: Punch[] }) {
  const blank = { title: '', location: '', detail: '' };
  const [d, setD, resetDraft] = useDraft(`punch:${projectId}`, blank);
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [adding, setAdding] = useState(false);
  const open = items.filter((i) => i.status === 'open');
  const closed = items.filter((i) => i.status === 'resolved').slice(0, 5);
  const save = async () => {
    await enqueue({ kind: 'punch', projectId, photos, payload: { title: d.title.trim(), location: d.location.trim() || undefined, detail: d.detail.trim() || undefined } });
    resetDraft(); setPhotos([]); setAdding(false);
  };
  return (
    <div className="space-y-5">
      {!adding ? <button type="button" className={`${primary} w-full`} onClick={() => setAdding(true)}><Plus size={18} />Add punch item</button> : (
        <Panel title="New punch item" right={<button type="button" className={small} onClick={() => setAdding(false)}>Cancel</button>}>
          <div className="space-y-4">
            <Label text="What needs fixing"><input className={fieldCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Crack in the header" /></Label>
            <Label text="Where"><input className={fieldCls} value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} placeholder="Kitchen, north wall" /></Label>
            <Label text="Details (optional)"><textarea className={`${fieldCls} min-h-20 py-2`} rows={3} value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} /></Label>
            <PhotoPicker photos={photos} onChange={setPhotos} />
            <button type="button" className={`${primary} w-full`} disabled={!d.title.trim()} onClick={() => void save()}>Save item</button>
          </div>
        </Panel>
      )}
      <section>
        <h2 className="label-mono mb-2">Open · {open.length}</h2>
        {!open.length ? <p className="text-sm text-gray-500">Nothing open. Nice.</p> : <ul className="space-y-2">{open.map((p) => <PunchCard key={p.id} p={p} projectId={projectId} canClose={me.role === 'foreman'} />)}</ul>}
      </section>
      {closed.length > 0 && <section><h2 className="label-mono mb-2">Closed recently</h2><ul className="space-y-2">{closed.map((p) => <PunchCard key={p.id} p={p} projectId={projectId} canClose={false} />)}</ul></section>}
    </div>
  );
}

function PunchCard({ p, projectId, canClose }: { p: Punch; projectId: string; canClose: boolean }) {
  return (
    <li className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className={`font-medium ${p.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.title}</div><div className="mt-0.5 text-xs text-gray-500">{[p.location, `by ${p.createdBy}`].filter(Boolean).join(' · ')}</div></div>
        <span className="shrink-0 text-xs text-gray-500">{p.pending ? (p.failed ? 'not sent' : 'sending…') : ''}</span>
      </div>
      {p.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.detail}</p>}
      {p.failed && <p className="mt-1 text-xs text-red-600">{p.failed}</p>}
      <Thumbs photos={p.photos} />
      {canClose && p.status === 'open' && !p.pending && <button type="button" className={`${secondary} mt-3 w-full`} onClick={() => void enqueue({ kind: 'resolve', projectId, payload: { punchId: p.id } })}><CheckCircle2 size={18} />Mark fixed</button>}
    </li>
  );
}

// ---------- what is waiting to send ----------

const label = (e: Entry) => e.kind === 'log' ? `Daily log: ${String(e.payload.workPerformed).slice(0, 48)}` : e.kind === 'punch' ? `Punch item: ${e.payload.title}` : e.kind === 'resolve' ? 'Mark a punch item fixed' : 'Schedule update';

function SyncSheet({ open, onClose, entries, online }: { open: boolean; onClose: () => void; entries: Entry[]; online: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title="Sending">
      <p className="mb-3 text-sm text-gray-600">{entries.length ? (online ? 'These are saved on this phone and go out as soon as the connection allows.' : 'No signal. These are saved on this phone and will go out when you are back online.') : 'Everything has been sent.'}</p>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-md border border-gray-200 p-3 text-sm">
            <div className="text-gray-900">{label(e)}</div>
            <div className="mt-0.5 text-xs text-gray-500">{e.photos.length ? `${e.photos.length} photo${e.photos.length === 1 ? '' : 's'} · ` : ''}{e.error ? <span className="text-red-600">{e.error}</span> : 'waiting'}</div>
            <div className="mt-2 flex gap-2">{e.error && <button type="button" className={small} onClick={() => void retry(e.id)}>Try again</button>}<button type="button" className={small} onClick={() => { if (confirm('Delete this without sending it?')) void discard(e.id); }}>Delete</button></div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
