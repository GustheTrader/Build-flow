import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { invoices as invoicesAPI, projects as projectsAPI } from '../lib/api';
import { Invoice, CreateInvoiceInput } from '../types/financial';
import { LineItemsEditor, LineItem } from '../components/financial/LineItemsEditor';
import { StatusBadge } from '../components/financial/StatusBadge';

export const InvoiceDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateInvoiceInput>({
    projectId: '',
    clientId: '',
    clientName: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lineItems: [],
    taxRate: 0,
    notes: '',
    paymentTerms: 'Net 30',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadProjects();
    if (!isNew && id) {
      loadInvoice(id);
    }
  }, [id, isNew]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.list();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await invoicesAPI.get(invoiceId);
      const invoiceData = response.data;
      setInvoice(invoiceData);
      setFormData({
        projectId: invoiceData.projectId,
        clientId: invoiceData.clientId,
        clientName: invoiceData.clientName,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        lineItems: invoiceData.lineItems,
        taxRate: invoiceData.taxRate || 0,
        notes: invoiceData.notes || '',
        paymentTerms: invoiceData.paymentTerms || '',
      });
      setLineItems(invoiceData.lineItems);
    } catch (error) {
      console.error('Failed to load invoice:', error);
      alert('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const tax = subtotal * ((formData.taxRate || 0) / 100);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const handleSave = async () => {
    if (!formData.clientName || lineItems.length === 0) {
      alert('Please fill in all required fields and add at least one line item');
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        lineItems: lineItems.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unitPrice,
        })),
      };

      if (isNew) {
        await invoicesAPI.create(data);
      } else {
        await invoicesAPI.update(id!, data);
      }

      navigate('/invoices');
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (isNew) {
      alert('Please save the invoice first');
      return;
    }

    if (confirm('Send this invoice to the client?')) {
      try {
        await invoicesAPI.send(id!);
        navigate('/invoices');
      } catch (error) {
        console.error('Failed to send invoice:', error);
        alert('Failed to send invoice');
      }
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center text-gray-500">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? 'New Invoice' : `Invoice ${invoice?.invoiceNumber}`}
            </h1>
            {invoice && (
              <div className="mt-2">
                <StatusBadge status={invoice.status} type="invoice" />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && invoice?.status === 'draft' && (
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Invoice
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => {
                const project = projects.find((p) => p.id === e.target.value);
                setFormData({
                  ...formData,
                  projectId: e.target.value,
                  clientId: project?.clientId || '',
                  clientName: project?.clientName || '',
                });
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Client name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Date *
            </label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={formData.taxRate || 0}
              onChange={(e) =>
                setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
              }
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.paymentTerms || ''}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Net 30"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="border-t pt-6">
          <LineItemsEditor items={lineItems} onChange={setLineItems} />
        </div>

        {/* Totals */}
        <div className="border-t pt-6">
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">
                  Tax ({formData.taxRate || 0}%):
                </span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold border-t pt-3">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Additional notes or terms..."
          />
        </div>
      </div>
    </div>
  );
};
