import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { warehouseService, Warehouse, WarehouseStats } from '../../services/warehouseService';
import { warehouseStockService, LowStockAlert } from '../../services/warehouseStockService';
import { inventoryService, InventoryItem } from '../../services/inventoryService';
import { getUsers, createUser, updateUser, deleteUser, User } from '../../services/authService';
import { Plus, Edit, Trash2, XCircle, CheckCircle, Building2, Box, Users, MapPin, Phone, Eye, X, Save, AlertCircle, TrendingDown, TrendingUp, Search, Package, Key } from 'lucide-react';
import { productService, Product } from '../../services/productService';
import { WarehouseCard } from '../../components/warehouse/WarehouseCard';

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
  const location = useLocation();
  const [warehouseListStats, setWarehouseListStats] = useState<Record<number, { totalProducts: number; totalStock: number; lowStock: number }>>({});
  const [searchWarehouse, setSearchWarehouse] = useState('');

  // Modal states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouseForDetails, setSelectedWarehouseForDetails] = useState<Warehouse | null>(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [warehouseInventory, setWarehouseInventory] = useState<any[]>([]);

  // Add Product Modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductWarehouseId, setAddProductWarehouseId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [addProductLoading, setAddProductLoading] = useState(false);

  // Staff Management states
  const [users, setUsers] = useState<User[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAssignWarehouseModal, setShowAssignWarehouseModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'WarehouseStaff'
  });
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isActive: true
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Permission states
  const [userPermissions, setUserPermissions] = useState({
    canViewInventory: true,
    canEditStock: false,
    canReorderProducts: false,
    canViewOrders: true,
    canManageWarehouse: false,
    canViewReports: false,
    canManageStaff: false
  });

  // Përdoruesi aktual dhe rolet e tij
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Rolet që mund të krijojë Menaxheri (VETËM këto dy)
  const managerAllowedRoles = ['WarehouseStaff', 'Driver'];
  // Rolet që mund të shfaqen në tabelë për Manager (VETËM këto dy)
  const allowedStaffRoles = ['WarehouseStaff', 'Driver'];
  const [availableRoles, setAvailableRoles] = useState<string[]>(managerAllowedRoles);

  // Form states
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

  // Merr rolet e përdoruesit aktual
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const roles = userData.roles || [];
      setCurrentUserRoles(roles);
      const admin = roles.includes('Admin');
      setIsAdmin(admin);

      if (admin) {
        setAvailableRoles(['Admin', 'Manager', 'WarehouseStaff', 'Driver', 'Supplier', 'User']);
      } else {
        setAvailableRoles(managerAllowedRoles);
        setUserForm(prev => ({ ...prev, role: 'WarehouseStaff' }));
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (location.pathname === '/manager/staff') {
      setActiveTab('staff');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab === 'staff') {
      setStaffError(null);
      loadStaffData();
    }
  }, [activeTab]);

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

      if (warehousesData && warehousesData.length > 0) {
        const stats: Record<number, { totalProducts: number; totalStock: number; lowStock: number }> = {};
        for (const warehouse of warehousesData) {
          try {
            const inventory: InventoryItem[] = await inventoryService.getByWarehouse(warehouse.id);
            stats[warehouse.id] = {
              totalProducts: inventory?.length || 0,
              totalStock: inventory?.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0) || 0,
              lowStock: inventory?.filter((item: InventoryItem) => item.isLowStock).length || 0
            };
          } catch (err) {
            stats[warehouse.id] = { totalProducts: 0, totalStock: 0, lowStock: 0 };
          }
        }
        setWarehouseListStats(stats);
      }

      if (!selectedWarehouse && warehousesData.length > 0) {
        setSelectedWarehouse(warehousesData[0].id);
      }

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

  // Warehouse CRUD
  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }
    try {
      const result = await warehouseService.create(warehouseForm);
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

  // Zone CRUD
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

  // Staff CRUD for warehouse
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
      alert('Staff assigned to warehouse successfully!');
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

  // Staff Management Functions - FILTRUAR VETËM PËR WAREHOUSESTAFF DHE DRIVER
  const loadStaffData = async () => {
    const hasPermission = currentUserRoles.includes('Admin') || currentUserRoles.includes('Manager');

    if (!hasPermission) {
      setStaffError('You do not have permission to access staff management.');
      return;
    }

    try {
      const usersData = await getUsers();

      // Filtro përdoruesit - shfaq VETËM ata me role WarehouseStaff ose Driver
      let filteredUsers = usersData;

      // Nëse nuk është Admin, shfaq vetëm WarehouseStaff dhe Driver
      if (!isAdmin) {
        filteredUsers = usersData.filter(user => {
          return user.roles.some(role => allowedStaffRoles.includes(role));
        });
      }

      setUsers(filteredUsers);
      setStaffError(null);
    } catch (error: any) {
      console.error('Failed to load staff data:', error);
      setStaffError(error?.message || 'Failed to load staff data.');
      setUsers([]);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.firstName || !userForm.lastName) {
      alert('All fields are required');
      return;
    }

    // Validimi: Nëse nuk është Admin, lejo vetëm WarehouseStaff dhe Driver
    if (!isAdmin && !managerAllowedRoles.includes(userForm.role)) {
      alert('You can only create users with Warehouse Staff or Driver roles');
      return;
    }

    try {
      await createUser({
        email: userForm.email,
        password: userForm.password,
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        role: userForm.role
      });
      await loadStaffData();
      setShowCreateUserModal(false);
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'WarehouseStaff' });
      alert('User created successfully!');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !editUserForm.firstName || !editUserForm.lastName || !editUserForm.email) {
      alert('All fields are required');
      return;
    }

    try {
      await updateUser(selectedUser.id, {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        email: editUserForm.email,
        isActive: editUserForm.isActive
      });
      await loadStaffData();
      setShowEditUserModal(false);
      setSelectedUser(null);
      setEditUserForm({ firstName: '', lastName: '', email: '', isActive: true });
      alert('User updated successfully!');
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!confirm(`Are you sure you want to delete ${selectedUser.firstName} ${selectedUser.lastName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser(selectedUser.id);
      await loadStaffData();
      setSelectedUser(null);
      alert('User deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive
    });
    setShowEditUserModal(true);
  };

// ManagerDashboard.tsx - handleAssignWarehouse
  const handleAssignWarehouse = async () => {
    if (!selectedUser || !selectedWarehouseId) return;
    try {
      await warehouseService.assignStaff(selectedWarehouseId, {
        userId: selectedUser.id,
        position: 'Staff',
        hireDate: new Date().toISOString().split('T')[0]
      });
      setSelectedWarehouseId(null);
      alert('Staff assigned to warehouse successfully!');
    } catch (error: any) {
      console.error('Failed to assign warehouse:', error);
      alert(error.message || 'Failed to assign warehouse');
    }
  };

  const loadUserPermissions = (user: User) => {
    const permissionsKey = `user_permissions_${user.id}`;
    const savedPermissions = localStorage.getItem(permissionsKey);
    if (savedPermissions) {
      setUserPermissions(JSON.parse(savedPermissions));
    } else {
      // Permissions default bazuar në rolin e përdoruesit
      let defaultPermissions = {
        canViewInventory: true,
        canEditStock: false,
        canReorderProducts: false,
        canViewOrders: true,
        canManageWarehouse: false,
        canViewReports: false,
        canManageStaff: false
      };

      if (user.roles.includes('WarehouseStaff')) {
        defaultPermissions = {
          canViewInventory: true,
          canEditStock: true,
          canReorderProducts: false,
          canViewOrders: true,
          canManageWarehouse: false,
          canViewReports: false,
          canManageStaff: false
        };
      } else if (user.roles.includes('Driver')) {
        defaultPermissions = {
          canViewInventory: false,
          canEditStock: false,
          canReorderProducts: false,
          canViewOrders: true,
          canManageWarehouse: false,
          canViewReports: false,
          canManageStaff: false
        };
      }

      setUserPermissions(defaultPermissions);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      // Ruaj permissions në localStorage
      const permissionsKey = `user_permissions_${selectedUser.id}`;
      localStorage.setItem(permissionsKey, JSON.stringify(userPermissions));

      alert(`Permissions updated for ${selectedUser.firstName} ${selectedUser.lastName}`);
      setShowPermissionsModal(false);
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      alert(error.message || 'Failed to update permissions');
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
            <button
                onClick={() => setActiveTab('staff')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'staff'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
            >
              Staff Management
            </button>
          </nav>
        </div>

        {/* OVERVIEW TAB */}
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

        {/* WAREHOUSES TAB */}
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
                    {filteredWarehouses.map((warehouse) => {
                      const stats = warehouseListStats[warehouse.id] || { totalProducts: 0, totalStock: 0, lowStock: 0 };
                      return (
                          <WarehouseCard
                              key={warehouse.id}
                              warehouse={warehouse}
                              stats={stats}
                              onViewDetails={async () => {
                                const data = await warehouseService.getById(warehouse.id);
                                setSelectedWarehouseForDetails(data);
                                await fetchWarehouseStats(warehouse.id);
                              }}
                              onEdit={(warehouse) => {
                                setEditingWarehouse(warehouse);
                                setWarehouseForm({
                                  name: warehouse.name,
                                  location: warehouse.location || '',
                                  phone: warehouse.phone || ''
                                });
                                setShowWarehouseModal(true);
                              }}
                              onDelete={(id) => setShowDeleteConfirm(id)}
                              onAddProduct={(warehouseId) => {
                                setAddProductWarehouseId(warehouseId);
                                setShowAddProductModal(true);
                                setSelectedProductId(null);
                                setProductQuantity(1);
                                setAddProductLoading(false);
                                productService.getAll().then(setProducts).catch(() => setProducts([]));
                              }}
                              showExtraActions={true}
                          />
                      );
                    })}
                  </div>
              )}
            </div>
        )}

        {/* INVENTORY TAB */}
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

        {/* LOW STOCK ALERTS TAB */}
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

        {/* STAFF MANAGEMENT TAB - VETËM PËR WAREHOUSESTAFF DHE DRIVER */}
        {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Staff Management</h2>
                  <p className="text-slate-400 mt-1">
                    {isAdmin
                        ? 'Manage all users, assign to warehouses, and configure permissions'
                        : 'Manage warehouse staff and drivers'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                      onClick={() => { loadStaffData(); setShowCreateUserModal(true); }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add User
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {isAdmin ? 'All Users' : 'Warehouse Staff & Drivers'}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400">Name</th>
                      <th className="text-left py-3 px-4 text-slate-400">Email</th>
                      <th className="text-left py-3 px-4 text-slate-400">Role</th>
                      <th className="text-left py-3 px-4 text-slate-400">Warehouse</th>
                      <th className="text-center py-3 px-4 text-slate-400">Permissions</th>
                      <th className="text-center py-3 px-4 text-slate-400">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {staffError && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-red-400">
                            {staffError}
                          </td>
                        </tr>
                    )}
                    {users.length === 0 && !staffError ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No staff members found. Click "Add User" to create new staff.
                          </td>
                        </tr>
                    ) : (
                        users.map((user) => {
                          const userPrimaryRole = user.roles.find(r => allowedStaffRoles.includes(r)) || user.roles[0];
                          return (
                              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition">
                                <td className="py-3 px-4 text-white">{user.firstName} {user.lastName}</td>
                                <td className="py-3 px-4 text-slate-300">{user.email}</td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {user.roles.map((role) => (
                                        <span key={role} className={`px-2 py-1 rounded text-xs ${
                                            role === 'WarehouseStaff' ? 'bg-green-500/20 text-green-400' :
                                                role === 'Driver' ? 'bg-blue-500/20 text-blue-400' :
                                                    role === 'Admin' ? 'bg-purple-500/20 text-purple-400' :
                                                        role === 'Manager' ? 'bg-cyan-500/20 text-cyan-400' :
                                                            role === 'Supplier' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                        }`}>
                                  {role === 'WarehouseStaff' ? 'Warehouse Staff' :
                                      role === 'Driver' ? 'Driver' : role}
                                </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                      onClick={() => { setSelectedUser(user); setShowAssignWarehouseModal(true); }}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition"
                                      disabled={userPrimaryRole === 'Driver'}
                                      title={userPrimaryRole === 'Driver' ? 'Drivers cannot be assigned to warehouses' : 'Assign to warehouse'}
                                  >
                                    Assign
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                      onClick={() => { setSelectedUser(user); loadUserPermissions(user); setShowPermissionsModal(true); }}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition inline-flex items-center gap-1"
                                  >
                                    <Key className="w-3 h-3" />
                                    Permissions
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => openEditUserModal(user)}
                                        className="text-cyan-400 hover:text-cyan-300 text-sm transition"
                                        title="Edit user details"
                                    >
                                      Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          handleDeleteUser();
                                        }}
                                        className="text-red-400 hover:text-red-300 text-sm transition"
                                        title="Delete user permanently"
                                    >
                                      Delete
                                    </button>
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
            </div>
        )}

        {/* CREATE USER MODAL */}
        {showCreateUserModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Create New User</h2>
                  <p className="text-slate-400 text-sm">Users will receive an email with login credentials</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                    <input
                        type="text"
                        value={userForm.firstName}
                        onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                    <input
                        type="text"
                        value={userForm.lastName}
                        onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email *</label>
                    <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Password *</label>
                    <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Role *</label>
                    <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role === 'WarehouseStaff' ? 'Warehouse Staff' :
                                role === 'Driver' ? 'Driver (Shofer)' :
                                    role === 'Supplier' ? 'Supplier (Furnitor)' : role}
                          </option>
                      ))}
                    </select>
                    {!isAdmin && (
                        <p className="text-xs text-slate-500 mt-1">
                          Manager can only create Warehouse Staff and Driver roles
                        </p>
                    )}
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => { setShowCreateUserModal(false); setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'WarehouseStaff' }); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Cancel</button>
                  <button onClick={handleCreateUser} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">Create User</button>
                </div>
              </div>
            </div>
        )}

        {/* EDIT USER MODAL */}
        {showEditUserModal && selectedUser && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Edit User</h2>
                  <p className="text-slate-400 text-sm">Update user information</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                    <input
                        type="text"
                        value={editUserForm.firstName}
                        onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                    <input
                        type="text"
                        value={editUserForm.lastName}
                        onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email *</label>
                    <input
                        type="email"
                        value={editUserForm.email}
                        onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                          type="checkbox"
                          checked={editUserForm.isActive}
                          onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                      <span className="text-sm text-slate-400">Active User</span>
                    </label>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button
                      onClick={() => {
                        setShowEditUserModal(false);
                        setSelectedUser(null);
                        setEditUserForm({ firstName: '', lastName: '', email: '', isActive: true });
                      }}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleEditUser}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
                  >
                    Update User
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ASSIGN WAREHOUSE MODAL */}
        {showAssignWarehouseModal && selectedUser && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Assign Warehouse to {selectedUser.firstName} {selectedUser.lastName}</h2>
                  <p className="text-slate-400 text-sm">Select which warehouse this user will work in</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Warehouse</label>
                    <select
                        value={selectedWarehouseId || ''}
                        onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select a warehouse</option>
                      {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} {warehouse.location ? `(${warehouse.location})` : ''}
                          </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => { setShowAssignWarehouseModal(false); setSelectedUser(null); setSelectedWarehouseId(null); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Cancel</button>
                  <button onClick={handleAssignWarehouse} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">Assign to Warehouse</button>
                </div>
              </div>
            </div>
        )}

        {/* PERMISSIONS MODAL */}
        {showPermissionsModal && selectedUser && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">User Permissions for {selectedUser.firstName} {selectedUser.lastName}</h2>
                  <p className="text-slate-400 text-sm">Configure what this user can access</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-cyan-400" />
                        <span className="text-white">View Inventory</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canViewInventory}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canViewInventory: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Edit className="w-4 h-4 text-yellow-400" />
                        <span className="text-white">Edit Stock</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canEditStock}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canEditStock: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-white">Reorder Products</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canReorderProducts}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canReorderProducts: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-white">View Orders</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canViewOrders}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canViewOrders: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="text-white">Manage Warehouse</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canManageWarehouse}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canManageWarehouse: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-4 h-4 text-orange-400" />
                        <span className="text-white">View Reports</span>
                      </div>
                      <input
                          type="checkbox"
                          checked={userPermissions.canViewReports}
                          onChange={(e) => setUserPermissions({ ...userPermissions, canViewReports: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                      />
                    </label>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => setShowPermissionsModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Cancel</button>
                  <button onClick={handleUpdatePermissions} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">Save Permissions</button>
                </div>
              </div>
            </div>
        )}

        {/* WAREHOUSE MODAL */}
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

        {/* ZONE MODAL */}
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

        {/* STAFF MODAL (Assign Staff to Warehouse) */}
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

        {/* ADD PRODUCT TO WAREHOUSE MODAL */}
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
                    <label className="block text-sm text-slate-400 mb-1">Initial Quantity</label>
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

        {/* DELETE CONFIRMATION MODAL */}
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