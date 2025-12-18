// Enhanced mock data for investor demonstration
const mockProjects = [
  {
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
    priority: 'high',
    manager: 'Sarah Johnson',
    riskLevel: 'Medium',
    aiPredictedCompletion: '2024-08-20',
    aiCostForecast: 2425000,
    aiRiskFactors: ['Weather delays', 'Material cost volatility'],
    timeline: {
      planning: { status: 'completed', duration: '3 weeks' },
      foundation: { status: 'completed', duration: '6 weeks' },
      structure: { status: 'in-progress', duration: '12 weeks', progress: 80 },
      electrical: { status: 'pending', duration: '8 weeks' },
      finishing: { status: 'pending', duration: '10 weeks' }
    }
  },
  {
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
    priority: 'high',
    manager: 'Michael Chen',
    riskLevel: 'Low',
    aiPredictedCompletion: '2025-01-15',
    aiCostForecast: 4850000,
    aiRiskFactors: ['Permit approval timeline'],
    timeline: {
      planning: { status: 'in-progress', duration: '8 weeks', progress: 65 },
      foundation: { status: 'pending', duration: '4 weeks' },
      structure: { status: 'pending', duration: '20 weeks' },
      utilities: { status: 'pending', duration: '6 weeks' },
      finishing: { status: 'pending', duration: '16 weeks' }
    }
  },
  {
    id: '3',
    name: 'Retail Shopping Center - Pacific Plaza',
    client: 'Pacific Plaza Group',
    status: 'Completed',
    budget: 1800000,
    spent: 1750000,
    startDate: '2023-05-01',
    endDate: '2024-02-28',
    progress: 100,
    location: 'South Center, WA',
    type: 'Commercial',
    description: '65,000 sq ft shopping center with anchor tenants and modern retail spaces',
    priority: 'completed',
    manager: 'David Rodriguez',
    riskLevel: 'Low',
    aiPredictedCompletion: '2024-02-28',
    aiCostForecast: 1750000,
    aiRiskFactors: [],
    timeline: {
      planning: { status: 'completed', duration: '4 weeks' },
      foundation: { status: 'completed', duration: '6 weeks' },
      structure: { status: 'completed', duration: '16 weeks' },
      utilities: { status: 'completed', duration: '8 weeks' },
      finishing: { status: 'completed', duration: '12 weeks' }
    }
  },
  {
    id: '4',
    name: 'Healthcare Facility - MedCenter North',
    client: 'Northwest Health Systems',
    status: 'In Progress',
    budget: 4200000,
    spent: 1260000,
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    progress: 35,
    location: 'Tacoma, WA',
    type: 'Healthcare',
    description: 'State-of-the-art medical facility with emergency services and specialized equipment',
    priority: 'critical',
    manager: 'Jennifer Liu',
    riskLevel: 'High',
    aiPredictedCompletion: '2024-12-15',
    aiCostForecast: 4350000,
    aiRiskFactors: ['Specialized equipment delivery', 'Regulatory compliance'],
    timeline: {
      planning: { status: 'completed', duration: '6 weeks' },
      foundation: { status: 'completed', duration: '8 weeks' },
      structure: { status: 'in-progress', duration: '20 weeks', progress: 45 },
      mechanical: { status: 'pending', duration: '12 weeks' },
      finishing: { status: 'pending', duration: '14 weeks' }
    }
  },
  {
    id: '5',
    name: 'Industrial Warehouse Complex',
    client: 'LogiFlow Distribution',
    status: 'In Progress',
    budget: 3800000,
    spent: 2850000,
    startDate: '2023-09-01',
    endDate: '2024-05-15',
    progress: 88,
    location: 'Kent, WA',
    type: 'Industrial',
    description: 'Automated warehouse facility with robotics integration and climate control',
    priority: 'high',
    manager: 'Robert Kim',
    riskLevel: 'Medium',
    aiPredictedCompletion: '2024-05-20',
    aiCostForecast: 3920000,
    aiRiskFactors: ['Automation system integration'],
    timeline: {
      planning: { status: 'completed', duration: '4 weeks' },
      foundation: { status: 'completed', duration: '6 weeks' },
      structure: { status: 'completed', duration: '18 weeks' },
      mechanical: { status: 'in-progress', duration: '10 weeks', progress: 70 },
      automation: { status: 'pending', duration: '8 weeks' }
    }
  }
];

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json(mockProjects);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}