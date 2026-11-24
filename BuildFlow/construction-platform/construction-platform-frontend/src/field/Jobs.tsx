import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { BRAND } from '../brand';
import { cachedGet } from './api';
import { localToday, Err } from './ui';

type JobCard = { id: string; number?: string; name: string; status: string; address: string | null; progress: number; today: number; late: number };

/** The jobs this person is assigned to. With exactly one job, it opens straight away. */
export default function Jobs({ me, onMenu }: { me: string; onMenu: () => void }) {
  const loc = useLocation();
  const [jobs, setJobs] = useState<JobCard[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    cachedGet<{ jobs: JobCard[] }>('jobs', `/jobs?today=${localToday()}`).then((r) => { setJobs(r.data.jobs); setOffline(r.offline); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your jobs'));
  }, []);
  if (jobs?.length === 1 && !(loc.state as { stay?: boolean } | null)?.stay) return <Navigate to={`/job/${jobs[0].id}`} replace />;
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <img src={BRAND.logoUrl} alt={BRAND.name} className="h-8 w-auto dark:invert" />
        <button type="button" className="min-h-10 rounded-sm px-3 text-sm text-gray-600 active:bg-gray-100" onClick={onMenu}>{me}</button>
      </header>
      <div className="label-mono mt-8">Your jobs</div>
      <h1 className="mt-1 text-gray-900">Where to today</h1>
      {offline && <p className="mt-2 text-xs text-amber-700">No signal. Showing what was saved on this phone.</p>}
      <div className="mt-5 space-y-3">
        {!jobs && !error && <p className="text-sm text-gray-500">Loading…</p>}
        {jobs?.length === 0 && <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">No jobs are assigned to you yet. Ask the office to add you to a job.</p>}
        {jobs?.map((j) => (
          <Link key={j.id} to={`/job/${j.id}`} className="block rounded-md border border-gray-200 bg-white p-4 active:bg-gray-100">
            <div className="flex items-baseline justify-between gap-3"><span className="font-medium text-gray-900">{j.name}</span><span className="num text-xs text-gray-500">{j.number}</span></div>
            {j.address && <div className="mt-0.5 text-sm text-gray-500">{j.address}</div>}
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-gray-100"><div className="h-1.5 bg-blue-500" style={{ width: `${j.progress}%` }} /></div>
            <div className="mt-2 flex gap-4 text-xs text-gray-600"><span>{j.progress}% done</span><span>{j.today} on today</span>{j.late > 0 && <span className="text-red-600">{j.late} running late</span>}</div>
          </Link>
        ))}
        <Err text={error} />
      </div>
    </div>
  );
}
