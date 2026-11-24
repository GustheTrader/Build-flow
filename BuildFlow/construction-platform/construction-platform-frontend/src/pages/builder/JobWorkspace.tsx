import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchAPI } from '../../lib/api';
import { money } from '../../lib/builder-api';
import ProjectDetail from '../ProjectDetail';
import ScheduleTab from './ScheduleTab';
import DailyLogsTab from './DailyLogsTab';
import ChangeOrdersTab from './ChangeOrdersTab';
import SelectionsTab from './SelectionsTab';
import PortalTab from './PortalTab';
import PunchTab from './PunchTab';

/** A job: the existing overview plus schedule, daily logs, change orders, selections and client portal tabs. */
const TABS = [
  ['overview', 'Overview'], ['schedule', 'Schedule'], ['logs', 'Daily logs'], ['punch', 'Punch list'], ['change-orders', 'Change orders'], ['selections', 'Selections'], ['portal', 'Client portal'],
] as const;

export default function JobWorkspace() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const [sum, setSum] = useState<any>(null);
  useEffect(() => { fetchAPI(`/jobs/${id}/summary`).then(setSum).catch(() => setSum(null)); }, [id, tab]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono"><Link to="/projects" className="hover:text-gray-800">Jobs</Link>{sum?.job?.number ? <> <span className="mx-1 text-gray-300">/</span> {sum.job.number}</> : null}</div>
          <h1 className="mt-2 text-gray-900">{sum?.job?.name ?? 'Job'}</h1>
          {sum?.job?.client && <p className="mt-1 text-sm text-gray-500">{sum.job.client} · {String(sum.job.status).replace(/_/g, ' ')}</p>}
        </div>
        {sum && (
          <div className="flex gap-6 text-right">
            <div><div className="label-mono">Contract</div><div className="num mt-1 text-xl text-gray-900">{money(sum.contract.revised)}</div></div>
            <div><div className="label-mono">Schedule</div><div className="num mt-1 text-xl text-gray-900">{sum.schedule.progress}%</div></div>
            <div><div className="label-mono">Waiting on client</div><div className="num mt-1 text-xl text-gray-900">{sum.waitingOnClient.changeOrders.length + sum.waitingOnClient.selections.length}</div></div>
          </div>
        )}
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Job sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setParams(key === 'overview' ? {} : { tab: key })}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] ${tab === key ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <ProjectDetail />}
      {tab === 'schedule' && <ScheduleTab projectId={id} />}
      {tab === 'logs' && <DailyLogsTab projectId={id} />}
      {tab === 'punch' && <PunchTab projectId={id} />}
      {tab === 'change-orders' && <ChangeOrdersTab projectId={id} />}
      {tab === 'selections' && <SelectionsTab projectId={id} />}
      {tab === 'portal' && <PortalTab projectId={id} />}
    </div>
  );
}
