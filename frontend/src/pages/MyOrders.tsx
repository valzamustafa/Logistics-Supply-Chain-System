
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { orderService, Order } from '../services/orderService';
import { shipmentService, Shipment } from '../services/shipmentService';
import { InvoiceModal } from '../components/InvoiceModal';

export const MyOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Map<number, Shipment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserOrders();
    }
  }, [user?.id]);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const ordersResponse = await orderService.getByUser(user!.id);
      const userOrders = ordersResponse;
      setOrders(userOrders);

      const shipmentsMap = new Map<number, Shipment>();
      for (const order of userOrders) {
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
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const translateStatus = (status?: string) => {
    if (!status) return t('orders.pending', 'Pending');
    const key = status.toLowerCase().replace(/\s+/g, '');
    return t(`myOrders.status.${key}`, status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-500">{t('myOrders.loading', 'Loading your orders...')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('orders.myOrders', 'My Orders')}</h1>

    
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="text-slate-500 text-sm">{t('myOrders.totalOrders', 'Total Orders')}</div>
          <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="text-slate-500 text-sm">{t('orders.delivered', 'Delivered')}</div>
          <div className="text-2xl font-bold text-green-400">
            {orders.filter(o => o.status?.toLowerCase() === 'delivered').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="text-slate-500 text-sm">{t('userDashboard.inTransit', 'In Transit')}</div>
          <div className="text-2xl font-bold text-blue-400">
            {orders.filter(o => o.status?.toLowerCase() === 'in transit' || o.status?.toLowerCase() === 'shipped').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="text-slate-500 text-sm">{t('userDashboard.totalSpent', 'Total Spent')}</div>
          <div className="text-2xl font-bold text-cyan-400">
            €{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

     
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.orderId', 'Order ID')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.date', 'Date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.itemsLabel', 'Items')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.total', 'Total')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.statusLabel', 'Status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('navigation.tracking', 'Tracking')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('orders.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-700">
            {orders.map((order) => {
              const shipment = shipments.get(order.id);
              return (
                <tr key={order.id} className="hover:bg-slate-100/80 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {t('myOrders.itemsCount', '{{count}} items', { count: order.items?.length || 0 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-medium">
                    €{(order.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                      {translateStatus(order.status)}
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
                      <span className="text-slate-500">{t('myOrders.notShippedYet', 'Not shipped yet')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => viewInvoice(order)}
                      className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-md hover:bg-cyan-500/20 transition border border-cyan-500/30"
                    >
                      {t('myOrders.invoice', 'Invoice')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            {t('myOrders.noOrdersYet', "You haven't placed any orders yet.")}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
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
};




