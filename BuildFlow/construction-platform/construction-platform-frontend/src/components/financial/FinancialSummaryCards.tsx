import React from 'react';
import { DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, subtitle }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface FinancialSummaryCardsProps {
  stats: {
    totalInvoices?: number;
    totalAmount?: number;
    totalPaid?: number;
    totalOutstanding?: number;
    overdueAmount?: number;
  };
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <SummaryCard
        title="Total Invoices"
        value={stats.totalInvoices || 0}
        icon={<FileText className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        color="#3B82F6"
      />
      <SummaryCard
        title="Total Amount"
        value={formatCurrency(stats.totalAmount)}
        icon={<DollarSign className="w-6 h-6" style={{ color: '#10B981' }} />}
        color="#10B981"
      />
      <SummaryCard
        title="Outstanding"
        value={formatCurrency(stats.totalOutstanding)}
        icon={<AlertCircle className="w-6 h-6" style={{ color: '#F59E0B' }} />}
        color="#F59E0B"
        subtitle={stats.overdueAmount ? `${formatCurrency(stats.overdueAmount)} overdue` : undefined}
      />
      <SummaryCard
        title="Paid"
        value={formatCurrency(stats.totalPaid)}
        icon={<CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />}
        color="#10B981"
      />
    </div>
  );
};
