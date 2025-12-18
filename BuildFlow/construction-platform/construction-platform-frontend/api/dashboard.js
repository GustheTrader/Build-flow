// Dashboard metrics for investor demonstration
const dashboardData = {
  summary: {
    totalProjects: 5,
    activeProjects: 3,
    completedProjects: 1,
    totalBudget: 17800000,
    totalSpent: 8545000,
    avgProgress: 54.2,
    onTimeDelivery: 96.4,
    budgetVariance: -2.8,
    clientSatisfaction: 4.7
  },
  aiMetrics: {
    totalAgents: 7,
    activeAgents: 7,
    systemHealth: 97.4,
    tasksCompleted: 6181,
    successRate: 96.9,
    costSavings: 450000,
    efficiencyGain: 34,
    automationRate: 91.7
  },
  hitlMetrics: {
    pendingApprovals: 5,
    avgDecisionTime: 2.4,
    humanAcceptanceRate: 94.2,
    criticalAlerts: 2,
    weeklyTrend: -8.3,
    totalSavings: 340000
  },
  financialOverview: {
    quarterlyRevenue: 4200000,
    profitMargin: 18.7,
    operationalEfficiency: 89.3,
    costReductions: 12.4,
    aiROI: 340,
    projectedSavings: 1200000
  },
  recentActivities: [
    {
      id: '1',
      type: 'ai_decision',
      message: 'ML Pipeline Agent optimized material ordering schedule',
      project: 'Modern Office Complex',
      savings: 15000,
      timestamp: '2024-11-04T11:30:00Z'
    },
    {
      id: '2',
      type: 'hitl_approval',
      message: 'Cost estimate validation approved by project manager',
      project: 'Healthcare Facility',
      impact: 'Schedule maintained',
      timestamp: '2024-11-04T11:15:00Z'
    },
    {
      id: '3',
      type: 'risk_mitigation',
      message: 'Weather delay risk automatically mitigated',
      project: 'Housing Development',
      action: 'Temporary cover installed',
      timestamp: '2024-11-04T10:45:00Z'
    },
    {
      id: '4',
      type: 'quality_improvement',
      message: 'Validation Agent identified material quality concern',
      project: 'Warehouse Complex',
      result: 'Alternative supplier selected',
      timestamp: '2024-11-04T10:30:00Z'
    },
    {
      id: '5',
      type: 'efficiency_gain',
      message: 'Graph DB Agent optimized work sequence',
      project: 'Warehouse Complex',
      timeSaved: '18 days',
      timestamp: '2024-11-04T09:15:00Z'
    }
  ],
  performanceTrends: {
    weekly: {
      projectProgress: [65, 68, 71, 69, 72, 74, 72],
      aiEfficiency: [88, 91, 89, 92, 94, 93, 95],
      costSavings: [25000, 32000, 28000, 41000, 38000, 45000, 42000],
      hitlDecisions: [12, 8, 15, 10, 9, 11, 5]
    },
    monthly: {
      revenue: [3800000, 4100000, 4200000],
      projects: [3, 4, 5],
      satisfaction: [4.5, 4.6, 4.7],
      efficiency: [82, 87, 89]
    }
  },
  alerts: [
    {
      id: '1',
      type: 'warning',
      severity: 'medium',
      message: 'Weather delay risk identified for Housing Development project',
      action: 'Review mitigation options',
      timestamp: '2024-11-04T09:45:00Z'
    },
    {
      id: '2',
      type: 'info',
      severity: 'low',
      message: 'ML model retraining completed - 3% accuracy improvement',
      action: 'No action required',
      timestamp: '2024-11-04T09:00:00Z'
    }
  ],
  competitiveAdvantage: {
    timeToMarket: '+28% faster than industry average',
    costEfficiency: '+34% more efficient than traditional methods',
    qualityScore: '96.4% (Industry: 87.2%)',
    clientRetention: '98.5%',
    aiAdoption: '91.7% of decisions AI-assisted',
    predictiveAccuracy: '94.3% for cost and timeline forecasts'
  }
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
      ...dashboardData,
      timestamp: new Date().toISOString(),
      systemStatus: 'operational'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}