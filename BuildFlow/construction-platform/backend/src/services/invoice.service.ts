import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import {
  Invoice,
  InvoiceLineItem,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilters,
  InvoiceStatus
} from '../models/financial.types';

export class InvoiceService {
  private readonly INVOICE_KEY_PREFIX = 'invoice:';
  private readonly INVOICE_LIST_KEY = 'invoices:all';
  private readonly PROJECT_INVOICES_PREFIX = 'project:invoices:';
  private readonly INVOICE_COUNTER_KEY = 'invoice:counter';

  /**
   * Generate a unique invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    const redis = redisClient.getClient();
    const counter = await redis.incr(this.INVOICE_COUNTER_KEY);
    const year = new Date().getFullYear();
    return `INV-${year}-${String(counter).padStart(5, '0')}`;
  }

  /**
   * Calculate line item total
   */
  private calculateLineItemTotal(quantity: number, unitPrice: number): number {
    return Math.round(quantity * unitPrice * 100) / 100;
  }

  /**
   * Calculate invoice totals
   */
  private calculateTotals(
    lineItems: InvoiceLineItem[],
    taxRate: number = 0
  ): { subtotal: number; tax: number; total: number } {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return { subtotal, tax, total };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(userId: string, data: CreateInvoiceInput): Promise<Invoice> {
    const invoiceId = uuidv4();
    const invoiceNumber = await this.generateInvoiceNumber();
    const now = new Date().toISOString();

    // Process line items
    const lineItems: InvoiceLineItem[] = data.lineItems.map(item => ({
      id: uuidv4(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: this.calculateLineItemTotal(item.quantity, item.unitPrice)
    }));

    // Calculate totals
    const { subtotal, tax, total } = this.calculateTotals(lineItems, data.taxRate || 0);

    const invoice: Invoice = {
      id: invoiceId,
      projectId: data.projectId,
      invoiceNumber,
      clientId: data.clientId,
      clientName: data.clientName,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      status: 'draft',
      lineItems,
      subtotal,
      tax,
      taxRate: data.taxRate,
      total,
      amountPaid: 0,
      amountDue: total,
      notes: data.notes,
      paymentTerms: data.paymentTerms,
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    };

    // Store in Redis
    const redis = redisClient.getClient();
    await redis.set(
      `${this.INVOICE_KEY_PREFIX}${invoiceId}`,
      JSON.stringify(invoice)
    );

    // Add to invoice list
    await redis.sAdd(this.INVOICE_LIST_KEY, invoiceId);

    // Add to project invoices
    await redis.sAdd(
      `${this.PROJECT_INVOICES_PREFIX}${data.projectId}`,
      invoiceId
    );

    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const redis = redisClient.getClient();
    const data = await redis.get(`${this.INVOICE_KEY_PREFIX}${invoiceId}`);
    if (!data) return null;
    return JSON.parse(data) as Invoice;
  }

  /**
   * Get all invoices with optional filters
   */
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const redis = redisClient.getClient();
    let invoiceIds: string[];

    if (filters?.projectId) {
      // Get invoices for specific project
      invoiceIds = await redis.sMembers(
        `${this.PROJECT_INVOICES_PREFIX}${filters.projectId}`
      );
    } else {
      // Get all invoices
      invoiceIds = await redis.sMembers(this.INVOICE_LIST_KEY);
    }

    // Fetch all invoices
    const invoices: Invoice[] = [];
    for (const id of invoiceIds) {
      const invoice = await this.getInvoiceById(id);
      if (invoice) {
        invoices.push(invoice);
      }
    }

    // Apply filters
    let filtered = invoices;

    if (filters?.status) {
      filtered = filtered.filter(inv => inv.status === filters.status);
    }

    if (filters?.clientId) {
      filtered = filtered.filter(inv => inv.clientId === filters.clientId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(inv => inv.issueDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(inv => inv.issueDate <= filters.endDate!);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        inv =>
          inv.invoiceNumber.toLowerCase().includes(searchLower) ||
          inv.clientName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by issue date (newest first)
    filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

    return filtered;
  }

  /**
   * Update an invoice
   */
  async updateInvoice(invoiceId: string, data: UpdateInvoiceInput): Promise<Invoice | null> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return null;

    const now = new Date().toISOString();

    // Update line items if provided
    let lineItems = invoice.lineItems;
    if (data.lineItems) {
      lineItems = data.lineItems.map(item => ({
        id: uuidv4(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: this.calculateLineItemTotal(item.quantity, item.unitPrice)
      }));
    }

    // Recalculate totals if line items or tax rate changed
    const taxRate = data.taxRate !== undefined ? data.taxRate : invoice.taxRate || 0;
    const { subtotal, tax, total } = this.calculateTotals(lineItems, taxRate);

    const updatedInvoice: Invoice = {
      ...invoice,
      issueDate: data.issueDate || invoice.issueDate,
      dueDate: data.dueDate || invoice.dueDate,
      lineItems,
      subtotal,
      tax,
      taxRate,
      total,
      amountDue: total - invoice.amountPaid,
      notes: data.notes !== undefined ? data.notes : invoice.notes,
      paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : invoice.paymentTerms,
      status: data.status || invoice.status,
      updatedAt: now
    };

    // Save to Redis
    const redis = redisClient.getClient();
    await redis.set(
      `${this.INVOICE_KEY_PREFIX}${invoiceId}`,
      JSON.stringify(updatedInvoice)
    );

    return updatedInvoice;
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return false;

    // Remove from Redis
    const redis = redisClient.getClient();
    await redis.del(`${this.INVOICE_KEY_PREFIX}${invoiceId}`);

    // Remove from lists
    await redis.sRem(this.INVOICE_LIST_KEY, invoiceId);
    await redis.sRem(
      `${this.PROJECT_INVOICES_PREFIX}${invoice.projectId}`,
      invoiceId
    );

    return true;
  }

  /**
   * Send invoice to client (change status to 'sent')
   */
  async sendInvoice(invoiceId: string): Promise<Invoice | null> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return null;

    return this.updateInvoice(invoiceId, { status: 'sent' });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(
    invoiceId: string,
    paymentAmount: number,
    paymentDate: string
  ): Promise<Invoice | null> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return null;

    const newAmountPaid = invoice.amountPaid + paymentAmount;
    const newAmountDue = invoice.total - newAmountPaid;

    const updatedInvoice: Invoice = {
      ...invoice,
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      status: newAmountDue <= 0 ? 'paid' : invoice.status,
      updatedAt: new Date().toISOString()
    };

    const redis = redisClient.getClient();
    await redis.set(
      `${this.INVOICE_KEY_PREFIX}${invoiceId}`,
      JSON.stringify(updatedInvoice)
    );

    return updatedInvoice;
  }

  /**
   * Update overdue invoices
   */
  async updateOverdueInvoices(): Promise<number> {
    const invoices = await this.getInvoices();
    const today = new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    for (const invoice of invoices) {
      if (
        (invoice.status === 'sent' || invoice.status === 'draft') &&
        invoice.dueDate < today &&
        invoice.amountDue > 0
      ) {
        await this.updateInvoice(invoice.id, { status: 'overdue' });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(projectId?: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    overdueAmount: number;
    byStatus: Record<InvoiceStatus, number>;
  }> {
    const invoices = await this.getInvoices(projectId ? { projectId } : undefined);

    const stats = {
      totalInvoices: invoices.length,
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      byStatus: {
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0
      } as Record<InvoiceStatus, number>
    };

    for (const invoice of invoices) {
      stats.totalAmount += invoice.total;
      stats.totalPaid += invoice.amountPaid;
      stats.totalOutstanding += invoice.amountDue;
      stats.byStatus[invoice.status]++;

      if (invoice.status === 'overdue') {
        stats.overdueAmount += invoice.amountDue;
      }
    }

    return stats;
  }
}

export const invoiceService = new InvoiceService();
