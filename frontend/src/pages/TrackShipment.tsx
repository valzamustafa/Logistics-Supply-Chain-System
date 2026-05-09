import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { shipmentService, Shipment } from '../services/shipmentService';
import { orderService, Order } from '../services/orderService';

export const TrackShipment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setSelectedShipment(null);
      setLiveLocation(null);

      try {
        const userOrders: Order[] = user?.id ? await orderService.getByUser(user.id) : [];
        const shipmentsMap = await Promise.all(
          userOrders.map(async (order) => {
            try {
              return await shipmentService.getByOrderId(order.id);
            } catch (err) {
              console.warn(`Unable to load shipment for order ${order.id}`, err);
              return [] as Shipment[];
            }
          })
        );

        const allShipments = shipmentsMap.flat();
        setShipments(allShipments);

        if (id) {
          try {
            const found = await shipmentService.getById(id);
            setSelectedShipment(found);
          } catch (err: any) {
            setError(err.message || 'Failed to load shipment details');
          }
        } else if (allShipments.length > 0) {
          setSelectedShipment(allShipments[0]);
        } else {
          setError('No shipments found. Place an order to start tracking a shipment.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load shipment tracking data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, user?.id]);

  useEffect(() => {
    if (!selectedShipment) return;

    let intervalId: number | undefined;

    const refreshLiveTracking = async () => {
      try {
        const data = await shipmentService.getLiveTracking(selectedShipment.id);
        setLiveLocation(data);
      } catch (err) {
        console.error('Failed to refresh live tracking:', err);
      }
    };

    refreshLiveTracking();

    if (selectedShipment.status?.toLowerCase() === 'in transit') {
      intervalId = window.setInterval(refreshLiveTracking, 10000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [selectedShipment]);

  const getTimelineSteps = () => {
    return [
      {
        status: 'Order Placed',
        date: selectedShipment?.estimatedDeliveryDate,
        description: 'Your order has been confirmed',
        completed: true,
      },
      {
        status: 'Processing',
        date: selectedShipment?.estimatedDeliveryDate,
        description: 'Order is being prepared for shipment',
        completed: selectedShipment?.status?.toLowerCase() !== 'pending',
      },
      {
        status: 'Picked Up',
        date: selectedShipment?.estimatedDeliveryDate,
        description: 'Package picked up from warehouse',
        completed:
          selectedShipment?.status?.toLowerCase() !== 'pending' &&
          selectedShipment?.status?.toLowerCase() !== 'processing',
      },
      {
        status: 'In Transit',
        date: selectedShipment?.estimatedDeliveryDate,
        description: 'Your package is on the way',
        completed:
          selectedShipment?.status?.toLowerCase() === 'in transit' ||
          selectedShipment?.status?.toLowerCase() === 'delivered',
      },
      {
        status: 'Delivered',
        date: selectedShipment?.actualDeliveryDate,
        description: 'Package delivered successfully',
        completed: selectedShipment?.status?.toLowerCase() === 'delivered',
      },
    ];
  };

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return 'bg-slate-500/20 text-slate-400';
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'in transit':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Loading shipment tracking...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Track Your Shipment</h1>
          <p className="text-slate-400">Select a shipment and follow your warehouse driver in real time.</p>
        </div>
        <Link
          to="/my-orders"
          className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-200 transition hover:bg-cyan-500/20"
        >
          View My Orders
        </Link>
      </div>

      {error && !selectedShipment ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <p>{error}</p>
          <p className="text-sm text-slate-400 mt-2">You can start tracking as soon as your order is assigned to a warehouse and driver.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">Your Shipments</h2>
            {shipments.length === 0 ? (
              <div className="text-slate-400">No shipments available yet.</div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto">
                {shipments.map((shipment) => (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      selectedShipment?.id === shipment.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{shipment.trackingNumber}</p>
                        <p className="text-sm text-slate-400">Order {shipment.orderId}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-slate-400">
                      Driver: {shipment.driverName || 'Not assigned yet'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedShipment && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedShipment.trackingNumber}</h2>
                    <p className="text-slate-400">Order #{selectedShipment.orderId}</p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusBadgeClass(selectedShipment.status)}`}>
                    {selectedShipment.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Driver</p>
                      <p className="text-white font-medium">{selectedShipment.driverName || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Vehicle</p>
                      <p className="text-white font-medium">{selectedShipment.vehiclePlate || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Estimated Delivery</p>
                      <p className="text-white font-medium">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Items</p>
                      <p className="text-white font-medium">{selectedShipment.items?.length || 0} items</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Live Tracking</h3>
                    <p className="text-slate-400 text-sm">Latest driver location and shipment status.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedShipment) return;
                      try {
                        const result = await shipmentService.getLiveTracking(selectedShipment.id);
                        setLiveLocation(result);
                      } catch (err) {
                        console.error('Failed to refresh live tracking:', err);
                      }
                    }}
                    className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
                  >
                    Refresh
                  </button>
                </div>

                {liveLocation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm">Current Location</p>
                        <p className="text-white">{liveLocation.currentLocation || 'Waiting for driver update'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Last Update</p>
                        <p className="text-white">{liveLocation.lastLocationUpdate ? new Date(liveLocation.lastLocationUpdate).toLocaleString() : 'No updates yet'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm">Driver</p>
                        <p className="text-white">{liveLocation.driverName || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Driver Contact</p>
                        <p className="text-white">{liveLocation.driverPhone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Shipment Status</p>
                        <p className="text-white">{liveLocation.status || selectedShipment.status}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">Live tracking is loading for this shipment.</p>
                )}

                {liveLocation?.currentLocation ? (
                  <div className="mt-6 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/40 h-72">
                    <iframe
                      title="Shipment map"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(liveLocation.currentLocation)}&output=embed`}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-center">
                    <p className="text-slate-400">Driver live location is not available yet.</p>
                    <p className="text-slate-500 text-sm mt-2">The driver must send GPS updates for this shipment before the map appears.</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 mt-1">📍</div>
                    <div>
                      <p className="text-sm text-slate-400">Shipping Address</p>
                      <p className="text-white font-medium">{selectedShipment.shippingAddress || 'Address not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 mt-1">⏱️</div>
                    <div>
                      <p className="text-sm text-slate-400">Estimated Delivery</p>
                      <p className="text-white font-medium">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
