import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Brain } from 'lucide-react';
import { projects, aiAgents } from '../lib/api';

export default function Dashboard() {
  const [projectList, setProjectList] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [hitlCount, setHitlCount] = useState(0);
  const [agentHealth, setAgentHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [projectsRes, hitlRes, healthRes] = await Promise.all([
        projects.list({ limit: 5 }),
        aiAgents.getHITLRequests('pending'),
        aiAgents.getHealth(),
      ]);

      setProjectList(projectsRes.data || []);
      setHitlCount(hitlRes.count || 0);
      setAgentHealth(healthRes.data);

      // Calculate aggregate metrics
      const totalBudget = projectsRes.data.reduce((sum: number, p: any) => sum + p.budget, 0);
      const totalActual = projectsRes.data.reduce((sum: number, p: any) => sum + p.actualCost, 0);
      
      setMetrics({
        activeProjects: projectsRes.data.filter((p: any) => p.status === 'in_progress').length,
        totalBudget,
        totalActual,
        variance: totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget * 100) : 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">AI-powered construction management insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<FolderKanban className="h-8 w-8 text-blue-600" />}
          title="Active Projects"
          value={metrics?.activeProjects || 0}
          trend="+2 this month"
          trendUp={true}
        />
        <MetricCard
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
          title="Total Budget"
          value={`$${(metrics?.totalBudget / 1000000).toFixed(1)}M`}
          trend="Across all projects"
        />
        <MetricCard
          icon={<TrendingUp className="h-8 w-8 text-purple-600" />}
          title="Budget Variance"
          value={`${metrics?.variance.toFixed(1)}%`}
          trend={metrics?.variance > 0 ? 'Over budget' : 'Under budget'}
          trendUp={metrics?.variance < 0}
        />
        <MetricCard
          icon={<AlertCircle className="h-8 w-8 text-orange-600" />}
          title="HITL Pending"
          value={hitlCount}
          trend="Awaiting review"
          link="/hitl-approvals"
        />
      </div>

      {/* AI Agent Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-blue-600" />
            AI Agent Status
          </h2>
          <Link to="/ai-agents" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {agentHealth?.agents?.metrics && Object.entries(agentHealth.agents.metrics).map(([name, data]: [string, any]) => (
            <div key={name} className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-xs font-medium text-gray-900 capitalize">{name.replace('_', ' ')}</div>
              <div className="text-xs text-gray-500">{data.calls || 0} calls</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All →
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {projectList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No projects yet. <Link to="/projects" className="text-blue-600 hover:text-blue-700">Create your first project</Link>
            </div>
          ) : (
            projectList.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{project.clientName}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <StatusBadge status={project.status} />
                      <span className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      ${(project.budget / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-gray-500">Budget</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, trend, trendUp, link }: any) {
  const Card = (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>{icon}</div>
        {trendUp !== undefined && (
          <div className={`text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '↑' : '↓'}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{title}</div>
        <div className="text-xs text-gray-500 mt-1">{trend}</div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{Card}</Link>;
  }

  return Card;
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    planning: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.planning}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}
