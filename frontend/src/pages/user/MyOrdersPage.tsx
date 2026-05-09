import { useState, useEffect } from 'react';
import { orderService, Order } from '../../services/orderService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { useAuth } from '../../hooks/useAuth';
import { InvoiceModal } from '../../components/InvoiceModal';

export function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Map<number, Shipment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getByUser(user!.id);
      setOrders(data);
      
    
      const shipmentsMap = new Map<number, Shipment>();
      for (const order of data) {
        try {
          const shipmentResponse = await shipmentService.getByOrderId(order.id);
          const shipmentsArray = shipmentResponse;
          if (shipmentsArray && shipmentsArray.length > 0) {
            shipmentsMap.set(order.id, shipmentsArray[0]);
          }
        } catch (error) {
          console.error(`Failed to fetch shipment for order ${order.id}:`, error);
        }
      }
      setShipments(shipmentsMap);
      setError(null);
    } catch (err) {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'shipped':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'in transit':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'delivered':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const viewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400">Loading your orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-white mb-2">No Orders Yet</h1>
          <p className="text-slate-400">You haven't placed any orders yet.</p>
          <button 
            onClick={() => window.location.href = '/create-order'}
            className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
          >
            Create Your First Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">My Orders</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Total Orders</div>
          <div className="text-2xl font-bold text-white">{orders.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Delivered</div>
          <div className="text-2xl font-bold text-green-400">
            {orders.filter(o => o.status?.toLowerCase() === 'delivered').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">In Transit</div>
          <div className="text-2xl font-bold text-blue-400">
            {orders.filter(o => o.status?.toLowerCase() === 'in transit' || o.status?.toLowerCase() === 'shipped').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Total Spent</div>
          <div className="text-2xl font-bold text-cyan-400">
            ${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {orders.map((order) => {
                const shipment = shipments.get(order.id);
                return (
                  <tr key={order.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-medium">
                      ${(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {shipment ? (
                        <a
                          href={`/track-shipment/${shipment.id}`}
                          className="text-cyan-400 hover:text-cyan-300 transition"
                        >
                          {shipment.trackingNumber}
                        </a>
                      ) : (
                        <span className="text-slate-500">Not shipped yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewInvoice(order)}
                        className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-md hover:bg-cyan-500/20 transition border border-cyan-500/30"
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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