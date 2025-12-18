import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import {
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  VendorFilters
} from '../models/financial.types';

export class VendorService {
  private readonly VENDOR_KEY_PREFIX = 'vendor:';
  private readonly VENDOR_LIST_KEY = 'vendors:all';

  /**
   * Create a new vendor
   */
  async createVendor(data: CreateVendorInput): Promise<Vendor> {
    const vendorId = uuidv4();
    const now = new Date().toISOString();

    const vendor: Vendor = {
      id: vendorId,
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      category: data.category,
      taxId: data.taxId,
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };

    // Store in Redis
    const redis = redisClient.getClient();
    await redis.set(
      `${this.VENDOR_KEY_PREFIX}${vendorId}`,
      JSON.stringify(vendor)
    );

    // Add to vendor list
    await redis.sAdd(this.VENDOR_LIST_KEY, vendorId);

    return vendor;
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(vendorId: string): Promise<Vendor | null> {
    const redis = redisClient.getClient();
    const data = await redis.get(`${this.VENDOR_KEY_PREFIX}${vendorId}`);
    if (!data) return null;
    return JSON.parse(data) as Vendor;
  }

  /**
   * Get all vendors with optional filters
   */
  async getVendors(filters?: VendorFilters): Promise<Vendor[]> {
    const redis = redisClient.getClient();
    const vendorIds = await redis.sMembers(this.VENDOR_LIST_KEY);

    // Fetch all vendors
    const vendors: Vendor[] = [];
    for (const id of vendorIds) {
      const vendor = await this.getVendorById(id);
      if (vendor) {
        vendors.push(vendor);
      }
    }

    // Apply filters
    let filtered = vendors;

    if (filters?.category) {
      filtered = filtered.filter(v => v.category === filters.category);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        v =>
          v.name.toLowerCase().includes(searchLower) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(searchLower)) ||
          (v.email && v.email.toLowerCase().includes(searchLower))
      );
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }

  /**
   * Update a vendor
   */
  async updateVendor(vendorId: string, data: UpdateVendorInput): Promise<Vendor | null> {
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) return null;

    const updatedVendor: Vendor = {
      ...vendor,
      name: data.name || vendor.name,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson : vendor.contactPerson,
      email: data.email !== undefined ? data.email : vendor.email,
      phone: data.phone !== undefined ? data.phone : vendor.phone,
      address: data.address !== undefined ? data.address : vendor.address,
      category: data.category !== undefined ? data.category : vendor.category,
      taxId: data.taxId !== undefined ? data.taxId : vendor.taxId,
      notes: data.notes !== undefined ? data.notes : vendor.notes,
      updatedAt: new Date().toISOString()
    };

    const redis = redisClient.getClient();
    await redis.set(
      `${this.VENDOR_KEY_PREFIX}${vendorId}`,
      JSON.stringify(updatedVendor)
    );

    return updatedVendor;
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(vendorId: string): Promise<boolean> {
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) return false;

    const redis = redisClient.getClient();
    await redis.del(`${this.VENDOR_KEY_PREFIX}${vendorId}`);
    await redis.sRem(this.VENDOR_LIST_KEY, vendorId);

    return true;
  }

  /**
   * Get vendor categories
   */
  async getVendorCategories(): Promise<string[]> {
    const vendors = await this.getVendors();
    const categories = new Set<string>();

    for (const vendor of vendors) {
      if (vendor.category) {
        categories.add(vendor.category);
      }
    }

    return Array.from(categories).sort();
  }
}

export const vendorService = new VendorService();
