import { useEffect, useState } from 'react';
import { portalAccess, shortDate } from '../../lib/builder-api';
import { btn, btn2, Card, Empty, ErrorText, errMsg, Field, input } from './ui';

/** Client portal links: each homeowner gets a private link. The link is shown once; only a hash is kept. */
export default function PortalTab({ projectId }: { projectId: string }) {
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', email: '' });
  const [link, setLink] = useState<string | null>(null);
  const load = () => portalAccess.list(projectId).then((r) => setList(r.access)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);

  const create = async () => {
    setError(null);
    try {
      const r = await portalAccess.create(projectId, f);
      setLink(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/portal/${r.token}`);
      setF({ name: '', email: '' });
      await load();
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <Card title="Give a client access">
        <p className="mb-3 text-sm text-gray-600">The client sees the schedule items and daily logs you share, approves and signs change orders, and makes selections. No account needed.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Client name"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email (for your records)"><input className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <div className="flex items-end"><button type="button" className={btn} disabled={!f.name.trim()} onClick={create}>Create link</button></div>
        </div>
        {link && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <div className="font-medium text-amber-900">Copy this link now. It won’t be shown again.</div>
            <div className="mt-1 flex gap-2"><input readOnly className={input} value={link} onFocus={(e) => e.target.select()} /><button type="button" className={btn2} onClick={() => navigator.clipboard?.writeText(link)}>Copy</button></div>
          </div>
        )}
        <ErrorText error={error} />
      </Card>
      <Card title="Links">
        {!list ? <Empty>Loading…</Empty> : !list.length ? <Empty>No client links yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{a.name}{a.email ? <span className="text-gray-500"> · {a.email}</span> : null}</span>
                <span className="text-xs text-gray-500">{a.revoked ? 'Turned off' : a.lastSeenAt ? `Last opened ${shortDate(a.lastSeenAt)}` : 'Not opened yet'}</span>
                {!a.revoked && <button type="button" className={btn2} onClick={async () => { if (confirm(`Turn off ${a.name}'s link?`)) { await portalAccess.revoke(a.id); load(); } }}>Turn off</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
