
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { shipmentService, Shipment, CreateShipmentDto } from '../../services/shipmentService';
import { driverService, Driver, vehicleService, Vehicle } from '../../services/driverService';
import { orderService, Order } from '../../services/orderService';
import { productService, Product } from '../../services/productService';
import { userService, User } from '../../services/userService';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import * as signalR from '@microsoft/signalr';
import { useToast } from '../../hooks/useToast';
import { notificationService } from '../../services/notificationService';
import { Plus, Truck, MapPin, Navigation, RefreshCw, User as UserIcon, Eye, Edit, Trash2, Package, Building2, Users, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { VehicleManagementModal } from '../../components/vehicles/VehicleManagementModal';
import { AssignVehicleToDriverModal } from '../../components/vehicles/AssignVehicleToDriverModal';
import { VehicleLiveTracker } from '../../components/vehicles/VehicleLiveTracker';
import { ExportButtons } from '../../components/ExportButtons';

interface AdminLiveTrackingInfo {
  trackingNumber?: string;
  currentLocation?: string;
  lastLocationUpdate?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [liveTracking, setLiveTracking] = useState<AdminLiveTrackingInfo | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleStats, setVehicleStats] = useState<Record<number, { status: string; progress: number; location: string }>>({});
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    lowStockItems: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModalOld, setShowVehicleModalOld] = useState(false);
  const [newDriver, setNewDriver] = useState({ userId: 0, licenseNumber: '', phoneNumber: '', isAvailable: true });
  const [newVehicle, setNewVehicle] = useState({ plateNumber: '', model: '', capacity: 0, isAvailable: true });
  const [newShipment, setNewShipment] = useState({
    orderId: '',
    driverId: '',
    vehicleId: '',
    estimatedDeliveryDate: '',
    shippingAddress: '',
    items: [] as { productId: number; quantity: number }[]
  });
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);

  const candidateDriverUsers = users.filter((u) => !drivers.some((driver) => driver.userId === u.id));
  const selectedDriverUser = users.find((u) => u.id === newDriver.userId) ?? null;

  const fetchVehicles = async () => {
    try {
      const vehiclesData = await vehicleService.getAll();
      setVehicles(vehiclesData);
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
    if (activeTab === 'vehicles') {
      fetchVehicles();
    }
  }, [activeTab]);

  useEffect(() => {
    loadAllData();
    setupSignalR();
    return () => {
      hubConnection?.stop();
    };
  }, []);

  const setupSignalR = async () => {
    const dashboardHubUrl = import.meta.env.VITE_DASHBOARD_HUB_URL || 'http://localhost:5008/dashboardHub';
    const token = localStorage.getItem('token');
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(dashboardHubUrl, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveShipmentUpdate', (updatedShipment: Shipment) => {
      setShipments(prev => prev.map(s => s.id === updatedShipment.id ? updatedShipment : s));
      if (selectedShipment?.id === updatedShipment.id) {
        setSelectedShipment(updatedShipment);
      }
    });

    connection.on('ReceiveNewShipment', (newShipmentData: Shipment) => {
      setShipments(prev => [newShipmentData, ...prev]);
    });

    connection.on('ReceiveStatsUpdate', (updatedStats) => {
      setStats(prev => ({ ...prev, ...updatedStats }));
    });

    try {
      await connection.start();
      setHubConnection(connection);
    } catch (error) {
      console.error('SignalR connection failed:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [shipmentsData, driversData, vehiclesData, ordersData, productsData, usersData, inventoryData, warehousesData] = await Promise.all([
        shipmentService.getAll(),
        driverService.getAll(),
        vehicleService.getAll(),
        orderService.getAll(),
        productService.getAll(),
        userService.getAll(),
        inventoryService.getAll(),
        warehouseService.getAll(),
      ]);

      setShipments(shipmentsData);
      setDrivers(driversData);
      setVehicles(vehiclesData);
      setOrders(ordersData);
      setProducts(productsData);
      setUsers(usersData);
      setInventory(inventoryData);
      setWarehouses(warehousesData);

      const activeCount = shipmentsData.filter((s) => {
        const status = s.status?.toLowerCase() || '';
        return status.includes('in transit') || status.includes('on route') || status.includes('processing');
      }).length;

      const lowStockCount = inventoryData.filter((item: any) => item.quantity <= (item.reorderLevel || 10)).length;
      const totalRevenue = ordersData.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

      setStats({
        totalShipments: shipmentsData.length,
        activeShipments: activeCount,
        totalDrivers: driversData.length,
        totalVehicles: vehiclesData.length,
        totalOrders: ordersData.length,
        totalProducts: productsData.length,
        totalUsers: usersData.length,
        lowStockItems: lowStockCount,
        totalRevenue: totalRevenue,
      });

      const vehicleStatsData: Record<number, any> = {};
      for (const vehicle of vehiclesData) {
        vehicleStatsData[vehicle.id] = {
          status: vehicle.isAvailable ? 'available' : 'maintenance',
          progress: Math.floor(Math.random() * 100),
          location: Math.random() > 0.5 ? 'In Route - Highway A1' : 'Warehouse',
        };
      }
      setVehicleStats(vehicleStatsData);

      if (shipmentsData.length > 0) {
        setSelectedShipment(shipmentsData[0]);
      }
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveTracking = async (shipmentId: string) => {
    try {
      const data = await shipmentService.getLiveTracking(shipmentId);
      setLiveTracking(data);
    } catch (error) {
      console.error('Failed to load live tracking for shipment:', error);
      setLiveTracking(null);
    }
  };

  const getMapQuery = () => {
    if (liveTracking?.currentLocation) {
      const coords = liveTracking.currentLocation.split(',').map((v) => v.trim());
      if (coords.length === 2 && !isNaN(Number(coords[0])) && !isNaN(Number(coords[1]))) {
        return `${coords[0]},${coords[1]}`;
      }
    }
    return '';
  };

  const getMapUrl = () => {
    const query = getMapQuery();
    return query ? `https://maps.google.com/maps?q=${query}&output=embed` : '';
  };

  useEffect(() => {
    if (selectedShipment) {
      refreshLiveTracking(selectedShipment.id);
    } else {
      setLiveTracking(null);
    }
  }, [selectedShipment]);

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    try {
      const updated = await shipmentService.updateStatus(shipmentId, { status });
      setShipments(prev => prev.map(s => s.id === shipmentId ? updated : s));
      if (selectedShipment?.id === shipmentId) {
        setSelectedShipment(updated);
      }
      showToast('success', `Shipment status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update shipment status:', error);
      showToast('error', 'Failed to update shipment status');
    }
  };

  const createShipment = async () => {
    if (!newShipment.orderId || !newShipment.estimatedDeliveryDate) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      const shipmentData: CreateShipmentDto = {
        orderId: parseInt(newShipment.orderId),
        driverId: newShipment.driverId ? parseInt(newShipment.driverId) : undefined,
        vehicleId: newShipment.vehicleId ? parseInt(newShipment.vehicleId) : undefined,
        estimatedDeliveryDate: newShipment.estimatedDeliveryDate,
        shippingAddress: newShipment.shippingAddress,
        items: newShipment.items.map(item => ({ productId: item.productId, quantity: item.quantity }))
      };

      const created = await shipmentService.create(shipmentData);
      setShipments(prev => [created, ...prev]);
      setShowCreateShipmentModal(false);
      setNewShipment({ orderId: '', driverId: '', vehicleId: '', estimatedDeliveryDate: '', shippingAddress: '', items: [] });
      showToast('success', 'Shipment created successfully!');
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Shipment', title: 'Shipment Created', message: `Shipment ${created.trackingNumber} created`, actionUrl: '/admin' }).catch(() => {});
    } catch (error) {
      console.error('Failed to create shipment:', error);
      showToast('error', 'Failed to create shipment');
    }
  };

  const createDriver = async () => {
    if (!newDriver.userId || !newDriver.licenseNumber) {
      showToast('error', 'Please fill in all required fields');
      return;
    }
    try {
      await driverService.create(newDriver);
      setShowDriverModal(false);
      setNewDriver({ userId: 0, licenseNumber: '', phoneNumber: '', isAvailable: true });
      await loadAllData();
      showToast('success', 'Driver created successfully!');
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Driver', title: 'Driver Created', message: `Driver created`, actionUrl: '/admin' }).catch(() => {});
    } catch (error) {
      console.error('Failed to create driver:', error);
      showToast('error', 'Failed to create driver');
    }
  };

  const createVehicleOld = async () => {
    if (!newVehicle.plateNumber || !newVehicle.model) {
      showToast('error', 'Please fill in all required fields');
      return;
    }
    try {
      await vehicleService.create(newVehicle as any);
      setShowVehicleModalOld(false);
      setNewVehicle({ plateNumber: '', model: '', capacity: 0, isAvailable: true });
      await loadAllData();
      showToast('success', 'Vehicle created successfully!');
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Vehicle', title: 'Vehicle Created', message: `Vehicle ${newVehicle.plateNumber} created`, actionUrl: '/admin' }).catch(() => {});
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      showToast('error', 'Failed to create vehicle');
    }
  };

  const getStatusColor = (status?: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('delivered')) return 'bg-green-500/20 text-green-400';
    if (normalized.includes('in transit') || normalized.includes('on route')) return 'bg-blue-500/20 text-blue-400';
    if (normalized.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-500';
  };

  const getProgress = (status?: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('pending')) return 25;
    if (normalized.includes('processing')) return 45;
    if (normalized.includes('shipped')) return 70;
    if (normalized.includes('in transit') || normalized.includes('on route')) return 85;
    if (normalized.includes('delivered')) return 100;
    return 40;
  };

  const statusColors: Record<string, string> = {
    'available': 'bg-green-500/20 text-green-400',
    'in-transit': 'bg-blue-500/20 text-blue-400',
    'maintenance': 'bg-red-500/20 text-red-400',
    'offline': 'bg-slate-500/20 text-slate-400'
  };

  const statusLabels: Record<string, string> = {
    'available': t('adminDashboard.statusAvailable'),
    'in-transit': t('adminDashboard.statusInTransit'),
    'maintenance': t('adminDashboard.statusMaintenance'),
    'offline': t('adminDashboard.statusOffline')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-500">{t('adminDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('adminDashboard.title')}</h1>
          <p className="text-slate-500">{t('adminDashboard.description')}</p>
        </div>
        <div className="flex gap-3">
          <ExportButtons data={{ shipments, drivers, vehicles, orders, products, users, inventory, warehouses }} />
          <button onClick={() => setShowDriverModal(true)} className="inline-flex items-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500">+ {t('adminDashboard.addDriver')}</button>
          <button onClick={() => setShowVehicleModalOld(true)} className="inline-flex items-center rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500">+ {t('adminDashboard.addVehicle')}</button>
          <button onClick={() => setShowCreateShipmentModal(true)} className="inline-flex items-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400">+ {t('adminDashboard.newShipment')}</button>
        </div>
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-2xl">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{t('adminDashboard.dashboard')}</button>
        <button onClick={() => setActiveTab('vehicles')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'vehicles' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{t('navigation.vehicles')}</button>
        <button onClick={() => setActiveTab('shipments')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'shipments' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{t('navigation.shipments')}</button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.shipmentsCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalShipments}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><Package className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.activeCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.activeShipments}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><Truck className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.driversCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalDrivers}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><Users className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.vehiclesCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalVehicles}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><MapPin className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.ordersCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalOrders}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><CheckCircle className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.productsCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalProducts}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><Building2 className="w-6 h-6" /></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{t('adminDashboard.usersCount')}</p><p className="text-3xl font-semibold text-slate-900">{stats.totalUsers}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-cyan-500"><UserIcon className="w-6 h-6" /></div></div></div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-slate-900">{t('adminDashboard.liveShipments')}</h2><p className="text-sm text-slate-500">{t('adminDashboard.liveShipmentDesc')}</p></div></div>
                <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
                  {shipments.map((shipment) => {
                    const selected = selectedShipment?.id === shipment.id;
                    return (
                      <button key={shipment.id} onClick={() => setSelectedShipment(shipment)} className={`w-full text-left rounded-3xl border p-4 transition ${selected ? 'border-cyan-500 bg-white' : 'border-slate-200 bg-white/70 hover:border-slate-600'}`}>
                        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{shipment.trackingNumber}</p><p className="text-xs text-slate-500 mt-1">{shipment.shippingAddress || t('adminDashboard.noDestination')}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(shipment.status)}`}>{shipment.status}</span></div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${getProgress(shipment.status)}%` }} /></div>
                        <p className="text-xs text-slate-500 mt-2">{t('adminDashboard.driverLabel')}: {shipment.driverName || t('adminDashboard.unassigned')}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedShipment ? (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2"><h2 className="text-2xl font-semibold text-slate-900">{selectedShipment.trackingNumber}</h2><p className="text-slate-500">{t('adminDashboard.orderNumber', { number: selectedShipment.orderId })}</p><p className="text-sm text-slate-500">{t('adminDashboard.updated', { date: selectedShipment.estimatedDeliveryDate?.slice(0, 10) || t('adminDashboard.na') })}</p></div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <button onClick={loadAllData} className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">{t('adminDashboard.refresh')}</button>
                        {selectedShipment.status !== 'Delivered' && selectedShipment.status !== 'In Transit' && (<button onClick={() => updateShipmentStatus(selectedShipment.id, 'In Transit')} className="rounded-2xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-400 transition">{t('adminDashboard.startDelivery')}</button>)}
                        {selectedShipment.status !== 'Delivered' && (<button onClick={() => updateShipmentStatus(selectedShipment.id, 'Delivered')} className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition">{t('adminDashboard.markDelivered')}</button>)}
                      </div>
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-white/70 p-5"><p className="text-slate-500 text-sm uppercase tracking-[0.25em] mb-4">{t('adminDashboard.shippingInfo')}</p><div className="space-y-3"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.status')}</span><span className={`text-sm font-medium ${getStatusColor(selectedShipment.status)}`}>{selectedShipment.status || t('adminDashboard.unknown')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.destination')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.shippingAddress || t('adminDashboard.na')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.currentLocation')}</span><span className="text-sm font-medium text-slate-900">{liveTracking?.currentLocation ?? t('adminDashboard.waitingGps')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.lastUpdate')}</span><span className="text-sm font-medium text-slate-900">{liveTracking?.lastLocationUpdate ? new Date(liveTracking.lastLocationUpdate).toLocaleDateString() : t('adminDashboard.loading')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.estimatedDelivery')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.estimatedDeliveryDate ? new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString() : t('adminDashboard.tbd')}</span></div><div className="flex items-center justify-between pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.actualDelivery')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.actualDeliveryDate ? new Date(selectedShipment.actualDeliveryDate).toLocaleDateString() : t('adminDashboard.pending')}</span></div></div></div>
                      <div className="rounded-3xl border border-slate-200 bg-white/70 p-5"><p className="text-slate-500 text-sm uppercase tracking-[0.25em] mb-4">{t('adminDashboard.vehicleInfo')}</p><div className="space-y-3"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.driverLabel')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.driverName || t('adminDashboard.unassigned')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.vehicle')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.vehiclePlate || t('adminDashboard.na')}</span></div><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.itemsLabel')}</span><span className="text-sm font-medium text-slate-900">{selectedShipment.items?.length || 0} {t('adminDashboard.products')}</span></div><div className="flex items-center justify-between pb-3"><span className="text-sm text-slate-500">{t('adminDashboard.progress')}</span><span className="text-sm font-medium text-slate-900">{getProgress(selectedShipment.status)}%</span></div></div></div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4"><div><h3 className="text-lg font-semibold text-slate-900">{t('adminDashboard.liveTracking')}</h3><p className="text-slate-500 text-sm">{t('adminDashboard.liveTrackingDesc')}</p></div><button onClick={() => selectedShipment && refreshLiveTracking(selectedShipment.id)} className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">{t('adminDashboard.refresh')}</button></div>
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/80 h-72 flex items-center justify-center">
                        {liveTracking?.currentLocation ? (<iframe title="Admin live tracking map" src={getMapUrl()} className="w-full h-full border-0" allowFullScreen />) : (<div className="text-center px-4"><p className="text-slate-500">{t('adminDashboard.noDriverLocation')}</p><p className="text-slate-500 text-sm mt-2">{t('adminDashboard.waitingGps')}</p></div>)}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-4"><div className="space-y-4"><div><p className="text-slate-500 text-sm">{t('adminDashboard.currentLocation')}</p><p className="text-slate-900 font-medium">{liveTracking?.currentLocation ?? t('adminDashboard.waitingGps')}</p></div><div><p className="text-slate-500 text-sm">{t('adminDashboard.lastUpdate')}</p><p className="text-slate-900 font-medium">{liveTracking?.lastLocationUpdate ? new Date(liveTracking.lastLocationUpdate).toLocaleString() : t('messages.loading')}</p></div><div><p className="text-slate-500 text-sm">{t('adminDashboard.driverLabel')}</p><p className="text-slate-900 font-medium">{liveTracking?.driverName || selectedShipment.driverName || t('adminDashboard.unassigned')}</p></div><div><p className="text-slate-500 text-sm">{t('adminDashboard.driverContact')}</p><p className="text-slate-900 font-medium">{liveTracking?.driverPhone || t('adminDashboard.na')}</p></div><div><p className="text-slate-500 text-sm">{t('adminDashboard.status')}</p><p className="text-slate-900 font-medium">{liveTracking?.status || selectedShipment.status}</p></div></div></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-8 text-center"><p className="text-slate-500">{t('adminDashboard.selectShipment')}</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'vehicles' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-bold text-slate-900">{t('adminDashboard.fleetManagement')}</h2><p className="text-slate-500 text-sm">{t('adminDashboard.fleetManagementDesc')}</p></div><div className="flex gap-3"><button onClick={() => { setEditingVehicle(null); setShowVehicleModal(true); }} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" />{t('adminDashboard.addVehicle')}</button><button onClick={() => setShowAssignModal(true)} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"><UserIcon className="w-4 h-4" />{t('adminDashboard.assignToDriver')}</button><button onClick={fetchVehicles} className="px-3 py-2 bg-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" />{t('adminDashboard.refresh')}</button></div></div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => {
              const statsData = vehicleStats[vehicle.id] || { status: vehicle.isAvailable ? 'available' : 'offline', progress: 0, location: t('adminDashboard.unknown') };
              const assignedDriver = drivers.find(d => d.id === vehicle.driverId);
              return (
                <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-cyan-500/50 transition-all duration-300">
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50"><div className="flex justify-between items-center"><div className="flex items-center gap-3">{vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={vehicle.model} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Truck className="w-6 h-6 text-cyan-500" /></div>}<div><h3 className="text-lg font-bold text-slate-900">{vehicle.plateNumber}</h3><p className="text-slate-500 text-sm">{vehicle.model} ({vehicle.year})</p></div></div><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[statsData.status]}`}>{statusLabels[statsData.status]}</span></div></div>
                  <div className="p-4 space-y-3"><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">{t('vehicles.type')}</p><p className="text-slate-900 font-medium capitalize">{vehicle.vehicleType}</p></div><div><p className="text-slate-500">{t('vehicles.capacity')}</p><p className="text-slate-900 font-medium">{vehicle.capacity} kg</p></div><div><p className="text-slate-500">{t('adminDashboard.color')}</p><p className="text-slate-900 font-medium">{vehicle.color || '-'}</p></div><div><p className="text-slate-500">{t('vehicles.driver')}</p><p className="text-slate-900 font-medium">{assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : t('adminDashboard.notAssigned')}</p></div></div>{statsData.location && (<div className="flex items-center gap-2 text-sm bg-slate-100 rounded-lg p-2"><MapPin className="w-4 h-4 text-cyan-500" /><span className="text-slate-600">{statsData.location}</span></div>)}{statsData.status === 'in-transit' && (<div><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{t('adminDashboard.routeProgress')}</span><span className="text-cyan-500 font-semibold">{statsData.progress}%</span></div><div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: `${statsData.progress}%` }} /></div></div>)}<div className="flex gap-2 pt-2"><button onClick={() => setShowTrackerModal(vehicle)} className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"><Navigation className="w-4 h-4" />{t('adminDashboard.liveTracking')}</button><button onClick={() => { setEditingVehicle(vehicle); setShowVehicleModal(true); }} className="px-3 py-2 bg-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition"><Edit className="w-4 h-4" /></button></div></div>
                </div>
              );
            })}
            {vehicles.length === 0 && (<div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200"><Truck className="w-16 h-16 text-slate-400 mx-auto mb-4" /><p className="text-slate-500">{t('adminDashboard.noVehiclesFound')}</p><button onClick={() => setShowVehicleModal(true)} className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">{t('adminDashboard.addFirstVehicle')}</button></div>)}
          </div>
        </div>
      )}

      {activeTab === 'shipments' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-slate-900">{shipment.trackingNumber}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(shipment.status)}`}>{shipment.status}</span></div><div className="space-y-2"><p className="text-slate-500">{t('adminDashboard.destination')}: {shipment.shippingAddress}</p><p className="text-slate-500">{t('adminDashboard.driverLabel')}: {shipment.driverName || t('adminDashboard.unassigned')}</p></div><div className="flex gap-2 mt-4"><button onClick={() => updateShipmentStatus(shipment.id, 'In Transit')} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-400">{t('adminDashboard.startDelivery')}</button><button onClick={() => updateShipmentStatus(shipment.id, 'Delivered')} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-400">{t('adminDashboard.markDelivered')}</button></div></div>
          ))}
        </div>
      )}

      {showVehicleModal && (<VehicleManagementModal vehicle={editingVehicle} onClose={() => { setShowVehicleModal(false); setEditingVehicle(null); }} onSuccess={() => { fetchVehicles(); loadAllData(); }} />)}
      {showAssignModal && (<AssignVehicleToDriverModal drivers={drivers} vehicles={vehicles} onClose={() => setShowAssignModal(false)} onSuccess={() => { fetchVehicles(); loadAllData(); }} />)}
      {showTrackerModal && (<VehicleLiveTracker vehicleId={showTrackerModal.id} plateNumber={showTrackerModal.plateNumber} model={showTrackerModal.model} imageUrl={showTrackerModal.imageUrl} color={showTrackerModal.color} onClose={() => setShowTrackerModal(null)} />)}

      {showCreateShipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateShipmentModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">{t('adminDashboard.createNewShipment')}</h2>
            <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-slate-500 mb-1">{t('orders.orderId')} *</label><input type="number" placeholder={t('orders.orderId')} value={newShipment.orderId} onChange={(e) => setNewShipment({ ...newShipment, orderId: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /></div><div><label className="block text-sm text-slate-500 mb-1">{t('adminDashboard.estimatedDelivery')} *</label><input type="datetime-local" value={newShipment.estimatedDeliveryDate} onChange={(e) => setNewShipment({ ...newShipment, estimatedDeliveryDate: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-slate-500 mb-1">{t('adminDashboard.assignDriverOptional')}</label><select value={newShipment.driverId} onChange={(e) => setNewShipment({ ...newShipment, driverId: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"><option value="">{t('adminDashboard.selectDriver')}</option>{drivers.filter(d => d.isAvailable).map(driver => (<option key={driver.id} value={driver.id}>{driver.firstName} {driver.lastName} - {driver.licenseNumber}</option>))}</select></div><div><label className="block text-sm text-slate-500 mb-1">{t('adminDashboard.assignVehicleOptional')}</label><select value={newShipment.vehicleId} onChange={(e) => setNewShipment({ ...newShipment, vehicleId: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"><option value="">{t('adminDashboard.selectVehicle')}</option>{vehicles.filter(v => v.isAvailable).map(vehicle => (<option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.model}</option>))}</select></div></div><div><label className="block text-sm text-slate-500 mb-1">{t('adminDashboard.shippingAddress')}</label><textarea placeholder={t('adminDashboard.shippingAddressPlaceholder')} value={newShipment.shippingAddress} onChange={(e) => setNewShipment({ ...newShipment, shippingAddress: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" rows={2} /></div><div><label className="block text-sm text-slate-500 mb-2">{t('adminDashboard.itemsLabel')}</label><div className="space-y-2 max-h-48 overflow-y-auto">{products.filter(p => p.isActive).map(product => { const existingItem = newShipment.items.find(i => i.productId === product.id); return (<div key={product.id} className="flex items-center gap-3 p-2 bg-white rounded-xl"><input type="checkbox" checked={!!existingItem} onChange={(e) => { if (e.target.checked) { setNewShipment({ ...newShipment, items: [...newShipment.items, { productId: product.id, quantity: 1 }] }); } else { setNewShipment({ ...newShipment, items: newShipment.items.filter(i => i.productId !== product.id) }); } }} className="w-4 h-4" /><span className="flex-1 text-slate-900">{product.name}</span><span className="text-slate-500">${product.price}</span>{existingItem && (<input type="number" min="1" value={existingItem.quantity} onChange={(e) => { setNewShipment({ ...newShipment, items: newShipment.items.map(i => i.productId === product.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i) }); }} className="w-20 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-900 text-center" />)}</div>); })}</div></div></div>
            <div className="flex gap-3 mt-6"><button onClick={() => setShowCreateShipmentModal(false)} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-slate-900 hover:bg-slate-100 transition">Cancel</button><button onClick={createShipment} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition">Create Shipment</button></div>
          </div>
        </div>
      )}

      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDriverModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('adminDashboard.addNewDriver')}</h2>
            <div className="space-y-4"><div><label className="block text-sm text-slate-500 mb-2">{t('adminDashboard.userLabel')} *</label><select value={newDriver.userId || ''} onChange={(e) => setNewDriver({ ...newDriver, userId: Number(e.target.value) || 0 })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"><option value="">{t('adminDashboard.selectDriver')}</option>{candidateDriverUsers.map((u) => (<option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>))}</select>{selectedDriverUser && !selectedDriverUser.roles.includes('Driver') && (<p className="mt-2 text-xs text-yellow-600">{t('adminDashboard.userDoesNotHaveDriverRole')}</p>)}</div><input type="text" placeholder={`${t('adminDashboard.licenseNumber')} *`} value={newDriver.licenseNumber} onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /><input type="text" placeholder={t('adminDashboard.phoneNumber')} value={newDriver.phoneNumber} onChange={(e) => setNewDriver({ ...newDriver, phoneNumber: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /><label className="flex items-center gap-3"><input type="checkbox" checked={newDriver.isAvailable} onChange={(e) => setNewDriver({ ...newDriver, isAvailable: e.target.checked })} className="h-4 w-4 rounded border-slate-300 bg-slate-100 text-cyan-500" /><span className="text-slate-700">{t('adminDashboard.available')}</span></label><div className="flex gap-3 pt-4"><button onClick={() => setShowDriverModal(false)} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-slate-900 hover:bg-slate-100 transition">{t('common.cancel')}</button><button onClick={createDriver} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition">{t('adminDashboard.createDriver')}</button></div></div>
          </div>
        </div>
      )}

      {showVehicleModalOld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVehicleModalOld(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('adminDashboard.addNewVehicle')}</h2>
            <div className="space-y-4"><input type="text" placeholder={`${t('adminDashboard.plateNumber')} *`} value={newVehicle.plateNumber} onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /><input type="text" placeholder={`${t('adminDashboard.model')} *`} value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /><input type="number" placeholder={t('adminDashboard.capacityKg')} value={newVehicle.capacity || ''} onChange={(e) => setNewVehicle({ ...newVehicle, capacity: parseInt(e.target.value, 10) || 0 })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" /><label className="flex items-center gap-3"><input type="checkbox" checked={newVehicle.isAvailable} onChange={(e) => setNewVehicle({ ...newVehicle, isAvailable: e.target.checked })} className="h-4 w-4 rounded border-slate-300 bg-slate-100 text-cyan-500" /><span className="text-slate-700">{t('adminDashboard.available')}</span></label><div className="flex gap-3 pt-4"><button onClick={() => setShowVehicleModalOld(false)} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-slate-900 hover:bg-slate-100 transition">{t('common.cancel')}</button><button onClick={createVehicleOld} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition">{t('adminDashboard.createVehicle')}</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">{label}</p>
          <p className="text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: { label: string; value: string; badge?: string }[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
      <p className="text-slate-500 text-sm uppercase tracking-[0.25em] mb-4">{title}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0 last:pb-0">
            <span className="text-sm text-slate-500">{row.label}</span>
            <span className={`text-sm font-medium ${row.badge ? row.badge : 'text-slate-900'}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${badge ? badge : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function DocumentRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <p className="text-slate-900 font-medium">{title}</p>
        <p className="text-slate-500 text-xs">Uploaded</p>
      </div>
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-500">{status}</span>
    </div>
  );
}




