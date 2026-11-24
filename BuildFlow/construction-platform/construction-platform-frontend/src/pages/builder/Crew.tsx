import { useEffect, useState } from 'react';
import { crew as crewApi, shortDate } from '../../lib/builder-api';
import { fetchAPI } from '../../lib/api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input } from './ui';

/**
 * Crew: the field team. Add a person, pick the jobs they can see, and send them their invite link (shown once).
 * They sign in on their phone at /field/ and see only those jobs, with no prices.
 */
type Job = { id: string; number?: string; name: string };
type Member = { id: string; name: string; email: string; phone?: string; role: 'crew' | 'foreman'; jobIds: string[]; active: boolean; access: 'invited' | 'active' | 'expired' | 'disabled'; lastSeenAt?: string };

const origin = () => window.location.origin;
const fieldUrl = () => `${origin()}/field/`;
const inviteUrl = (token: string) => `${origin()}/field/join/${token}`;
const ACCESS: Record<string, string> = { invited: 'Invite sent', active: 'Active', expired: 'Invite expired', disabled: 'Turned off' };

export default function Crew() {
  const [crew, setCrew] = useState<Member[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ name: string; url: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const blank = { name: '', email: '', phone: '', role: 'crew' as 'crew' | 'foreman', jobIds: [] as string[] };
  const [f, setF] = useState(blank);

  const load = () => crewApi.list().then((r) => setCrew(r.crew)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); fetchAPI('/projects').then((r) => setJobs((r.data ?? []).map((p: any) => ({ id: p.id, number: p.number, name: p.name })))).catch(() => {}); }, []);
  const run = async (fn: () => Promise<any>) => { setError(null); try { return await fn(); } catch (e) { setError(errMsg(e)); } };
  const jobName = (id: string) => { const j = jobs.find((x) => x.id === id); return j ? `${j.number ?? ''} ${j.name}`.trim() : 'Removed job'; };

  const add = () => run(async () => {
    const r = await crewApi.create(f);
    setInvite({ name: r.crew.name, url: inviteUrl(r.inviteToken) });
    setF(blank); await load();
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono">Field team</div>
          <h1 className="mt-2 text-gray-900">Crew <span className="italic text-blue-500">&amp; field app</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">Each person gets their own sign-in on their phone. They see only the jobs you pick, can start and finish work, write daily logs with photos and raise punch items, and never see prices.</p>
        </div>
      </header>

      <Card title="The field app">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <code className="rounded-sm border border-gray-200 bg-gray-100 px-2 py-1 text-xs">{fieldUrl()}</code>
          <button type="button" className={btn2} onClick={() => navigator.clipboard?.writeText(fieldUrl())}>Copy</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">On a phone, open the invite link, set a password, then use Share → “Add to Home Screen” (iPhone) or the install prompt (Android) so it opens like an app.</p>
      </Card>

      {invite && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="font-medium text-amber-900">Send this link to {invite.name}. It won’t be shown again.</div>
          <div className="mt-2 flex gap-2"><input readOnly className={input} value={invite.url} onFocus={(e) => e.target.select()} /><button type="button" className={btn2} onClick={() => navigator.clipboard?.writeText(invite.url)}>Copy</button><button type="button" className={btn2} onClick={() => setInvite(null)}>Done</button></div>
          <p className="mt-2 text-xs text-amber-800">It works once and expires in 14 days. If it gets lost, use “Reset access” to make a new one.</p>
        </div>
      )}

      <Card title="People">
        {!crew ? <Empty>Loading…</Empty> : !crew.length ? <Empty>No one yet. Add your first crew member below.</Empty> : (
          <ul className="divide-y divide-gray-200">
            {crew.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{m.name} <span className="font-mono text-[10.5px] uppercase tracking-wider text-gray-500">{m.role}</span></span>
                    <span className="block truncate text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}{m.lastSeenAt ? ` · last seen ${shortDate(m.lastSeenAt)}` : ''}</span>
                    <span className="mt-1 block text-xs text-gray-600">{m.jobIds.length ? m.jobIds.map(jobName).join(' · ') : 'No jobs assigned yet'}</span>
                  </span>
                  <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${m.access === 'active' ? 'bg-green-100 text-green-800' : m.access === 'disabled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'}`}>{ACCESS[m.access]}</span>
                  <span className="flex gap-2">
                    <button type="button" className={btn2} onClick={() => setEditing(editing === m.id ? null : m.id)}>{editing === m.id ? 'Close' : 'Edit'}</button>
                    <button type="button" className={btn2} onClick={() => { if (confirm(`Make a new invite for ${m.name}? Their old sign-in on any phone stops working.`)) run(async () => { const r = await crewApi.reset(m.id); setInvite({ name: m.name, url: inviteUrl(r.inviteToken) }); await load(); }); }}>Reset access</button>
                  </span>
                </div>
                {editing === m.id && (
                  <EditMember m={m} jobs={jobs} onSave={(b) => run(async () => { await crewApi.update(m.id, b); await load(); })}
                    onRemove={() => { if (confirm(`Remove ${m.name}? Their past logs stay on the jobs.`)) run(async () => { await crewApi.remove(m.id); setEditing(null); await load(); }); }} />
                )}
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={error} />
      </Card>

      <Card title="Add a crew member">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Name"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ana Ruiz" /></Field>
          <Field label="Email (their sign-in)"><input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Role"><select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'crew' | 'foreman' })}><option value="crew">Crew</option><option value="foreman">Foreman (can close punch items)</option></select></Field>
        </div>
        <JobPicker jobs={jobs} value={f.jobIds} onChange={(jobIds) => setF({ ...f, jobIds })} />
        <div className="mt-3"><button type="button" className={btn} disabled={!f.name.trim() || !f.email.trim()} onClick={add}>Create and get invite link</button></div>
      </Card>
    </div>
  );
}

function JobPicker({ jobs, value, onChange }: { jobs: Job[]; value: string[]; onChange: (v: string[]) => void }) {
  if (!jobs.length) return <p className="mt-3 text-xs text-gray-500">No jobs yet. You can assign jobs once you have one.</p>;
  return (
    <fieldset className="mt-3">
      <legend className="mb-1.5 text-xs text-gray-500">Jobs they can see</legend>
      <div className="flex flex-wrap gap-2">
        {jobs.map((j) => {
          const on = value.includes(j.id);
          return (
            <label key={j.id} className={`flex cursor-pointer items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs ${on ? 'border-blue-500 bg-blue-50 text-gray-900' : 'border-gray-200 text-gray-600'}`}>
              <input type="checkbox" className="h-3.5 w-3.5" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== j.id) : [...value, j.id])} />
              {j.number ? <span className="num text-gray-500">{j.number}</span> : null} {j.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function EditMember({ m, jobs, onSave, onRemove }: { m: Member; jobs: Job[]; onSave: (b: any) => void; onRemove: () => void }) {
  const [f, setF] = useState({ name: m.name, phone: m.phone ?? '', role: m.role, jobIds: m.jobIds });
  return (
    <div className="mt-3 rounded-md border border-gray-200 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Role"><select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'crew' | 'foreman' })}><option value="crew">Crew</option><option value="foreman">Foreman</option></select></Field>
      </div>
      <JobPicker jobs={jobs} value={f.jobIds} onChange={(jobIds) => setF({ ...f, jobIds })} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => onSave(f)}>Save</button>
        <button type="button" className={btn2} onClick={() => onSave({ active: !m.active })}>{m.active ? 'Turn off access' : 'Turn access back on'}</button>
        <button type="button" className={btn2} onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}
