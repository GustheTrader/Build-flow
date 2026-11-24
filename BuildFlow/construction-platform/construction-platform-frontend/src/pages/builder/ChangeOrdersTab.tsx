import { useEffect, useState } from 'react';
import { changeOrders, money, shortDate } from '../../lib/builder-api';
import LinesEditor, { blankLine, type Line } from './LinesEditor';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input, Pill } from './ui';

/** Change orders: priced changes the client approves (and signs) in the portal; approved ones revise the contract. */
export default function ChangeOrdersTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<{ changeOrders: any[]; contract: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<{ title: string; description: string; scheduleImpactDays: number; lines: Line[] }>({ title: '', description: '', scheduleImpactDays: 0, lines: [blankLine()] });
  const load = () => changeOrders.list(projectId).then(setData).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);
  const run = async (fn: () => Promise<any>) => { setError(null); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };

  const c = data?.contract;
  return (
    <div className="space-y-4">
      {c && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Original contract', money(c.original)], ['Approved changes', money(c.approvedChangeOrders)], ['Waiting on client', money(c.pendingChangeOrders)], ['Revised contract', money(c.revised)]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-gray-200 bg-white p-3"><div className="text-xs text-gray-500">{k}</div><div className="text-lg font-semibold tabular-nums text-gray-900">{v}</div></div>
          ))}
        </div>
      )}

      <Card title="Change orders">
        {!data ? <Empty>Loading…</Empty> : !data.changeOrders.length ? <Empty>No change orders yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {data.changeOrders.map((co) => (
              <li key={co.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-20 text-xs font-mono text-gray-500">{co.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{co.title}</span>
                  <span className="block text-xs text-gray-500">{co.lines.length} line{co.lines.length === 1 ? '' : 's'}{co.scheduleImpactDays ? ` · +${co.scheduleImpactDays} days` : ''}{co.signatureName ? ` · signed by ${co.signatureName} ${shortDate(co.decidedAt)}` : ''}{co.declineReason ? ` · “${co.declineReason}”` : ''}</span>
                </span>
                <span className="w-24 text-right text-sm tabular-nums">{money(co.totals.price)}</span>
                <Pill value={co.status} />
                <span className="flex gap-2">
                  {co.status === 'draft' && <button type="button" className={btn2} onClick={() => run(() => changeOrders.setStatus(co.id, 'pending_client'))}>Send to client</button>}
                  {co.status === 'declined' && <button type="button" className={btn2} onClick={() => run(() => changeOrders.setStatus(co.id, 'draft'))}>Back to draft</button>}
                  {co.status === 'pending_client' && <button type="button" className={btn2} onClick={() => run(() => changeOrders.setStatus(co.id, 'draft'))}>Recall</button>}
                  {co.status !== 'void' && <button type="button" className={btn2} onClick={() => { if (confirm(`Void ${co.number}?`)) run(() => changeOrders.setStatus(co.id, 'void')); }}>Void</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={error} />
      </Card>

      <Card title="New change order">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Title" wide><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Add pantry cabinet" /></Field>
          <Field label="Schedule impact (days)"><input type="number" min={0} className={input} value={f.scheduleImpactDays} onChange={(e) => setF({ ...f, scheduleImpactDays: Number(e.target.value) })} /></Field>
          <Field label="Description" wide><textarea className={`${input} h-16`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><LinesEditor lines={f.lines} onChange={(lines) => setF({ ...f, lines })} /></div>
        <div className="mt-3"><button type="button" className={btn} disabled={!f.title.trim()} onClick={() => run(async () => { await changeOrders.create(projectId, { ...f, lines: f.lines.filter((l) => l.description.trim()) }); setF({ title: '', description: '', scheduleImpactDays: 0, lines: [blankLine()] }); })}>Save as draft</button></div>
      </Card>
    </div>
  );
}
