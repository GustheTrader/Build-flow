// Enhanced project details for investor demonstration
const projectDetails = {
  '1': {
    id: '1',
    name: 'Modern Office Complex - TechHub Seattle',
    client: 'TechCorp Inc.',
    status: 'In Progress',
    budget: 2500000,
    spent: 1800000,
    startDate: '2024-01-15',
    endDate: '2024-08-15',
    progress: 72,
    location: 'Downtown Seattle, WA',
    type: 'Commercial',
    description: '10-story office building with modern amenities and smart building technology',
    manager: 'Sarah Johnson',
    riskLevel: 'Medium',
    aiPredictedCompletion: '2024-08-20',
    aiCostForecast: 2425000,
    aiRiskFactors: ['Weather delays', 'Material cost volatility'],
    tasks: [
      { 
        id: '1', 
        name: 'Foundation & Excavation', 
        status: 'completed', 
        assignedTo: 'John Smith',
        progress: 100,
        budget: 400000,
        spent: 385000,
        aiConfidence: 95.2,
        estimatedCompletion: '2024-02-28'
      },
      { 
        id: '2', 
        name: 'Steel Frame Construction', 
        status: 'in-progress', 
        assignedTo: 'Mike Johnson',
        progress: 80,
        budget: 800000,
        spent: 640000,
        aiConfidence: 88.7,
        estimatedCompletion: '2024-06-15'
      },
      { 
        id: '3', 
        name: 'Electrical Systems Installation', 
        status: 'pending', 
        assignedTo: 'Sarah Wilson',
        progress: 0,
        budget: 350000,
        spent: 0,
        aiConfidence: 92.1,
        estimatedCompletion: '2024-07-30'
      },
      { 
        id: '4', 
        name: 'HVAC System Installation', 
        status: 'pending', 
        assignedTo: 'Carlos Rodriguez',
        progress: 0,
        budget: 450000,
        spent: 0,
        aiConfidence: 89.4,
        estimatedCompletion: '2024-08-10'
      },
      { 
        id: '5', 
        name: 'Interior Finishing', 
        status: 'pending', 
        assignedTo: 'Lisa Chen',
        progress: 0,
        budget: 500000,
        spent: 0,
        aiConfidence: 91.8,
        estimatedCompletion: '2024-08-15'
      }
    ],
    invoices: [
      { 
        id: '1', 
        amount: 400000, 
        status: 'paid', 
        date: '2024-01-15',
        description: 'Foundation work - Phase 1',
        vendor: 'Foundation Specialists Inc.'
      },
      { 
        id: '2', 
        amount: 600000, 
        status: 'paid', 
        date: '2024-03-01',
        description: 'Steel frame materials',
        vendor: 'Metro Steel Supply'
      },
      { 
        id: '3', 
        amount: 800000, 
        status: 'pending', 
        date: '2024-05-15',
        description: 'Construction services - Q2',
        vendor: 'Prime Construction LLC'
      },
      { 
        id: '4', 
        amount: 350000, 
        status: 'draft', 
        date: '2024-07-01',
        description: 'Electrical systems',
        vendor: 'ElectroMax Solutions'
      }
    ],
    aiInsights: {
      costOptimization: [
        'Material costs are trending 3% above forecast - recommend bulk purchasing for Q3',
        'Labor efficiency increased 12% with new scheduling algorithm',
        'Weather delays reduced by 40% using predictive modeling'
      ],
      riskMitigation: [
        'Supply chain delays for specialized glass panels - alternative suppliers identified',
        'Permit approval for rooftop equipment pending - expedited review requested',
        'Skilled electrician shortage in market - recommend subcontractor partnership'
      ],
      qualityMetrics: {
        overallScore: 92.4,
        safetyRecord: 'Excellent - 0 incidents in 180 days',
        defectRate: '0.8% (Industry average: 2.1%)',
        clientSatisfaction: '4.8/5.0'
      }
    },
    documents: [
      { name: 'Architectural Plans v3.2', type: 'blueprint', lastUpdated: '2024-04-15' },
      { name: 'Safety Compliance Report', type: 'report', lastUpdated: '2024-05-01' },
      { name: 'Material Specifications', type: 'spec', lastUpdated: '2024-03-20' },
      { name: 'AI Cost Analysis', type: 'analysis', lastUpdated: '2024-05-10' }
    ]
  },
  '2': {
    id: '2',
    name: 'Residential Housing Development - Green Valley',
    client: 'Metro Builders LLC',
    status: 'Planning',
    budget: 5000000,
    spent: 350000,
    startDate: '2024-03-01',
    endDate: '2025-01-31',
    progress: 15,
    location: 'Bellevue, WA',
    type: 'Residential',
    description: '45-unit sustainable housing development with EV charging stations',
    manager: 'Michael Chen',
    riskLevel: 'Low',
    aiPredictedCompletion: '2025-01-15',
    aiCostForecast: 4850000,
    aiRiskFactors: ['Permit approval timeline'],
    tasks: [
      { 
        id: '1', 
        name: 'Site Survey & Planning', 
        status: 'completed', 
        assignedTo: 'Survey Team Alpha',
        progress: 100,
        budget: 150000,
        spent: 145000,
        aiConfidence: 98.1,
        estimatedCompletion: '2024-03-30'
      },
      { 
        id: '2', 
        name: 'Environmental Impact Assessment', 
        status: 'in-progress', 
        assignedTo: 'EcoConsult Group',
        progress: 75,
        budget: 200000,
        spent: 150000,
        aiConfidence: 94.3,
        estimatedCompletion: '2024-06-15'
      },
      { 
        id: '3', 
        name: 'Infrastructure Planning', 
        status: 'pending', 
        assignedTo: 'Infrastructure Team',
        progress: 0,
        budget: 800000,
        spent: 0,
        aiConfidence: 91.7,
        estimatedCompletion: '2024-09-30'
      }
    ],
    invoices: [
      { 
        id: '1', 
        amount: 150000, 
        status: 'paid', 
        date: '2024-03-15',
        description: 'Site survey and initial planning',
        vendor: 'Survey Specialists Inc.'
      },
      { 
        id: '2', 
        amount: 200000, 
        status: 'pending', 
        date: '2024-05-01',
        description: 'Environmental assessment',
        vendor: 'EcoConsult Group'
      }
    ],
    aiInsights: {
      costOptimization: [
        'Green building certification will reduce long-term operational costs by 35%',
        'Bulk material ordering could save 8% on construction costs',
        'EV charging infrastructure grants available - $50k potential savings'
      ],
      riskMitigation: [
        'Permit approval process on track - no delays expected',
        'Sustainable materials supply chain stable',
        'Local utility partnerships established for grid integration'
      ],
      qualityMetrics: {
        overallScore: 96.1,
        sustainabilityRating: 'LEED Platinum (projected)',
        energyEfficiency: '40% above code requirements',
        clientSatisfaction: '4.9/5.0'
      }
    }
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
    const { projectId } = req.query;
    const project = projectDetails[projectId];
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    return res.status(200).json(project);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}