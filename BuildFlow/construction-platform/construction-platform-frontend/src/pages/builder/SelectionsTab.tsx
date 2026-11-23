import { useEffect, useState } from 'react';
import { money, selections, shortDate } from '../../lib/builder-api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input, Pill } from './ui';

/** Selections: finishes and fixtures the client picks from options, against an allowance. */
export default function SelectionsTab({ projectId }: { projectId: string }) {
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blank = { category: '', title: '', allowance: 0, dueDate: '', options: [{ name: '', price: 0, vendor: '' }] };
  const [f, setF] = useState(blank);
  const load = () => selections.list(projectId).then((r) => setList(r.selections)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);
  const run = async (fn: () => Promise<any>) => { setError(null); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };

  return (
    <div className="space-y-4">
      <Card title="Selections">
        {!list ? <Empty>Loading…</Empty> : !list.length ? <Empty>No selections yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {list.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{s.category}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900">{s.title}</span>
                  <span className="text-xs text-gray-500">Allowance {money(s.allowance)}{s.dueDate ? ` · due ${shortDate(s.dueDate)}` : ''}</span>
                  {s.overdue && <span className="text-xs font-medium text-red-600">Overdue</span>}
                  <Pill value={s.status} />
                  {s.status === 'selected' && <button type="button" className={btn2} onClick={() => run(() => selections.update(s.id, { status: 'approved' }))}>Approve</button>}
                  {s.status === 'approved' && <button type="button" className={btn2} onClick={() => run(() => selections.update(s.id, { status: 'ordered' }))}>Mark ordered</button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.options.map((o: any) => (
                    <span key={o.id} className={`rounded-md border px-2 py-1 text-xs ${o.id === s.chosenOptionId ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700'}`}>
                      {o.name} · {money(o.price)}{o.vendor ? ` · ${o.vendor}` : ''}
                    </span>
                  ))}
                </div>
                {s.chosen && <p className={`mt-1 text-xs ${s.overage > 0 ? 'text-amber-700' : 'text-green-700'}`}>{s.overage > 0 ? `${money(s.overage)} over allowance` : s.overage < 0 ? `${money(-s.overage)} under allowance` : 'On allowance'}{s.chosenBy ? ` · chosen by ${s.chosenBy}` : ''}{s.clientNotes ? ` · “${s.clientNotes}”` : ''}</p>}
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={error} />
      </Card>

      <Card title="New selection">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Category"><input className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Countertops" /></Field>
          <Field label="What"><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Kitchen countertop" /></Field>
          <Field label="Allowance ($)"><input type="number" className={input} value={f.allowance} onChange={(e) => setF({ ...f, allowance: Number(e.target.value) })} /></Field>
          <Field label="Client decides by"><input type="date" className={input} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        </div>
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-600">Options</div>
          {f.options.map((o, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1.5fr_auto]">
              <input className={input} placeholder="Name" value={o.name} onChange={(e) => setF({ ...f, options: f.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <input type="number" className={input} placeholder="Price" value={o.price} onChange={(e) => setF({ ...f, options: f.options.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} />
              <input className={input} placeholder="Vendor" value={o.vendor} onChange={(e) => setF({ ...f, options: f.options.map((x, j) => (j === i ? { ...x, vendor: e.target.value } : x)) })} />
              <button type="button" className="text-xs text-gray-400 hover:text-red-600" onClick={() => setF({ ...f, options: f.options.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setF({ ...f, options: [...f.options, { name: '', price: 0, vendor: '' }] })}>+ Add option</button>
        </div>
        <div className="mt-3"><button type="button" className={btn} disabled={!f.title.trim() || !f.category.trim()} onClick={() => run(async () => { await selections.create(projectId, { ...f, dueDate: f.dueDate || undefined, options: f.options.filter((o) => o.name.trim()) }); setF(blank); })}>Add selection</button></div>
      </Card>
    </div>
  );
}
