import { useState, useEffect } from 'react';
import { shipmentService, Shipment } from '../services/shipmentService';
import { MapPin, Calendar, AlertCircle } from 'lucide-react';

export function TrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const data = await shipmentService.getAll();
      setShipments(data);
      if (data.length > 0) setSelectedShipment(data[0]);
      setError(null);
    } catch (err) {
      console.error('Failed to load shipments:', err);
      setError('Failed to load shipments. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter(s =>
    s.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.shippingAddress?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (s.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const getStatusSteps = (status: string) => {
    const steps = [
      { label: 'Order Placed', completed: true },
      { label: 'Processing', completed: ['Processing', 'Shipped', 'In Transit', 'Delivered'].includes(status) },
      { label: 'Shipped', completed: ['Shipped', 'In Transit', 'Delivered'].includes(status) },
      { label: 'In Transit', completed: ['In Transit', 'Delivered'].includes(status) },
      { label: 'Delivered', completed: status === 'Delivered' },
    ];
    return steps;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400';
      case 'shipped':
        return 'bg-purple-500/20 text-purple-400';
      case 'in transit':
        return 'bg-orange-500/20 text-orange-400';
      case 'delivered':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipment Tracking</h1>
        <p className="text-slate-400">Real-time tracking and monitoring of all shipments</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur h-full">
            <h2 className="text-xl font-bold text-white mb-4">Shipments</h2>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search tracking #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedShipment?.id === shipment.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <p className="text-white font-medium text-sm">{shipment.trackingNumber}</p>
                    <p className="text-xs text-slate-400 mt-1">{shipment.shippingAddress || 'No address'}</p>
                    <span className={`text-xs mt-2 inline-block px-2 py-1 rounded ${getStatusBadge(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4 text-sm">No shipments found</p>
              )}
            </div>
          </div>
        </div>

        {selectedShipment && (
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedShipment.trackingNumber}</h2>
                  <p className="text-slate-400">Order #{selectedShipment.orderId}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedShipment.status)}`}>
                  {selectedShipment.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Driver</p>
                  <p className="text-white font-medium">{selectedShipment.driverName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Vehicle</p>
                  <p className="text-white font-medium">{selectedShipment.vehiclePlate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Est. Delivery</p>
                  <p className="text-white font-medium">
                    {new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Items</p>
                  <p className="text-white font-medium">{selectedShipment.items?.length || 0} items</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <h3 className="text-lg font-bold text-white mb-6">Delivery Progress</h3>
              <div className="space-y-4">
                {getStatusSteps(selectedShipment.status).map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ${
                        step.completed
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${step.completed ? 'text-white' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                    </div>
                    {step.completed && index < getStatusSteps(selectedShipment.status).length - 1 && (
                      <div className="text-xs text-green-400">✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-400">Shipping Address</p>
                    <p className="text-white font-medium">{selectedShipment.shippingAddress || 'Address not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-400">Estimated Delivery</p>
                    <p className="text-white font-medium">
                      {new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedShipment.actualDeliveryDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-400">Delivered</p>
                      <p className="text-white font-medium">
                        {new Date(selectedShipment.actualDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}