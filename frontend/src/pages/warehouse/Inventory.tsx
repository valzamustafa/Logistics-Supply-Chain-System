import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, BarChart3, AlertCircle, Search } from 'lucide-react';
import { warehouseStockService, LowStockAlert, StockMovement, WarehouseStock } from '../../services/warehouseStockService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { supplierService, Supplier } from '../../services/supplierService';

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
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false);
  const [selectedSupplierOrderAlert, setSelectedSupplierOrderAlert] = useState<LowStockAlert | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [orderUnitPrice, setOrderUnitPrice] = useState('0');
  const [isEmergencyOrder, setIsEmergencyOrder] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesData, alerts, stocks, suppliersData] = await Promise.all([
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(selectedWarehouse || undefined),
        selectedWarehouse ? warehouseStockService.getByWarehouse(selectedWarehouse) : warehouseStockService.getAll(),
        supplierService.getAll(),
      ]);

      setWarehouses(warehousesData);
      setLowStockAlerts(alerts);
      setWarehouseStocks(stocks);
      setSuppliers(suppliersData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(`Failed to load warehouse inventory data: ${err.message || err}`);
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
    openSupplierOrderModal(alert);
  };

  const openSupplierOrderModal = (alert: LowStockAlert) => {
    setSelectedSupplierOrderAlert(alert);
    setOrderQuantity(Math.max(alert.deficit, 1).toString());
    setSelectedSupplierId(suppliers[0]?.id ?? 0);
    setOrderUnitPrice('0');
    setIsEmergencyOrder(false);
    setEmergencyReason('');
    setOrderError(null);
    setShowSupplierOrderModal(true);
  };


  const handleSupplierOrder = async () => {
    if (!selectedSupplierOrderAlert) return;
    const quantity = parseInt(orderQuantity, 10);
    const price = parseFloat(orderUnitPrice);

    if (!isEmergencyOrder && !selectedSupplierId) {
      setOrderError('Select a supplier or switch to emergency purchase');
      return;
    }

    if (!quantity || quantity <= 0) {
      setOrderError('Enter a valid quantity');
      return;
    }

    if (isNaN(price) || price < 0) {
      setOrderError('Enter a valid unit price');
      return;
    }

    try {
      setLoading(true);

      if (isEmergencyOrder || selectedSupplierId === 0) {
        await supplierService.createEmergencyPurchase({
          warehouseId: selectedSupplierOrderAlert.warehouseId,
          productName: selectedSupplierOrderAlert.productName,
          quantity,
          unitPrice: price,
          reason: emergencyReason || 'Emergency supplier request for unavailable product',
        });
      } else {
        await supplierService.createPurchaseOrder({
          supplierId: selectedSupplierId,
          warehouseId: selectedSupplierOrderAlert.warehouseId,
          items: [
            {
              productId: selectedSupplierOrderAlert.productId,
              quantity,
              unitPrice: price,
            },
          ],
          notes: `Reorder generated from warehouse inventory alert`,
        });
      }

      await fetchData();
      setShowSupplierOrderModal(false);
      setSelectedSupplierOrderAlert(null);
      setOrderQuantity('');
      setOrderUnitPrice('0');
      setSelectedSupplierId(0);
      setIsEmergencyOrder(false);
      setEmergencyReason('');
    } catch (err) {
      console.error('Failed to create supplier order:', err);
      setOrderError('Failed to create supplier order, please try again');
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openSupplierOrderModal(alert)}
                      className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg text-cyan-300 border border-cyan-500/20 transition"
                    >
                      Order from supplier
                    </button>
                    <button
                      onClick={() => openReorderModal(alert)}
                      className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg text-yellow-300 border border-yellow-500/20 transition"
                    >
                      Reorder from supplier
                    </button>
                  </div>
                </div>

            
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


      {showSupplierOrderModal && selectedSupplierOrderAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Order {selectedSupplierOrderAlert.productName} from Supplier</h2>
            <p className="text-slate-400 text-sm">
              Warehouse: {selectedSupplierOrderAlert.warehouseName} • Current: {selectedSupplierOrderAlert.currentQuantity} units
            </p>
            {orderError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-3 py-2 rounded">
                {orderError}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-300 text-sm flex-1">Supplier</label>
              <label className="flex items-center gap-2 text-slate-300 text-sm">
                <input
                  type="checkbox"
                  checked={isEmergencyOrder}
                  onChange={(e) => setIsEmergencyOrder(e.target.checked)}
                  className="accent-cyan-500"
                />
                Emergency purchase request
              </label>
            </div>
            {!isEmergencyOrder ? (
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white outline-none"
              >
                <option value={0}>Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm">
                Emergency purchase requests can be created when no supplier is available for the selected product.
              </div>
            )}
            <label className="text-slate-300 text-sm">Quantity</label>
            <input
              type="number"
              min={1}
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
            />
            <label className="text-slate-300 text-sm">Unit price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={orderUnitPrice}
              onChange={(e) => setOrderUnitPrice(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
            />
            {isEmergencyOrder && (
              <>
                <label className="text-slate-300 text-sm">Reason</label>
                <textarea
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                  rows={3}
                  placeholder="Describe why this order is an emergency"
                />
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSupplierOrderModal(false);
                  setSelectedSupplierOrderAlert(null);
                  setOrderQuantity('');
                  setOrderUnitPrice('0');
                  setOrderError(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSupplierOrder}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}