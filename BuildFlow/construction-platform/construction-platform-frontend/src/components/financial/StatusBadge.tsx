import React from 'react';
import { InvoiceStatus, PurchaseOrderStatus } from '../../types/financial';

interface StatusBadgeProps {
  status: InvoiceStatus | PurchaseOrderStatus;
  type?: 'invoice' | 'po';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'invoice' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
    >
      {getStatusLabel()}
    </span>
  );
};
