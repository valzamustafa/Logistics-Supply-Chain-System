import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { orderService, Order } from '../services/orderService';
import { shipmentService, Shipment } from '../services/shipmentService';
import { productService, Product } from '../services/productService';
import { warehouseService, Warehouse } from '../services/warehouseService';
import { warehouseStockService, LowStockAlert } from '../services/warehouseStockService';
import { ListChecks, Package, TrendingUp, AlertTriangle } from 'lucide-react';

export function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [ordersData, shipmentsData, productsData, warehousesData, alertsData] = await Promise.all([
        orderService.getAll(),
        shipmentService.getAll(),
        productService.getAll(),
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(),
      ]);
      setOrders(ordersData);
      setShipments(shipmentsData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setLowStockAlerts(alertsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Unable to load report metrics. Please check backend status.');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const deliveredShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('deliver')).length;
  const inTransitShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('in transit') || shipment.status.toLowerCase().includes('route')).length;
  const pendingShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('pending')).length;
  const activeProducts = products.filter((product) => product.isActive).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-slate-400">Analytics and business intelligence for logistics operations</p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 transition"
        >
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} />
        <ReportCard title="Delivered Shipments" value={deliveredShipments.toString()} icon={<Package className="w-5 h-5" />} />
        <ReportCard title="Active Products" value={activeProducts.toString()} icon={<ListChecks className="w-5 h-5" />} />
        <ReportCard title="Low Stock Alerts" value={lowStockAlerts.length.toString()} icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Top Orders</h2>
              <p className="text-sm text-slate-400">Highest value orders from the last 30 days</p>
            </div>
          </div>
          <div className="space-y-3">
            {orders
              .slice()
              .sort((a, b) => b.totalAmount - a.totalAmount)
              .slice(0, 5)
              .map((order) => (
                <div key={order.id} className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <div>
                    <p className="text-sm text-slate-400">Order #{order.orderNumber}</p>
                    <p className="text-white font-semibold mt-2">{order.items?.length || 0} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Status</p>
                    <p className="text-white font-semibold mt-2">{order.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Amount</p>
                    <p className="text-white font-semibold mt-2">${order.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Low Stock Alerts</h2>
              <p className="text-sm text-slate-400">Items likely to need replenishment</p>
            </div>
          </div>
          <div className="space-y-3">
            {lowStockAlerts.slice(0, 5).map((alert) => (
              <div key={`${alert.warehouseId}-${alert.productId}`} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-white font-semibold">{alert.productName}</p>
                <p className="text-slate-400 text-sm">Warehouse: {alert.warehouseName}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>Current {alert.currentQuantity}</span>
                  <span>Need {alert.deficit}</span>
                </div>
              </div>
            ))}
            {lowStockAlerts.length === 0 && (
              <p className="text-slate-400 text-sm">No low stock alerts found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-semibold text-white mt-3">{value}</p>
        </div>
        <div className="rounded-3xl bg-slate-800 p-3 text-cyan-400">{icon}</div>
      </div>
    </div>
  );
}