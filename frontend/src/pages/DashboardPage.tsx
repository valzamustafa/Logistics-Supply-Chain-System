import { useEffect, useState } from 'react';
import { shipmentService, Shipment } from '../services/shipmentService';
import { orderService, Order } from '../services/orderService';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [shipmentsData, ordersData] = await Promise.all([
        shipmentService.getAll(),
        orderService.getAll()
      ]);
      setShipments(shipmentsData || []);
      setOrders(ordersData || []);
      if (shipmentsData && shipmentsData.length > 0) {
        setSelectedShipment(shipmentsData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load data. Make sure the backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredShipments = shipments.filter(s => {
    if (activeFilter === 'all') return true;
    const status = s.status.toLowerCase();
    if (activeFilter === 'active') return status.includes('in') || status.includes('route');
    if (activeFilter === 'pending') return status.includes('pending');
    if (activeFilter === 'delivered') return status.includes('deliver');
    return true;
  });

  const stats = [
    { 
      label: 'Total Shipments', 
      value: shipments.length, 
      icon: '📦', 
      color: 'from-cyan-400 to-blue-500' 
    },
    { 
      label: 'In Transit', 
      value: shipments.filter(s => s.status?.toLowerCase().includes('in') || s.status?.toLowerCase().includes('route')).length, 
      icon: '🚚', 
      color: 'from-green-400 to-emerald-500' 
    },
    { 
      label: 'Delivered', 
      value: shipments.filter(s => s.status?.toLowerCase().includes('deliver')).length, 
      icon: '✅', 
      color: 'from-purple-400 to-pink-500' 
    },
    { 
      label: 'Pending', 
      value: shipments.filter(s => s.status?.toLowerCase().includes('pending')).length, 
      icon: '⏳', 
      color: 'from-yellow-400 to-orange-500' 
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Real-time logistics and supply chain management</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white flex items-center gap-2 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur transition hover:border-slate-600"
          >
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Active Shipments</h2>
            
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'active', 'pending', 'delivered'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFilter === filter
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {filteredShipments.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-slate-400">No shipments found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`cursor-pointer rounded-2xl border transition p-4 ${
                      selectedShipment?.id === shipment.id
                        ? 'border-cyan-500 bg-slate-800'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">📦</div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                          <p className="text-sm text-slate-400">{shipment.shippingAddress || 'No address specified'}</p>
                          <p className="text-xs text-slate-500 mt-1">Order ID: {shipment.orderId}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                          shipment.status?.toLowerCase().includes('deliver')
                            ? 'bg-green-500/20 text-green-400'
                            : shipment.status?.toLowerCase().includes('in') || shipment.status?.toLowerCase().includes('route')
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {shipment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Shipment Details</h2>
          
          {selectedShipment ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tracking Number</p>
                  <p className="text-lg font-semibold text-white">{selectedShipment.trackingNumber}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedShipment.status?.toLowerCase().includes('deliver')
                      ? 'bg-green-500/20 text-green-400'
                      : selectedShipment.status?.toLowerCase().includes('in') || selectedShipment.status?.toLowerCase().includes('route')
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {selectedShipment.status}
                </span>
              </div>

              <div className="h-32 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-slate-700 flex items-center justify-center text-5xl">
                📦
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Order ID</p>
                  <p className="text-sm text-white font-medium">{selectedShipment.orderId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Destination</p>
                  <p className="text-sm text-white font-medium">{selectedShipment.shippingAddress || 'No address specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Est. Delivery</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
                {selectedShipment.driverName && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Driver</p>
                    <p className="text-sm text-white font-medium">{selectedShipment.driverName}</p>
                  </div>
                )}
              </div>

              <button className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400">
                View Details
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-center">
              <p className="text-slate-400">Select a shipment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
