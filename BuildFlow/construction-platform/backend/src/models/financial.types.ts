// Financial Management Type Definitions

export interface Address {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  taxRate?: number; // percentage
  total: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  paymentTerms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  projectId: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  lineItems: Omit<InvoiceLineItem, 'id'>[];
  taxRate?: number;
  notes?: string;
  paymentTerms?: string;
}

export interface UpdateInvoiceInput {
  issueDate?: string;
  dueDate?: string;
  lineItems?: Omit<InvoiceLineItem, 'id'>[];
  taxRate?: number;
  notes?: string;
  paymentTerms?: string;
  status?: InvoiceStatus;
}

// ============================================================================
// PURCHASE ORDER TYPES
// ============================================================================

export interface PurchaseOrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity?: number;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  projectId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorContact?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: PurchaseOrderStatus;
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  total: number;
  shippingAddress?: Address;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderInput {
  projectId: string;
  vendorId: string;
  vendorName: string;
  vendorContact?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  lineItems: Omit<PurchaseOrderLineItem, 'id'>[];
  taxRate?: number;
  shippingAddress?: Address;
  notes?: string;
}

export interface UpdatePurchaseOrderInput {
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  lineItems?: Omit<PurchaseOrderLineItem, 'id'>[];
  taxRate?: number;
  shippingAddress?: Address;
  notes?: string;
  status?: PurchaseOrderStatus;
}

export interface ReceiveItemsInput {
  items: Array<{
    lineItemId: string;
    receivedQuantity: number;
  }>;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'online';

export interface Payment {
  id: string;
  projectId: string;
  invoiceId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreatePaymentInput {
  projectId: string;
  invoiceId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

// ============================================================================
// VENDOR TYPES
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: Address;
  category?: string;
  taxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: Address;
  category?: string;
  taxId?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: Address;
  category?: string;
  taxId?: string;
  notes?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface InvoiceFilters {
  projectId?: string;
  status?: InvoiceStatus;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PurchaseOrderFilters {
  projectId?: string;
  status?: PurchaseOrderStatus;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaymentFilters {
  projectId?: string;
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
}

export interface VendorFilters {
  category?: string;
  search?: string;
}
