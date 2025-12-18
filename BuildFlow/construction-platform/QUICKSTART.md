# Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Node.js v18+ and npm
- 10 minutes of your time

## Option 1: Automated Start (Recommended)

```bash
cd /workspace/construction-platform
./start.sh
```

This will:
1. Start Redis and Chroma via Docker
2. Install all dependencies
3. Start backend server on port 3000
4. Start frontend on port 5173

## Option 2: Manual Start

### 1. Start Data Services

```bash
docker-compose up -d
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend starts at http://localhost:3000

### 3. Start Frontend (New Terminal)

```bash
cd construction-platform-frontend
npm install
npm run dev
```

Frontend starts at http://localhost:5173

## First Steps

### 1. Access the Application

Open your browser to http://localhost:5173

### 2. Create an Account

Click "Try Demo" or register with:
- Email: your@email.com
- Password: (your choice)

### 3. Create Your First Project

1. Navigate to "Projects"
2. Click "Create Project"
3. Fill in project details
4. Watch AI agents automatically analyze the project

### 4. Explore AI Features

**Dashboard**: View AI-powered insights and recommendations

**Projects**: See ML-based cost forecasts and schedule predictions

**HITL Approvals**: Review and approve AI recommendations

**AI Agents**: Monitor all 7 agents in real-time

## Testing the AI Agents

### Test Cost Forecasting

```bash
# Login first and get your token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}'

# Execute ML Pipeline Agent
curl -X POST http://localhost:3000/api/v1/ai-agents/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agentType": "ml_pipeline",
    "input": {
      "task": "cost_forecast",
      "data": {
        "budget": 500000,
        "actualCost": 250000,
        "completion": 0.45
      }
    }
  }'
```

### Test Project Planning Workflow

```bash
curl -X POST http://localhost:3000/api/v1/ai-agents/orchestrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "workflow": "project_planning",
    "context": {
      "projectType": "commercial",
      "budget": {"total": 500000}
    }
  }'
```

## API Endpoints

### Authentication
- POST /api/v1/auth/register - Create account
- POST /api/v1/auth/login - Login

### Projects
- GET /api/v1/projects - List projects
- POST /api/v1/projects - Create project
- GET /api/v1/projects/:id - Get project details
- GET /api/v1/projects/:id/metrics - Get AI-powered metrics

### AI Agents
- POST /api/v1/ai-agents/execute - Run single agent
- POST /api/v1/ai-agents/orchestrate - Multi-agent workflow
- GET /api/v1/ai-agents/hitl - Get pending approvals
- POST /api/v1/ai-agents/hitl/:id/approve - Approve recommendation

## Available AI Agents

1. **LangGraph** - Workflow orchestration
2. **LangSmith** - Monitoring and tracing
3. **Validation** - Quality assurance
4. **Minimax** - Optimization
5. **Memory** - Knowledge retention
6. **ML Pipeline** - Predictive analytics
7. **Graph DB** - Relationship analysis

## Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 PID
```

### Redis connection error
```bash
# Check if Redis is running
docker ps | grep redis
# Restart if needed
docker-compose restart redis
```

### Frontend build errors
```bash
cd construction-platform-frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Complete the frontend pages (see README.md)
2. Add real-time WebSocket updates
3. Implement file upload for documents
4. Add Gantt chart visualization
5. Integrate with QuickBooks/Salesforce

## Support

For issues or questions, refer to:
- Main README: `/construction-platform/README.md`
- Architecture: `/construction-platform/docs/ARCHITECTURE.md`
