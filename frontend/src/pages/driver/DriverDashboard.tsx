import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { driverService, DriverShipment, DriverStats, DriverSchedule } from '../../services/driverService';

export function DriverDashboard() {
  const { user, token } = useAuth();
  const [shipments, setShipments] = useState<DriverShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<DriverShipment | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    todaysDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalDistance: 0,
    totalDeliveries: 0,
    onTimeRate: 0,
    averageRating: 0,
  });
  const [schedule, setSchedule] = useState<DriverSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showProofModal, setShowProofModal] = useState(false);
  const [deliveryProof, setDeliveryProof] = useState('');
  const [deliverySignature, setDeliverySignature] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [shipmentsData, statsData, scheduleData, profileData] = await Promise.all([
        driverService.getMyShipments(),
        driverService.getStats(),
        driverService.getTodaySchedule(),
        driverService.getProfile(),
      ]);
      setShipments(shipmentsData);
      setStats(statsData);
      setSchedule(scheduleData);
      setIsAvailable(profileData.isAvailable);
      if (shipmentsData.length > 0) setSelectedShipment(shipmentsData[0]);
    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async () => {
    try {
      await driverService.updateAvailability(!isAvailable);
      setIsAvailable(!isAvailable);
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const startDelivery = async (shipmentId: string) => {
    setUpdating(true);
    try {
      await driverService.startDelivery(shipmentId);
      await loadAllData();
    } catch (error) {
      console.error('Failed to start delivery:', error);
      alert('Failed to start delivery');
    } finally {
      setUpdating(false);
    }
  };

  const completeDelivery = async (shipmentId: string) => {
    setUpdating(true);
    try {
      await driverService.completeDelivery(shipmentId, deliveryProof, deliverySignature);
      setShowProofModal(false);
      setDeliveryProof('');
      setDeliverySignature('');
      setSelectedShipmentId(null);
      await loadAllData();
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      alert('Failed to complete delivery');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-green-500/20 text-green-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'Delivered': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const statsCards = [
    { label: "Today's Deliveries", value: stats.todaysDeliveries.toString(), icon: '🚚', color: 'from-cyan-400 to-blue-500' },
    { label: 'Completed', value: stats.completedDeliveries.toString(), icon: '✅', color: 'from-green-400 to-emerald-500' },
    { label: 'Pending', value: stats.pendingDeliveries.toString(), icon: '⏳', color: 'from-yellow-400 to-orange-500' },
    { label: 'Total Distance', value: `${stats.totalDistance} km`, icon: '📍', color: 'from-purple-400 to-pink-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Driver Dashboard</h1>
          <p className="text-slate-400">Welcome back, {user?.firstName} {user?.lastName}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={updateAvailability}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              isAvailable 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {isAvailable ? '● Available' : '● Unavailable'}
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
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
            <h2 className="text-xl font-bold text-white">My Shipments</h2>
            <span className="text-sm text-slate-400">{shipments.length} active</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => setSelectedShipment(shipment)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedShipment?.id === shipment.id
                    ? 'border-cyan-500 bg-slate-700/50'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {shipment.pickupLocation || 'Warehouse'} → {shipment.deliveryLocation || 'Customer'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(shipment.status)}`}>
                    {shipment.status}
                  </span>
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-slate-400">Distance: {shipment.distance || 'N/A'}</span>
                  <span className="text-slate-400">ETA: {shipment.eta || 'N/A'}</span>
                </div>
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    style={{ 
                      width: shipment.status === 'Delivered' ? '100%' : 
                             shipment.status === 'In Transit' ? '60%' : '20%' 
                    }}
                  />
                </div>
              </div>
            ))}
            {shipments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🚚</p>
                <p className="text-slate-400">No shipments assigned yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedShipment && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <h2 className="text-xl font-bold text-white mb-4">Delivery Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Tracking Number:</span>
                  <span className="text-white font-medium">{selectedShipment.trackingNumber}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white font-medium">#{selectedShipment.orderId}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Pickup Location:</span>
                  <span className="text-white">{selectedShipment.pickupLocation || 'Main Warehouse'}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Delivery Location:</span>
                  <span className="text-white">{selectedShipment.deliveryLocation || selectedShipment.shippingAddress || 'Customer Address'}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Distance:</span>
                  <span className="text-white">{selectedShipment.distance || 'Calculating...'}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-slate-700">
                  <span className="text-slate-400">Estimated Delivery:</span>
                  <span className="text-white">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-medium ${getStatusColor(selectedShipment.status)}`}>
                    {selectedShipment.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {selectedShipment.status === 'Pending' && (
                  <button
                    onClick={() => startDelivery(selectedShipment.id)}
                    disabled={updating}
                    className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-white font-medium hover:bg-green-400 transition disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Start Delivery'}
                  </button>
                )}
                {selectedShipment.status === 'In Transit' && (
                  <button
                    onClick={() => {
                      setSelectedShipmentId(selectedShipment.id);
                      setShowProofModal(true);
                    }}
                    disabled={updating}
                    className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-400 transition disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Complete Delivery'}
                  </button>
                )}
                <button className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white font-medium hover:bg-slate-600 transition">
                  View Route
                </button>
              </div>

              {selectedShipment.items && selectedShipment.items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h3 className="text-white font-semibold mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedShipment.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">Product #{item.productId}</span>
                        <span className="text-white">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4">Today's Schedule</h2>
            <div className="space-y-3">
              {schedule.length > 0 ? schedule.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    item.type === 'pickup' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {item.time}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.description}</p>
                    <p className="text-xs text-slate-400">{item.location}</p>
                  </div>
                  <span className="text-xs text-slate-500">{item.trackingNumber}</span>
                </div>
              )) : (
                <div className="text-center py-4">
                  <p className="text-slate-400">No scheduled deliveries for today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showProofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowProofModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Delivery Proof</h2>
            <div className="space-y-4">
              <textarea
                placeholder="Add delivery notes or photo URL..."
                value={deliveryProof}
                onChange={(e) => setDeliveryProof(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white h-24 resize-none focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Customer signature (name)"
                value={deliverySignature}
                onChange={(e) => setDeliverySignature(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
              <p className="text-xs text-slate-400">You can add a photo URL or customer signature</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowProofModal(false)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 transition">
                  Cancel
                </button>
                <button onClick={() => completeDelivery(selectedShipmentId!)} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white hover:from-cyan-400 hover:to-blue-400 transition">
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}