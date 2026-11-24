import { useEffect, useState } from 'react';
import { mediaUrl, punch, shortDate } from '../../lib/builder-api';
import { btn2, Card, Empty, ErrorText, errMsg, Pill } from './ui';

/** Punch list: issues the field raised (with photos). The office can close, reopen or delete them. */
export default function PunchTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => punch.list(projectId).then((r) => setItems(r.items)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [projectId]);
  const run = async (fn: () => Promise<any>) => { setError(null); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };
  const open = items?.filter((i) => i.status === 'open').length ?? 0;
  return (
    <Card title={`Punch list${items ? ` · ${open} open` : ''}`}>
      {!items ? <Empty>Loading…</Empty> : !items.length ? <Empty>Nothing raised. The crew adds punch items from the field app.</Empty> : (
        <ul className="divide-y divide-gray-200">
          {items.map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${i.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{i.title}</span>
                  <span className="block text-xs text-gray-500">{[i.location, `raised by ${i.createdBy} ${shortDate(i.createdAt)}`, i.resolvedBy ? `closed by ${i.resolvedBy} ${shortDate(i.resolvedAt)}` : ''].filter(Boolean).join(' · ')}</span>
                </span>
                <Pill value={i.status === 'open' ? 'pending' : 'approved'} />
                <button type="button" className={btn2} onClick={() => run(() => punch.setStatus(i.id, i.status === 'open' ? 'resolved' : 'open'))}>{i.status === 'open' ? 'Close' : 'Reopen'}</button>
                <button type="button" className={btn2} onClick={() => { if (confirm('Delete this punch item?')) run(() => punch.remove(i.id)); }}>Delete</button>
              </div>
              {i.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{i.detail}</p>}
              {i.photos?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{i.photos.map((p: any) => <a key={p.url} href={mediaUrl(p.url)} target="_blank" rel="noreferrer"><img src={mediaUrl(p.url)} alt="" loading="lazy" className="h-20 w-20 rounded-sm border border-gray-200 object-cover" /></a>)}</div>}
            </li>
          ))}
        </ul>
      )}
      <ErrorText error={error} />
    </Card>
  );
}
