import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { shipmentService, Shipment, CreateShipmentDto } from '../../services/shipmentService';
import { driverService, Driver, vehicleService, Vehicle } from '../../services/driverService';
import { orderService, Order } from '../../services/orderService';
import { productService, Product } from '../../services/productService';
import { userService, User } from '../../services/userService';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { reportService } from '../../services/reportService';
import * as signalR from '@microsoft/signalr';

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
  const [showVehicleModal, setShowVehicleModal] = useState(false);
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

  const candidateDriverUsers = users.filter((user) => !drivers.some((driver) => driver.userId === user.id));
  const selectedDriverUser = users.find((user) => user.id === newDriver.userId) ?? null;

  useEffect(() => {
    loadAllData();
    setupSignalR();
    return () => {
      hubConnection?.stop();
    };
  }, []);

  const setupSignalR = async () => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/dashboardHub')
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveShipmentUpdate', (updatedShipment: Shipment) => {
      setShipments(prev => prev.map(s => s.id === updatedShipment.id ? updatedShipment : s));
      if (selectedShipment?.id === updatedShipment.id) {
        setSelectedShipment(updatedShipment);
      }
    });

    connection.on('ReceiveNewShipment', (newShipment: Shipment) => {
      setShipments(prev => [newShipment, ...prev]);
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

      const activeCount = shipmentsData.filter((shipment) => {
        const status = shipment.status?.toLowerCase() || '';
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
      const coords = liveTracking.currentLocation.split(',').map((value) => value.trim());
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
    } catch (error) {
      console.error('Failed to update shipment status:', error);
      alert('Failed to update shipment status');
    }
  };

  const createShipment = async () => {
    if (!newShipment.orderId || !newShipment.estimatedDeliveryDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const shipmentData: CreateShipmentDto = {
        orderId: parseInt(newShipment.orderId),
        driverId: newShipment.driverId ? parseInt(newShipment.driverId) : undefined,
        vehicleId: newShipment.vehicleId ? parseInt(newShipment.vehicleId) : undefined,
        estimatedDeliveryDate: newShipment.estimatedDeliveryDate,
        shippingAddress: newShipment.shippingAddress,
        items: newShipment.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      };

      const created = await shipmentService.create(shipmentData);
      setShipments(prev => [created, ...prev]);
      setShowCreateShipmentModal(false);
      setNewShipment({
        orderId: '',
        driverId: '',
        vehicleId: '',
        estimatedDeliveryDate: '',
        shippingAddress: '',
        items: []
      });
      alert('Shipment created successfully!');
    } catch (error) {
      console.error('Failed to create shipment:', error);
      alert('Failed to create shipment');
    }
  };

  const createDriver = async () => {
    if (!newDriver.userId || !newDriver.licenseNumber) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await driverService.create(newDriver);
      setShowDriverModal(false);
      setNewDriver({ userId: 0, licenseNumber: '', phoneNumber: '', isAvailable: true });
      await loadAllData();
      alert('Driver created successfully!');
    } catch (error) {
      console.error('Failed to create driver:', error);
      alert('Failed to create driver');
    }
  };

  const createVehicle = async () => {
    if (!newVehicle.plateNumber || !newVehicle.model) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await vehicleService.create(newVehicle);
      setShowVehicleModal(false);
      setNewVehicle({ plateNumber: '', model: '', capacity: 0, isAvailable: true });
      await loadAllData();
      alert('Vehicle created successfully!');
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      alert('Failed to create vehicle');
    }
  };

  const getStatusColor = (status?: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('delivered')) return 'bg-green-500/20 text-green-400';
    if (normalized.includes('in transit') || normalized.includes('on route')) return 'bg-blue-500/20 text-blue-400';
    if (normalized.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-400';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">Monitor shipments, drivers, users and system activity.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDriverModal(true)}
            className="inline-flex items-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            + Add Driver
          </button>
          <button
            onClick={() => setShowVehicleModal(true)}
            className="inline-flex items-center rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            + Add Vehicle
          </button>
          <button
            onClick={() => setShowCreateShipmentModal(true)}
            className="inline-flex items-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            + New Shipment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Shipments" value={stats.totalShipments} icon="📦" />
        <StatCard label="Active" value={stats.activeShipments} icon="🚚" />
        <StatCard label="Drivers" value={stats.totalDrivers} icon="👨‍✈️" />
        <StatCard label="Vehicles" value={stats.totalVehicles} icon="🚛" />
        <StatCard label="Orders" value={stats.totalOrders} icon="🛒" />
        <StatCard label="Products" value={stats.totalProducts} icon="🏷️" />
        <StatCard label="Users" value={stats.totalUsers} icon="👥" />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shipments List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Shipments</h2>
                <p className="text-sm text-slate-400">Live shipment status and routing</p>
              </div>
            </div>
            <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
              {shipments.map((shipment) => {
                const selected = selectedShipment?.id === shipment.id;
                return (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full text-left rounded-3xl border p-4 transition ${
                      selected ? 'border-cyan-500 bg-slate-800' : 'border-slate-700 bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                        <p className="text-xs text-slate-400 mt-1">{shipment.shippingAddress || 'No destination set'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${getProgress(shipment.status)}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Driver: {shipment.driverName || 'Unassigned'}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedShipment ? (
            <>
              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">{selectedShipment.trackingNumber}</h2>
                    <p className="text-slate-400">Order #{selectedShipment.orderId}</p>
                    <p className="text-sm text-slate-500">Updated {selectedShipment.estimatedDeliveryDate?.slice(0, 10) || 'N/A'}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      onClick={loadAllData}
                      className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
                    >
                      Refresh
                    </button>
                    {selectedShipment.status !== 'Delivered' && selectedShipment.status !== 'In Transit' && (
                      <button
                        onClick={() => updateShipmentStatus(selectedShipment.id, 'In Transit')}
                        className="rounded-2xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-400 transition"
                      >
                        Start Delivery
                      </button>
                    )}
                    {selectedShipment.status !== 'Delivered' && (
                      <button
                        onClick={() => updateShipmentStatus(selectedShipment.id, 'Delivered')}
                        className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <InfoBlock
                    title="Shipping Info"
                    rows={[
                      { label: 'Status', value: selectedShipment.status || 'Unknown', badge: getStatusColor(selectedShipment.status) },
                      { label: 'Destination', value: selectedShipment.shippingAddress || 'N/A' },
                      { label: 'Current Location', value: liveTracking?.currentLocation ?? 'Waiting for live GPS' },
                      { label: 'Last Update', value: liveTracking?.lastLocationUpdate ? new Date(liveTracking.lastLocationUpdate).toLocaleDateString() : 'Awaiting update' },
                      { label: 'Estimated Delivery', value: selectedShipment.estimatedDeliveryDate ? new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString() : 'TBD' },
                      { label: 'Actual Delivery', value: selectedShipment.actualDeliveryDate ? new Date(selectedShipment.actualDeliveryDate).toLocaleDateString() : 'Pending' },
                    ]}
                  />
                  <InfoBlock
                    title="Vehicle Info"
                    rows={[
                      { label: 'Driver', value: selectedShipment.driverName || 'Unassigned' },
                      { label: 'Vehicle', value: selectedShipment.vehiclePlate || 'N/A' },
                      { label: 'Items', value: `${selectedShipment.items?.length || 0} products` },
                      { label: 'Progress', value: `${getProgress(selectedShipment.status)}%` },
                    ]}
                  />
                </div>
              </div>

              {/* Live Tracking Map */}
              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Live Tracking</h3>
                    <p className="text-slate-400 text-sm">Realtime driver location and estimated shipment route.</p>
                  </div>
                  <button
                    onClick={() => selectedShipment && refreshLiveTracking(selectedShipment.id)}
                    className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                  <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/40 h-72 flex items-center justify-center">
                    {liveTracking?.currentLocation ? (
                      <iframe
                        title="Admin live tracking map"
                        src={getMapUrl()}
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div className="text-center px-4">
                        <p className="text-slate-400">Driver location is not available yet.</p>
                        <p className="text-slate-500 text-sm mt-2">Wait for the driver to send their live GPS coordinates.</p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-slate-400 text-sm">Current Location</p>
                        <p className="text-white font-medium">{liveTracking?.currentLocation ?? 'Waiting for live GPS'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Last Updated</p>
                        <p className="text-white font-medium">
                          {liveTracking?.lastLocationUpdate
                            ? new Date(liveTracking.lastLocationUpdate).toLocaleString()
                            : 'Awaiting update'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Driver</p>
                        <p className="text-white font-medium">{liveTracking?.driverName || selectedShipment.driverName || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Driver Contact</p>
                        <p className="text-white font-medium">{liveTracking?.driverPhone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Shipment Status</p>
                        <p className="text-white font-medium">{liveTracking?.status || selectedShipment.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-slate-400 text-sm uppercase tracking-[0.25em]">Documents Info</p>
                    <button className="text-cyan-400 text-sm hover:text-cyan-300 transition">Upload</button>
                  </div>
                  <DocumentRow title="Bill of Lading" status="Ready" />
                  <DocumentRow title="Customs" status="Pending" />
                  <DocumentRow title="Invoice" status="Ready" />
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-slate-400 text-sm uppercase tracking-[0.25em]">Billing Info</p>
                    <span className="text-slate-400 text-sm">Due Soon</span>
                  </div>
                  <InfoRow label="Total Items" value={`${selectedShipment.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} units`} />
                  <InfoRow label="Transport Cost" value="$2,500" />
                  <InfoRow label="Payment Status" value="Pending" badge="bg-yellow-500/20 text-yellow-400" />
                  <InfoRow label="Invoice" value={`INV-${selectedShipment.orderId}`} />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-center">
              <p className="text-slate-400">Select a shipment to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showCreateShipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateShipmentModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-white mb-4">Create New Shipment</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Order ID *</label>
                  <input
                    type="number"
                    placeholder="Order ID"
                    value={newShipment.orderId}
                    onChange={(e) => setNewShipment({ ...newShipment, orderId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Estimated Delivery Date *</label>
                  <input
                    type="datetime-local"
                    value={newShipment.estimatedDeliveryDate}
                    onChange={(e) => setNewShipment({ ...newShipment, estimatedDeliveryDate: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Assign Driver (Optional)</label>
                  <select
                    value={newShipment.driverId}
                    onChange={(e) => setNewShipment({ ...newShipment, driverId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="">Select Driver</option>
                    {drivers.filter(d => d.isAvailable).map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName} - {driver.licenseNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Assign Vehicle (Optional)</label>
                  <select
                    value={newShipment.vehicleId}
                    onChange={(e) => setNewShipment({ ...newShipment, vehicleId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.isAvailable).map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plateNumber} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Shipping Address</label>
                <textarea
                  placeholder="Full shipping address"
                  value={newShipment.shippingAddress}
                  onChange={(e) => setNewShipment({ ...newShipment, shippingAddress: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Items</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {products.filter(p => p.isActive).map(product => {
                    const existingItem = newShipment.items.find(i => i.productId === product.id);
                    return (
                      <div key={product.id} className="flex items-center gap-3 p-2 bg-slate-800 rounded-xl">
                        <input
                          type="checkbox"
                          checked={!!existingItem}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewShipment({
                                ...newShipment,
                                items: [...newShipment.items, { productId: product.id, quantity: 1 }]
                              });
                            } else {
                              setNewShipment({
                                ...newShipment,
                                items: newShipment.items.filter(i => i.productId !== product.id)
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="flex-1 text-white">{product.name}</span>
                        <span className="text-slate-400">${product.price}</span>
                        {existingItem && (
                          <input
                            type="number"
                            min="1"
                            value={existingItem.quantity}
                            onChange={(e) => {
                              setNewShipment({
                                ...newShipment,
                                items: newShipment.items.map(i =>
                                  i.productId === product.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                                )
                              });
                            }}
                            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateShipmentModal(false)}
                className="flex-1 rounded-2xl bg-slate-700 px-4 py-3 text-white hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={createShipment}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition"
              >
                Create Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDriverModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-white mb-4">Add New Driver</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">User *</label>
                <select
                  value={newDriver.userId || ''}
                  onChange={(e) => setNewDriver({ ...newDriver, userId: Number(e.target.value) || 0 })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                >
                  <option value="">Select existing user</option>
                  {candidateDriverUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
                {selectedDriverUser && !selectedDriverUser.roles.includes('Driver') && (
                  <p className="mt-2 text-xs text-yellow-300">
                    Selected user does not have the Driver role assigned. Assign the role in Users if needed.
                  </p>
                )}
              </div>
              <input
                type="text"
                placeholder="License Number *"
                value={newDriver.licenseNumber}
                onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newDriver.phoneNumber}
                onChange={(e) => setNewDriver({ ...newDriver, phoneNumber: e.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newDriver.isAvailable}
                  onChange={(e) => setNewDriver({ ...newDriver, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                />
                <span className="text-slate-300">Available</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowDriverModal(false)} className="flex-1 rounded-2xl bg-slate-700 px-4 py-3 text-white hover:bg-slate-600 transition">
                  Cancel
                </button>
                <button onClick={createDriver} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition">
                  Create Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVehicleModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-white mb-4">Add New Vehicle</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Plate Number *"
                value={newVehicle.plateNumber}
                onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <input
                type="text"
                placeholder="Model *"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <input
                type="number"
                placeholder="Capacity (kg)"
                value={newVehicle.capacity || ''}
                onChange={(e) => setNewVehicle({ ...newVehicle, capacity: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newVehicle.isAvailable}
                  onChange={(e) => setNewVehicle({ ...newVehicle, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                />
                <span className="text-slate-300">Available</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowVehicleModal(false)} className="flex-1 rounded-2xl bg-slate-700 px-4 py-3 text-white hover:bg-slate-600 transition">
                  Cancel
                </button>
                <button onClick={createVehicle} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white hover:from-cyan-400 hover:to-blue-400 transition">
                  Create Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-2">{label}</p>
          <p className="text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-800 text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: { label: string; value: string; badge?: string }[] }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-5">
      <p className="text-slate-400 text-sm uppercase tracking-[0.25em] mb-4">{title}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-slate-700 pb-3 last:border-0 last:pb-0">
            <span className="text-sm text-slate-400">{row.label}</span>
            <span className={`text-sm font-medium ${row.badge ? row.badge : 'text-white'}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 py-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${badge ? badge : 'text-white'}`}>{value}</span>
    </div>
  );
}

function DocumentRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-700 bg-slate-900/70 p-4">
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-slate-500 text-xs">Uploaded</p>
      </div>
      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">{status}</span>
    </div>
  );
}