import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticateToken } from '../middleware/auth';
import { InvoiceLineItem } from '../models/types';
import Stripe from 'stripe';
import { config } from '../config';

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-11-20.acacia' as any,
});

// Create a payment intent
router.post('/create-payment-intent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency, projectId, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const result = await paymentService.createPaymentIntent(
      amount,
      currency || 'usd',
      projectId,
      description || 'Construction project payment',
      metadata || {}
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create an invoice
router.post('/invoices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      amount,
      currency,
      dueDate,
      lineItems,
      clientEmail,
      description,
    } = req.body;

    if (!projectId || !amount || !dueDate || !lineItems) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const invoice = await paymentService.createInvoice(
      projectId,
      amount,
      currency || 'usd',
      new Date(dueDate),
      lineItems as InvoiceLineItem[],
      clientEmail,
      description,
      (req as any).user?.id || 'system'
    );

    res.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/invoices/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await paymentService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project invoices
router.get('/projects/:projectId/invoices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const invoices = await paymentService.getProjectInvoices(projectId);

    res.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('Error fetching project invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project payments
router.get('/projects/:projectId/payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const payments = await paymentService.getProjectPayments(projectId);

    res.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('Error fetching project payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment by intent ID
router.get('/payments/:paymentIntentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    const payment = await paymentService.getPayment(paymentIntentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook endpoint (no authentication required)
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe signature' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );

    await paymentService.handlePaymentWebhook(event);

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

// Get Stripe publishable key
router.get('/config', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publishableKey: config.stripe.publishableKey,
    },
  });
});

export default router;
