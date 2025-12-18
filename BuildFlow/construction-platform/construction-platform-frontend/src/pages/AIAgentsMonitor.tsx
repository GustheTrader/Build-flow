import { useEffect, useState } from 'react';
import { Activity, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { aiAgents } from '../lib/api';

export default function AIAgentsMonitor() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentData();
    const interval = setInterval(loadAgentData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAgentData = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        aiAgents.getHealth(),
        aiAgents.getMetrics(),
      ]);

      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading AI agents...</div>;
  }

  const agentInfo = [
    {
      id: 'langgraph',
      name: 'LangGraph',
      description: 'Workflow orchestration and multi-step coordination',
      icon: <Activity className="h-6 w-6" />,
      color: 'blue',
    },
    {
      id: 'langsmith',
      name: 'LangSmith',
      description: 'System monitoring, tracing, and performance optimization',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'green',
    },
    {
      id: 'validation',
      name: 'Validation',
      description: 'Data validation, compliance checking, quality assurance',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'purple',
    },
    {
      id: 'minimax',
      name: 'Minimax',
      description: 'Decision optimization, resource allocation, scheduling',
      icon: <Zap className="h-6 w-6" />,
      color: 'yellow',
    },
    {
      id: 'memory',
      name: 'Memory',
      description: 'Knowledge retention, pattern recognition, context retrieval',
      icon: <Clock className="h-6 w-6" />,
      color: 'indigo',
    },
    {
      id: 'ml_pipeline',
      name: 'ML Pipeline',
      description: 'Predictive analytics, cost forecasting, model operations',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'pink',
    },
    {
      id: 'graph_db',
      name: 'Graph DB',
      description: 'Relationship analysis, dependency mapping, impact analysis',
      icon: <Activity className="h-6 w-6" />,
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Agents Monitor</h1>
        <p className="mt-2 text-gray-600">Real-time monitoring of all 7 Noesis AI agents</p>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthMetric
            label="Status"
            value={health?.status || 'Unknown'}
            color={health?.status === 'healthy' ? 'green' : 'red'}
          />
          <HealthMetric
            label="Active Agents"
            value={`${health?.agents?.active || 0} / ${health?.agents?.total || 7}`}
            color="blue"
          />
          <HealthMetric
            label="HITL Pending"
            value={health?.hitl?.pendingCount || 0}
            color="orange"
          />
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentInfo.map((agent) => {
          const agentMetrics = metrics?.[agent.id] || { calls: 0, avgLatency: 0 };
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              metrics={agentMetrics}
            />
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Latency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentInfo.map((agent) => {
                const agentMetrics = metrics?.[agent.id] || { calls: 0, avgLatency: 0 };
                return (
                  <tr key={agent.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`text-${agent.color}-600 mr-3`}>{agent.icon}</div>
                        <div className="font-medium text-gray-900">{agent.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agentMetrics.calls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agentMetrics.avgLatency.toFixed(0)}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ label, value, color }: any) {
  const colors: any = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

function AgentCard({ agent, metrics }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`bg-gradient-to-r ${colors[agent.color]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>{agent.icon}</div>
          <CheckCircle className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold mt-2">{agent.name}</h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Total Calls</div>
            <div className="font-semibold text-gray-900">{metrics.calls}</div>
          </div>
          <div>
            <div className="text-gray-600">Avg Latency</div>
            <div className="font-semibold text-gray-900">{metrics.avgLatency.toFixed(0)}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
