import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { mediaUrl, money, portal, shortDate } from '../../lib/builder-api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, input, Pill } from './ui';
import { BRAND } from '../../brand';

/** The homeowner's view, from a private link: progress, shared photos/logs, change orders to sign, selections to make. */
export default function Portal() {
  const { token = '' } = useParams();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => portal.get(token).then(setD).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [token]);
  const run = async (fn: () => Promise<any>) => { setError(null); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };

  if (!d) return <div className="mx-auto max-w-3xl p-6">{error ? <ErrorText error={error} /> : <Empty>Loading…</Empty>}</div>;
  const pending = d.changeOrders.filter((c: any) => c.status === 'pending_client');
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4"><div><div className="label-mono">Hi {d.client.name}</div><h1 className="mt-1 text-3xl text-gray-900">{d.job.name}</h1></div><a href={BRAND.website} target="_blank" rel="noreferrer"><img src={BRAND.logoUrl} alt={BRAND.name} className="h-8 w-auto dark:invert" /></a></div></header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <ErrorText error={error} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[['Contract', money(d.contract.original)], ['Approved changes', money(d.contract.approvedChangeOrders)], ['Current total', money(d.contract.revised)]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-gray-200 bg-white p-3"><div className="text-xs text-gray-500">{k}</div><div className="text-lg font-semibold tabular-nums">{v}</div></div>
          ))}
        </div>

        {pending.length > 0 && (
          <Card title={`Waiting for you: ${pending.length} change order${pending.length === 1 ? '' : 's'}`}>
            {pending.map((c: any) => <Decide key={c.id} co={c} onDecide={(b) => run(() => portal.decide(token, c.id, b))} />)}
          </Card>
        )}

        <Card title="Schedule">
          {!d.schedule.length ? <Empty>The schedule will show here.</Empty> : (
            <ul className="divide-y divide-gray-100">{d.schedule.map((s: any) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm"><span className="flex-1">{s.title}</span><span className="text-xs text-gray-500">{shortDate(s.startDate)} – {shortDate(s.endDate)}</span><span className="w-24"><span className="block h-1.5 rounded bg-gray-200"><span className="block h-1.5 rounded bg-blue-500" style={{ width: `${s.progress}%` }} /></span></span><Pill value={s.status} /></li>
            ))}</ul>
          )}
        </Card>

        <Card title="Selections">
          {!d.selections.length ? <Empty>No selections yet.</Empty> : d.selections.map((s: any) => (
            <div key={s.id} className="border-b border-gray-100 py-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-xs uppercase text-gray-500">{s.category}</span><span className="flex-1 font-medium">{s.title}</span><span className="text-xs text-gray-500">Allowance {money(s.allowance)}{s.dueDate ? ` · decide by ${shortDate(s.dueDate)}` : ''}</span><Pill value={s.status} /></div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {s.options.map((o: any) => {
                  const chosen = o.id === s.chosenOptionId, locked = ['approved', 'ordered'].includes(s.status);
                  return (
                    <button key={o.id} type="button" disabled={locked} onClick={() => run(() => portal.choose(token, s.id, { optionId: o.id }))} className={`rounded-md border p-2 text-left text-sm ${chosen ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'} disabled:cursor-default`}>
                      <div className="font-medium">{o.name}</div><div className="text-xs text-gray-600">{money(o.price)}{o.price > s.allowance ? ` (+${money(o.price - s.allowance)})` : ''}</div>{o.vendor && <div className="text-xs text-gray-400">{o.vendor}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>

        <Card title="Updates from the site">
          {!d.dailyLogs.length ? <Empty>No updates shared yet.</Empty> : d.dailyLogs.map((l: any) => (
            <div key={l.id} className="border-b border-gray-100 py-2 text-sm last:border-0"><div className="font-medium">{shortDate(l.date)}{l.weather?.conditions ? <span className="font-normal text-gray-500"> · {l.weather.conditions}</span> : null}</div><p className="whitespace-pre-wrap text-gray-700">{l.workPerformed}</p>{l.photos?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{l.photos.map((p: any) => <a key={p.url} href={mediaUrl(p.url)} target="_blank" rel="noreferrer"><img src={mediaUrl(p.url)} alt="" loading="lazy" className="h-24 w-24 rounded-sm border border-gray-200 object-cover" /></a>)}</div>}</div>
          ))}
        </Card>

        {d.changeOrders.some((c: any) => c.status !== 'pending_client') && (
          <Card title="Past change orders">
            {d.changeOrders.filter((c: any) => c.status !== 'pending_client').map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm"><span className="font-mono text-xs text-gray-500">{c.number}</span><span className="flex-1">{c.title}</span><span className="tabular-nums">{money(c.total)}</span><Pill value={c.status} /></div>
            ))}
          </Card>
        )}
      <footer className="pt-6 text-center text-xs text-gray-500">{BRAND.name} · {BRAND.region} · <a className="hover:text-gray-800" href={`tel:${BRAND.phone.replace(/\D/g, '')}`}>{BRAND.phone}</a></footer>
      </main>
    </div>
  );
}

function Decide({ co, onDecide }: { co: any; onDecide: (b: any) => void }) {
  const [sig, setSig] = useState('');
  const [reason, setReason] = useState('');
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-center gap-2 text-sm"><span className="font-mono text-xs text-gray-500">{co.number}</span><span className="flex-1 font-medium">{co.title}</span><span className="font-semibold tabular-nums">{money(co.total)}</span></div>
      {co.description && <p className="mt-1 text-sm text-gray-600">{co.description}</p>}
      <ul className="mt-1 text-xs text-gray-600">{co.lines.map((l: any, i: number) => <li key={i}>{l.description} × {l.quantity} — {money(l.price)}</li>)}</ul>
      {co.scheduleImpactDays > 0 && <p className="mt-1 text-xs text-amber-700">Adds {co.scheduleImpactDays} day{co.scheduleImpactDays === 1 ? '' : 's'} to the schedule.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className={`${input} max-w-xs`} value={sig} onChange={(e) => setSig(e.target.value)} placeholder="Type your full name to sign" aria-label="Signature" />
        <button type="button" className={btn} disabled={!sig.trim()} onClick={() => onDecide({ decision: 'approve', signatureName: sig })}>Approve and sign</button>
        <input className={`${input} max-w-xs`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason for declining" />
        <button type="button" className={btn2} onClick={() => onDecide({ decision: 'decline', reason })}>Decline</button>
      </div>
    </div>
  );
}
