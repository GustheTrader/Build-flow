import { useParams, useSearchParams } from 'react-router-dom';
import ProjectDetail from '../ProjectDetail';
import ScheduleTab from './ScheduleTab';
import DailyLogsTab from './DailyLogsTab';
import ChangeOrdersTab from './ChangeOrdersTab';
import SelectionsTab from './SelectionsTab';
import PortalTab from './PortalTab';

/** A job: the existing overview plus schedule, daily logs, change orders, selections and client portal tabs. */
const TABS = [
  ['overview', 'Overview'], ['schedule', 'Schedule'], ['logs', 'Daily logs'], ['change-orders', 'Change orders'], ['selections', 'Selections'], ['portal', 'Client portal'],
] as const;

export default function JobWorkspace() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Job sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setParams(key === 'overview' ? {} : { tab: key })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <ProjectDetail />}
      {tab === 'schedule' && <ScheduleTab projectId={id} />}
      {tab === 'logs' && <DailyLogsTab projectId={id} />}
      {tab === 'change-orders' && <ChangeOrdersTab projectId={id} />}
      {tab === 'selections' && <SelectionsTab projectId={id} />}
      {tab === 'portal' && <PortalTab projectId={id} />}
    </div>
  );
}
