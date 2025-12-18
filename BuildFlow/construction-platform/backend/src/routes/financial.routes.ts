import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { invoiceService } from '../services/invoice.service';
import { purchaseOrderService } from '../services/purchase-order.service';
import { vendorService } from '../services/vendor.service';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiveItemsInput,
  CreateVendorInput,
  UpdateVendorInput
} from '../models/financial.types';

const router = Router();

// ============================================================================
// INVOICE ROUTES
// ============================================================================

// Create invoice
router.post('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const data: CreateInvoiceInput = req.body;

    const invoice = await invoiceService.createInvoice(userId, data);

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all invoices
router.get('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const filters = {
      projectId: req.query.projectId as string,
      status: req.query.status as any,
      clientId: req.query.clientId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string
    };

    const invoices = await invoiceService.getInvoices(filters);

    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error: any) {
    console.error('Error getting invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get invoice by ID
router.get('/invoices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    console.error('Error getting invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update invoice
router.put('/invoices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const data: UpdateInvoiceInput = req.body;
    const invoice = await invoiceService.updateInvoice(req.params.id, data);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete invoice
router.delete('/invoices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const deleted = await invoiceService.deleteInvoice(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send invoice
router.post('/invoices/:id/send', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.sendInvoice(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get invoice statistics
router.get('/invoices/stats/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const stats = await invoiceService.getInvoiceStats(projectId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting invoice stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// PURCHASE ORDER ROUTES
// ============================================================================

// Create purchase order
router.post('/purchase-orders', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const data: CreatePurchaseOrderInput = req.body;

    const po = await purchaseOrderService.createPurchaseOrder(userId, data);

    res.status(201).json({
      success: true,
      data: po
    });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all purchase orders
router.get('/purchase-orders', authenticate, async (req: Request, res: Response) => {
  try {
    const filters = {
      projectId: req.query.projectId as string,
      status: req.query.status as any,
      vendorId: req.query.vendorId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string
    };

    const pos = await purchaseOrderService.getPurchaseOrders(filters);

    res.json({
      success: true,
      data: pos,
      count: pos.length
    });
  } catch (error: any) {
    console.error('Error getting purchase orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get purchase order by ID
router.get('/purchase-orders/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const po = await purchaseOrderService.getPurchaseOrderById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: po
    });
  } catch (error: any) {
    console.error('Error getting purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update purchase order
router.put('/purchase-orders/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const data: UpdatePurchaseOrderInput = req.body;
    const po = await purchaseOrderService.updatePurchaseOrder(req.params.id, data);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: po
    });
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete purchase order
router.delete('/purchase-orders/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const deleted = await purchaseOrderService.deletePurchaseOrder(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send purchase order
router.post('/purchase-orders/:id/send', authenticate, async (req: Request, res: Response) => {
  try {
    const po = await purchaseOrderService.sendPurchaseOrder(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: po,
      message: 'Purchase order sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Receive items
router.post('/purchase-orders/:id/receive', authenticate, async (req: Request, res: Response) => {
  try {
    const data: ReceiveItemsInput = req.body;
    const po = await purchaseOrderService.receiveItems(req.params.id, data);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: po,
      message: 'Items received successfully'
    });
  } catch (error: any) {
    console.error('Error receiving items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get purchase order statistics
router.get('/purchase-orders/stats/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const stats = await purchaseOrderService.getPurchaseOrderStats(projectId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting purchase order stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// VENDOR ROUTES
// ============================================================================

// Create vendor
router.post('/vendors', authenticate, async (req: Request, res: Response) => {
  try {
    const data: CreateVendorInput = req.body;
    const vendor = await vendorService.createVendor(data);

    res.status(201).json({
      success: true,
      data: vendor
    });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all vendors
router.get('/vendors', authenticate, async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string
    };

    const vendors = await vendorService.getVendors(filters);

    res.json({
      success: true,
      data: vendors,
      count: vendors.length
    });
  } catch (error: any) {
    console.error('Error getting vendors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get vendor by ID
router.get('/vendors/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (error: any) {
    console.error('Error getting vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update vendor
router.put('/vendors/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const data: UpdateVendorInput = req.body;
    const vendor = await vendorService.updateVendor(req.params.id, data);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete vendor
router.delete('/vendors/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const deleted = await vendorService.deleteVendor(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get vendor categories
router.get('/vendors/categories/list', authenticate, async (req: Request, res: Response) => {
  try {
    const categories = await vendorService.getVendorCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Error getting vendor categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
