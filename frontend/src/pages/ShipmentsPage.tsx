import { useEffect, useState } from 'react';
import { Truck, Clock, CheckCircle, AlertCircle, Search, Plus } from 'lucide-react';
import { shipmentService, Shipment } from '../services/shipmentService';

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-route' | 'delivered'>('all');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const data = await shipmentService.getAll();
      setShipments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setError('Failed to load shipments. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shipment.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (shipment.shippingAddress?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus =
      statusFilter === 'all' ||
      shipment.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('in') || lower.includes('route')) return 'bg-blue-500/20 text-blue-400';
    if (lower.includes('deliver')) return 'bg-green-500/20 text-green-400';
    if (lower.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('deliver')) return <CheckCircle className="w-5 h-5" />;
    if (lower.includes('route')) return <Truck className="w-5 h-5" />;
    if (lower.includes('pending')) return <Clock className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Shipments</h1>
          <p className="text-slate-400 mt-1">Manage and monitor all shipments</p>
        </div>
        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />
          New Shipment
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="text-2xl font-bold text-white">{shipments.length}</div>
          <p className="text-slate-400 text-sm">Total Shipments</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">{shipments.filter(s => s.status.toLowerCase().includes('in-route')).length}</div>
          <p className="text-slate-400 text-sm">In Route</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">{shipments.filter(s => s.status.toLowerCase().includes('delivered')).length}</div>
          <p className="text-slate-400 text-sm">Delivered</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="text-2xl font-bold text-yellow-400">{shipments.filter(s => s.status.toLowerCase().includes('pending')).length}</div>
          <p className="text-slate-400 text-sm">Pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking number, driver, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-route">In Route</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredShipments.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No shipments found</p>
          </div>
        ) : (
          filteredShipments.map((shipment) => (
            <div key={shipment.id} className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-cyan-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(shipment.status)}`}>
                    {getStatusIcon(shipment.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{shipment.trackingNumber}</h3>
                    <p className="text-slate-400 text-sm">Order #{shipment.orderId}</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(shipment.status)}`}>
                  {shipment.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {shipment.driverName && (
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Driver</p>
                    <p className="text-white font-medium">{shipment.driverName}</p>
                  </div>
                )}
                {shipment.vehiclePlate && (
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Vehicle</p>
                    <p className="text-white font-medium">{shipment.vehiclePlate}</p>
                  </div>
                )}
                {shipment.estimatedDeliveryDate && (
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Est. Delivery</p>
                    <p className="text-white font-medium">
                      {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {shipment.shippingAddress && (
                <div className="bg-slate-900/50 rounded p-3 mb-4">
                  <p className="text-slate-400 text-sm mb-1">Shipping Address</p>
                  <p className="text-white">{shipment.shippingAddress}</p>
                </div>
              )}

              {shipment.items && shipment.items.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Items ({shipment.items.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {shipment.items.map((item) => (
                      <span key={item.id} className="bg-slate-700 px-3 py-1 rounded text-xs text-slate-300">
                        Product #{item.productId} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm">
                  View Details
                </button>
                {shipment.status.toLowerCase() !== 'delivered' && (
                  <button className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm">
                    Update Status
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}