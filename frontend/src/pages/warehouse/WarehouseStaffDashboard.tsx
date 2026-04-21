import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { inventoryService, InventoryItem, UpdateStockRequest } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';

export function WarehouseStaffDashboard() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateForm, setUpdateForm] = useState({
    quantity: 0,
    type: 'IN' as 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUST',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryData, warehousesData, productsData] = await Promise.all([
        inventoryService.getAll(),
        warehouseService.getAll(),
        productService.getAll(),
      ]);
      setInventory(inventoryData);
      setWarehouses(warehousesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseInventory = async (warehouseId: number) => {
    try {
      const inventoryData = await inventoryService.getByWarehouse(warehouseId);
      setInventory(inventoryData);
      setSelectedWarehouse(warehouseId);
    } catch (error) {
      console.error('Failed to load warehouse inventory:', error);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    try {
      const updateData: UpdateStockRequest = {
        productId: selectedItem.productId,
        warehouseId: selectedItem.warehouseId,
        quantity: updateForm.quantity,
        type: updateForm.type,
        notes: updateForm.notes
      };

      await inventoryService.updateStock(updateData);
      await loadData();
      setShowUpdateModal(false);
      setSelectedItem(null);
      setUpdateForm({ quantity: 0, type: 'IN', notes: '' });
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const getStockStatus = (quantity: number, reorderLevel?: number | null) => {
    const level = reorderLevel ?? 10;
    if (quantity <= level * 0.5) return 'bg-red-500/20 text-red-400';
    if (quantity <= level) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Product ${productId}`;
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Warehouse ${warehouseId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading warehouse staff dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Warehouse Staff Dashboard</h1>
          <p className="text-slate-400">Manage inventory and stock levels.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={selectedWarehouse || ''}
          onChange={(e) => {
            const warehouseId = parseInt(e.target.value);
            if (warehouseId) {
              loadWarehouseInventory(warehouseId);
            } else {
              loadData();
            }
          }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((warehouse: any) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inventory.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{getProductName(item.productId)}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStockStatus(item.quantity, item.reorderLevel)}`}>
                {item.quantity <= (item.reorderLevel || 10) ? 'Low' : 'OK'}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-slate-400">Warehouse: {getWarehouseName(item.warehouseId)}</p>
              <p className="text-slate-400">Current Stock: {item.quantity}</p>
              <p className="text-slate-400">Available: {item.availableQuantity}</p>
              <p className="text-slate-400">Reorder Level: {item.reorderLevel || 10}</p>
            </div>
            <button
              onClick={() => {
                setSelectedItem(item);
                setShowUpdateModal(true);
              }}
              className="w-full bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-400 transition"
            >
              Update Stock
            </button>
          </div>
        ))}
      </div>

      {showUpdateModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Update Stock</h2>
            <p className="text-slate-400 mb-4">{getProductName(selectedItem.productId)} - {getWarehouseName(selectedItem.warehouseId)}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                <select
                  value={updateForm.type}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="RESERVE">Reserve</option>
                  <option value="RELEASE">Release</option>
                  <option value="ADJUST">Adjust</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Quantity</label>
                <input
                  type="number"
                  value={updateForm.quantity}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Notes</label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-400 transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}