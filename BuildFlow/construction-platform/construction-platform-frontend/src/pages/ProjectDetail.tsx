import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Brain, Plus, FileText } from 'lucide-react';
import { projects, aiAgents, payments } from '../lib/api';
import CreateInvoiceModal from '../components/CreateInvoiceModal';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    try {
      const [projectRes, metricsRes, tasksRes, invoicesRes] = await Promise.all([
        projects.get(projectId),
        projects.getMetrics(projectId),
        projects.getTasks(projectId),
        payments.getProjectInvoices(projectId),
      ]);

      setProject(projectRes.data);
      setMetrics(metricsRes.data);
      setTasks(tasksRes.data || []);
      setInvoices(invoicesRes.data || []);

      // Get AI cost forecast
      const forecast = await aiAgents.execute('ml_pipeline', {
        task: 'cost_forecast',
        data: {
          budget: projectRes.data.budget,
          actualCost: projectRes.data.actualCost,
          completion: metricsRes.data.completionPercentage / 100,
        },
      }, projectId);

      setAiInsights(forecast.data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading project...</div>;
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/projects" className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        <p className="mt-2 text-gray-600">{project.description}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          label="Budget"
          value={`$${(project.budget / 1000).toFixed(0)}K`}
        />
        <MetricCard
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          label="Actual Cost"
          value={`$${(project.actualCost / 1000).toFixed(0)}K`}
        />
        <MetricCard
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          label="Completion"
          value={`${metrics?.completionPercentage.toFixed(1)}%`}
        />
        <MetricCard
          icon={<Calendar className="h-6 w-6 text-orange-600" />}
          label="Active Tasks"
          value={metrics?.activeTasksCount || 0}
        />
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-start">
            <Brain className="h-6 w-6 text-blue-600 mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Cost Forecast</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Forecasted Total Cost</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(aiInsights.recommendation?.forecastedTotalCost / 1000).toFixed(0)}K
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Variance</div>
                  <div className={`text-2xl font-bold ${
                    aiInsights.recommendation?.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {aiInsights.recommendation?.variance > 0 ? '+' : ''}
                    {aiInsights.recommendation?.variance.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Confidence</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(aiInsights.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-700">
                <strong>Reasoning:</strong> {aiInsights.reasoning}
              </div>
              {aiInsights.hitlRequired && (
                <div className="mt-3 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded">
                  This forecast requires human review due to confidence level
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tasks yet. Add your first task to get started.
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                      <span className="text-xs text-gray-500">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-600">Assignee</div>
                    <div className="font-medium text-gray-900">{task.assigneeName}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailItem label="Client" value={project.clientName} />
          <DetailItem label="Project Manager" value={project.projectManager} />
          <DetailItem label="Type" value={project.type} />
          <DetailItem label="Status" value={project.status} />
          <DetailItem
            label="Timeline"
            value={`${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}`}
          />
          <DetailItem
            label="Location"
            value={`${project.location.city}, ${project.location.state}`}
          />
        </div>
      </div>

      {/* Invoices & Payments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              Invoices & Payments
            </h2>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Invoice
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No invoices yet. Create your first invoice to bill the client.
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{invoice.invoiceNumber}</h4>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {invoice.description || 'No description'}
                    </p>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                      {invoice.lineItems && (
                        <span>{invoice.lineItems.length} line items</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">{invoice.currency.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <CreateInvoiceModal
          projectId={id!}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={() => {
            setShowInvoiceModal(false);
            loadProjectData(id!);
          }}
        />
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: any = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.draft}`}>
      {status.toUpperCase()}
    </span>
  );
}

function MetricCard({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-2">{icon}</div>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: any) {
  return (
    <div>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-base font-medium text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const colors: any = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    in_review: 'bg-purple-100 text-purple-800',
    blocked: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.todo}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const colors: any = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority] || colors.medium}`}>
      {priority.toUpperCase()}
    </span>
  );
}
