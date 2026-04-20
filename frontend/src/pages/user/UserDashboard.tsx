import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';

export function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
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
        s.status?.toLowerCase().includes('in transit') || s.status?.toLowerCase().includes('shipped') || s.status?.toLowerCase().includes('route')
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

  const statItems = [
    { label: 'Orders Placed', value: stats.totalOrders.toString(), icon: '📋', color: 'from-cyan-400 to-blue-500' },
    { label: 'Delivered', value: stats.delivered.toString(), icon: '✅', color: 'from-green-400 to-emerald-500' },
    { label: 'In Transit', value: stats.inTransit.toString(), icon: '🚚', color: 'from-yellow-400 to-orange-500' },
    { label: 'Total Spent', value: `$${(stats.totalSpent / 1000).toFixed(1)}K`, icon: '💰', color: 'from-purple-400 to-pink-500' },
  ];

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Dashboard</h1>
        <p className="text-slate-400">Welcome back, {user?.firstName}! Track your orders and shipments</p>
      </div>

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            <button className="text-cyan-400 text-sm hover:text-cyan-300">View All →</button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <div>
                  <p className="text-white font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-slate-400">{new Date(order.orderDate).toLocaleDateString()} • {order.items?.length || 0} items</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${order.totalAmount.toLocaleString()}</p>
                  <span className={`text-xs ${getStatusColor(order.status)}`}>{order.status}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-slate-400 text-center py-4">No orders yet. Start placing orders to see them here.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4">Active Shipments</h2>
            <div className="space-y-3">
              {shipments.filter(s => s.status === 'In Transit' || s.status === 'Shipped').slice(0, 3).map((shipment) => (
                <div key={shipment.id} className="p-3 rounded-lg bg-slate-700/30">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-white font-medium text-sm">{shipment.trackingNumber}</p>
                    <span className={`text-xs ${getStatusColor(shipment.status)}`}>{shipment.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">Est. Delivery: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</p>
                </div>
              ))}
              {shipments.filter(s => s.status === 'In Transit' || s.status === 'Shipped').length === 0 && (
                <p className="text-slate-400 text-center py-4 text-sm">No active shipments</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-lg bg-cyan-500/20 p-3 text-cyan-400 hover:bg-cyan-500/30 text-sm transition">Create Order</button>
              <button className="rounded-lg bg-purple-500/20 p-3 text-purple-400 hover:bg-purple-500/30 text-sm transition">Track Order</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}