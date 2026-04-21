import { useState, useEffect } from 'react';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { warehouseStockService } from '../../services/warehouseStockService';
import { inventoryService } from '../../services/inventoryService';

export function ManagerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    totalShipments: 0,
    activeShipments: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchInventoryByWarehouse(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, shipmentsData, warehousesData, inventoryData, lowStockAlerts] = await Promise.all([
        orderService.getAll(),
        shipmentService.getAll(),
        warehouseService.getAll(),
        inventoryService.getAll(),
        warehouseStockService.getLowStockAlerts(),
      ]);

      setOrders(ordersData);
      setShipments(shipmentsData);
      setWarehouses(warehousesData);
      setInventory(inventoryData);

      const pending = ordersData.filter((o) => o.status === 'Pending').length;
      const totalRev = ordersData.reduce((sum, o) => sum + o.totalAmount, 0);
      const activeShipments = shipmentsData.filter((s) => s.status?.toLowerCase().includes('in transit') || s.status?.toLowerCase().includes('processing')).length;

      setStats({
        totalOrders: ordersData.length,
        pendingOrders: pending,
        totalRevenue: totalRev,
        lowStockItems: lowStockAlerts.length,
        totalShipments: shipmentsData.length,
        activeShipments: activeShipments,
      });
    } catch (error) {
      console.error('Failed to load manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryByWarehouse = async (warehouseId: number) => {
    try {
      const data = await inventoryService.getByWarehouse(warehouseId);
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory by warehouse:', error);
    }
  };

  const statItems = [
    { label: 'Total Orders', value: stats.totalOrders.toString(), icon: '📋', color: 'from-cyan-400 to-blue-500' },
    { label: 'Pending Orders', value: stats.pendingOrders.toString(), icon: '⏳', color: 'from-yellow-400 to-orange-500' },
    { label: 'Revenue', value: `$${(stats.totalRevenue / 1000).toFixed(1)}K`, icon: '💰', color: 'from-green-400 to-emerald-500' },
    { label: 'Low Stock', value: stats.lowStockItems.toString(), icon: '⚠️', color: 'from-red-400 to-orange-500' },
    { label: 'Shipments', value: stats.totalShipments.toString(), icon: '🚚', color: 'from-purple-400 to-pink-500' },
    { label: 'Active Shipments', value: stats.activeShipments.toString(), icon: '📦', color: 'from-blue-400 to-cyan-500' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'Processing': return 'bg-blue-500/20 text-blue-400';
      case 'Shipped': return 'bg-purple-500/20 text-purple-400';
      case 'Delivered': return 'bg-green-500/20 text-green-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Manager Dashboard</h1>
        <p className="text-slate-400">Operations and inventory management</p>
      </div>

      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'warehouses'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Warehouses
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Inventory
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statItems.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 text-2xl`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 text-slate-400">Order #</th>
                      <th className="text-left py-3 text-slate-400">Amount</th>
                      <th className="text-left py-3 text-slate-400">Status</th>
                      <th className="text-left py-3 text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-b border-slate-700/50">
                        <td className="py-3 text-white">{order.orderNumber}</td>
                        <td className="py-3 text-white">${order.totalAmount.toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{new Date(order.orderDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <h2 className="text-xl font-bold text-white mb-4">Active Shipments</h2>
                <div className="space-y-3">
                  {shipments.slice(0, 3).map((shipment) => (
                    <div key={shipment.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                      <div>
                        <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                        <p className="text-xs text-slate-400">{shipment.status}</p>
                      </div>
                      <span className="text-cyan-400 text-sm">{shipment.driverName || 'Unassigned'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <h2 className="text-xl font-bold text-white mb-4">Warehouses</h2>
                <div className="space-y-2">
                  {warehouses.slice(0, 3).map((warehouse) => (
                    <div key={warehouse.id} className="p-3 rounded-lg bg-slate-700/30">
                      <p className="text-white font-medium">{warehouse.name}</p>
                      <p className="text-xs text-slate-400">{warehouse.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'warehouses' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-4">Warehouse Management</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="rounded-xl border border-slate-600 bg-slate-700/30 p-4">
                <h3 className="text-lg font-semibold text-white mb-2">{warehouse.name}</h3>
                <p className="text-slate-400 text-sm mb-2">{warehouse.location}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Active: {warehouse.isActive ? 'Yes' : 'No'}</span>
                  <button
                    onClick={() => setSelectedWarehouse(warehouse.id)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
                  >
                    View Inventory
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Inventory Management</h2>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          {selectedWarehouse ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 text-slate-400">Product</th>
                    <th className="text-left py-3 text-slate-400">SKU</th>
                    <th className="text-left py-3 text-slate-400">Stock Level</th>
                    <th className="text-left py-3 text-slate-400">Status</th>
                    <th className="text-left py-3 text-slate-400">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700/50">
                      <td className="py-3 text-white">{item.productName || 'N/A'}</td>
                      <td className="py-3 text-slate-400">{item.productSku || 'N/A'}</td>
                      <td className="py-3 text-white">{item.quantity}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.isOutOfStock ? 'bg-red-500/20 text-red-400' :
                          item.isLowStock ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {item.isOutOfStock ? 'Out of Stock' :
                           item.isLowStock ? 'Low Stock' : 'Good'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{item.warehouseName || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">Select a warehouse to view inventory</p>
          )}
        </div>
      )}
    </div>
  );
}