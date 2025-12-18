# AI-Augmented Construction Platform - Technical Architecture

## System Overview

A production-grade, AI-augmented construction and service business management platform targeting residential and commercial general contractors in the $5-25M revenue segment. The platform integrates 7 Noesis AI agents to provide intelligent automation while maintaining human-in-the-loop controls.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  React + TypeScript + Tailwind CSS (Mobile-First, Responsive)   │
│  - Project Dashboard    - Financial Tools    - Team Portal      │
│  - Scheduling & Gantt   - Materials Mgmt     - Mobile App       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API / WebSocket
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                      API Gateway / Auth                         │
│               JWT-based Authentication & Authorization          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend Services Layer                       │
│                    Node.js + Express + TypeScript               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Project    │  │  Financial   │  │ Collaboration│         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Materials   │  │  Scheduling  │  │   AI Agent   │         │
│  │   Service    │  │   Service    │  │  Orchestrator│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    AI Agent Layer (Noesis)                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  LangGraph   │  │  LangSmith   │  │  Validation  │         │
│  │  (Orchestr.) │  │ (Monitoring) │  │    Agent     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Minimax    │  │    Memory    │  │  ML Pipeline │         │
│  │ (Optimizer)  │  │    Agent     │  │    Agent     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐                                               │
│  │   Graph DB   │                                               │
│  │    Agent     │                                               │
│  └──────────────┘                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                      Data Layer                                 │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │     Redis (Primary)      │  │   Chroma (Vector DB)     │   │
│  │  - Real-time data        │  │  - AI embeddings         │   │
│  │  - Session storage       │  │  - Semantic search       │   │
│  │  - Pub/Sub messaging     │  │  - Knowledge base        │   │
│  │  - Caching               │  │  - Project history       │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            File Storage (Local/S3-compatible)            │  │
│  │         - Documents - Photos - Plans - Reports           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Layer Architecture

### Redis - Primary Data Store

**Purpose**: Real-time operational data, session management, caching, pub/sub messaging

**Data Structures**:

1. **Projects** (Hash)
   - Key: `project:{projectId}`
   - Fields: id, name, status, startDate, endDate, budget, client, etc.

2. **Tasks** (Hash + Sorted Set)
   - Hash: `task:{taskId}` - task details
   - Sorted Set: `project:{projectId}:tasks` - tasks ordered by due date

3. **Financials** (Hash + List)
   - `invoice:{invoiceId}` - invoice details
   - `payment:{paymentId}` - payment records
   - `budget:{projectId}` - budget tracking

4. **Real-time Metrics** (Sorted Set + Stream)
   - `metrics:project:{projectId}` - real-time KPIs
   - `events:stream` - event stream for pub/sub

5. **User Sessions** (Hash with TTL)
   - `session:{sessionId}` - JWT session data

6. **Cache Layer** (String with TTL)
   - `cache:api:{endpoint}:{params}` - API response cache

### Chroma - Vector Database

**Purpose**: AI embeddings, semantic search, knowledge management

**Collections**:

1. **Project Knowledge**
   - Embeddings of project documents, RFIs, submittals
   - Metadata: projectId, documentType, date, status

2. **Historical Data**
   - Past project patterns for ML predictions
   - Cost estimations, schedule performance

3. **Best Practices**
   - Knowledge base from successful projects
   - Lessons learned, risk mitigations

4. **Vendor/Subcontractor Intelligence**
   - Performance history
   - Qualification records

## Backend Services Architecture

### Core Services

#### 1. Project Service
- CRUD operations for projects
- Schedule management
- Task tracking
- RFI/Submittal workflows

#### 2. Financial Service
- Budget management
- Invoice generation
- Payment processing
- Cost tracking
- Accounting integration (QuickBooks, Xero)

#### 3. Collaboration Service
- Team messaging
- Client portal
- Subcontractor hub
- Notifications
- Document sharing

#### 4. Materials Service
- Inventory tracking
- Supplier management
- Purchase orders
- Materials forecasting

#### 5. Scheduling Service
- Gantt chart generation
- Critical path analysis
- Resource allocation
- Conflict detection

#### 6. AI Agent Orchestrator
- Coordinates all 7 Noesis agents
- Routes requests to appropriate agents
- Manages agent configurations
- Collects metrics and traces

### AI Agent Integration

#### Agent Responsibilities

1. **LangGraph Agent** (Orchestration)
   - Workflow orchestration
   - Multi-step process coordination
   - Dependency management
   - Task routing

2. **LangSmith Agent** (Monitoring)
   - End-to-end tracing
   - Performance metrics
   - Observability dashboards
   - Auto-optimization suggestions

3. **Validation Agent** (Quality Assurance)
   - Data validation
   - Compliance checking
   - Quality thresholds enforcement
   - Human-in-the-loop triggers

4. **Minimax Agent** (Decision Optimization)
   - Schedule optimization
   - Resource allocation
   - Payment timing
   - Risk-aware decisions

5. **Memory Agent** (Knowledge Retention)
   - Project history storage
   - Pattern recognition
   - Context retrieval
   - Knowledge consolidation

6. **ML Pipeline Agent** (Predictive Analytics)
   - Cost forecasting
   - Budget variance prediction
   - Schedule risk scoring
   - Model training/deployment

7. **Graph DB Agent** (Relationship Mapping)
   - Entity relationship analysis
   - Dependency visualization
   - Impact analysis
   - Cross-project insights

### Human-in-the-Loop (HITL) Framework

**Decision Tiers**:
- **Low Risk** (Auto-execute): Confidence >= 0.95
- **Medium Risk** (Review): 0.80 <= Confidence < 0.95
- **High Risk** (Approval Required): Confidence < 0.80 OR High Impact

**HITL Workflow**:
1. AI agent produces recommendation + confidence score
2. Validation agent checks quality threshold
3. Route based on risk tier:
   - Low: Execute automatically, log audit trail
   - Medium: Queue for PM/Controller review
   - High: Require explicit approval with justification
4. Capture human feedback for model improvement

## API Design

### RESTful API Endpoints

```
/api/v1
  /auth
    POST   /login
    POST   /register
    POST   /refresh
    POST   /logout
  
  /projects
    GET    /
    POST   /
    GET    /:id
    PUT    /:id
    DELETE /:id
    GET    /:id/tasks
    GET    /:id/financials
    GET    /:id/metrics
  
  /tasks
    GET    /
    POST   /
    GET    /:id
    PUT    /:id
    DELETE /:id
  
  /financials
    /budgets
    /invoices
    /payments
    /expenses
  
  /collaboration
    /messages
    /notifications
    /documents
  
  /materials
    /inventory
    /suppliers
    /orders
  
  /scheduling
    /gantt
    /resources
    /critical-path
  
  /ai-agents
    /recommend
    /validate
    /predict
    /optimize
  
  /integrations
    /quickbooks
    /salesforce
    /procore
```

### WebSocket Endpoints

```
/ws
  /projects/:id/realtime     - Real-time project updates
  /notifications             - Push notifications
  /ai-agents/status          - Agent status updates
```

## Security Architecture

### Authentication & Authorization

1. **JWT-based Authentication**
   - Access tokens (15 min expiry)
   - Refresh tokens (7 day expiry)
   - Role-based access control (RBAC)

2. **Role Hierarchy**
   - Admin: Full system access
   - Project Manager: Project-level control
   - Superintendent: Field operations
   - Controller: Financial access
   - Subcontractor: Limited portal access
   - Client: Read-only portal

3. **Permission Model**
   - Resource-based permissions
   - Action-based (CRUD) controls
   - Project-level isolation

### Data Security

1. **Encryption**
   - TLS 1.3 for data in transit
   - AES-256 for sensitive data at rest
   - JWT signing with RS256

2. **API Security**
   - Rate limiting (100 req/min per user)
   - Request validation
   - SQL injection prevention
   - XSS protection

3. **Audit Logging**
   - All data mutations logged
   - HITL decisions recorded
   - AI agent actions tracked
   - Compliance trail maintained

## Frontend Architecture

### Technology Stack
- React 18+ with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Query for data fetching
- React Router for navigation
- Recharts/Chart.js for visualizations
- Socket.io-client for real-time updates

### Key Components

1. **Dashboard**
   - Real-time KPI widgets
   - Project health indicators
   - AI-powered insights
   - Alert notifications

2. **Project Management**
   - Gantt chart (react-gantt-chart)
   - Task kanban board
   - RFI/Submittal tracking
   - Document management

3. **Financial Tools**
   - Budget vs. actual charts
   - Invoice management
   - Payment processing
   - Cost forecasting

4. **Collaboration Hub**
   - Team messaging
   - Client portal
   - Subcontractor interface
   - Notification center

5. **Mobile Interface**
   - Progressive Web App (PWA)
   - Offline-first architecture
   - Field data capture
   - Photo/document upload

## Deployment Architecture

### Infrastructure Requirements

1. **Application Servers**
   - Node.js runtime (v18+)
   - PM2 for process management
   - Load balancer (nginx/HAProxy)

2. **Data Layer**
   - Redis cluster (3+ nodes)
   - Chroma server
   - File storage (S3-compatible)

3. **Monitoring**
   - Application metrics (Prometheus)
   - Log aggregation (ELK/Loki)
   - Distributed tracing (Jaeger)
   - Uptime monitoring

### Cloud Deployment Options

**AWS**:
- ECS/EKS for containers
- ElastiCache for Redis
- EC2 for Chroma
- S3 for file storage
- CloudFront for CDN

**GCP**:
- Cloud Run/GKE
- Memorystore for Redis
- Compute Engine for Chroma
- Cloud Storage
- Cloud CDN

**Azure**:
- Container Instances/AKS
- Azure Cache for Redis
- VMs for Chroma
- Blob Storage
- Azure CDN

### Scalability Considerations

1. **Horizontal Scaling**
   - Stateless backend services
   - Redis cluster mode
   - Load-balanced API gateway

2. **Caching Strategy**
   - Redis for frequently accessed data
   - CDN for static assets
   - API response caching

3. **Database Optimization**
   - Redis pipeline for bulk operations
   - Chroma batch processing
   - Connection pooling

## Performance Targets

- **API Response Time**: < 200ms (p95)
- **Real-time Updates**: < 100ms latency
- **Dashboard Load**: < 2s initial render
- **Mobile App**: < 3s first contentful paint
- **AI Agent Response**: < 5s for recommendations
- **Concurrent Users**: 1000+ simultaneous
- **Uptime**: 99.9% availability

## Development Workflow

1. **Local Development**
   - Docker Compose for services
   - Hot reload for frontend/backend
   - Redis & Chroma containers
   - Mock AI agent responses

2. **Testing Strategy**
   - Unit tests (Jest/Vitest)
   - Integration tests (Supertest)
   - E2E tests (Playwright)
   - Load testing (k6)

3. **CI/CD Pipeline**
   - GitHub Actions/GitLab CI
   - Automated testing
   - Docker image builds
   - Staging deployment
   - Production deployment

## Monitoring & Observability

### Metrics to Track

1. **System Metrics**
   - CPU/Memory usage
   - Redis memory/hit rate
   - API latency/throughput
   - Error rates

2. **Business Metrics**
   - Active projects
   - Payment cycle time
   - Budget variance
   - User engagement

3. **AI Agent Metrics**
   - Recommendation accuracy
   - HITL intervention rate
   - Model performance
   - Agent response time

### Alerting Rules

- API error rate > 1%
- Response time > 500ms (p95)
- Redis memory > 80%
- Critical AI agent failures
- Security incidents

## Conclusion

This architecture provides a scalable, secure, and AI-augmented platform for construction management. The Redis + Chroma data layer enables real-time operations and intelligent insights, while the modular service design ensures maintainability and extensibility.

The integration of 7 Noesis AI agents with HITL controls delivers automation with accountability, addressing the core pain points of mid-market construction businesses while maintaining human oversight for critical decisions.
