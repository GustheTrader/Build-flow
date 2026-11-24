import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CalendarClock, ClipboardCheck, HardHat, PenLine, TrendingUp } from 'lucide-react';
import { fetchAPI } from '../lib/api';
import { leads as leadsApi, money, shortDate } from '../lib/builder-api';
import { BRAND } from '../brand';

/**
 * Daily Operations: the company at a glance. Active jobs and their next work, what's late, what's waiting on
 * clients (change orders to sign, selections to make), and the sales pipeline. All from live Build-flow data.
 */
type Summary = {
  job: { id: string; number?: string; name: string; client?: string; status: string };
  contract: { original: number; approvedChangeOrders: number; pendingChangeOrders: number; revised: number };
  schedule: { items: number; complete: number; progress: number; late: { id: string; title: string; endDate: string }[]; next: { id: string; title: string; startDate: string; endDate: string; status: string }[] };
  waitingOnClient: { changeOrders: { id: string; number: string; title: string; total: number }[]; selections: { id: string; title: string; dueDate?: string }[] };
  lastDailyLog: { date: string; author: string; workPerformed: string } | null;
};

const ACTIVE = new Set(['planning', 'active', 'in_progress']);

export default function Dashboard() {
  const [jobs, setJobs] = useState<Summary[] | null>(null);
  const [pipeline, setPipeline] = useState<{ stage: string; count: number; value: number; weighted: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = (await fetchAPI('/projects')).data ?? [];
        const sums: Summary[] = await Promise.all(list.map((p: any) => fetchAPI(`/jobs/${p.id}/summary`).catch(() => null)));
        setJobs(sums.filter(Boolean));
        setPipeline((await leadsApi.list()).pipeline ?? []);
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load'); }
    })();
  }, []);

  const k = useMemo(() => {
    const active = (jobs ?? []).filter((j) => ACTIVE.has(j.job.status));
    const open = pipeline.filter((p) => !['won', 'lost'].includes(p.stage));
    return {
      active: active.length,
      contract: active.reduce((s, j) => s + j.contract.revised, 0),
      pipeline: open.reduce((s, p) => s + p.value, 0),
      weighted: open.reduce((s, p) => s + p.weighted, 0),
      waitingCOs: (jobs ?? []).flatMap((j) => j.waitingOnClient.changeOrders.map((c) => ({ ...c, job: j.job }))),
      waitingSel: (jobs ?? []).flatMap((j) => j.waitingOnClient.selections.map((x) => ({ ...x, job: j.job }))),
      late: (jobs ?? []).flatMap((j) => j.schedule.late.map((x) => ({ ...x, job: j.job }))),
      approved: (jobs ?? []).reduce((s, j) => s + j.contract.approvedChangeOrders, 0),
      openLeads: open.reduce((s, p) => s + p.count, 0),
    };
  }, [jobs, pipeline]);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono">{today}</div>
          <h1 className="mt-2 text-gray-900">{BRAND.name} <span className="italic text-blue-500">Operations</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">{BRAND.services} across {BRAND.region}. Jobs, schedules, client decisions and the sales pipeline in one place.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/leads" className="inline-flex items-center gap-1.5 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300">New lead</Link>
          <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-sm bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">Open jobs <ArrowUpRight size={14} /></Link>
        </div>
      </header>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <section className="grid gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Active jobs" value={jobs ? String(k.active) : '—'} sub={jobs ? `${money(k.contract)} under contract` : 'Loading…'} icon={<HardHat size={16} />} />
        <Kpi label="Open pipeline" value={money(k.pipeline)} sub={`${money(k.weighted)} weighted · ${k.openLeads} lead${k.openLeads === 1 ? '' : 's'}`} icon={<TrendingUp size={16} />} />
        <Kpi label="Waiting on clients" value={String(k.waitingCOs.length + k.waitingSel.length)} sub={`${k.waitingCOs.length} change order${k.waitingCOs.length === 1 ? '' : 's'} · ${k.waitingSel.length} selection${k.waitingSel.length === 1 ? '' : 's'}`} icon={<PenLine size={16} />} />
        <Kpi label="Late schedule items" value={String(k.late.length)} sub={k.late.length ? 'Past their end date' : 'Everything on time'} icon={<AlertTriangle size={16} />} alert={k.late.length > 0} />
        <Kpi label="Approved change orders" value={money(k.approved)} sub="Added to contracts" icon={<ClipboardCheck size={16} />} />
        <Kpi label="Pipeline won" value={String(pipeline.find((p) => p.stage === 'won')?.count ?? 0)} sub={`${money(pipeline.find((p) => p.stage === 'won')?.value)} in won work`} icon={<CalendarClock size={16} />} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-md border border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div><div className="label-mono">On site</div><h2 className="mt-1 font-serif text-2xl text-gray-900">What’s next on each job</h2></div>
          </header>
          {!jobs ? <p className="px-5 py-8 text-sm text-gray-500">Loading…</p> : !jobs.length ? (
            <div className="px-5 py-10 text-center">
              <p className="font-serif text-xl text-gray-800">No jobs yet.</p>
              <p className="mt-1 text-sm text-gray-500">Add a lead, write the estimate, and accepting it turns it into a job.</p>
              <Link to="/leads" className="mt-4 inline-flex rounded-sm bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">Start with a lead</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {jobs.map((j, i) => (
                <li key={j.job.id} className="grid gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto]">
                  <span className="num text-sm text-gray-400">{String(i + 1).padStart(2, '0')}.</span>
                  <div className="min-w-0">
                    <Link to={`/projects/${j.job.id}`} className="font-medium text-gray-900 hover:text-blue-700">{j.job.name}</Link>
                    <div className="mt-0.5 text-xs text-gray-500">{[j.job.number, j.job.client, j.job.status.replace(/_/g, ' ')].filter(Boolean).join(' · ')}</div>
                    <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded bg-gray-100"><div className="h-1 bg-blue-500" style={{ width: `${j.schedule.progress}%` }} /></div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      {j.schedule.next.length ? j.schedule.next.map((n) => <span key={n.id}>{n.title} <span className="num text-gray-400">{shortDate(n.startDate)}</span></span>) : <span className="text-gray-400">Nothing scheduled</span>}
                    </div>
                    {j.lastDailyLog && <p className="mt-2 line-clamp-2 text-xs text-gray-500"><span className="num text-gray-400">{shortDate(j.lastDailyLog.date)}</span> · {j.lastDailyLog.workPerformed}</p>}
                  </div>
                  <div className="text-right">
                    <div className="num text-lg text-gray-900">{money(j.contract.revised)}</div>
                    <div className="text-xs text-gray-500">{j.schedule.progress}% done</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <SideList title="Waiting on clients" empty="Nobody owes you a decision." items={[
            ...k.waitingCOs.map((c) => ({ key: c.id, to: `/projects/${c.job.id}?tab=change-orders`, title: `${c.number} · ${c.title}`, meta: c.job.name, right: money(c.total) })),
            ...k.waitingSel.map((x) => ({ key: x.id, to: `/projects/${x.job.id}?tab=selections`, title: x.title, meta: `${x.job.name}${x.dueDate ? ` · due ${shortDate(x.dueDate)}` : ''}`, right: 'Selection' })),
          ]} />
          <SideList title="Late" empty="Nothing is late." alert items={k.late.map((x) => ({ key: x.id, to: `/projects/${x.job.id}?tab=schedule`, title: x.title, meta: x.job.name, right: `ended ${shortDate(x.endDate)}` }))} />
          <section className="rounded-md border border-gray-200 bg-white px-5 py-4">
            <div className="label-mono">Pipeline</div>
            <ul className="mt-3 space-y-2">
              {pipeline.filter((p) => p.stage !== 'lost').map((p) => {
                const max = Math.max(1, ...pipeline.map((x) => x.value));
                return (
                  <li key={p.stage} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-xs">
                    <span className="capitalize text-gray-600">{p.stage.replace(/_/g, ' ')}</span>
                    <span className="h-1.5 overflow-hidden rounded bg-gray-100"><span className="block h-1.5 bg-blue-500" style={{ width: `${(p.value / max) * 100}%` }} /></span>
                    <span className="num text-gray-700">{p.count}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, alert }: { label: string; value: string; sub: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-center justify-between text-sm text-gray-500">{label}<span className={alert ? 'text-red-500' : 'text-blue-500'}>{icon}</span></div>
      <div className={`num mt-3 text-3xl ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function SideList({ title, items, empty, alert }: { title: string; empty: string; alert?: boolean; items: { key: string; to: string; title: string; meta: string; right: string }[] }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3"><span className="label-mono">{title}</span><span className={`num text-xs ${alert && items.length ? 'text-red-600' : 'text-gray-500'}`}>{items.length}</span></div>
      {!items.length ? <p className="px-5 py-4 text-sm text-gray-500">{empty}</p> : (
        <ul className="divide-y divide-gray-200">
          {items.map((i) => (
            <li key={i.key}><Link to={i.to} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <span className="min-w-0 flex-1"><span className="block truncate text-sm text-gray-900">{i.title}</span><span className="block truncate text-xs text-gray-500">{i.meta}</span></span>
              <span className="num text-xs text-gray-600">{i.right}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}
