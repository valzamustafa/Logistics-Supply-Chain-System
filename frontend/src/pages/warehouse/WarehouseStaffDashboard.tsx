
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { inventoryService, InventoryItem, UpdateStockRequest } from '../../services/inventoryService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { productService, Product } from '../../services/productService';
import { warehouseStockService, LowStockAlert, WarehouseStock } from '../../services/warehouseStockService';
import { vehicleService, Vehicle, Driver } from '../../services/driverService';
import { Package, AlertTriangle, TrendingUp, Edit2, Eye, ShoppingCart, RefreshCw, Search, Filter, X, CheckCircle, Clock, Truck, Plus, MapPin, Navigation, User } from 'lucide-react';
import { AdvancedSearchBar } from '../../components/AdvancedSearchBar';
import { advancedSearch } from '../../utils/advancedSearch';
import { useToast } from '../../hooks/useToast';
import { notificationService } from '../../services/notificationService';
import { VehicleManagementModal } from '../../components/vehicles/VehicleManagementModal';
import { AssignVehicleToDriverModal } from '../../components/vehicles/AssignVehicleToDriverModal';
import { VehicleLiveTracker } from '../../components/vehicles/VehicleLiveTracker';
import { ExportButtons } from '../../components/ExportButtons';

type DashboardTab = 'inventory' | 'vehicles';

interface UserPermissions {
  canViewInventory: boolean;
  canEditStock: boolean;
  canReorderProducts: boolean;
  canViewOrders: boolean;
  canManageWarehouse: boolean;
  canViewReports: boolean;
  canManageStaff: boolean;
  canViewVehicles: boolean;
  canManageVehicles: boolean;
}

export function WarehouseStaffDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>('inventory');
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'productSku' | 'quantity' | 'warehouseId'>('quantity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleStats, setVehicleStats] = useState<Record<number, { status: string; progress: number; location: string }>>({});
  

  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    canViewInventory: true,
    canEditStock: false,
    canReorderProducts: false,
    canViewOrders: true,
    canManageWarehouse: false,
    canViewReports: false,
    canManageStaff: false,
    canViewVehicles: true,
    canManageVehicles: false
  });
  
  const [userRole, setUserRole] = useState<string>('');
  

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
  

  const { t } = useTranslation();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValue: 0
  });


  const fetchVehicles = async () => {
    try {
      const [vehiclesData, driversData] = await Promise.all([
        vehicleService.getAll(),
        vehicleService.getDrivers?.() || Promise.resolve([])
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      const newStats: Record<number, any> = {};
      for (const vehicle of vehiclesData) {
        newStats[vehicle.id] = {
          status: vehicle.isAvailable ? 'available' : 'maintenance',
          progress: Math.floor(Math.random() * 100),
          location: Math.random() > 0.5 ? 'In Route - Highway A1' : 'Warehouse',
        };
      }
      setVehicleStats(newStats);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

 
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const roles = userData.roles || [];
      setUserRole(roles[0] || 'Staff');
      
      const permissionsKey = `user_permissions_${userData.id}`;
      const savedPermissions = localStorage.getItem(permissionsKey);
      if (savedPermissions) {
        setUserPermissions(JSON.parse(savedPermissions));
      } else {
        if (roles.includes('Admin')) {
          setUserPermissions({
            canViewInventory: true, canEditStock: true, canReorderProducts: true,
            canViewOrders: true, canManageWarehouse: true, canViewReports: true,
            canManageStaff: true, canViewVehicles: true, canManageVehicles: true
          });
        } else if (roles.includes('Manager')) {
          setUserPermissions({
            canViewInventory: true, canEditStock: true, canReorderProducts: true,
            canViewOrders: true, canManageWarehouse: true, canViewReports: true,
            canManageStaff: false, canViewVehicles: true, canManageVehicles: true
          });
        } else if (roles.includes('WarehouseStaff')) {
          setUserPermissions({
            canViewInventory: true, canEditStock: true, canReorderProducts: false,
            canViewOrders: true, canManageWarehouse: false, canViewReports: false,
            canManageStaff: false, canViewVehicles: true, canManageVehicles: false
          });
        } else if (roles.includes('Driver')) {
          setUserPermissions({
            canViewInventory: false, canEditStock: false, canReorderProducts: false,
            canViewOrders: true, canManageWarehouse: false, canViewReports: false,
            canManageStaff: false, canViewVehicles: false, canManageVehicles: false
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'vehicles') {
      fetchVehicles();
    } else {
      loadData();
    }
  }, [activeTab, selectedWarehouse]);

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
    if (!userPermissions.canEditStock) {
      showToast('error', 'You do not have permission to edit stock');
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
      showToast('success', 'Stock updated successfully!');
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Stock', title: 'Stock Updated', message: `Stock updated for product ${selectedItem.productId}`, actionUrl: '/warehouse' }).catch(() => {});
    } catch (error) {
      console.error('Failed to update stock:', error);
      showToast('error', 'Failed to update stock');
    }
  };

  const handleReorderStock = async () => {
    if (!selectedReorderItem) return;
    if (!userPermissions.canReorderProducts) {
      showToast('error', 'You do not have permission to reorder products');
      return;
    }
    try {
      showToast('success', `Reorder request sent for ${selectedReorderItem.productName}: ${reorderQuantity} units`);
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Reorder', title: 'Reorder Requested', message: `Requested ${reorderQuantity} units of ${selectedReorderItem.productName}`, actionUrl: '/warehouse' }).catch(() => {});
      setShowReorderModal(false);
      setSelectedReorderItem(null);
      setReorderQuantity(0);
      setReorderNotes('');
    } catch (error) {
      console.error('Failed to reorder:', error);
      showToast('error', 'Failed to reorder');
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

  const filteredInventory = advancedSearch(inventory, {
    query: searchQuery,
    searchFields: [
      (item) => getProductName(item.productId),
      'productSku',
      (item) => getWarehouseName(item.warehouseId),
    ],
    filterPredicates: {
      lowstock: (item) => item.isLowStock,
      warehouse: (item, value) => getWarehouseName(item.warehouseId).toLowerCase().includes(value.toLowerCase()),
    },
    sortBy,
    sortDir,
  }).filter(item => !showLowStockOnly || item.isLowStock);

  const statusColors: Record<string, string> = {
    'available': 'bg-green-500/20 text-green-400',
    'in-transit': 'bg-blue-500/20 text-blue-400',
    'maintenance': 'bg-red-500/20 text-red-400',
    'offline': 'bg-slate-500/20 text-slate-400'
  };

  const statusLabels: Record<string, string> = {
    'available': 'Available',
    'in-transit': 'In Transit',
    'maintenance': 'Maintenance',
    'offline': 'Offline'
  };

  if (loading && activeTab === 'inventory') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('warehouseDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'inventory' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          {t('common.inventory')}
        </button>
        {userPermissions.canViewVehicles && (
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'vehicles' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            {t('common.vehicles')}
          </button>
        )}
      </div>

     
      {activeTab === 'inventory' && (
        <>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('warehouseStaffDashboard.title')}</h1>
              <p className="text-slate-500 mt-1">
                {userRole === 'WarehouseStaff'
                  ? t('warehouseStaffDashboard.manageInventory')
                  : userRole === 'Driver'
                  ? t('warehouseStaffDashboard.trackAndManageDeliveries')
                  : t('warehouseStaffDashboard.warehouseOperationsDashboard')}
              </p>
            </div>
            <div className="flex gap-3">
              <ExportButtons data={{ inventory, warehouses, products }} />
            <div className="w-full md:w-96">
              <AdvancedSearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                sortBy={sortBy}
                sortDir={sortDir}
                sortOptions={[
                  { value: 'quantity', label: t('common.quantity') },
                  { value: 'productSku', label: t('common.sku') },
                  { value: 'warehouseId', label: t('common.warehouse') },
                ]}
                onSortByChange={(value) => setSortBy(value as typeof sortBy)}
                onSortDirChange={(value) => setSortDir(value as typeof sortDir)}
                showClear
                onClear={() => {
                  setSearchQuery('');
                  setShowLowStockOnly(false);
                  setSortBy('quantity');
                  setSortDir('asc');
                }}
                placeholder={t('common.searchProductsPlaceholder')}
              />
            </div>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                showLowStockOnly ? 'bg-cyan-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900'
              }`}
              >
                <AlertTriangle className="w-4 h-4" />
                {t('warehouseStaffDashboard.lowStockOnly')}
              </button>
              <button
                onClick={loadData}
                className="p-2 bg-white hover:bg-slate-200 rounded-xl transition"
              >
                <RefreshCw className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

       
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('common.totalProducts')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalProducts}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('common.totalStock')}</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalStock}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('common.lowStockItems')}</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.lowStockCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('common.totalValue')}</p>
                  <p className="text-2xl font-bold text-slate-900">${stats.totalValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

        
          <div className="flex items-center gap-4">
            <label className="text-slate-500 text-sm">{t('warehouseStaffDashboard.filterByWarehouse')}</label>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">{t('warehouseStaffDashboard.allWarehouses')}</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl border border-slate-200 bg-slate-100/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.product')}</th>
                    <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.sku')}</th>
                    <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.warehouse')}</th>
                    <th className="text-right py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.quantity')}</th>
                    <th className="text-right py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.price')}</th>
                    <th className="text-center py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.status')}</th>
                    <th className="text-center py-4 px-6 text-slate-500 font-medium">{t('warehouseStaffDashboard.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        {t('warehouseStaffDashboard.noInventoryFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const status = getStockStatus(item.quantity, item.minimumStockLevel);
                      const StatusIcon = status.icon;
                      
                      return (
                        <tr key={item.id} className="border-b border-slate-200/50 hover:bg-slate-100/80 transition">
                          <td className="py-4 px-6 text-slate-900 font-medium">
                            {getProductName(item.productId)}
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            {item.productSku || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            {getWarehouseName(item.warehouseId)}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-900">
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
                              <button 
                                onClick={() => {
                                  setSelectedItem(item);
                                  showToast('info', `Product: ${getProductName(item.productId)} — Warehouse: ${getWarehouseName(item.warehouseId)} — Quantity: ${item.quantity}`);
                                }}
                                className="p-2 hover:bg-blue-500/20 rounded-lg transition text-blue-400"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
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
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Low Stock Alerts
                <span className="text-sm text-slate-500 ml-2">({lowStockAlerts.length} items)</span>
              </h2>
              <div className="space-y-3">
                {lowStockAlerts.map((alert) => (
                  <div key={`${alert.warehouseId}-${alert.productId}`} className="bg-slate-100/80 rounded-xl p-4 border border-yellow-500/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-slate-900 font-semibold">{alert.productName}</h3>
                        <p className="text-slate-500 text-sm">SKU: {alert.productSku}</p>
                        <p className="text-slate-500 text-sm">Warehouse: {alert.warehouseName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 text-2xl font-bold">{alert.deficit}</p>
                        <p className="text-slate-500 text-xs">units needed</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${Math.min((alert.currentQuantity / alert.minimumLevel) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-slate-500">Current: {alert.currentQuantity}</span>
                      <span className="text-slate-500">Minimum: {alert.minimumLevel}</span>
                    </div>
                    {userPermissions.canReorderProducts && (
                      <button
                        onClick={() => {
                          setSelectedReorderItem(alert);
                          setReorderQuantity(alert.deficit);
                          setShowReorderModal(true);
                        }}
                        className="mt-3 w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-slate-900 rounded-lg transition text-sm font-semibold"
                      >
                        Reorder Now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

  
      {activeTab === 'vehicles' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fleet Management</h2>
              <p className="text-slate-500 text-sm">View vehicles, track locations</p>
            </div>
            <div className="flex gap-3">
              {userPermissions.canManageVehicles && (
                <>
                  <button
                    onClick={() => {
                      setEditingVehicle(null);
                      setShowVehicleModal(true);
                    }}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vehicle
                  </button>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Assign to Driver
                  </button>
                </>
              )}
              <button
                onClick={fetchVehicles}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => {
              const statsData = vehicleStats[vehicle.id] || { status: vehicle.isAvailable ? 'available' : 'offline', progress: 0, location: 'Unknown' };
              const assignedDriver = drivers.find(d => d.id === vehicle.driverId);
              return (
                <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-cyan-500/50 transition-all duration-300">
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {vehicle.imageUrl ? (
                          <img src={vehicle.imageUrl} alt={vehicle.model} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-cyan-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{vehicle.plateNumber}</h3>
                          <p className="text-slate-500 text-sm">{vehicle.model} ({vehicle.year})</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[statsData.status]}`}>
                        {statusLabels[statsData.status]}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Type</p>
                        <p className="text-slate-900 font-medium capitalize">{vehicle.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Capacity</p>
                        <p className="text-slate-900 font-medium">{vehicle.capacity} kg</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Color</p>
                        <div className="flex items-center gap-2">
                          {vehicle.color && (
                            <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: vehicle.color }} />
                          )}
                          <p className="text-slate-900 font-medium">{vehicle.color || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500">Driver</p>
                        <p className="text-slate-900 font-medium">{assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : 'Not assigned'}</p>
                      </div>
                    </div>
                    {statsData.location && (
                      <div className="flex items-center gap-2 text-sm bg-slate-100 rounded-lg p-2">
                        <MapPin className="w-4 h-4 text-cyan-500" />
                        <span className="text-slate-600">{statsData.location}</span>
                      </div>
                    )}
                    {statsData.status === 'in-transit' && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Route Progress</span>
                          <span className="text-cyan-500 font-semibold">{statsData.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: `${statsData.progress}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowTrackerModal(vehicle)}
                        className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Live Tracking
                      </button>
                      {userPermissions.canManageVehicles && (
                        <button
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setShowVehicleModal(true);
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {vehicles.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
                <Truck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No vehicles found</p>
                {userPermissions.canManageVehicles && (
                  <button
                    onClick={() => setShowVehicleModal(true)}
                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
                  >
                    Add your first vehicle
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {showUpdateModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Update Stock</h2>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-500 mb-4">
              {getProductName(selectedItem.productId)} - {getWarehouseName(selectedItem.warehouseId)}
            </p>
            <p className="text-slate-900 text-2xl font-bold mb-4">Current: {selectedItem.quantity} units</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Transaction Type</label>
                <select
                  value={updateForm.type}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-slate-200 border border-slate-600 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
                >
                  <option value="IN">Stock In (Receive)</option>
                  <option value="OUT">Stock Out (Ship)</option>
                  <option value="RESERVE">Reserve</option>
                  <option value="RELEASE">Release</option>
                  <option value="ADJUST">Adjust</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Quantity</label>
                <input
                  type="number"
                  value={updateForm.quantity}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-200 border border-slate-600 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Notes</label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-200 border border-slate-600 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
                  rows={3}
                  placeholder="Add notes about this stock update..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-slate-200 text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition"
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


      {showReorderModal && selectedReorderItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Reorder Product</h2>
              <button onClick={() => setShowReorderModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-900 font-semibold text-lg">{selectedReorderItem.productName}</p>
            <p className="text-slate-500 text-sm mb-2">SKU: {selectedReorderItem.productSku}</p>
            <p className="text-slate-500 text-sm">Warehouse: {selectedReorderItem.warehouseName}</p>
            
            <div className="bg-slate-100/80 rounded-xl p-4 my-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Current Stock:</span>
                <span className="text-slate-900">{selectedReorderItem.currentQuantity}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Minimum Level:</span>
                <span className="text-slate-900">{selectedReorderItem.minimumLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deficit:</span>
                <span className="text-yellow-400 font-bold">{selectedReorderItem.deficit}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Reorder Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-200 border border-slate-600 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Notes</label>
                <textarea
                  value={reorderNotes}
                  onChange={(e) => setReorderNotes(e.target.value)}
                  className="w-full bg-slate-200 border border-slate-600 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
                  rows={3}
                  placeholder="Add notes for the supplier..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReorderModal(false)}
                className="flex-1 bg-slate-200 text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReorderStock}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-slate-900 px-4 py-2 rounded-xl transition"
              >
                Request Reorder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Modals */}
      {showVehicleModal && (
        <VehicleManagementModal
          vehicle={editingVehicle}
          onClose={() => {
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          onSuccess={() => {
            fetchVehicles();
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          isDriverMode={false}
        />
      )}

      {showAssignModal && (
        <AssignVehicleToDriverModal
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            fetchVehicles();
          }}
        />
      )}

      {showTrackerModal && (
        <VehicleLiveTracker
          vehicleId={showTrackerModal.id}
          plateNumber={showTrackerModal.plateNumber}
          model={showTrackerModal.model}
          imageUrl={showTrackerModal.imageUrl}
          color={showTrackerModal.color}
          onClose={() => setShowTrackerModal(null)}
        />
      )}
    </div>
  );
}
