import { useEffect, useState } from 'react';
import { dailyLogs, shortDate, today } from '../../lib/builder-api';
import { btn, Card, Empty, ErrorText, errMsg, Field, input } from './ui';

/** Daily logs: what happened on site each day (weather, crew, work, delays, safety, photos). */
export default function DailyLogsTab({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blank = { date: today(), conditions: '', highF: '', lowF: '', weatherDelay: false, crew: '', workPerformed: '', delays: '', safety: '', photoUrl: '', visibleToClient: false };
  const [f, setF] = useState(blank);
  const load = () => dailyLogs.list(projectId).then((r) => setLogs(r.logs)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);

  const save = async () => {
    setError(null);
    try {
      await dailyLogs.create(projectId, {
        date: f.date, workPerformed: f.workPerformed, delays: f.delays, safety: f.safety, visibleToClient: f.visibleToClient,
        weather: { conditions: f.conditions, highF: f.highF === '' ? undefined : Number(f.highF), lowF: f.lowF === '' ? undefined : Number(f.lowF), delay: f.weatherDelay },
        // "Ana 8, Ben (Ace Electric) 6" → crew rows
        crew: f.crew.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const m = /^(.*?)(?:\s*\(([^)]+)\))?\s*(\d+(?:\.\d+)?)?$/.exec(s)!; return { name: m[1].trim(), company: m[2], hours: m[3] ? Number(m[3]) : undefined }; }),
        photos: f.photoUrl ? [{ url: f.photoUrl }] : [],
      });
      setF(blank); await load();
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <Card title="New daily log">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Date"><input type="date" className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Weather"><input className={input} value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} placeholder="Sunny" /></Field>
          <Field label="High °F"><input type="number" className={input} value={f.highF} onChange={(e) => setF({ ...f, highF: e.target.value })} /></Field>
          <Field label="Low °F"><input type="number" className={input} value={f.lowF} onChange={(e) => setF({ ...f, lowF: e.target.value })} /></Field>
          <Field label="Work performed" wide><textarea className={`${input} h-20`} value={f.workPerformed} onChange={(e) => setF({ ...f, workPerformed: e.target.value })} /></Field>
          <Field label="Crew on site (name (company) hours, …)" wide><input className={input} value={f.crew} onChange={(e) => setF({ ...f, crew: e.target.value })} placeholder="Ana 8, Ben (Ace Electric) 6" /></Field>
          <Field label="Delays"><input className={input} value={f.delays} onChange={(e) => setF({ ...f, delays: e.target.value })} /></Field>
          <Field label="Safety notes"><input className={input} value={f.safety} onChange={(e) => setF({ ...f, safety: e.target.value })} /></Field>
          <Field label="Photo link"><input className={input} value={f.photoUrl} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Options">
            <span className="flex flex-col gap-1 font-normal text-gray-700">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.weatherDelay} onChange={(e) => setF({ ...f, weatherDelay: e.target.checked })} />Weather delay</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.visibleToClient} onChange={(e) => setF({ ...f, visibleToClient: e.target.checked })} />Share with client</label>
            </span>
          </Field>
        </div>
        <div className="mt-3"><button type="button" className={btn} disabled={!f.workPerformed.trim()} onClick={save}>Save log</button></div>
        <ErrorText error={error} />
      </Card>

      <Card title="Logs">
        {!logs ? <Empty>Loading…</Empty> : !logs.length ? <Empty>No daily logs yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {logs.map((l) => (
              <li key={l.id} className="py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="font-semibold text-gray-900">{shortDate(l.date)}</span>
                  {l.weather?.conditions && <span className="text-gray-600">{l.weather.conditions}{l.weather.highF !== undefined ? ` ${l.weather.highF}°` : ''}{l.weather.lowF !== undefined ? `/${l.weather.lowF}°` : ''}{l.weather.delay ? ' · weather delay' : ''}</span>}
                  <span className="text-xs text-gray-400">by {l.author}{l.visibleToClient ? ' · shared with client' : ''}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{l.workPerformed}</p>
                {l.crew?.length > 0 && <p className="mt-1 text-xs text-gray-500">Crew: {l.crew.map((c: any) => `${c.name}${c.company ? ` (${c.company})` : ''}${c.hours ? ` ${c.hours}h` : ''}`).join(', ')}</p>}
                {l.delays && <p className="mt-1 text-xs text-amber-700">Delays: {l.delays}</p>}
                {l.safety && <p className="mt-1 text-xs text-gray-500">Safety: {l.safety}</p>}
                {l.photos?.map((p: any) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="mr-2 text-xs text-blue-600 hover:underline">Photo</a>)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
