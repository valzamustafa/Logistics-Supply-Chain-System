import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, BarChart3, AlertCircle, Search } from 'lucide-react';
import { warehouseStockService, LowStockAlert, StockMovement, WarehouseStock } from '../../services/warehouseStockService';
import { warehouseService, Warehouse } from '../../services/warehouseService';

export function WarehouseInventory() {
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(null);
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [reorderError, setReorderError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesData, alerts, stocks] = await Promise.all([
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(selectedWarehouse || undefined),
        selectedWarehouse ? warehouseStockService.getByWarehouse(selectedWarehouse) : warehouseStockService.getAll(),
      ]);

      setWarehouses(warehousesData);
      setLowStockAlerts(alerts);
      setWarehouseStocks(stocks);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load warehouse inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse]);

  const filteredAlerts = lowStockAlerts.filter((alert) =>
    alert.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocks = warehouseStocks.filter((stock) =>
    stock.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalAlerts = lowStockAlerts.filter(a => a.deficit > 50);
  const warningAlerts = lowStockAlerts.filter(a => a.deficit <= 50);

  const openReorderModal = (alert: LowStockAlert) => {
    setSelectedAlert(alert);
    setReorderQuantity(Math.max(alert.deficit, 1).toString());
    setReorderError(null);
    setShowReorderModal(true);
  };

  const handleReorder = async () => {
    if (!selectedAlert) return;
    const quantity = parseInt(reorderQuantity, 10);
    if (!quantity || quantity <= 0) {
      setReorderError('Enter a valid reorder quantity');
      return;
    }

    try {
      setLoading(true);
      await warehouseStockService.reorderStock(selectedAlert.warehouseId, selectedAlert.productId, quantity, 'Inventory reorder from warehouse alert');
      await fetchData();
      setShowReorderModal(false);
      setSelectedAlert(null);
      setReorderQuantity('');
    } catch (err) {
      console.error('Failed to reorder stock:', err);
      setReorderError('Failed to reorder stock, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Warehouse Inventory</h1>
          <p className="text-slate-400 mt-1">Monitor warehouse stock, low stock alerts, and reorder items by warehouse.</p>
        </div>
        <select
          value={selectedWarehouse || ''}
          onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{criticalAlerts.length}</h3>
            <p className="text-slate-400 text-sm">Critical Items</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{warningAlerts.length}</h3>
            <p className="text-slate-400 text-sm">Low Stock Items</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{lowStockAlerts.length}</h3>
            <p className="text-slate-400 text-sm">Total Alerts</p>
          </div>
        </div>
      </div>

      {/* Warehouse Stock Summary */}
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Warehouse Inventory Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No stock items found.</td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={`${stock.warehouseId}-${stock.productId}`} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 text-white">{stock.productName}</td>
                      <td className="px-4 py-3">{stock.productSku}</td>
                      <td className="px-4 py-3">{stock.quantity}</td>
                      <td className="px-4 py-3">{stock.warehouseName}</td>
                      <td className="px-4 py-3">
                        {stock.isOutOfStock ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Out of Stock</span>
                        ) : stock.isLowStock ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Low Stock</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Low Stock Alerts</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>

        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-6 text-center text-slate-400">
              No low stock alerts
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={`${alert.warehouseId}-${alert.productId}`}
                className={`rounded-lg p-4 border ${
                  alert.deficit > 50
                    ? 'bg-red-500/10 border-red-500/50'
                    : 'bg-yellow-500/10 border-yellow-500/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-medium">{alert.productName}</h3>
                      <span className="text-slate-400 text-sm">({alert.productSku})</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.deficit > 50
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {alert.deficit > 50 ? 'Critical' : 'Warning'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Warehouse</p>
                        <p className="text-white font-medium">{alert.warehouseName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Current Level</p>
                        <p className="text-white font-medium">{alert.currentQuantity} units</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Minimum Level</p>
                        <p className="text-white font-medium">{alert.minimumLevel} units</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-400">{alert.deficit}</div>
                    <div className="text-xs text-slate-400">units needed</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
                  <div className="text-slate-400 text-sm">Warehouse: {alert.warehouseName}</div>
                  <button
                    onClick={() => openReorderModal(alert)}
                    className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg text-yellow-300 border border-yellow-500/20 transition"
                  >
                    Reorder stock
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      alert.deficit > 50 ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min((alert.currentQuantity / alert.minimumLevel) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showReorderModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Reorder {selectedAlert.productName}</h2>
            <p className="text-slate-400 text-sm">
              Warehouse: {selectedAlert.warehouseName} • Current: {selectedAlert.currentQuantity} units
            </p>
            {reorderError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-3 py-2 rounded">
                {reorderError}
              </div>
            )}
            <label className="text-slate-300 text-sm">Quantity to reorder</label>
            <input
              type="number"
              min={1}
              value={reorderQuantity}
              onChange={(e) => setReorderQuantity(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowReorderModal(false);
                  setSelectedAlert(null);
                  setReorderQuantity('');
                  setReorderError(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReorder}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                Reorder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}