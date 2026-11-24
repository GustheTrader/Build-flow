import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { redisClient } from '../config/redis';
import { 
  Payment, 
  Invoice, 
  PaymentStatus, 
  InvoiceStatus, 
  InvoiceLineItem 
} from '../models/types';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-11-20.acacia' as any,
});

export class PaymentService {
  // Create a payment intent for invoices or milestones
  async createPaymentIntent(
    amount: number,
    currency: string,
    projectId: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        metadata: {
          projectId,
          ...metadata,
        },
      });

      // Store payment intent info in Redis
      const paymentKey = `payment:${paymentIntent.id}`;
      await redisClient.hSet(paymentKey, {
        id: paymentIntent.id,
        projectId,
        amount: amount.toString(),
        currency,
        status: PaymentStatus.PENDING,
        description,
        metadata: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
      });
      await redisClient.expire(paymentKey, 86400); // 24 hours

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Create an invoice for a project
  async createInvoice(
    projectId: string,
    amount: number,
    currency: string,
    dueDate: Date,
    lineItems: InvoiceLineItem[],
    clientEmail?: string,
    description?: string,
    createdBy?: string
  ): Promise<Invoice> {
    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const invoice: Invoice = {
      id: invoiceId,
      projectId,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
      amount,
      currency,
      dueDate,
      description,
      lineItems,
      clientEmail,
      createdBy: createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in Redis
    const invoiceKey = `invoice:${invoiceId}`;
    await redisClient.hSet(invoiceKey, {
      id: invoiceId,
      projectId,
      invoiceNumber,
      status: invoice.status,
      amount: amount.toString(),
      currency,
      dueDate: dueDate.toISOString(),
      description: description || '',
      lineItems: JSON.stringify(lineItems),
      clientEmail: clientEmail || '',
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    });

    // Add to project's invoice list
    const projectInvoicesKey = `project:${projectId}:invoices`;
    await redisClient.sAdd(projectInvoicesKey, invoiceId);

    return invoice;
  }

  // Get invoice by ID
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const invoiceKey = `invoice:${invoiceId}`;
    const invoiceData = await redisClient.hGetAll(invoiceKey);

    if (!invoiceData || Object.keys(invoiceData).length === 0) {
      return null;
    }

    return {
      id: invoiceData.id,
      projectId: invoiceData.projectId,
      invoiceNumber: invoiceData.invoiceNumber,
      status: invoiceData.status as InvoiceStatus,
      amount: parseFloat(invoiceData.amount),
      currency: invoiceData.currency,
      dueDate: new Date(invoiceData.dueDate),
      description: invoiceData.description || undefined,
      lineItems: JSON.parse(invoiceData.lineItems || '[]'),
      clientEmail: invoiceData.clientEmail || undefined,
      createdBy: invoiceData.createdBy,
      createdAt: new Date(invoiceData.createdAt),
      updatedAt: new Date(invoiceData.updatedAt),
      paidAt: invoiceData.paidAt ? new Date(invoiceData.paidAt) : undefined,
    };
  }

  // Get all invoices for a project
  async getProjectInvoices(projectId: string): Promise<Invoice[]> {
    const projectInvoicesKey = `project:${projectId}:invoices`;
    const invoiceIds = await redisClient.sMembers(projectInvoicesKey);

    const invoices = await Promise.all(
      invoiceIds.map(id => this.getInvoice(id))
    );

    return invoices.filter(inv => inv !== null) as Invoice[];
  }

  // Update invoice status
  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
    paidAt?: Date
  ): Promise<void> {
    const invoiceKey = `invoice:${invoiceId}`;
    const updates: Record<string, string> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (paidAt) {
      updates.paidAt = paidAt.toISOString();
    }

    await redisClient.hSet(invoiceKey, updates);
  }

  // Process payment webhook from Stripe
  async handlePaymentWebhook(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const paymentKey = `payment:${paymentIntent.id}`;
    const paymentData = await redisClient.hGetAll(paymentKey);

    if (!paymentData || Object.keys(paymentData).length === 0) {
      console.warn('Payment not found in Redis:', paymentIntent.id);
      return;
    }

    let newStatus: PaymentStatus;

    switch (event.type) {
      case 'payment_intent.succeeded':
        newStatus = PaymentStatus.COMPLETED;

        // Update invoice if linked
        const metadata = JSON.parse(paymentData.metadata || '{}');
        if (metadata.invoiceId) {
          await this.updateInvoiceStatus(
            metadata.invoiceId,
            InvoiceStatus.PAID,
            new Date()
          );
        }
        break;

      case 'payment_intent.processing':
        newStatus = PaymentStatus.PROCESSING;
        break;

      case 'payment_intent.payment_failed':
        newStatus = PaymentStatus.FAILED;
        break;

      case 'payment_intent.canceled':
        newStatus = PaymentStatus.CANCELLED;
        break;

      default:
        return;
    }

    // Update payment status
    await redisClient.hSet(paymentKey, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  // Get payment by intent ID
  async getPayment(paymentIntentId: string): Promise<Payment | null> {
    const paymentKey = `payment:${paymentIntentId}`;
    const paymentData = await redisClient.hGetAll(paymentKey);

    if (!paymentData || Object.keys(paymentData).length === 0) {
      return null;
    }

    const metadata = JSON.parse(paymentData.metadata || '{}');

    return {
      id: paymentData.id,
      projectId: paymentData.projectId,
      invoiceId: metadata.invoiceId,
      stripePaymentIntentId: paymentData.id,
      amount: parseFloat(paymentData.amount),
      currency: paymentData.currency,
      status: paymentData.status as PaymentStatus,
      description: paymentData.description || undefined,
      metadata,
      createdAt: new Date(paymentData.createdAt),
      updatedAt: new Date(paymentData.updatedAt || paymentData.createdAt),
    };
  }

  // Get project payments
  async getProjectPayments(projectId: string): Promise<Payment[]> {
    const pattern = `payment:*`;
    const keys = await redisClient.keys(pattern);

    const payments: Payment[] = [];

    for (const key of keys) {
      const paymentData = await redisClient.hGetAll(key);
      if (paymentData.projectId === projectId) {
        const metadata = JSON.parse(paymentData.metadata || '{}');
        payments.push({
          id: paymentData.id,
          projectId: paymentData.projectId,
          invoiceId: metadata.invoiceId,
          stripePaymentIntentId: paymentData.id,
          amount: parseFloat(paymentData.amount),
          currency: paymentData.currency,
          status: paymentData.status as PaymentStatus,
          description: paymentData.description || undefined,
          metadata,
          createdAt: new Date(paymentData.createdAt),
          updatedAt: new Date(paymentData.updatedAt || paymentData.createdAt),
        });
      }
    }

    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const paymentService = new PaymentService();
