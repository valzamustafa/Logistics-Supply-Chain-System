
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  warehouseId: number;
  warehouseName: string;
  lastUpdated: string;
}

export const InventoryPage: React.FC = () => {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      } else {
        setError('Failed to fetch inventory');
      }
    } catch (err) {
      setError('Error loading inventory');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Loading inventory...</div>
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
      <h1 className="text-2xl font-bold text-white mb-6">Inventory Management</h1>
      
      <div className="bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Product ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {item.productId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {item.productName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.quantity < 10 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                    item.quantity < 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {item.quantity} units
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {item.warehouseName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {new Date(item.lastUpdated).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventory.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No inventory items found.
          </div>
        )}
      </div>
    </div>
  );
};