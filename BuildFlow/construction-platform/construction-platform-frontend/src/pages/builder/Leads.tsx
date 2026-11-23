import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { leads, money, shortDate } from '../../lib/builder-api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input, Pill } from './ui';

/** Leads: a pipeline board by stage, each lead's history and estimates, and "convert to job". */
const STAGES = ['new', 'contacted', 'site_visit', 'estimating', 'proposal_sent', 'won', 'lost'];
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Leads() {
  const [data, setData] = useState<{ leads: any[]; pipeline: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', contactName: '', email: '', phone: '', source: '', estimatedValue: '', confidence: '50' });
  const load = () => leads.list().then(setData).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<any>) => { setError(null); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">Leads</h1></div>
      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat k="Open pipeline" v={money(data.pipeline.filter((p) => !['won', 'lost'].includes(p.stage)).reduce((s, p) => s + p.value, 0))} />
          <Stat k="Weighted" v={money(data.pipeline.filter((p) => !['won', 'lost'].includes(p.stage)).reduce((s, p) => s + p.weighted, 0))} />
          <Stat k="Won" v={`${data.pipeline.find((p) => p.stage === 'won')?.count ?? 0} · ${money(data.pipeline.find((p) => p.stage === 'won')?.value)}`} />
        </div>
      )}
      <ErrorText error={error} />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const col = data?.leads.filter((l) => l.stage === stage) ?? [];
          return (
            <div key={stage} className="w-60 shrink-0 rounded-lg bg-gray-100 p-2">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-gray-600"><span>{label(stage)}</span><span>{col.length}</span></div>
              <div className="space-y-2">
                {col.map((l) => (
                  <button key={l.id} type="button" onClick={() => setOpen(l.id)} className={`block w-full rounded-md border bg-white p-2 text-left shadow-sm hover:border-blue-400 ${open === l.id ? 'border-blue-500' : 'border-gray-200'}`}>
                    <div className="truncate text-sm font-medium text-gray-900">{l.name}</div>
                    <div className="truncate text-xs text-gray-500">{l.contactName ?? ''}{l.estimatedValue ? ` · ${money(l.estimatedValue)}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {open && <LeadDetail key={open} id={open} onChanged={load} onClose={() => setOpen(null)} />}
      <Card title="New lead">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Job name" wide><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Smith kitchen remodel" /></Field>
          <Field label="Contact"><input className={input} value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} /></Field>
          <Field label="Source"><input className={input} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Referral" /></Field>
          <Field label="Email"><input className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Estimated value ($)"><input type="number" className={input} value={f.estimatedValue} onChange={(e) => setF({ ...f, estimatedValue: e.target.value })} /></Field>
          <Field label="Confidence %"><input type="number" min={0} max={100} className={input} value={f.confidence} onChange={(e) => setF({ ...f, confidence: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><button type="button" className={btn} disabled={!f.name.trim()} onClick={() => run(async () => { await leads.create({ ...f, estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : undefined, confidence: Number(f.confidence) }); setF({ name: '', contactName: '', email: '', phone: '', source: '', estimatedValue: '', confidence: '50' }); })}>Add lead</button></div>
      </Card>
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: string }) => <div className="rounded-lg border border-gray-200 bg-white p-3"><div className="text-xs text-gray-500">{k}</div><div className="text-lg font-semibold tabular-nums text-gray-900">{v}</div></div>;

function LeadDetail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const nav = useNavigate();
  const [d, setD] = useState<{ lead: any; estimates: any[] } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const load = () => leads.get(id).then(setD).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]);
  const run = async (fn: () => Promise<any>) => { setError(null); try { const r = await fn(); await load(); onChanged(); return r; } catch (e) { setError(errMsg(e)); } };
  if (!d?.lead) return <Card title="Lead"><Empty>{error ?? 'Loading…'}</Empty></Card>;
  const l = d.lead;
  return (
    <Card title={l.name} actions={<button type="button" className={btn2} onClick={onClose}>Close</button>}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 text-sm">
          <div className="text-gray-700">{[l.contactName, l.email, l.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
          <Field label="Stage">
            <select className={input} value={l.stage} onChange={(e) => run(() => leads.update(id, { stage: e.target.value }))}>{STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          </Field>
          {l.projectId ? <Link className="text-blue-600 hover:underline" to={`/projects/${l.projectId}`}>Open the job →</Link>
            : <button type="button" className={btn} onClick={async () => { const r = await run(() => leads.convert(id)); if (r?.projectId) nav(`/projects/${r.projectId}`); }}>Convert to job</button>}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500"><span>Estimates</span><Link className="normal-case text-blue-600" to={`/estimates?leadId=${id}`}>New estimate</Link></div>
          {!d.estimates.length ? <p className="text-sm text-gray-500">None yet.</p> : d.estimates.map((e) => (
            <Link key={e.id} to={`/estimates?open=${e.id}`} className="flex items-center gap-2 border-b border-gray-100 py-1.5 text-sm hover:text-blue-700"><span className="font-mono text-xs text-gray-500">{e.number}</span><span className="flex-1 truncate">{e.title}</span><span className="tabular-nums">{money(e.totals.total)}</span><Pill value={e.status} /></Link>
          ))}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Activity</div>
          <div className="flex gap-2"><input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called, site visit booked…" /><button type="button" className={btn2} disabled={!note.trim()} onClick={() => run(async () => { await leads.addActivity(id, { note }); setNote(''); })}>Add</button></div>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-600">
            {[...l.activities].reverse().map((a: any, i: number) => <li key={i}><span className="text-gray-400">{shortDate(a.at)}</span> {a.note}{a.by ? <span className="text-gray-400"> · {a.by}</span> : null}</li>)}
          </ul>
        </div>
      </div>
      <ErrorText error={error} />
    </Card>
  );
}

