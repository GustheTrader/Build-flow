import { useEffect, useMemo, useState } from 'react';
import { schedule, shortDate, today } from '../../lib/builder-api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input, Pill } from './ui';

/**
 * Job schedule: a Gantt-style chart (one bar per item on a day grid) and the list to edit it. Items can depend on
 * others (finish-to-start); moving an item pushes everything after it, and the server says what moved.
 */
type Item = { id: string; title: string; startDate: string; endDate: string; durationDays: number; predecessorIds: string[]; lagDays: number; assignees: string[]; status: string; progress: number; visibleToClient: boolean };

const DAY = 86_400_000;
const dayIndex = (d: string, origin: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${origin}T00:00:00Z`)) / DAY);

export default function ScheduleTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', startDate: today(), endDate: today(), predecessorId: '', assignees: '' });
  const [editing, setEditing] = useState<string | null>(null);

  const load = () => schedule.list(projectId).then((r) => setItems(r.items)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);

  const chart = useMemo(() => {
    if (!items?.length) return null;
    const origin = items.map((i) => i.startDate).sort()[0];
    const end = items.map((i) => i.endDate).sort().at(-1)!;
    const days = dayIndex(end, origin) + 1;
    return { origin, days };
  }, [items]);

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setError(null); setNote(null);
    try {
      const r = await fn();
      if (r?.moved?.length) setNote(`${r.moved.length} later item${r.moved.length === 1 ? '' : 's'} moved to keep the order.`);
      else if (ok) setNote(ok);
      await load();
    } catch (e) { setError(errMsg(e)); }
  };

  const add = () => run(() => schedule.create(projectId, {
    title: draft.title, startDate: draft.startDate, endDate: draft.endDate,
    predecessorIds: draft.predecessorId ? [draft.predecessorId] : [],
    assignees: draft.assignees.split(',').map((s) => s.trim()).filter(Boolean),
  }).then((r) => { setDraft({ ...draft, title: '', assignees: '' }); return r; }));

  const name = (id: string) => items?.find((i) => i.id === id)?.title ?? '';

  return (
    <div className="space-y-4">
      <Card title="Schedule">
        {!items ? <Empty>Loading…</Empty> : !items.length || !chart ? <Empty>No schedule yet. Add the first item below.</Empty> : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(600, chart.days * 22 + 220) }}>
              <div className="flex text-[11px] text-gray-500">
                <div className="w-[220px] shrink-0" />
                <div className="relative flex-1" style={{ height: 18 }}>
                  {Array.from({ length: chart.days }, (_, d) => d).filter((d) => d % 7 === 0).map((d) => (
                    <span key={d} className="absolute" style={{ left: `${(d / chart.days) * 100}%` }}>{shortDate(new Date(Date.parse(`${chart.origin}T00:00:00Z`) + d * DAY).toISOString())}</span>
                  ))}
                </div>
              </div>
              {items.map((i) => {
                const left = (dayIndex(i.startDate, chart.origin) / chart.days) * 100;
                const width = (i.durationDays / chart.days) * 100;
                return (
                  <div key={i.id} className="flex items-center border-t border-gray-100 py-1.5">
                    <button type="button" className="w-[220px] shrink-0 truncate pr-3 text-left text-sm text-gray-800 hover:text-blue-700" onClick={() => setEditing(editing === i.id ? null : i.id)} title={i.title}>
                      {i.title}{i.predecessorIds.length > 0 && <span className="ml-1 text-xs text-gray-400">after {i.predecessorIds.map(name).join(', ')}</span>}
                    </button>
                    <div className="relative h-6 flex-1 rounded bg-gray-50">
                      <div className={`absolute top-0 h-6 rounded ${i.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }} title={`${i.title}: ${shortDate(i.startDate)} – ${shortDate(i.endDate)} (${i.durationDays}d)`}>
                        <div className="h-6 rounded bg-black/20" style={{ width: `${i.progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {note && <p className="mt-2 text-sm text-blue-700" role="status">{note}</p>}
        <ErrorText error={error} />
      </Card>

      {editing && items?.find((i) => i.id === editing) && (
        <EditItem key={editing} item={items.find((i) => i.id === editing)!} items={items} onSave={(b) => run(() => schedule.update(editing, b), 'Saved.')} onDelete={() => run(() => schedule.remove(editing).then(() => setEditing(null)), 'Removed.')} onClose={() => setEditing(null)} />
      )}

      <Card title="Add to the schedule">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="What" wide><input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Framing inspection" /></Field>
          <Field label="Start"><input type="date" className={input} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value, endDate: e.target.value > draft.endDate ? e.target.value : draft.endDate })} /></Field>
          <Field label="End"><input type="date" className={input} value={draft.endDate} min={draft.startDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></Field>
          <Field label="Starts after" wide>
            <select className={input} value={draft.predecessorId} onChange={(e) => setDraft({ ...draft, predecessorId: e.target.value })}>
              <option value="">— nothing —</option>
              {items?.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </Field>
          <Field label="Assigned to (comma separated)" wide><input className={input} value={draft.assignees} onChange={(e) => setDraft({ ...draft, assignees: e.target.value })} placeholder="Ana's framing crew" /></Field>
        </div>
        <div className="mt-3"><button type="button" className={btn} disabled={!draft.title.trim()} onClick={add}>Add item</button></div>
      </Card>
    </div>
  );
}

function EditItem({ item, items, onSave, onDelete, onClose }: { item: Item; items: Item[]; onSave: (b: any) => void; onDelete: () => void; onClose: () => void }) {
  const [f, setF] = useState({ title: item.title, startDate: item.startDate, endDate: item.endDate, status: item.status, progress: item.progress, predecessorIds: item.predecessorIds, lagDays: item.lagDays, visibleToClient: item.visibleToClient, assignees: item.assignees.join(', ') });
  return (
    <Card title={<span>{item.title} <Pill value={item.status} /></span>} actions={<button type="button" className={btn2} onClick={onClose}>Close</button>}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="What" wide><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Start"><input type="date" className={input} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="End"><input type="date" className={input} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        <Field label="Status">
          <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="complete">Complete</option>
          </select>
        </Field>
        <Field label={`Progress ${f.progress}%`}><input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => setF({ ...f, progress: Number(e.target.value) })} /></Field>
        <Field label="Lag after predecessors (days)"><input type="number" min={0} className={input} value={f.lagDays} onChange={(e) => setF({ ...f, lagDays: Number(e.target.value) })} /></Field>
        <Field label="Client can see it"><input type="checkbox" checked={f.visibleToClient} onChange={(e) => setF({ ...f, visibleToClient: e.target.checked })} className="h-4 w-4" /></Field>
        <Field label="Starts after" wide>
          <select multiple className={`${input} h-24`} value={f.predecessorIds} onChange={(e) => setF({ ...f, predecessorIds: [...e.target.selectedOptions].map((o) => o.value) })}>
            {items.filter((i) => i.id !== item.id).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </Field>
        <Field label="Assigned to" wide><input className={input} value={f.assignees} onChange={(e) => setF({ ...f, assignees: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className={btn} onClick={() => onSave({ ...f, assignees: f.assignees.split(',').map((s) => s.trim()).filter(Boolean) })}>Save</button>
        <button type="button" className={btn2} onClick={() => { if (confirm(`Remove “${item.title}” from the schedule?`)) onDelete(); }}>Remove</button>
      </div>
    </Card>
  );
}
