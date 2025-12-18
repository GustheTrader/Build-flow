import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Send, Trash2, Eye, Edit, Package } from 'lucide-react';
import { purchaseOrders as poAPI } from '../lib/api';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderStats } from '../types/financial';
import { StatusBadge } from '../components/financial/StatusBadge';

export const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');

  useEffect(() => {
    loadPurchaseOrders();
    loadStats();
  }, [statusFilter]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await poAPI.list(params);
      setPurchaseOrders(response.data || []);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await poAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSearch = () => {
    loadPurchaseOrders();
  };

  const handleSendPO = async (id: string) => {
    if (confirm('Send this purchase order to the vendor?')) {
      try {
        await poAPI.send(id);
        loadPurchaseOrders();
        loadStats();
      } catch (error) {
        console.error('Failed to send PO:', error);
        alert('Failed to send purchase order');
      }
    }
  };

  const handleDeletePO = async (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await poAPI.delete(id);
        loadPurchaseOrders();
        loadStats();
      } catch (error) {
        console.error('Failed to delete PO:', error);
        alert('Failed to delete purchase order');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage vendor purchase orders and deliveries</p>
        </div>
        <button
          onClick={() => navigate('/purchase-orders/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Purchase Order
        </button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600">Total POs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPOs}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(stats.byStatus.draft || 0) + (stats.byStatus.sent || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-600">Received</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.byStatus.received || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PO number or vendor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | 'all')}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading purchase orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No purchase orders found. Create your first PO to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">PO #</th>
                  <th className="text-left p-4 font-semibold">Vendor</th>
                  <th className="text-left p-4 font-semibold">Order Date</th>
                  <th className="text-left p-4 font-semibold">Expected Delivery</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {po.poNumber}
                      </button>
                    </td>
                    <td className="p-4">{po.vendorName}</td>
                    <td className="p-4 text-gray-600">{formatDate(po.orderDate)}</td>
                    <td className="p-4 text-gray-600">
                      {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {formatCurrency(po.total)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={po.status} type="po" />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleSendPO(po.id)}
                            className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                            title="Send"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(po.status === 'sent' || po.status === 'approved') && (
                          <button
                            onClick={() => navigate(`/purchase-orders/${po.id}/receive`)}
                            className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                            title="Receive Items"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePO(po.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
