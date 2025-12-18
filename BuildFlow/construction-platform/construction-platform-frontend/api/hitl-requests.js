// Enhanced HITL requests data for investor demonstration
const hitlRequests = [
  {
    id: '1',
    agentId: '3',
    agentName: 'Validation Agent',
    type: 'Cost Estimate Validation',
    confidence: 78.5,
    description: 'Material cost variance exceeds 20% threshold for steel beam procurement',
    detailedAnalysis: {
      originalEstimate: 145000,
      currentQuote: 174000,
      variance: 20.0,
      marketFactors: ['Steel commodity price increase', 'Supply chain delays', 'Transportation costs'],
      recommendation: 'Consider alternative suppliers or material substitutions'
    },
    projectId: '1',
    projectName: 'Modern Office Complex - TechHub Seattle',
    requestTime: '2024-11-04T10:15:00Z',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Sarah Johnson',
    estimatedDecisionTime: '2 hours',
    impacts: {
      cost: '+$29,000',
      timeline: '+3 days',
      quality: 'No impact',
      risk: 'Low'
    },
    aiRecommendation: 'Approve with alternative supplier - 12% cost savings available',
    options: [
      {
        id: 'opt1',
        title: 'Approve current quote',
        cost: 174000,
        timeline: 'No delay',
        risk: 'Low'
      },
      {
        id: 'opt2', 
        title: 'Source alternative supplier',
        cost: 152000,
        timeline: '+5 days',
        risk: 'Medium'
      },
      {
        id: 'opt3',
        title: 'Redesign with alternative materials',
        cost: 148000,
        timeline: '+10 days',
        risk: 'High'
      }
    ]
  },
  {
    id: '2',
    agentId: '4',
    agentName: 'MiniMax Analysis',
    type: 'Risk Assessment',
    confidence: 82.3,
    description: 'Weather-related schedule delay risk for Q3 outdoor construction activities',
    detailedAnalysis: {
      riskProbability: 67,
      potentialDelay: '7-14 days',
      affectedTasks: ['Exterior cladding', 'Roofing installation', 'Site preparation'],
      weatherPattern: 'Extended rainy season predicted (15% above historical average)',
      recommendation: 'Implement covered work areas or reschedule critical path items'
    },
    projectId: '2',
    projectName: 'Residential Housing Development - Green Valley',
    requestTime: '2024-11-04T09:45:00Z',
    priority: 'medium',
    status: 'in_review',
    assignedTo: 'Michael Chen',
    estimatedDecisionTime: '4 hours',
    impacts: {
      cost: '+$35,000 (if delayed)',
      timeline: '+7-14 days',
      quality: 'Weather protection required',
      risk: 'Medium-High'
    },
    aiRecommendation: 'Install temporary weather protection - ROI 340%',
    options: [
      {
        id: 'opt1',
        title: 'Install temporary weather protection',
        cost: 35000,
        timeline: 'No delay',
        risk: 'Low'
      },
      {
        id: 'opt2',
        title: 'Reschedule outdoor work to Q4',
        cost: 0,
        timeline: '+45 days',
        risk: 'Low'
      },
      {
        id: 'opt3',
        title: 'Proceed with current schedule',
        cost: 0,
        timeline: 'Potential +14 days',
        risk: 'High'
      }
    ]
  },
  {
    id: '3',
    agentId: '6',
    agentName: 'ML Pipeline Agent',
    type: 'Budget Forecast Update',
    confidence: 88.7,
    description: 'Revised budget forecast based on material cost trends and labor market analysis',
    detailedAnalysis: {
      originalBudget: 2500000,
      revisedForecast: 2425000,
      savings: 75000,
      confidenceInterval: '±3.2%',
      keyFactors: ['Bulk purchasing discounts', 'Improved labor efficiency', 'Energy cost reductions'],
      recommendation: 'Update project budget and allocate savings to contingency fund'
    },
    projectId: '1',
    projectName: 'Modern Office Complex - TechHub Seattle',
    requestTime: '2024-11-04T08:30:00Z',
    priority: 'medium',
    status: 'pending',
    assignedTo: 'Sarah Johnson',
    estimatedDecisionTime: '1 hour',
    impacts: {
      cost: '-$75,000',
      timeline: 'No impact',
      quality: 'Improved',
      risk: 'Reduced'
    },
    aiRecommendation: 'Approve forecast update and reallocate 50% of savings to quality improvements',
    options: [
      {
        id: 'opt1',
        title: 'Approve budget reduction',
        cost: -75000,
        timeline: 'No change',
        risk: 'Low'
      },
      {
        id: 'opt2',
        title: 'Maintain original budget for contingency',
        cost: 0,
        timeline: 'No change',
        risk: 'Very Low'
      },
      {
        id: 'opt3',
        title: 'Reinvest savings in quality upgrades',
        cost: 0,
        timeline: 'No change',
        risk: 'Low'
      }
    ]
  },
  {
    id: '4',
    agentId: '5',
    agentName: 'Memory Agent',
    type: 'Historical Pattern Alert',
    confidence: 91.4,
    description: 'Similar project patterns suggest potential electrical system integration issues',
    detailedAnalysis: {
      similarProjects: 3,
      historicalPattern: 'Complex HVAC integration with smart building systems',
      failureRate: 23,
      averageDelay: '12 days',
      costOverrun: '$45,000 average',
      recommendation: 'Schedule additional coordination meetings and extend testing phase'
    },
    projectId: '4',
    projectName: 'Healthcare Facility - MedCenter North',
    requestTime: '2024-11-04T07:15:00Z',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Jennifer Liu',
    estimatedDecisionTime: '3 hours',
    impacts: {
      cost: '+$25,000 (prevention)',
      timeline: '+5 days (prevention)',
      quality: 'Significantly improved',
      risk: 'Major risk mitigation'
    },
    aiRecommendation: 'Implement preventive measures - historical ROI 420%',
    options: [
      {
        id: 'opt1',
        title: 'Implement preventive coordination plan',
        cost: 25000,
        timeline: '+5 days',
        risk: 'Very Low'
      },
      {
        id: 'opt2',
        title: 'Proceed with standard timeline',
        cost: 0,
        timeline: 'No change',
        risk: 'High'
      },
      {
        id: 'opt3',
        title: 'Delay integration phase for planning',
        cost: 15000,
        timeline: '+12 days',
        risk: 'Low'
      }
    ]
  },
  {
    id: '5',
    agentId: '7',
    agentName: 'Graph DB Agent',
    type: 'Dependency Optimization',
    confidence: 94.2,
    description: 'Critical path optimization opportunity identified through dependency analysis',
    detailedAnalysis: {
      currentCriticalPath: ['Foundation', 'Structure', 'Electrical', 'Finishing'],
      optimizedPath: ['Foundation', 'Structure + Electrical (parallel)', 'Finishing'],
      timeSavings: '18 days',
      riskAssessment: 'Low risk - parallel work validated by historical data',
      recommendation: 'Reorganize electrical work to run parallel with structural completion'
    },
    projectId: '5',
    projectName: 'Industrial Warehouse Complex',
    requestTime: '2024-11-04T06:00:00Z',
    priority: 'medium',
    status: 'pending',
    assignedTo: 'Robert Kim',
    estimatedDecisionTime: '6 hours',
    impacts: {
      cost: '-$12,000 (efficiency)',
      timeline: '-18 days',
      quality: 'No impact',
      risk: 'Slightly increased'
    },
    aiRecommendation: 'Implement optimization - 89% confidence in successful parallel execution',
    options: [
      {
        id: 'opt1',
        title: 'Implement parallel workflow',
        cost: -12000,
        timeline: '-18 days',
        risk: 'Low'
      },
      {
        id: 'opt2',
        title: 'Maintain sequential approach',
        cost: 0,
        timeline: 'No change',
        risk: 'Very Low'
      },
      {
        id: 'opt3',
        title: 'Partial parallel implementation',
        cost: -6000,
        timeline: '-9 days',
        risk: 'Very Low'
      }
    ]
  }
];

// HITL system metrics
const hitlMetrics = {
  totalRequests: 127,
  pendingRequests: 5,
  avgDecisionTime: '2.4 hours',
  humanAcceptanceRate: '94.2%',
  costSavingsFromHITL: '$340K this quarter',
  riskMitigationEvents: 23,
  systemLearningRate: '+12% accuracy improvement'
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
      requests: hitlRequests,
      metrics: hitlMetrics,
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST') {
    const { requestId, decision, notes } = req.body;
    
    // Find and update the request
    const request = hitlRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'completed';
      request.decision = decision;
      request.decisionNotes = notes;
      request.completedAt = new Date().toISOString();
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Decision recorded successfully',
      request: request 
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}