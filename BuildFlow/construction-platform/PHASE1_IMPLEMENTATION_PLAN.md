# Phase 1: Core Business Engine - Implementation Plan

**Duration:** 8-10 weeks
**Priority:** CRITICAL
**Goal:** Build the foundational business features that make Build-flow immediately useful for construction companies

---

## Overview

Phase 1 focuses on three critical feature areas:
1. **Financial Management** - Invoicing, Payment Tracking, Purchase Orders
2. **Client Portal** - Basic progress view, document sharing, communication
3. **Scheduling** - Gantt chart view, milestone tracking, timeline management

These features represent the core business engine that contractors use daily to manage profitability, client relationships, and project timelines.

---

## 1. Financial Management Module

### 1.1. Backend Implementation

#### Data Models (TypeScript Interfaces)

```typescript
// Invoice
interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  paymentTerms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Purchase Order
interface PurchaseOrder {
  id: string;
  projectId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorContact?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress?: Address;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity?: number;
}

// Payment
interface Payment {
  id: string;
  projectId: string;
  invoiceId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'online';
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// Vendor
interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: Address;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### API Endpoints

**Invoices:**
```
POST   /api/v1/invoices                    # Create invoice
GET    /api/v1/invoices                    # List all invoices (with filters)
GET    /api/v1/invoices/:id                # Get invoice details
PUT    /api/v1/invoices/:id                # Update invoice
DELETE /api/v1/invoices/:id                # Delete invoice
POST   /api/v1/invoices/:id/send           # Send invoice to client
POST   /api/v1/invoices/:id/mark-paid      # Mark as paid
GET    /api/v1/projects/:projectId/invoices # Get project invoices
```

**Purchase Orders:**
```
POST   /api/v1/purchase-orders             # Create PO
GET    /api/v1/purchase-orders             # List all POs
GET    /api/v1/purchase-orders/:id         # Get PO details
PUT    /api/v1/purchase-orders/:id         # Update PO
DELETE /api/v1/purchase-orders/:id         # Delete PO
POST   /api/v1/purchase-orders/:id/send    # Send to vendor
POST   /api/v1/purchase-orders/:id/receive # Mark items received
GET    /api/v1/projects/:projectId/purchase-orders
```

**Payments:**
```
POST   /api/v1/payments                    # Record payment
GET    /api/v1/payments                    # List payments
GET    /api/v1/payments/:id                # Get payment details
DELETE /api/v1/payments/:id                # Delete payment
GET    /api/v1/projects/:projectId/payments
GET    /api/v1/invoices/:invoiceId/payments
```

**Vendors:**
```
POST   /api/v1/vendors                     # Create vendor
GET    /api/v1/vendors                     # List vendors
GET    /api/v1/vendors/:id                 # Get vendor details
PUT    /api/v1/vendors/:id                 # Update vendor
DELETE /api/v1/vendors/:id                 # Delete vendor
```

#### Service Layer Functions

```typescript
// invoice.service.ts
- createInvoice(data)
- getInvoices(filters)
- getInvoiceById(id)
- updateInvoice(id, data)
- deleteInvoice(id)
- sendInvoice(id)
- markInvoicePaid(id, paymentData)
- calculateInvoiceTotals(lineItems)
- generateInvoiceNumber()

// purchase-order.service.ts
- createPurchaseOrder(data)
- getPurchaseOrders(filters)
- getPurchaseOrderById(id)
- updatePurchaseOrder(id, data)
- deletePurchaseOrder(id)
- sendPurchaseOrder(id)
- receiveItems(id, receivedItems)
- generatePONumber()

// payment.service.ts
- recordPayment(data)
- getPayments(filters)
- getPaymentById(id)
- deletePayment(id)
- applyPaymentToInvoice(invoiceId, paymentData)

// vendor.service.ts
- createVendor(data)
- getVendors(filters)
- getVendorById(id)
- updateVendor(id, data)
- deleteVendor(id)
```

### 1.2. Frontend Implementation

#### Pages to Create

1. **Invoices List Page** (`/src/pages/Invoices.tsx`)
   - Table view of all invoices
   - Filters: status, date range, project, client
   - Search by invoice number or client name
   - Quick actions: Send, Mark Paid, View, Edit, Delete
   - Summary cards: Total Outstanding, Overdue, Paid This Month

2. **Invoice Detail/Create Page** (`/src/pages/InvoiceDetail.tsx`)
   - Invoice form with line items
   - Auto-calculate totals
   - Client selection
   - Project association
   - PDF preview/download
   - Send invoice action

3. **Purchase Orders List Page** (`/src/pages/PurchaseOrders.tsx`)
   - Table view of all POs
   - Filters: status, vendor, project
   - Quick actions: Send, Receive, View, Edit

4. **Purchase Order Detail/Create Page** (`/src/pages/PurchaseOrderDetail.tsx`)
   - PO form with line items
   - Vendor selection
   - Delivery tracking
   - Receive items interface

5. **Payments Page** (`/src/pages/Payments.tsx`)
   - Payment history table
   - Record payment modal
   - Link to invoices
   - Payment method breakdown

6. **Vendors Page** (`/src/pages/Vendors.tsx`)
   - Vendor directory
   - Add/Edit vendor modal
   - Vendor details with PO history

#### Components to Create

```
/src/components/financial/
  - InvoiceForm.tsx
  - InvoiceLineItems.tsx
  - PurchaseOrderForm.tsx
  - POLineItems.tsx
  - PaymentForm.tsx
  - VendorForm.tsx
  - FinancialSummaryCards.tsx
  - InvoicePDFPreview.tsx
```

---

## 2. Client Portal Module

### 2.1. Backend Implementation

#### Data Models

```typescript
// Client User (extends User)
interface ClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client';
  projectIds: string[]; // Projects they have access to
  createdAt: string;
}

// Project Update
interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'general' | 'milestone' | 'issue' | 'photo';
  photos?: string[]; // URLs to photos
  createdBy: string;
  createdAt: string;
  visibleToClient: boolean;
}

// Document
interface Document {
  id: string;
  projectId: string;
  name: string;
  type: string; // file extension
  size: number;
  url: string;
  category?: 'contract' | 'permit' | 'plan' | 'photo' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  visibleToClient: boolean;
}

// Client Message
interface ClientMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'project_manager' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: string;
  readAt?: string;
}
```

#### API Endpoints

**Client Authentication:**
```
POST   /api/v1/client-auth/register        # Client signup
POST   /api/v1/client-auth/login           # Client login
GET    /api/v1/client-auth/me              # Get client profile
```

**Client Portal:**
```
GET    /api/v1/client/projects             # Get client's projects
GET    /api/v1/client/projects/:id         # Get project details
GET    /api/v1/client/projects/:id/updates # Get project updates
GET    /api/v1/client/projects/:id/documents # Get project documents
GET    /api/v1/client/projects/:id/messages  # Get messages
POST   /api/v1/client/projects/:id/messages  # Send message
```

**Project Updates (Admin/PM):**
```
POST   /api/v1/projects/:id/updates        # Create update
GET    /api/v1/projects/:id/updates        # List updates
PUT    /api/v1/projects/:id/updates/:updateId # Edit update
DELETE /api/v1/projects/:id/updates/:updateId # Delete update
```

**Documents:**
```
POST   /api/v1/projects/:id/documents      # Upload document
GET    /api/v1/projects/:id/documents      # List documents
DELETE /api/v1/projects/:id/documents/:docId # Delete document
PUT    /api/v1/projects/:id/documents/:docId # Update visibility
```

**Messages:**
```
POST   /api/v1/projects/:id/messages       # Send message
GET    /api/v1/projects/:id/messages       # Get messages
PUT    /api/v1/projects/:id/messages/:msgId/read # Mark as read
```

### 2.2. Frontend Implementation

#### Client Portal Pages

1. **Client Dashboard** (`/src/pages/client/ClientDashboard.tsx`)
   - List of client's projects
   - Recent updates
   - Pending items (selections, approvals)
   - Quick links

2. **Client Project View** (`/src/pages/client/ClientProjectView.tsx`)
   - Project overview
   - Progress timeline
   - Budget summary (if enabled)
   - Recent photos
   - Upcoming milestones

3. **Client Updates Feed** (`/src/pages/client/ClientUpdates.tsx`)
   - Chronological feed of updates
   - Photo galleries
   - Milestone markers

4. **Client Documents** (`/src/pages/client/ClientDocuments.tsx`)
   - Document library
   - Download documents
   - View contracts, plans, permits

5. **Client Messages** (`/src/pages/client/ClientMessages.tsx`)
   - Message thread with project team
   - Send messages
   - Attach photos/files

#### Admin Pages for Client Management

1. **Project Updates Management** (`/src/pages/ProjectUpdates.tsx`)
   - Create/edit updates
   - Photo upload
   - Toggle client visibility

2. **Document Management** (`/src/pages/ProjectDocuments.tsx`)
   - Upload documents
   - Organize by category
   - Set client visibility

3. **Client Communication** (`/src/pages/ClientCommunication.tsx`)
   - Message inbox
   - Respond to client messages
   - Message history

---

## 3. Scheduling Module

### 3.1. Backend Implementation

#### Data Models

```typescript
// Task (enhanced from existing)
interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  duration: number; // in days
  progress: number; // 0-100
  assignedTo?: string[];
  dependencies: string[]; // IDs of tasks that must complete first
  milestone: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Milestone
interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'completed' | 'delayed';
  linkedTaskIds: string[];
  createdAt: string;
}
```

#### API Endpoints

**Tasks:**
```
POST   /api/v1/projects/:id/tasks          # Create task
GET    /api/v1/projects/:id/tasks          # List tasks
PUT    /api/v1/projects/:id/tasks/:taskId  # Update task
DELETE /api/v1/projects/:id/tasks/:taskId  # Delete task
POST   /api/v1/projects/:id/tasks/:taskId/progress # Update progress
GET    /api/v1/projects/:id/gantt          # Get Gantt chart data
```

**Milestones:**
```
POST   /api/v1/projects/:id/milestones     # Create milestone
GET    /api/v1/projects/:id/milestones     # List milestones
PUT    /api/v1/projects/:id/milestones/:milestoneId # Update
DELETE /api/v1/projects/:id/milestones/:milestoneId # Delete
```

#### Service Layer Functions

```typescript
// task.service.ts (enhanced)
- createTask(projectId, data)
- getTasks(projectId, filters)
- updateTask(taskId, data)
- deleteTask(taskId)
- updateTaskProgress(taskId, progress)
- getGanttData(projectId) // Format for Gantt chart
- calculateCriticalPath(projectId)
- validateDependencies(taskId, dependencies)

// milestone.service.ts
- createMilestone(projectId, data)
- getMilestones(projectId)
- updateMilestone(milestoneId, data)
- deleteMilestone(milestoneId)
- checkMilestoneStatus(milestoneId)
```

### 3.2. Frontend Implementation

#### Pages to Create

1. **Project Schedule Page** (`/src/pages/ProjectSchedule.tsx`)
   - Gantt chart view
   - Task list view toggle
   - Milestone markers
   - Critical path highlighting
   - Drag-and-drop task adjustment

2. **Task Board** (`/src/pages/TaskBoard.tsx`)
   - Kanban board view
   - Drag tasks between columns
   - Quick task creation
   - Filter by assignee, priority

3. **Milestones Page** (`/src/pages/Milestones.tsx`)
   - Timeline view of milestones
   - Create/edit milestones
   - Link tasks to milestones
   - Status tracking

#### Components to Create

```
/src/components/scheduling/
  - GanttChart.tsx (using a library like react-gantt-chart or frappe-gantt)
  - TaskList.tsx
  - TaskCard.tsx
  - TaskForm.tsx
  - MilestoneTimeline.tsx
  - MilestoneForm.tsx
  - DependencyGraph.tsx
  - CriticalPathView.tsx
```

---

## 4. Implementation Order

### Week 1-2: Financial Management Backend
- Set up data models in Redis
- Implement invoice service and routes
- Implement purchase order service and routes
- Implement payment service and routes
- Implement vendor service and routes
- Test all endpoints with Postman/curl

### Week 3-4: Financial Management Frontend
- Build Invoices page
- Build Invoice detail/create page
- Build Purchase Orders page
- Build PO detail/create page
- Build Payments page
- Build Vendors page
- Integrate with backend APIs

### Week 5-6: Client Portal Backend
- Set up client user model
- Implement client authentication
- Implement project updates service
- Implement document service
- Implement messaging service
- Test client portal APIs

### Week 7: Client Portal Frontend
- Build client-facing pages
- Build admin pages for client management
- Implement real-time messaging (optional: WebSocket)
- Test client portal flow

### Week 8-9: Scheduling Backend & Frontend
- Enhance task model with dependencies
- Implement milestone service
- Build Gantt chart component
- Build task board
- Build milestone timeline
- Integrate with backend

### Week 10: Testing, Polish, Documentation
- End-to-end testing
- Bug fixes
- UI/UX polish
- Update documentation
- Prepare demo

---

## 5. Technical Considerations

### 5.1. File Upload/Storage
For documents and photos, we'll need to implement file storage:
- **Option 1:** Store files in `/backend/uploads/` directory (simple, not scalable)
- **Option 2:** Use S3-compatible storage (AWS S3, MinIO, etc.) - RECOMMENDED
- Implement file upload middleware
- Generate secure URLs for client access

### 5.2. PDF Generation
For invoices and purchase orders:
- Use `pdfkit` or `puppeteer` for PDF generation
- Create HTML templates for invoices/POs
- Generate PDFs on-demand or cache them

### 5.3. Gantt Chart Library
Recommended libraries:
- `frappe-gantt` - Lightweight, simple
- `react-gantt-chart` - More features
- `dhtmlx-gantt` - Enterprise-grade (paid)

### 5.4. Real-time Features
For client messaging:
- Implement WebSocket support using `ws` library
- Add real-time message delivery
- Show online/offline status

### 5.5. AI Integration Points
Leverage existing AI agents:
- **Invoice validation:** Use Validation Agent to check for errors
- **Cost forecasting:** Use ML Pipeline Agent to predict invoice totals
- **Schedule optimization:** Use Minimax Agent to suggest optimal task ordering
- **Document classification:** Use Memory Agent to auto-categorize documents

---

## 6. Success Criteria

Phase 1 will be considered complete when:
- ✅ Users can create, send, and track invoices
- ✅ Users can create and manage purchase orders
- ✅ Users can record and track payments
- ✅ Users can manage vendor database
- ✅ Clients can log in and view their project
- ✅ Clients can see project updates and photos
- ✅ Clients can download documents
- ✅ Clients can message the project team
- ✅ Users can create tasks with dependencies
- ✅ Users can view project schedule in Gantt chart
- ✅ Users can track milestones
- ✅ All features are tested and documented

---

## 7. Next Steps

After completing this plan review, we will:
1. Set up the backend data models and services
2. Implement API routes
3. Build frontend components
4. Test and iterate
5. Deploy Phase 1 features

Let's begin implementation!
