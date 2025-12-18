// Core Data Models

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  company: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  SUPERINTENDENT = 'superintendent',
  CONTROLLER = 'controller',
  SUBCONTRACTOR = 'subcontractor',
  CLIENT = 'client',
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  type: ProjectType;
  clientId: string;
  clientName: string;
  projectManager: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  actualCost: number;
  location: ProjectLocation;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  RENOVATION = 'renovation',
  NEW_CONSTRUCTION = 'new_construction',
}

export interface ProjectLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  dueDate: Date;
  startDate: Date;
  completedDate?: Date;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date;
  lineItems: InvoiceLineItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIAL_PAID = 'partial_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface Payment {
  id: string;
  invoiceId: string;
  projectId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidDate: Date;
  notes?: string;
  createdAt: Date;
}

export enum PaymentMethod {
  CHECK = 'check',
  WIRE_TRANSFER = 'wire_transfer',
  ACH = 'ach',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface Budget {
  id: string;
  projectId: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  percentageUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier: string;
  status: MaterialStatus;
  orderedDate?: Date;
  receivedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum MaterialStatus {
  PLANNED = 'planned',
  ORDERED = 'ordered',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  INSTALLED = 'installed',
}

export interface RFI {
  id: string;
  projectId: string;
  title: string;
  description: string;
  submittedBy: string;
  assignedTo: string;
  status: RFIStatus;
  priority: TaskPriority;
  submittedDate: Date;
  dueDate: Date;
  resolvedDate?: Date;
  response?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RFIStatus {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  ANSWERED = 'answered',
  CLOSED = 'closed',
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  category: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  version: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum DocumentType {
  PLAN = 'plan',
  PHOTO = 'photo',
  REPORT = 'report',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  RFI = 'rfi',
  SUBMITTAL = 'submittal',
  OTHER = 'other',
}

// AI Agent Types

export interface AgentRecommendation {
  agentType: AgentType;
  recommendation: any;
  confidence: number;
  reasoning: string;
  hitlRequired: boolean;
  metadata: Record<string, any>;
  timestamp: Date;
}

export enum AgentType {
  LANGGRAPH = 'langgraph',
  LANGSMITH = 'langsmith',
  VALIDATION = 'validation',
  MINIMAX = 'minimax',
  MEMORY = 'memory',
  ML_PIPELINE = 'ml_pipeline',
  GRAPH_DB = 'graph_db',
}

export interface HITLRequest {
  id: string;
  projectId: string;
  agentType: AgentType;
  recommendation: AgentRecommendation;
  status: HITLStatus;
  reviewerId?: string;
  reviewerNotes?: string;
  decision?: HITLDecision;
  createdAt: Date;
  reviewedAt?: Date;
}

export enum HITLStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
}

export enum HITLDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  MODIFY = 'modify',
}

// Metrics and Analytics

export interface ProjectMetrics {
  projectId: string;
  budgetVariance: number;
  scheduleVariance: number;
  completionPercentage: number;
  activeTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  invoicedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  averagePaymentCycle: number;
  updatedAt: Date;
}

export interface SystemMetrics {
  activeProjects: number;
  totalUsers: number;
  aiRecommendations24h: number;
  hitlPendingCount: number;
  averageApiLatency: number;
  redisHitRate: number;
  timestamp: Date;
}


// Payment types
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface Payment {
  id: string;
  projectId: string;
  invoiceId?: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  dueDate: Date;
  description?: string;
  lineItems: InvoiceLineItem[];
  clientEmail?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  agents: {
    total: number;
    active: number;
    metrics: Record<string, any>;
  };
  hitl: {
    pendingCount: number;
    avgResponseTime: number;
  };
  redis: {
    connected: boolean;
    latency?: number;
  };
  chroma: {
    connected: boolean;
    collections?: number;
  };
}
