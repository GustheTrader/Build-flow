// Moved out of src/models/types.ts: these redeclared Payment/Invoice and broke the build.

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

