import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { inventoryService, InventoryItem, UpdateStockRequest } from '../../services/inventoryService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { productService, Product } from '../../services/productService';
import { warehouseStockService, LowStockAlert, WarehouseStock } from '../../services/warehouseStockService';
import { Package, AlertTriangle, TrendingUp, Edit2, Eye, ShoppingCart, RefreshCw, Search, Filter, X, CheckCircle, Clock, Truck } from 'lucide-react';

interface UserPermissions {
  canViewInventory: boolean;
  canEditStock: boolean;
  canReorderProducts: boolean;
  canViewOrders: boolean;
  canManageWarehouse: boolean;
  canViewReports: boolean;
  canManageStaff: boolean;
}

export function WarehouseStaffDashboard() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Permission states
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    canViewInventory: true,
    canEditStock: false,
    canReorderProducts: false,
    canViewOrders: true,
    canManageWarehouse: false,
    canViewReports: false,
    canManageStaff: false
  });

  const [userRole, setUserRole] = useState<string>('');

  // Modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WarehouseStock | null>(null);
  const [updateForm, setUpdateForm] = useState({
    quantity: 0,
    type: 'IN' as 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUST',
    notes: ''
  });

  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedReorderItem, setSelectedReorderItem] = useState<LowStockAlert | null>(null);
  const [reorderQuantity, setReorderQuantity] = useState(0);
  const [reorderNotes, setReorderNotes] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValue: 0
  });

  // Merr permissions nga localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const roles = userData.roles || [];
      setUserRole(roles[0] || 'Staff');

      // Merr permissions për këtë përdorues
      const permissionsKey = `user_permissions_${userData.id}`;
      const savedPermissions = localStorage.getItem(permissionsKey);
      if (savedPermissions) {
        setUserPermissions(JSON.parse(savedPermissions));
      } else {
        // Permissions default bazuar në rol
        if (roles.includes('Admin')) {
          setUserPermissions({
            canViewInventory: true,
            canEditStock: true,
            canReorderProducts: true,
            canViewOrders: true,
            canManageWarehouse: true,
            canViewReports: true,
            canManageStaff: true
          });
        } else if (roles.includes('Manager')) {
          setUserPermissions({
            canViewInventory: true,
            canEditStock: true,
            canReorderProducts: true,
            canViewOrders: true,
            canManageWarehouse: true,
            canViewReports: true,
            canManageStaff: false
          });
        } else if (roles.includes('WarehouseStaff')) {
          setUserPermissions({
            canViewInventory: true,
            canEditStock: true,
            canReorderProducts: false,
            canViewOrders: true,
            canManageWarehouse: false,
            canViewReports: false,
            canManageStaff: false
          });
        } else if (roles.includes('Driver')) {
          setUserPermissions({
            canViewInventory: false,
            canEditStock: false,
            canReorderProducts: false,
            canViewOrders: true,
            canManageWarehouse: false,
            canViewReports: false,
            canManageStaff: false
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [warehousesData, productsData, stocksData, alertsData] = await Promise.all([
        warehouseService.getAll(),
        productService.getAll(),
        selectedWarehouse ? warehouseStockService.getByWarehouse(selectedWarehouse) : warehouseStockService.getAll(),
        warehouseStockService.getLowStockAlerts(selectedWarehouse || undefined)
      ]);

      setWarehouses(warehousesData);
      setProducts(productsData);
      setInventory(stocksData);
      setLowStockAlerts(alertsData);

      // Llogarit statistikat
      const totalValue = stocksData.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.productId);
        return sum + (item.quantity * (product?.price || 0));
      }, 0);

      setStats({
        totalProducts: stocksData.length,
        totalStock: stocksData.reduce((sum, item) => sum + item.quantity, 0),
        lowStockCount: stocksData.filter(item => item.isLowStock).length,
        outOfStockCount: stocksData.filter(item => item.isOutOfStock).length,
        totalValue: totalValue
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    // Permission check
    if (!userPermissions.canEditStock) {
      alert('You do not have permission to edit stock');
      return;
    }

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
      alert('Stock updated successfully!');
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleReorderStock = async () => {
    if (!selectedReorderItem) return;

    // Permission check
    if (!userPermissions.canReorderProducts) {
      alert('You do not have permission to reorder products');
      return;
    }

    try {
      // Këtu mund të krijohet një porosi për furnitor
      alert(`Reorder request sent for ${selectedReorderItem.productName}: ${reorderQuantity} units`);
      setShowReorderModal(false);
      setSelectedReorderItem(null);
      setReorderQuantity(0);
      setReorderNotes('');
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert('Failed to reorder');
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Product ${productId}`;
  };

  const getProductPrice = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.price || 0;
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Warehouse ${warehouseId}`;
  };

  const getStockStatus = (quantity: number, minimumStockLevel: number) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle };
    if (quantity <= minimumStockLevel) return { text: 'Low Stock', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertTriangle };
    return { text: 'In Stock', color: 'bg-green-500/20 text-green-400', icon: CheckCircle };
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
        getProductName(item.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = !showLowStockOnly || item.isLowStock;
    return matchesSearch && matchesLowStock;
  });

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading warehouse dashboard...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Warehouse Staff Dashboard</h1>
            <p className="text-slate-400 mt-1">
              {userRole === 'WarehouseStaff' ? 'Manage inventory and stock levels' :
                  userRole === 'Driver' ? 'Track and manage deliveries' :
                      'Warehouse operations dashboard'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>
            <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                    showLowStockOnly ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock Only
            </button>
            <button
                onClick={loadData}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Products</p>
                <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Stock</p>
                <p className="text-2xl font-bold text-white">{stats.totalStock}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.lowStockCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Value</p>
                <p className="text-2xl font-bold text-white">${stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-4">
          <label className="text-slate-400 text-sm">Filter by Warehouse:</label>
          <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
            ))}
          </select>
        </div>

        {/* Inventory Table */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left py-4 px-6 text-slate-400 font-medium">Product</th>
                <th className="text-left py-4 px-6 text-slate-400 font-medium">SKU</th>
                <th className="text-left py-4 px-6 text-slate-400 font-medium">Warehouse</th>
                <th className="text-right py-4 px-6 text-slate-400 font-medium">Quantity</th>
                <th className="text-right py-4 px-6 text-slate-400 font-medium">Price</th>
                <th className="text-center py-4 px-6 text-slate-400 font-medium">Status</th>
                <th className="text-center py-4 px-6 text-slate-400 font-medium">Actions</th>
              </tr>
              </thead>
              <tbody>
              {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No inventory items found
                    </td>
                  </tr>
              ) : (
                  filteredInventory.map((item) => {
                    const status = getStockStatus(item.quantity, item.minimumStockLevel);
                    const StatusIcon = status.icon;

                    return (
                        <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition">
                          <td className="py-4 px-6 text-white font-medium">
                            {getProductName(item.productId)}
                          </td>
                          <td className="py-4 px-6 text-slate-300">
                            {item.productSku || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-slate-300">
                            {getWarehouseName(item.warehouseId)}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-white">
                            {item.quantity}
                          </td>
                          <td className="py-4 px-6 text-right text-cyan-400">
                            ${getProductPrice(item.productId).toFixed(2)}
                          </td>
                          <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.text}
                        </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Stock - vetëm nëse ka permission */}
                              {userPermissions.canEditStock && (
                                  <button
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setUpdateForm({
                                          quantity: item.quantity,
                                          type: 'IN',
                                          notes: ''
                                        });
                                        setShowUpdateModal(true);
                                      }}
                                      className="p-2 hover:bg-cyan-500/20 rounded-lg transition text-cyan-400"
                                      title="Edit Stock"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                              )}

                              {/* View Details - gjithmonë në dispozicion */}
                              <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    // Shfaq detajet në një modal ose alert
                                    alert(`Product: ${getProductName(item.productId)}\nWarehouse: ${getWarehouseName(item.warehouseId)}\nQuantity: ${item.quantity}\nMin Level: ${item.minimumStockLevel}\nMax Level: ${item.maximumStockLevel}`);
                                  }}
                                  className="p-2 hover:bg-blue-500/20 rounded-lg transition text-blue-400"
                                  title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Reorder - vetëm nëse ka permission dhe stock është i ulët */}
                              {userPermissions.canReorderProducts && item.isLowStock && (
                                  <button
                                      onClick={() => {
                                        setSelectedReorderItem({
                                          warehouseId: item.warehouseId,
                                          warehouseName: getWarehouseName(item.warehouseId),
                                          productId: item.productId,
                                          productName: getProductName(item.productId),
                                          productSku: item.productSku || 'N/A',
                                          currentQuantity: item.quantity,
                                          minimumLevel: item.minimumStockLevel,
                                          deficit: item.minimumStockLevel - item.quantity
                                        });
                                        setReorderQuantity(item.minimumStockLevel - item.quantity);
                                        setShowReorderModal(true);
                                      }}
                                      className="p-2 hover:bg-yellow-500/20 rounded-lg transition text-yellow-400"
                                      title="Reorder"
                                  >
                                    <ShoppingCart className="w-4 h-4" />
                                  </button>
                              )}
                            </div>
                          </td>
                        </tr>
                    );
                  })
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts Section */}
        {lowStockAlerts.length > 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Low Stock Alerts
                <span className="text-sm text-slate-400 ml-2">({lowStockAlerts.length} items)</span>
              </h2>
              <div className="space-y-3">
                {lowStockAlerts.map((alert) => (
                    <div key={`${alert.warehouseId}-${alert.productId}`} className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-semibold">{alert.productName}</h3>
                          <p className="text-slate-400 text-sm">SKU: {alert.productSku}</p>
                          <p className="text-slate-400 text-sm">Warehouse: {alert.warehouseName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 text-2xl font-bold">{alert.deficit}</p>
                          <p className="text-slate-400 text-xs">units needed</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${Math.min((alert.currentQuantity / alert.minimumLevel) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">Current: {alert.currentQuantity}</span>
                        <span className="text-slate-400">Minimum: {alert.minimumLevel}</span>
                      </div>
                      {userPermissions.canReorderProducts && (
                          <button
                              onClick={() => {
                                setSelectedReorderItem(alert);
                                setReorderQuantity(alert.deficit);
                                setShowReorderModal(true);
                              }}
                              className="mt-3 w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition text-sm font-semibold"
                          >
                            Reorder Now
                          </button>
                      )}
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* Update Stock Modal */}
        {showUpdateModal && selectedItem && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Update Stock</h2>
                  <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-400 mb-4">
                  {getProductName(selectedItem.productId)} - {getWarehouseName(selectedItem.warehouseId)}
                </p>
                <p className="text-white text-2xl font-bold mb-4">Current: {selectedItem.quantity} units</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Transaction Type</label>
                    <select
                        value={updateForm.type}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="IN">Stock In (Receive)</option>
                      <option value="OUT">Stock Out (Ship)</option>
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
                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Notes</label>
                    <textarea
                        value={updateForm.notes}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                        rows={3}
                        placeholder="Add notes about this stock update..."
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
                    Update Stock
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Reorder Modal */}
        {showReorderModal && selectedReorderItem && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Reorder Product</h2>
                  <button onClick={() => setShowReorderModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-white font-semibold text-lg">{selectedReorderItem.productName}</p>
                <p className="text-slate-400 text-sm mb-2">SKU: {selectedReorderItem.productSku}</p>
                <p className="text-slate-400 text-sm">Warehouse: {selectedReorderItem.warehouseName}</p>

                <div className="bg-slate-700/30 rounded-xl p-4 my-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Current Stock:</span>
                    <span className="text-white">{selectedReorderItem.currentQuantity}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Minimum Level:</span>
                    <span className="text-white">{selectedReorderItem.minimumLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deficit:</span>
                    <span className="text-yellow-400 font-bold">{selectedReorderItem.deficit}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Reorder Quantity</label>
                    <input
                        type="number"
                        min={1}
                        value={reorderQuantity}
                        onChange={(e) => setReorderQuantity(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Notes</label>
                    <textarea
                        value={reorderNotes}
                        onChange={(e) => setReorderNotes(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                        rows={3}
                        placeholder="Add notes for the supplier..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                      onClick={() => setShowReorderModal(false)}
                      className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleReorderStock}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl transition"
                  >
                    Request Reorder
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}