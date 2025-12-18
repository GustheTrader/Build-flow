// Enhanced AI agents data for investor demonstration
const aiAgents = [
  {
    id: '1',
    name: 'LangGraph Orchestrator',
    status: 'active',
    health: 'excellent',
    uptime: '99.8%',
    lastActivity: '2024-11-04T12:13:00Z',
    version: '2.1.4',
    description: 'Coordinates multi-agent workflows and decision-making processes',
    capabilities: ['Workflow orchestration', 'Agent coordination', 'Task distribution'],
    metrics: {
      tasksCompleted: 1247,
      successRate: 97.3,
      avgResponseTime: 1.2,
      dailyTasks: 156,
      weeklyTrend: '+8.4%'
    },
    performance: {
      cpuUsage: 23.5,
      memoryUsage: 412.3,
      throughput: 45.2,
      errorRate: 0.02
    },
    integrations: ['Redis', 'Chroma', 'LangSmith', 'Project Database'],
    alerts: []
  },
  {
    id: '2',
    name: 'LangSmith Monitor',
    status: 'active',
    health: 'excellent',
    uptime: '99.9%',
    lastActivity: '2024-11-04T12:12:45Z',
    version: '1.8.2',
    description: 'Monitors AI model performance and provides observability insights',
    capabilities: ['Model monitoring', 'Performance analytics', 'Anomaly detection'],
    metrics: {
      tasksCompleted: 1156,
      successRate: 98.1,
      avgResponseTime: 0.8,
      dailyTasks: 142,
      weeklyTrend: '+5.2%'
    },
    performance: {
      cpuUsage: 18.7,
      memoryUsage: 298.1,
      throughput: 67.8,
      errorRate: 0.01
    },
    integrations: ['LangGraph', 'Model Registry', 'Alerting System'],
    alerts: []
  },
  {
    id: '3',
    name: 'Validation Agent',
    status: 'active',
    health: 'good',
    uptime: '99.7%',
    lastActivity: '2024-11-04T12:13:00Z',
    version: '3.0.1',
    description: 'Validates AI decisions and triggers human-in-the-loop when confidence is low',
    capabilities: ['Decision validation', 'Confidence scoring', 'HITL triggering'],
    metrics: {
      tasksCompleted: 1089,
      successRate: 96.8,
      avgResponseTime: 0.5,
      dailyTasks: 134,
      weeklyTrend: '+12.1%'
    },
    performance: {
      cpuUsage: 31.2,
      memoryUsage: 267.4,
      throughput: 89.3,
      errorRate: 0.03
    },
    integrations: ['HITL System', 'Decision Engine', 'Notification Service'],
    alerts: [
      {
        type: 'info',
        message: 'High validation volume detected - processing 23% above normal',
        timestamp: '2024-11-04T11:45:00Z'
      }
    ]
  },
  {
    id: '4',
    name: 'MiniMax Analysis',
    status: 'active',
    health: 'good',
    uptime: '99.6%',
    lastActivity: '2024-11-04T12:12:30Z',
    version: '2.3.0',
    description: 'Provides advanced predictive analytics for cost and timeline optimization',
    capabilities: ['Predictive modeling', 'Cost optimization', 'Risk analysis'],
    metrics: {
      tasksCompleted: 987,
      successRate: 95.4,
      avgResponseTime: 2.1,
      dailyTasks: 98,
      weeklyTrend: '+15.7%'
    },
    performance: {
      cpuUsage: 45.8,
      memoryUsage: 578.9,
      throughput: 32.1,
      errorRate: 0.04
    },
    integrations: ['ML Pipeline', 'External Data Sources', 'Forecasting Engine'],
    alerts: [
      {
        type: 'warning',
        message: 'Model drift detected in cost prediction - retraining recommended',
        timestamp: '2024-11-04T10:30:00Z'
      }
    ]
  },
  {
    id: '5',
    name: 'Memory Agent',
    status: 'active',
    health: 'excellent',
    uptime: '99.8%',
    lastActivity: '2024-11-04T12:13:00Z',
    version: '1.5.3',
    description: 'Manages persistent memory and context for AI decision-making',
    capabilities: ['Context management', 'Memory persistence', 'Knowledge retrieval'],
    metrics: {
      tasksCompleted: 734,
      successRate: 98.9,
      avgResponseTime: 0.3,
      dailyTasks: 89,
      weeklyTrend: '+6.8%'
    },
    performance: {
      cpuUsage: 12.4,
      memoryUsage: 1024.7,
      throughput: 156.4,
      errorRate: 0.01
    },
    integrations: ['Vector Database', 'Knowledge Graph', 'All AI Agents'],
    alerts: []
  },
  {
    id: '6',
    name: 'ML Pipeline Agent',
    status: 'active',
    health: 'good',
    uptime: '99.5%',
    lastActivity: '2024-11-04T12:12:15Z',
    version: '4.1.2',
    description: 'Manages machine learning model training, deployment, and inference',
    capabilities: ['Model training', 'Feature engineering', 'Automated retraining'],
    metrics: {
      tasksCompleted: 523,
      successRate: 94.7,
      avgResponseTime: 3.4,
      dailyTasks: 67,
      weeklyTrend: '+9.3%'
    },
    performance: {
      cpuUsage: 67.2,
      memoryUsage: 892.1,
      throughput: 18.7,
      errorRate: 0.05
    },
    integrations: ['Model Registry', 'Training Data Store', 'Inference Engine'],
    alerts: [
      {
        type: 'info',
        message: 'Scheduled model retraining started for cost prediction models',
        timestamp: '2024-11-04T09:00:00Z'
      }
    ]
  },
  {
    id: '7',
    name: 'Graph DB Agent',
    status: 'active',
    health: 'excellent',
    uptime: '99.9%',
    lastActivity: '2024-11-04T12:12:55Z',
    version: '1.2.8',
    description: 'Manages knowledge graphs and relationship-based data analysis',
    capabilities: ['Graph analysis', 'Relationship mapping', 'Pattern recognition'],
    metrics: {
      tasksCompleted: 445,
      successRate: 99.2,
      avgResponseTime: 0.7,
      dailyTasks: 52,
      weeklyTrend: '+4.1%'
    },
    performance: {
      cpuUsage: 28.9,
      memoryUsage: 445.6,
      throughput: 73.2,
      errorRate: 0.008
    },
    integrations: ['Knowledge Graph DB', 'Chroma Vector Store', 'Relationship Engine'],
    alerts: []
  }
];

// System-wide metrics for demonstration
const systemMetrics = {
  totalOperations: 6181,
  overallHealthScore: 97.4,
  activeAgents: 7,
  systemUptime: '99.7%',
  averageLatency: 1.34,
  costSavings: '$450K annually',
  efficiency: '+34% vs manual processes',
  humanInterventionRate: '8.3%',
  lastSystemUpdate: '2024-11-01T08:00:00Z'
};

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      agents: aiAgents,
      systemMetrics: systemMetrics,
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}