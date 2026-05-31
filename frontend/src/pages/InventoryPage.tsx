
import React, { useState, useEffect } from 'react';
import { warehouseStockService, WarehouseStock } from '../services/warehouseStockService';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await warehouseStockService.getAll();
      setInventory(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-500">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Inventory Management</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Showing all warehouse stock items</p>
            <p className="text-xl font-semibold text-slate-900">{inventory.length} records</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Max Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-700">
              {inventory.map((item) => (
                <tr key={`${item.warehouseId}-${item.productId}`} className="hover:bg-slate-100/80 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.productName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.productSku || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.minimumStockLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.maximumStockLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.isOutOfStock ? 'bg-red-500/20 text-red-400' :
                      item.isLowStock ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.isOutOfStock ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'Good'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.warehouseName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.shelfLocation || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-8 text-slate-500">No inventory items found.</div>
        )}
      </div>
    </div>
  );
};




