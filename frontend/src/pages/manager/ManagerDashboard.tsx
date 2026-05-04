import { useState, useEffect } from 'react';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { warehouseService, Warehouse, WarehouseStats, CreateWarehouseDto, UpdateWarehouseDto, CreateZoneDto, AssignStaffDto } from '../../services/warehouseService';
import { warehouseStockService, LowStockAlert } from '../../services/warehouseStockService';
import { inventoryService } from '../../services/inventoryService';
import { Plus, Edit, Trash2, XCircle, CheckCircle, Building2, Box, Users, MapPin, Phone, Eye, X, Save, AlertCircle, TrendingDown, TrendingUp, Search, Package } from 'lucide-react';
import { useRef } from 'react';
import { productService, Product } from '../../services/productService';

export function ManagerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStats | null>(null);
  const [searchWarehouse, setSearchWarehouse] = useState('');
 
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouseForDetails, setSelectedWarehouseForDetails] = useState<Warehouse | null>(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [warehouseInventory, setWarehouseInventory] = useState<any[]>([]);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductWarehouseId, setAddProductWarehouseId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [addProductLoading, setAddProductLoading] = useState(false);


  const [warehouseForm, setWarehouseForm] = useState({ name: '', location: '', phone: '' });
  const [zoneForm, setZoneForm] = useState({ zoneName: '', description: '', capacity: 0 });
  const [staffForm, setStaffForm] = useState({ userId: 0, position: '', hireDate: '' });
  
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
      fetchWarehouseStats(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, shipmentsData, warehousesData, lowStockAlertsData] = await Promise.all([
        orderService.getAll(),
        shipmentService.getAll(),
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(),
      ]);

      setOrders(ordersData);
      setShipments(shipmentsData);
      setWarehouses(warehousesData);
      setLowStockAlerts(lowStockAlertsData);

      const pending = ordersData.filter((o) => o.status === 'Pending').length;
      const totalRev = ordersData.reduce((sum, o) => sum + o.totalAmount, 0);
      const activeShipments = shipmentsData.filter((s) => s.status?.toLowerCase().includes('in transit') || s.status?.toLowerCase().includes('processing')).length;

      setStats({
        totalOrders: ordersData.length,
        pendingOrders: pending,
        totalRevenue: totalRev,
        lowStockItems: lowStockAlertsData.length,
        totalShipments: shipmentsData.length,
        activeShipments: activeShipments,
      });
    } catch (error: any) {
      console.error('Failed to load manager data:', error);
      alert(error.message || 'Failed to load data. Please check if all services are running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryByWarehouse = async (warehouseId: number) => {
    try {
      const data = await warehouseStockService.getByWarehouse(warehouseId);
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory by warehouse:', error);
    }
  };

  const fetchWarehouseStats = async (warehouseId: number) => {
    try {
      const stats = await warehouseService.getStats(warehouseId);
      setWarehouseStats(stats);
    } catch (error) {
      console.error('Failed to fetch warehouse stats:', error);
    }
  };

  const fetchWarehouseInventory = async (warehouseId: number) => {
    try {
      const data = await warehouseStockService.getByWarehouse(warehouseId);
      setWarehouseInventory(data);
    } catch (error) {
      console.error('Failed to fetch warehouse inventory:', error);
    }
  };

  const refreshWarehouses = async () => {
    const data = await warehouseService.getAll();
    setWarehouses(data);
  };

  
  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }
    try {
      console.log('Creating warehouse with data:', warehouseForm);
      const result = await warehouseService.create(warehouseForm);
      console.log('Warehouse created:', result);
      await refreshWarehouses();
      setShowWarehouseModal(false);
      setWarehouseForm({ name: '', location: '', phone: '' });
      alert('Warehouse created successfully!');
    } catch (error: any) {
      console.error('Failed to create warehouse:', error);
      alert(error.message || 'Failed to create warehouse');
    }
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }
    try {
      console.log('Updating warehouse with data:', warehouseForm);
      await warehouseService.update(editingWarehouse.id, {
        name: warehouseForm.name,
        location: warehouseForm.location,
        phone: warehouseForm.phone,
        isActive: editingWarehouse.isActive
      });
      await refreshWarehouses();
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: '', location: '', phone: '' });
      alert('Warehouse updated successfully!');
    } catch (error: any) {
      console.error('Failed to update warehouse:', error);
      alert(error.message || 'Failed to update warehouse');
    }
  };

  const handleDeleteWarehouse = async (id: number) => {
    try {
      await warehouseService.delete(id);
      await refreshWarehouses();
      setShowDeleteConfirm(null);
      if (selectedWarehouse === id) {
        setSelectedWarehouse(null);
        setInventory([]);
      }
      alert('Warehouse deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete warehouse:', error);
      alert(error?.response?.data?.message || 'Cannot delete warehouse with existing stock. Transfer or remove stock first.');
    }
  };

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    try {
      await warehouseService.toggleStatus(id, !isActive);
      await refreshWarehouses();
      alert(`Warehouse ${!isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update warehouse status');
    }
  };

  const handleCreateZone = async () => {
    if (!selectedWarehouseForDetails) return;
    if (!zoneForm.zoneName.trim()) {
      alert('Zone name is required');
      return;
    }
    try {
      await warehouseService.createZone({
        warehouseId: selectedWarehouseForDetails.id,
        zoneName: zoneForm.zoneName,
        description: zoneForm.description,
        capacity: zoneForm.capacity
      });
      await refreshWarehouses();
      setShowZoneModal(false);
      setZoneForm({ zoneName: '', description: '', capacity: 0 });
      const updated = await warehouseService.getById(selectedWarehouseForDetails.id);
      setSelectedWarehouseForDetails(updated);
      alert('Zone created successfully!');
    } catch (error) {
      console.error('Failed to create zone:', error);
      alert('Failed to create zone');
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    try {
      await warehouseService.deleteZone(zoneId);
      await refreshWarehouses();
      if (selectedWarehouseForDetails) {
        const updated = await warehouseService.getById(selectedWarehouseForDetails.id);
        setSelectedWarehouseForDetails(updated);
      }
      alert('Zone deleted successfully!');
    } catch (error) {
      console.error('Failed to delete zone:', error);
      alert('Failed to delete zone');
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedWarehouseForDetails) return;
    if (!staffForm.userId || staffForm.userId <= 0) {
      alert('Valid User ID is required');
      return;
    }
    try {
      await warehouseService.assignStaff(selectedWarehouseForDetails.id, {
        userId: staffForm.userId,
        position: staffForm.position,
        hireDate: staffForm.hireDate
      });
      await refreshWarehouses();
      setShowStaffModal(false);
      setStaffForm({ userId: 0, position: '', hireDate: '' });
      const updated = await warehouseService.getById(selectedWarehouseForDetails.id);
      setSelectedWarehouseForDetails(updated);
      alert('Staff assigned successfully!');
    } catch (error) {
      console.error('Failed to assign staff:', error);
      alert('Failed to assign staff');
    }
  };

  const handleRemoveStaff = async (staffId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await warehouseService.removeStaff(staffId);
      await refreshWarehouses();
      if (selectedWarehouseForDetails) {
        const updated = await warehouseService.getById(selectedWarehouseForDetails.id);
        setSelectedWarehouseForDetails(updated);
      }
      alert('Staff removed successfully!');
    } catch (error) {
      console.error('Failed to remove staff:', error);
      alert('Failed to remove staff');
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchWarehouse.toLowerCase()) ||
    (warehouse.location && warehouse.location.toLowerCase().includes(searchWarehouse.toLowerCase()))
  );

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Manager Dashboard</h1>
          <p className="text-slate-400">Operations and inventory management</p>
        </div>
        <button
          onClick={() => {
            setEditingWarehouse(null);
            setWarehouseForm({ name: '', location: '', phone: '' });
            setShowWarehouseModal(true);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
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
          <button
            onClick={() => setActiveTab('low-stock')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'low-stock'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Low Stock Alerts
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
                <h2 className="text-xl font-bold text-white mb-4">Warehouses Summary</h2>
                <div className="space-y-2">
                  {warehouses.slice(0, 3).map((warehouse) => (
                    <div key={warehouse.id} className="p-3 rounded-lg bg-slate-700/30">
                      <p className="text-white font-medium">{warehouse.name}</p>
                      <p className="text-xs text-slate-400">{warehouse.location}</p>
                    </div>
                  ))}
                  {warehouses.length > 3 && (
                    <p className="text-cyan-400 text-sm text-center pt-2">
                      +{warehouses.length - 3} more warehouses
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

   
      {activeTab === 'warehouses' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-white">Warehouse Management</h2>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search warehouses..."
                  value={searchWarehouse}
                  onChange={(e) => setSearchWarehouse(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="text-sm text-slate-400">
                Total: {filteredWarehouses.length} warehouses
              </div>
            </div>
          </div>
          
          {filteredWarehouses.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No warehouses found</p>
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setWarehouseForm({ name: '', location: '', phone: '' });
                  setShowWarehouseModal(true);
                }}
                className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
              >
                Add your first warehouse
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredWarehouses.map((warehouse) => (
                <div key={warehouse.id} className="rounded-xl border border-slate-600 bg-slate-700/30 overflow-hidden hover:border-cyan-500/50 transition-all">
                  <div className="p-4 border-b border-slate-600 bg-slate-800/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="w-5 h-5 text-cyan-400" />
                          <h3 className="text-lg font-semibold text-white">{warehouse.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            warehouse.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {warehouse.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {warehouse.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3" />
                              {warehouse.location}
                            </span>
                          )}
                          {warehouse.phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Phone className="w-3 h-3" />
                              {warehouse.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            setAddProductWarehouseId(warehouse.id);
                            setShowAddProductModal(true);
                            setSelectedProductId(null);
                            setProductQuantity(1);
                            setAddProductLoading(false);
                            try {
                              const prods = await productService.getAll();
                              setProducts(prods);
                            } catch (err) {
                              setProducts([]);
                            }
                          }}
                          className="p-1.5 hover:bg-green-600/20 rounded-lg transition"
                          title="Add Product"
                        >
                          <Plus className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={async () => {
                            const data = await warehouseService.getById(warehouse.id);
                            setSelectedWarehouseForDetails(data);
                            await fetchWarehouseStats(warehouse.id);
                          }}
                          className="p-1.5 hover:bg-slate-600 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingWarehouse(warehouse);
                            setWarehouseForm({
                              name: warehouse.name,
                              location: warehouse.location || '',
                              phone: warehouse.phone || ''
                            });
                            setShowWarehouseModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-600 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(warehouse.id, warehouse.isActive)}
                          className="p-1.5 hover:bg-slate-600 rounded-lg transition"
                          title={warehouse.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {warehouse.isActive ? (
                            <XCircle className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(warehouse.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-slate-800/50">
                        <Box className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{warehouse.zones?.length || 0}</p>
                        <p className="text-xs text-slate-400">Zones</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-800/50">
                        <Users className="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{warehouse.staff?.length || 0}</p>
                        <p className="text-xs text-slate-400">Staff</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedWarehouse(warehouse.id);
                          setActiveTab('inventory');
                        }}
                        className="flex-1 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-sm rounded-lg transition-colors"
                      >
                        View Inventory
                      </button>
                      <button
                        onClick={async () => {
                          await fetchWarehouseInventory(warehouse.id);
                          setSelectedWarehouseForDetails(warehouse);
                          setShowInventoryModal(true);
                        }}
                        className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Package className="w-3 h-3" />
                        Stock
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === 'inventory' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-white">Inventory Management</h2>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} {!warehouse.isActive && '(Inactive)'}
                </option>
              ))}
            </select>
          </div>
          
          {selectedWarehouse && warehouseStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{warehouseStats.totalProducts}</p>
                <p className="text-xs text-slate-400">Products</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{warehouseStats.totalQuantity}</p>
                <p className="text-xs text-slate-400">Total Units</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{warehouseStats.lowStockCount}</p>
                <p className="text-xs text-slate-400">Low Stock</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{warehouseStats.outOfStockCount}</p>
                <p className="text-xs text-slate-400">Out of Stock</p>
              </div>
            </div>
          )}
          
          {selectedWarehouse ? (
            inventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No products found in this warehouse</p>
                <button
                  onClick={() => {
                    setAddProductWarehouseId(selectedWarehouse);
                    setShowAddProductModal(true);
                    setSelectedProductId(null);
                    setProductQuantity(1);
                    productService.getAll().then(setProducts).catch(() => setProducts([]));
                  }}
                  className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Add Product to Warehouse
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 text-slate-400">Product</th>
                      <th className="text-left py-3 text-slate-400">SKU</th>
                      <th className="text-left py-3 text-slate-400">Stock Level</th>
                      <th className="text-left py-3 text-slate-400">Min Level</th>
                      <th className="text-left py-3 text-slate-400">Max Level</th>
                      <th className="text-left py-3 text-slate-400">Status</th>
                      <th className="text-left py-3 text-slate-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/50">
                        <td className="py-3 text-white">{item.productName || 'N/A'}</td>
                        <td className="py-3 text-slate-400">{item.productSku || 'N/A'}</td>
                        <td className="py-3 text-white font-medium">{item.quantity}</td>
                        <td className="py-3 text-slate-400">{item.minimumStockLevel}</td>
                        <td className="py-3 text-slate-400">{item.maximumStockLevel}</td>
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
                        <td className="py-3 text-slate-400">{item.shelfLocation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a warehouse to view inventory</p>
            </div>
          )}
        </div>
      )}

  
      {activeTab === 'low-stock' && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-4">Low Stock Alerts</h2>
          {lowStockAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
              <p className="text-slate-400">No low stock alerts. All inventory levels are healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.map((alert) => (
                <div
                  key={`${alert.warehouseId}-${alert.productId}`}
                  className={`rounded-lg p-4 border ${
                    alert.deficit > 50
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-yellow-500/10 border-yellow-500/50'
                  }`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                        <div>
                          <p className="text-slate-400">Needed</p>
                          <p className="text-red-400 font-bold">{alert.deficit} units</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${alert.deficit > 50 ? 'bg-red-500' : 'bg-yellow-500'}`}
                      style={{
                        width: `${Math.min((alert.currentQuantity / alert.minimumLevel) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {showAddProductModal && addProductWarehouseId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Add Product to Warehouse</h2>
              <button onClick={() => setShowAddProductModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Product</label>
                <select
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  value={selectedProductId ?? ''}
                  onChange={e => setSelectedProductId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={productQuantity}
                  onChange={e => setProductQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                disabled={addProductLoading}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!addProductWarehouseId || !selectedProductId || productQuantity < 1) return;
                  setAddProductLoading(true);
                  try {
                    await warehouseStockService.assignProductToWarehouse(addProductWarehouseId, {
                      productId: selectedProductId,
                      initialQuantity: productQuantity,
                      minimumStockLevel: 5,
                      maximumStockLevel: 1000,
                      shelfLocation: ""
                    });
                    setShowAddProductModal(false);
                    setSelectedProductId(null);
                    setProductQuantity(1);
                    setAddProductWarehouseId(null);
                    await refreshWarehouses();
                    if (selectedWarehouse === addProductWarehouseId) {
                      await fetchInventoryByWarehouse(addProductWarehouseId);
                    }
                    alert('Product assigned to warehouse successfully!');
                  } catch (err: any) {
                    console.error('Failed to assign product:', err);
                    alert(err?.message || 'Failed to assign product');
                  } finally {
                    setAddProductLoading(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                disabled={addProductLoading || !selectedProductId || productQuantity < 1}
              >
                {addProductLoading ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}


      {selectedWarehouseForDetails && !showInventoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedWarehouseForDetails.name}</h2>
                <p className="text-slate-400 text-sm">{selectedWarehouseForDetails.location}</p>
              </div>
              <button
                onClick={() => setSelectedWarehouseForDetails(null)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {warehouseStats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{warehouseStats.totalProducts}</p>
                    <p className="text-xs text-slate-400">Products</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{warehouseStats.totalQuantity}</p>
                    <p className="text-xs text-slate-400">Total Units</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{selectedWarehouseForDetails.zones?.length || 0}</p>
                    <p className="text-xs text-slate-400">Zones</p>
                  </div>
                </div>
              )}

              {/* Zones Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-purple-400" />
                    Zones ({selectedWarehouseForDetails.zones?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowZoneModal(true)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Zone
                  </button>
                </div>
                {selectedWarehouseForDetails.zones && selectedWarehouseForDetails.zones.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedWarehouseForDetails.zones.map((zone) => (
                      <div key={zone.id} className="bg-slate-700/30 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{zone.zoneName}</p>
                          {zone.description && <p className="text-slate-400 text-xs">{zone.description}</p>}
                          <p className="text-slate-500 text-xs">Capacity: {zone.capacity} units</p>
                        </div>
                        <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 hover:bg-red-500/20 rounded transition">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No zones defined</p>
                )}
              </div>

              {/* Staff Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    Staff Members ({selectedWarehouseForDetails.staff?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Assign Staff
                  </button>
                </div>
                {selectedWarehouseForDetails.staff && selectedWarehouseForDetails.staff.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedWarehouseForDetails.staff.map((staff) => (
                      <div key={staff.id} className="bg-slate-700/30 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">User ID: {staff.userId}</p>
                          {staff.position && <p className="text-slate-400 text-xs">{staff.position}</p>}
                          {staff.hireDate && <p className="text-slate-500 text-xs">Hired: {new Date(staff.hireDate).toLocaleDateString()}</p>}
                        </div>
                        <button onClick={() => handleRemoveStaff(staff.id)} className="p-1.5 hover:bg-red-500/20 rounded transition">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No staff assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showInventoryModal && selectedWarehouseForDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedWarehouseForDetails.name} - Inventory</h2>
                <p className="text-slate-400 text-sm">Current stock levels</p>
              </div>
              <button onClick={() => { setShowInventoryModal(false); setSelectedWarehouseForDetails(null); }} className="p-2 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              {warehouseInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No products found in this warehouse</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 text-slate-400">Product</th>
                        <th className="text-left py-3 text-slate-400">SKU</th>
                        <th className="text-left py-3 text-slate-400">Quantity</th>
                        <th className="text-left py-3 text-slate-400">Min Level</th>
                        <th className="text-left py-3 text-slate-400">Max Level</th>
                        <th className="text-left py-3 text-slate-400">Status</th>
                        <th className="text-left py-3 text-slate-400">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseInventory.map((item) => (
                        <tr key={item.id} className="border-b border-slate-700/50">
                          <td className="py-3 text-white">{item.productName || 'N/A'}</td>
                          <td className="py-3 text-slate-400">{item.productSku || 'N/A'}</td>
                          <td className="py-3 text-white font-medium">{item.quantity}</td>
                          <td className="py-3 text-slate-400">{item.minimumStockLevel}</td>
                          <td className="py-3 text-slate-400">{item.maximumStockLevel}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.isOutOfStock ? 'bg-red-500/20 text-red-400' :
                              item.isLowStock ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {item.isOutOfStock ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'Good'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">{item.shelfLocation || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Main Warehouse"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="City, Address"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={warehouseForm.phone}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => { setShowWarehouseModal(false); setEditingWarehouse(null); setWarehouseForm({ name: '', location: '', phone: '' }); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Cancel</button>
              <button onClick={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">{editingWarehouse ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showZoneModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Add New Zone</h2>
              <p className="text-slate-400 text-sm">Warehouse: {selectedWarehouseForDetails?.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Zone Name *</label>
                <input type="text" value={zoneForm.zoneName} onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="e.g., Aisle A" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" rows={2} placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Capacity</label>
                <input type="number" value={zoneForm.capacity || ''} onChange={(e) => setZoneForm({ ...zoneForm, capacity: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="Max units" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => { setShowZoneModal(false); setZoneForm({ zoneName: '', description: '', capacity: 0 }); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
              <button onClick={handleCreateZone} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Create Zone</button>
            </div>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Assign Staff Member</h2>
              <p className="text-slate-400 text-sm">Warehouse: {selectedWarehouseForDetails?.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">User ID *</label>
                <input type="number" value={staffForm.userId || ''} onChange={(e) => setStaffForm({ ...staffForm, userId: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="Enter user ID" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Position</label>
                <input type="text" value={staffForm.position} onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="e.g., Warehouse Manager" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hire Date</label>
                <input type="date" value={staffForm.hireDate} onChange={(e) => setStaffForm({ ...staffForm, hireDate: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => { setShowStaffModal(false); setStaffForm({ userId: 0, position: '', hireDate: '' }); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
              <button onClick={handleAssignStaff} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Assign Staff</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Delete Warehouse</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-300 mb-2">Are you sure you want to delete this warehouse?</p>
              <p className="text-yellow-400 text-sm">⚠️ Note: Only warehouses with no stock can be deleted.</p>
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
              <button onClick={() => handleDeleteWarehouse(showDeleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}