import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { InvoiceModal } from '../../components/InvoiceModal';

export function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const [stats, setStats] = useState({
    totalOrders: 0,
    delivered: 0,
    inTransit: 0,
    totalSpent: 0,
    activeShipments: 0,
  });

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const ordersData = await orderService.getByUser(user.id);
      const shipmentsByOrder = await Promise.all(
          ordersData.map((order) => shipmentService.getByOrderId(order.id))
      );
      const shipmentsData = shipmentsByOrder.flat();

      setOrders(ordersData);
      setShipments(shipmentsData);

      const delivered = ordersData.filter((o) => o.status === 'Delivered').length;
      const inTransit = ordersData.filter((o) => o.status === 'Shipped' || o.status === 'In Transit').length;
      const totalSpent = ordersData.reduce((sum, o) => sum + o.totalAmount, 0);
      const activeShipments = shipmentsData.filter((s) =>
          s.status?.toLowerCase().includes('in transit') ||
          s.status?.toLowerCase().includes('shipped') ||
          s.status?.toLowerCase().includes('route')
      ).length;

      setStats({
        totalOrders: ordersData.length,
        delivered,
        inTransit,
        totalSpent,
        activeShipments,
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-500/20 text-green-400';
      case 'Shipped': return 'bg-purple-500/20 text-purple-400';
      case 'Processing': return 'bg-blue-500/20 text-blue-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'In Transit': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const viewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading your dashboard...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="flex flex-col gap-8 p-6 bg-slate-900 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back, {user?.firstName || user?.email?.split('@')[0]}!</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Orders Placed</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalOrders}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl p-3 text-2xl">📋</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delivered</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.delivered}</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl p-3 text-2xl">✅</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">In Transit</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.inTransit}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-3 text-2xl">🚚</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Spent</p>
                <p className="text-3xl font-bold text-white mt-2">${stats.totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl p-3 text-2xl">💰</div>
            </div>
          </div>
        </div>

        
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            <button
                onClick={() => window.location.href = '/orders'}
                className="text-cyan-400 text-sm hover:text-cyan-300 transition"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition">
                  <div>
                    <p className="text-white font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.orderDate).toLocaleDateString()} • {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-white font-semibold">${order.totalAmount.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                    <button
                        onClick={() => viewInvoice(order)}
                        className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-md hover:bg-cyan-500/20 transition border border-cyan-500/30 text-sm"
                    >
                      Invoice
                    </button>
                  </div>
                </div>
            ))}
            {orders.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-slate-400">No orders yet</p>
                  <p className="text-slate-500 text-sm mt-1">Click "Create Order" to get started</p>
                </div>
            )}
          </div>
        </div>

        
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Track Your Shipment</h2>
              <p className="text-slate-400 text-sm">Follow your warehouse driver and shipment status in real time.</p>
            </div>
            <button
                onClick={() => window.location.href = '/track-shipment'}
                className="text-cyan-400 text-sm hover:text-cyan-300 transition"
            >
              Go to Tracking →
            </button>
          </div>

          {shipments.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/30 p-6 text-slate-400">
                No active shipments yet. Your order will appear here once it is assigned to a warehouse and driver.
              </div>
          ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {shipments.slice(0, 2).map((shipment) => (
                    <div key={shipment.id} className="rounded-2xl border border-slate-700 bg-slate-900/30 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm text-slate-400">Shipment</p>
                          <p className="text-white font-semibold">{shipment.trackingNumber}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(shipment.status || '')}`}>
                    {shipment.status}
                  </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">Driver: <span className="text-white">{shipment.driverName || 'Pending assignment'}</span></p>
                      <p className="text-sm text-slate-400 mb-2">Order ID: <span className="text-white">{shipment.orderId}</span></p>
                      <p className="text-sm text-slate-400 mb-4">ETA: <span className="text-white">{new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span></p>
                      <button
                          onClick={() => window.location.href = `/track-shipment/${shipment.id}`}
                          className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition"
                      >
                        Track this shipment
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
        {showInvoice && selectedOrder && (
            <InvoiceModal
                order={selectedOrder}
                onClose={() => {
                  setShowInvoice(false);
                  setSelectedOrder(null);
                }}
            />
        )}
      </div>
  );
}