const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Simple router for API endpoints
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API Routes
  if (path.startsWith('/api/')) {
    handleAPIRequest(req, res, path);
    return;
  }
  
  // Default 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

function handleAPIRequest(req, res, path) {
  res.setHeader('Content-Type', 'application/json');
  
  // Mock data for construction platform
  if (path === '/api/projects') {
    const projects = [
      {
        id: '1',
        name: 'Modern Office Complex',
        client: 'TechCorp Inc.',
        status: 'In Progress',
        budget: 2500000,
        spent: 1800000,
        startDate: '2024-01-15',
        endDate: '2024-08-15',
        progress: 72,
        location: 'Downtown Seattle, WA',
        type: 'Commercial',
        description: '10-story office building with modern amenities'
      },
      {
        id: '2',
        name: 'Residential Housing Development',
        client: 'Metro Builders LLC',
        status: 'Planning',
        budget: 5000000,
        spent: 50000,
        startDate: '2024-03-01',
        endDate: '2025-01-31',
        progress: 15,
        location: 'Bellevue, WA',
        type: 'Residential',
        description: '45-unit housing development'
      },
      {
        id: '3',
        name: 'Retail Shopping Center',
        client: 'Pacific Plaza Group',
        status: 'Completed',
        budget: 1800000,
        spent: 1750000,
        startDate: '2023-05-01',
        endDate: '2024-02-28',
        progress: 100,
        location: 'South Center, WA',
        type: 'Commercial',
        description: '65,000 sq ft shopping center with anchor tenants'
      }
    ];
    
    res.writeHead(200);
    res.end(JSON.stringify(projects));
    return;
  }
  
  if (path.startsWith('/api/projects/')) {
    const projectId = path.split('/')[3];
    const project = {
      id: projectId,
      name: 'Sample Project',
      client: 'Sample Client',
      status: 'In Progress',
      budget: 1000000,
      spent: 750000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      progress: 75,
      location: 'Sample Location',
      type: 'Commercial',
      description: 'Sample project description',
      tasks: [
        { id: '1', name: 'Foundation', status: 'completed', assignedTo: 'John Smith' },
        { id: '2', name: 'Framing', status: 'in-progress', assignedTo: 'Mike Johnson' },
        { id: '3', name: 'Electrical', status: 'pending', assignedTo: 'Sarah Wilson' }
      ],
      invoices: [
        { id: '1', amount: 250000, status: 'paid', date: '2024-01-15' },
        { id: '2', amount: 500000, status: 'pending', date: '2024-02-15' }
      ]
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(project));
    return;
  }
  
  if (path === '/api/ai-agents') {
    const agents = [
      {
        id: '1',
        name: 'LangGraph Orchestrator',
        status: 'active',
        health: 'good',
        uptime: '99.8%',
        lastActivity: '2024-11-04T05:13:00Z',
        metrics: {
          tasksCompleted: 1247,
          successRate: 97.3,
          avgResponseTime: 1.2
        }
      },
      {
        id: '2',
        name: 'LangSmith Monitor',
        status: 'active',
        health: 'good',
        uptime: '99.9%',
        lastActivity: '2024-11-04T05:12:45Z',
        metrics: {
          tasksCompleted: 1156,
          successRate: 98.1,
          avgResponseTime: 0.8
        }
      },
      {
        id: '3',
        name: 'Validation Agent',
        status: 'active',
        health: 'good',
        uptime: '99.7%',
        lastActivity: '2024-11-04T05:13:00Z',
        metrics: {
          tasksCompleted: 1089,
          successRate: 96.8,
          avgResponseTime: 0.5
        }
      },
      {
        id: '4',
        name: 'MiniMax Analysis',
        status: 'active',
        health: 'good',
        uptime: '99.6%',
        lastActivity: '2024-11-04T05:12:30Z',
        metrics: {
          tasksCompleted: 987,
          successRate: 95.4,
          avgResponseTime: 2.1
        }
      },
      {
        id: '5',
        name: 'Memory Agent',
        status: 'active',
        health: 'good',
        uptime: '99.8%',
        lastActivity: '2024-11-04T05:13:00Z',
        metrics: {
          tasksCompleted: 734,
          successRate: 98.9,
          avgResponseTime: 0.3
        }
      },
      {
        id: '6',
        name: 'ML Pipeline Agent',
        status: 'active',
        health: 'good',
        uptime: '99.5%',
        lastActivity: '2024-11-04T05:12:15Z',
        metrics: {
          tasksCompleted: 523,
          successRate: 94.7,
          avgResponseTime: 3.4
        }
      },
      {
        id: '7',
        name: 'Graph DB Agent',
        status: 'active',
        health: 'good',
        uptime: '99.9%',
        lastActivity: '2024-11-04T05:12:55Z',
        metrics: {
          tasksCompleted: 445,
          successRate: 99.2,
          avgResponseTime: 0.7
        }
      }
    ];
    
    res.writeHead(200);
    res.end(JSON.stringify(agents));
    return;
  }
  
  if (path === '/api/hitl-requests') {
    const hitlRequests = [
      {
        id: '1',
        agentId: '3',
        agentName: 'Validation Agent',
        type: 'Cost Estimate Validation',
        confidence: 78.5,
        description: 'Material cost variance exceeds 20% threshold',
        projectId: '1',
        projectName: 'Modern Office Complex',
        requestTime: '2024-11-04T05:10:00Z',
        priority: 'high',
        status: 'pending'
      },
      {
        id: '2',
        agentId: '4',
        agentName: 'MiniMax Analysis',
        type: 'Risk Assessment',
        confidence: 82.3,
        description: 'Schedule delay risk detected based on weather patterns',
        projectId: '2',
        projectName: 'Residential Housing Development',
        requestTime: '2024-11-04T05:05:00Z',
        priority: 'medium',
        status: 'in_review'
      },
      {
        id: '3',
        agentId: '6',
        agentName: 'ML Pipeline Agent',
        type: 'Budget Forecast Update',
        confidence: 88.7,
        description: 'Revised budget forecast based on material cost trends',
        projectId: '1',
        projectName: 'Modern Office Complex',
        requestTime: '2024-11-04T04:55:00Z',
        priority: 'medium',
        status: 'pending'
      }
    ];
    
    res.writeHead(200);
    res.end(JSON.stringify(hitlRequests));
    return;
  }
  
  // Default response
  res.writeHead(200);
  res.end(JSON.stringify({ message: 'AI-Augmented Construction Management Platform API', status: 'active' }));
}

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available:`);
  console.log(`   - GET /api/projects`);
  console.log(`   - GET /api/projects/:id`);
  console.log(`   - GET /api/ai-agents`);
  console.log(`   - GET /api/hitl-requests`);
  console.log(`   - Frontend available at: http://localhost:5173/`);
  console.log('');
});