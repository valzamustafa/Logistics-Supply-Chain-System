import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { driverService, Driver, vehicleService, Vehicle } from '../../services/driverService';
import { orderService, Order } from '../../services/orderService';
import { productService, Product } from '../../services/productService';
import { userService, User } from '../../services/userService';
import { inventoryService } from '../../services/inventoryService';
import { warehouseService } from '../../services/warehouseService';
import { reportService } from '../../services/reportService';
import * as signalR from '@microsoft/signalr';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    loadAllData();
    setupSignalR();
    return () => {
      hubConnection?.stop();
    };
  }, []);

  const setupSignalR = async () => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5008/dashboardHub')
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveStatsUpdate', (updatedStats) => {
      setStats(prev => ({ ...prev, ...updatedStats }));
    });

    connection.on('ReceiveReportUpdate', (report) => {
      setReports(prev => [report, ...prev]);
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
      const [shipmentsData, driversData, vehiclesData, ordersData, productsData, usersData, inventoryData, warehousesData, reportsData] = await Promise.all([
        shipmentService.getAll(),
        driverService.getAll(),
        vehicleService.getAll(),
        orderService.getAll(),
        productService.getAll(),
        userService.getAll(),
        inventoryService.getAll(),
        warehouseService.getAll(),
        reportService.getAll(),
      ]);

      setShipments(shipmentsData);
      setDrivers(driversData);
      setVehicles(vehiclesData);
      setOrders(ordersData);
      setProducts(productsData);
      setUsers(usersData);
      setInventory(inventoryData);
      setWarehouses(warehousesData);
      setReports(reportsData);

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
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async (shipment: Shipment, status: string) => {
    try {
      await shipmentService.updateStatus(shipment.id, { status });
      await loadAllData();
    } catch (error) {
      console.error('Failed to update shipment status:', error);
    }
  };

  const reorderShipment = async (shipmentId: string, priority: number) => {
    try {
      await shipmentService.reorder(shipmentId, { newPriority: priority });
      await loadAllData();
    } catch (error) {
      console.error('Failed to reorder shipment:', error);
    }
  };

  const downloadReportPdf = async (reportId: number) => {
    try {
      const response = await fetch(`http://localhost:5008/api/reports/${reportId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
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

  const getStatusColor = (status?: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('delivered')) return 'bg-green-500/20 text-green-400';
    if (normalized.includes('in transit') || normalized.includes('on route')) return 'bg-blue-500/20 text-blue-400';
    if (normalized.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  const getStockStatus = (quantity: number, reorderLevel?: number | null) => {
    const level = reorderLevel ?? 10;
    if (quantity <= level * 0.5) return 'bg-red-500/20 text-red-400';
    if (quantity <= level) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">Monitor shipments, inventory, and system activity in real-time.</p>
        </div>
        <button
          onClick={() => navigate('/shipments')}
          className="inline-flex items-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
        >
          Add New Shipment
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-9">
        <StatCard label="Shipments" value={stats.totalShipments} icon="📦" />
        <StatCard label="Active" value={stats.activeShipments} icon="🚚" />
        <StatCard label="Drivers" value={stats.totalDrivers} icon="👨‍✈️" />
        <StatCard label="Vehicles" value={stats.totalVehicles} icon="🚛" />
        <StatCard label="Orders" value={stats.totalOrders} icon="🛒" />
        <StatCard label="Products" value={stats.totalProducts} icon="🏷️" />
        <StatCard label="Users" value={stats.totalUsers} icon="👥" />
        <StatCard label="Low Stock" value={stats.lowStockItems} icon="⚠️" />
        <StatCard label="Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon="💰" />
      </div>

      <div className="flex space-x-1 bg-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'dashboard' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'inventory' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'shipments' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Shipments
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'reports' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Shipments</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {shipments.slice(0, 10).map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                    <p className="text-sm text-slate-400">{shipment.shippingAddress}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                    {shipment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Low Stock Alerts</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {inventory.filter((item: any) => item.quantity <= (item.reorderLevel || 10)).slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">Product {item.productId}</p>
                    <p className="text-sm text-slate-400">Warehouse {item.warehouseId}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStockStatus(item.quantity, item.reorderLevel)}`}>
                    {item.quantity} units
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => {
                const warehouseId = parseInt(e.target.value);
                setSelectedWarehouse(warehouseId);
                loadWarehouseInventory(warehouseId);
              }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse: any) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(selectedWarehouse ? inventory : inventory.slice(0, 20)).map((item: any) => (
              <div key={item.id} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Product {item.productId}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStockStatus(item.quantity, item.reorderLevel)}`}>
                    {item.quantity <= (item.reorderLevel || 10) ? 'Low' : 'OK'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-400">Warehouse: {item.warehouseId}</p>
                  <p className="text-slate-400">Quantity: {item.quantity}</p>
                  <p className="text-slate-400">Reorder Level: {item.reorderLevel || 10}</p>
                  <p className="text-slate-400">Available: {item.quantity ?? item.availableQuantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'shipments' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{shipment.trackingNumber}</h3>
                  <select
                    value={shipment.priority || 1}
                    onChange={(e) => reorderShipment(shipment.id, parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-400">Status: <span className={getStatusColor(shipment.status)}>{shipment.status}</span></p>
                  <p className="text-slate-400">Destination: {shipment.shippingAddress}</p>
                  <p className="text-slate-400">Driver: {shipment.driverName || 'Unassigned'}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateShipmentStatus(shipment, 'In Transit')}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-400"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => updateShipmentStatus(shipment, 'Delivered')}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-400"
                  >
                    Deliver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Reports</h2>
            <button
              onClick={() => reportService.generate({ type: 'inventory', name: 'Inventory Report' })}
              className="bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-400"
            >
              Generate Report
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report: any) => (
              <div key={report.id} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
                <p className="text-slate-400 mb-2">Type: {report.type}</p>
                <p className="text-slate-400 mb-4">Created: {new Date(report.createdAt).toLocaleDateString()}</p>
                <button
                  onClick={() => downloadReportPdf(report.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-400 w-full"
                >
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}