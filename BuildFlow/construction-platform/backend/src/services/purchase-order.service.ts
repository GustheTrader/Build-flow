import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import {
  PurchaseOrder,
  PurchaseOrderLineItem,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderFilters,
  ReceiveItemsInput
} from '../models/financial.types';

export class PurchaseOrderService {
  private readonly PO_KEY_PREFIX = 'purchase_order:';
  private readonly PO_LIST_KEY = 'purchase_orders:all';
  private readonly PROJECT_POS_PREFIX = 'project:purchase_orders:';
  private readonly VENDOR_POS_PREFIX = 'vendor:purchase_orders:';
  private readonly PO_COUNTER_KEY = 'purchase_order:counter';

  /**
   * Generate a unique PO number
   */
  async generatePONumber(): Promise<string> {
    const redis = redisClient.getClient();
    const counter = await redis.incr(this.PO_COUNTER_KEY);
    const year = new Date().getFullYear();
    return `PO-${year}-${String(counter).padStart(5, '0')}`;
  }

  /**
   * Calculate line item total
   */
  private calculateLineItemTotal(quantity: number, unitPrice: number): number {
    return Math.round(quantity * unitPrice * 100) / 100;
  }

  /**
   * Calculate PO totals
   */
  private calculateTotals(
    lineItems: PurchaseOrderLineItem[],
    taxRate: number = 0
  ): { subtotal: number; tax: number; total: number } {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return { subtotal, tax, total };
  }

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(
    userId: string,
    data: CreatePurchaseOrderInput
  ): Promise<PurchaseOrder> {
    const poId = uuidv4();
    const poNumber = await this.generatePONumber();
    const now = new Date().toISOString();

    // Process line items
    const lineItems: PurchaseOrderLineItem[] = data.lineItems.map(item => ({
      id: uuidv4(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: this.calculateLineItemTotal(item.quantity, item.unitPrice),
      receivedQuantity: 0
    }));

    // Calculate totals
    const { subtotal, tax, total } = this.calculateTotals(lineItems, data.taxRate || 0);

    const purchaseOrder: PurchaseOrder = {
      id: poId,
      projectId: data.projectId,
      poNumber,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      vendorContact: data.vendorContact,
      orderDate: data.orderDate,
      expectedDeliveryDate: data.expectedDeliveryDate,
      status: 'draft',
      lineItems,
      subtotal,
      tax,
      taxRate: data.taxRate,
      total,
      shippingAddress: data.shippingAddress,
      notes: data.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    };

    // Store in Redis
    const redis = redisClient.getClient();
    await redis.set(
      `${this.PO_KEY_PREFIX}${poId}`,
      JSON.stringify(purchaseOrder)
    );

    // Add to lists
    await redis.sAdd(this.PO_LIST_KEY, poId);
    await redis.sAdd(`${this.PROJECT_POS_PREFIX}${data.projectId}`, poId);
    await redis.sAdd(`${this.VENDOR_POS_PREFIX}${data.vendorId}`, poId);

    return purchaseOrder;
  }

  /**
   * Get purchase order by ID
   */
  async getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
    const redis = redisClient.getClient();
    const data = await redis.get(`${this.PO_KEY_PREFIX}${poId}`);
    if (!data) return null;
    return JSON.parse(data) as PurchaseOrder;
  }

  /**
   * Get all purchase orders with optional filters
   */
  async getPurchaseOrders(filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> {
    const redis = redisClient.getClient();
    let poIds: string[];

    if (filters?.projectId) {
      poIds = await redis.sMembers(`${this.PROJECT_POS_PREFIX}${filters.projectId}`);
    } else if (filters?.vendorId) {
      poIds = await redis.sMembers(`${this.VENDOR_POS_PREFIX}${filters.vendorId}`);
    } else {
      poIds = await redis.sMembers(this.PO_LIST_KEY);
    }

    // Fetch all POs
    const purchaseOrders: PurchaseOrder[] = [];
    for (const id of poIds) {
      const po = await this.getPurchaseOrderById(id);
      if (po) {
        purchaseOrders.push(po);
      }
    }

    // Apply filters
    let filtered = purchaseOrders;

    if (filters?.status) {
      filtered = filtered.filter(po => po.status === filters.status);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(po => po.orderDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(po => po.orderDate <= filters.endDate!);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        po =>
          po.poNumber.toLowerCase().includes(searchLower) ||
          po.vendorName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by order date (newest first)
    filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return filtered;
  }

  /**
   * Update a purchase order
   */
  async updatePurchaseOrder(
    poId: string,
    data: UpdatePurchaseOrderInput
  ): Promise<PurchaseOrder | null> {
    const po = await this.getPurchaseOrderById(poId);
    if (!po) return null;

    const now = new Date().toISOString();

    // Update line items if provided
    let lineItems = po.lineItems;
    if (data.lineItems) {
      lineItems = data.lineItems.map(item => ({
        id: uuidv4(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: this.calculateLineItemTotal(item.quantity, item.unitPrice),
        receivedQuantity: 0
      }));
    }

    // Recalculate totals if line items or tax rate changed
    const taxRate = data.taxRate !== undefined ? data.taxRate : po.taxRate || 0;
    const { subtotal, tax, total } = this.calculateTotals(lineItems, taxRate);

    const updatedPO: PurchaseOrder = {
      ...po,
      orderDate: data.orderDate || po.orderDate,
      expectedDeliveryDate: data.expectedDeliveryDate !== undefined 
        ? data.expectedDeliveryDate 
        : po.expectedDeliveryDate,
      actualDeliveryDate: data.actualDeliveryDate !== undefined
        ? data.actualDeliveryDate
        : po.actualDeliveryDate,
      lineItems,
      subtotal,
      tax,
      taxRate,
      total,
      shippingAddress: data.shippingAddress !== undefined 
        ? data.shippingAddress 
        : po.shippingAddress,
      notes: data.notes !== undefined ? data.notes : po.notes,
      status: data.status || po.status,
      updatedAt: now
    };

    const redis = redisClient.getClient();
    await redis.set(
      `${this.PO_KEY_PREFIX}${poId}`,
      JSON.stringify(updatedPO)
    );

    return updatedPO;
  }

  /**
   * Delete a purchase order
   */
  async deletePurchaseOrder(poId: string): Promise<boolean> {
    const po = await this.getPurchaseOrderById(poId);
    if (!po) return false;

    const redis = redisClient.getClient();
    await redis.del(`${this.PO_KEY_PREFIX}${poId}`);
    await redis.sRem(this.PO_LIST_KEY, poId);
    await redis.sRem(`${this.PROJECT_POS_PREFIX}${po.projectId}`, poId);
    await redis.sRem(`${this.VENDOR_POS_PREFIX}${po.vendorId}`, poId);

    return true;
  }

  /**
   * Send purchase order to vendor (change status to 'sent')
   */
  async sendPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
    return this.updatePurchaseOrder(poId, { status: 'sent' });
  }

  /**
   * Receive items from purchase order
   */
  async receiveItems(poId: string, data: ReceiveItemsInput): Promise<PurchaseOrder | null> {
    const po = await this.getPurchaseOrderById(poId);
    if (!po) return null;

    // Update received quantities
    const updatedLineItems = po.lineItems.map(item => {
      const receivedItem = data.items.find(i => i.lineItemId === item.id);
      if (receivedItem) {
        return {
          ...item,
          receivedQuantity: (item.receivedQuantity || 0) + receivedItem.receivedQuantity
        };
      }
      return item;
    });

    // Check if all items are fully received
    const allReceived = updatedLineItems.every(
      item => (item.receivedQuantity || 0) >= item.quantity
    );

    const updatedPO: PurchaseOrder = {
      ...po,
      lineItems: updatedLineItems,
      status: allReceived ? 'received' : 'approved',
      actualDeliveryDate: allReceived ? new Date().toISOString() : po.actualDeliveryDate,
      updatedAt: new Date().toISOString()
    };

    const redis = redisClient.getClient();
    await redis.set(
      `${this.PO_KEY_PREFIX}${poId}`,
      JSON.stringify(updatedPO)
    );

    return updatedPO;
  }

  /**
   * Get purchase order statistics
   */
  async getPurchaseOrderStats(projectId?: string): Promise<{
    totalPOs: number;
    totalAmount: number;
    byStatus: Record<string, number>;
  }> {
    const pos = await this.getPurchaseOrders(projectId ? { projectId } : undefined);

    const stats = {
      totalPOs: pos.length,
      totalAmount: 0,
      byStatus: {
        draft: 0,
        sent: 0,
        approved: 0,
        received: 0,
        cancelled: 0
      }
    };

    for (const po of pos) {
      stats.totalAmount += po.total;
      stats.byStatus[po.status]++;
    }

    return stats;
  }
}

export const purchaseOrderService = new PurchaseOrderService();
