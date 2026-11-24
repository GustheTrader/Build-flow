import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { estimates, leads, money } from '../../lib/builder-api';
import LinesEditor, { blankLine, linePrice, type Line } from './LinesEditor';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input, Pill } from './ui';

/** Estimates: sections of cost-coded lines with markup and tax. Accepting one wins the lead and creates the job. */
type Draft = { id?: string; leadId?: string; title: string; taxRatePct: number; validUntil: string; notes: string; sections: { name: string; lines: Line[] }[]; status?: string };
const blank = (leadId?: string): Draft => ({ leadId, title: '', taxRatePct: 0, validUntil: '', notes: '', sections: [{ name: 'General', lines: [blankLine()] }] });

export default function Estimates() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<any[] | null>(null);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [d, setD] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => estimates.list().then((r) => setList(r.estimates)).catch((e) => setError(errMsg(e)));

  useEffect(() => {
    load();
    leads.list().then((r) => setLeadNames(Object.fromEntries(r.leads.map((l: any) => [l.id, l.name])))).catch(() => {});
    const open = params.get('open'), leadId = params.get('leadId');
    if (open) estimates.get(open).then((r) => setD(r.estimate)).catch((e) => setError(errMsg(e)));
    else if (leadId) setD(blank(leadId));
  }, []);

  const save = async () => {
    if (!d) return;
    setError(null);
    try {
      const body = { ...d, validUntil: d.validUntil || undefined, sections: d.sections.map((s) => ({ ...s, lines: s.lines.filter((l) => l.description.trim()) })) };
      const r = d.id ? await estimates.update(d.id, body) : await estimates.create(body);
      setD(r.estimate); setParams({ open: r.estimate.id }); await load();
    } catch (e) { setError(errMsg(e)); }
  };
  const status = async (s: string) => {
    if (!d?.id) return;
    setError(null);
    try { const r = await estimates.setStatus(d.id, s); setD(r.estimate); await load(); } catch (e) { setError(errMsg(e)); }
  };

  const subtotal = d ? d.sections.flatMap((s) => s.lines).reduce((t, l) => t + linePrice(l), 0) : 0;
  const tax = subtotal * (d?.taxRatePct ?? 0) / 100;
  const locked = d?.status === 'accepted';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">Estimates</h1><button type="button" className={btn} onClick={() => { setD(blank()); setParams({}); }}>New estimate</button></div>
      <ErrorText error={error} />
      {d && (
        <Card title={d.id ? <span>{(d as any).number} <Pill value={d.status ?? 'draft'} /></span> : 'New estimate'} actions={<button type="button" className={btn2} onClick={() => { setD(null); setParams({}); }}>Close</button>}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Title" wide><input className={input} disabled={locked} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></Field>
            <Field label="Lead">{d.leadId ? <span className="py-1.5 text-sm text-gray-800">{leadNames[d.leadId] ?? 'Lead'}</span> : <span className="py-1.5 text-sm text-gray-500">None</span>}</Field>
            <Field label="Tax %"><input type="number" className={input} disabled={locked} value={d.taxRatePct} onChange={(e) => setD({ ...d, taxRatePct: Number(e.target.value) })} /></Field>
          </div>
          {d.sections.map((s, i) => (
            <div key={i} className="mt-4 rounded-md border border-gray-200 p-3">
              <input className={`${input} mb-2 font-medium`} disabled={locked} value={s.name} onChange={(e) => setD({ ...d, sections: d.sections.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Section name" />
              <LinesEditor costCodes lines={s.lines} onChange={(lines) => setD({ ...d, sections: d.sections.map((x, j) => (j === i ? { ...x, lines } : x)) })} />
            </div>
          ))}
          {!locked && <button type="button" className="mt-2 text-sm text-blue-600 hover:underline" onClick={() => setD({ ...d, sections: [...d.sections, { name: 'New section', lines: [blankLine()] }] })}>+ Add section</button>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <div className="text-sm text-gray-700">Price {money(subtotal)} · Tax {money(tax)} · <span className="font-semibold text-gray-900">Total {money(subtotal + tax)}</span></div>
            <div className="flex gap-2">
              {!locked && <button type="button" className={btn} disabled={!d.title.trim()} onClick={save}>Save</button>}
              {d.id && d.status === 'draft' && <button type="button" className={btn2} onClick={() => status('sent')}>Mark sent</button>}
              {d.id && (d.status === 'sent' || d.status === 'draft') && <button type="button" className={btn2} onClick={() => { if (confirm('Accept this estimate? The lead becomes won and a job is created.')) status('accepted'); }}>Accept → create job</button>}
              {d.id && d.status === 'sent' && <button type="button" className={btn2} onClick={() => status('declined')}>Declined</button>}
              {(d as any).projectId && <Link className={btn2} to={`/projects/${(d as any).projectId}`}>Open job</Link>}
            </div>
          </div>
        </Card>
      )}
      <Card title="All estimates">
        {!list ? <Empty>Loading…</Empty> : !list.length ? <Empty>No estimates yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {list.map((e) => (
              <li key={e.id}><button type="button" className="flex w-full items-center gap-3 py-2 text-left text-sm hover:text-blue-700" onClick={() => { setD(e); setParams({ open: e.id }); }}>
                <span className="w-20 font-mono text-xs text-gray-500">{e.number}</span><span className="flex-1 truncate">{e.title}{e.leadId && leadNames[e.leadId] ? <span className="text-gray-500"> · {leadNames[e.leadId]}</span> : null}</span><span className="tabular-nums">{money(e.totals.total)}</span><Pill value={e.status} />
              </button></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
