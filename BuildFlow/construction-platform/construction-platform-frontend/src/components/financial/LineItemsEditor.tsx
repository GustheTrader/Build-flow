import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  receivedQuantity?: number;
}

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  showReceived?: boolean;
  readOnly?: boolean;
}

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({
  items,
  onChange,
  showReceived = false,
  readOnly = false,
}) => {
  const addItem = () => {
    onChange([
      ...items,
      { description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const calculateTotal = (quantity: number, unitPrice: number) => {
    return (quantity * unitPrice).toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Line Items</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 font-semibold">Description</th>
              <th className="text-right p-3 font-semibold w-24">Quantity</th>
              <th className="text-right p-3 font-semibold w-32">Unit Price</th>
              <th className="text-right p-3 font-semibold w-32">Total</th>
              {showReceived && (
                <th className="text-right p-3 font-semibold w-24">Received</th>
              )}
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={showReceived ? 6 : 5}
                  className="text-center p-8 text-gray-500"
                >
                  No items added yet
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {readOnly ? (
                      <span>{item.description}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, 'description', e.target.value)
                        }
                        placeholder="Item description"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {readOnly ? (
                      <span className="block text-right">{item.quantity}</span>
                    ) : (
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {readOnly ? (
                      <span className="block text-right">
                        ${item.unitPrice.toFixed(2)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ${calculateTotal(item.quantity, item.unitPrice)}
                  </td>
                  {showReceived && (
                    <td className="p-3 text-right">
                      {item.receivedQuantity || 0} / {item.quantity}
                    </td>
                  )}
                  {!readOnly && (
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">
                $
                {items
                  .reduce(
                    (sum, item) => sum + item.quantity * item.unitPrice,
                    0
                  )
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
