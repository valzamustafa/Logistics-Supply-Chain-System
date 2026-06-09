import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { shipmentService, Shipment } from '../services/shipmentService';
import { orderService, Order } from '../services/orderService';

export const TrackShipment: React.FC = () => {
  const { t } = useTranslation();
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
            setError(err.message || t('trackShipment.errors.detailsFailed', 'Failed to load shipment details'));
          }
        } else if (allShipments.length > 0) {
          setSelectedShipment(allShipments[0]);
        } else {
          setError(t('trackShipment.errors.noShipments', 'No shipments found. Place an order to start tracking a shipment.'));
        }
      } catch (err: any) {
        setError(err.message || t('trackShipment.errors.trackingFailed', 'Failed to load shipment tracking data'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, user?.id, t]);

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
        status: t('trackShipment.timeline.orderPlaced', 'Order Placed'),
        date: selectedShipment?.estimatedDeliveryDate,
        description: t('trackShipment.timeline.orderPlacedDesc', 'Your order has been confirmed'),
        completed: true,
      },
      {
        status: t('trackShipment.timeline.processing', 'Processing'),
        date: selectedShipment?.estimatedDeliveryDate,
        description: t('trackShipment.timeline.processingDesc', 'Order is being prepared for shipment'),
        completed: selectedShipment?.status?.toLowerCase() !== 'pending',
      },
      {
        status: t('trackShipment.timeline.pickedUp', 'Picked Up'),
        date: selectedShipment?.estimatedDeliveryDate,
        description: t('trackShipment.timeline.pickedUpDesc', 'Package picked up from warehouse'),
        completed:
          selectedShipment?.status?.toLowerCase() !== 'pending' &&
          selectedShipment?.status?.toLowerCase() !== 'processing',
      },
      {
        status: t('trackShipment.timeline.inTransit', 'In Transit'),
        date: selectedShipment?.estimatedDeliveryDate,
        description: t('trackShipment.timeline.inTransitDesc', 'Your package is on the way'),
        completed:
          selectedShipment?.status?.toLowerCase() === 'in transit' ||
          selectedShipment?.status?.toLowerCase() === 'delivered',
      },
      {
        status: t('trackShipment.timeline.delivered', 'Delivered'),
        date: selectedShipment?.actualDeliveryDate,
        description: t('trackShipment.timeline.deliveredDesc', 'Package delivered successfully'),
        completed: selectedShipment?.status?.toLowerCase() === 'delivered',
      },
    ];
  };

  const translateStatus = (status?: string) => {
    if (!status) return t('trackShipment.pending', 'Pending');
    const key = status.toLowerCase().replace(/\s+/g, '');
    return t(`trackShipment.status.${key}`, status);
  };

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return 'bg-slate-500/20 text-slate-500';
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
        <div className="text-slate-500">{t('trackShipment.loading', 'Loading shipment tracking...')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('trackShipment.title', 'Track Your Shipment')}</h1>
          <p className="text-slate-500">{t('trackShipment.description', 'Select a shipment and follow your warehouse driver in real time.')}</p>
        </div>
        <Link
          to="/my-orders"
          className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-200 transition hover:bg-cyan-500/20"
        >
          {t('trackShipment.viewMyOrders', 'View My Orders')}
        </Link>
      </div>

      {error && !selectedShipment ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <p>{error}</p>
          <p className="text-sm text-slate-500 mt-2">{t('trackShipment.startTrackingHint', 'You can start tracking as soon as your order is assigned to a warehouse and driver.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('trackShipment.yourShipments', 'Your Shipments')}</h2>
            {shipments.length === 0 ? (
              <div className="text-slate-500">{t('trackShipment.noShipmentsAvailable', 'No shipments available yet.')}</div>
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
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-600 hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{shipment.trackingNumber}</p>
                        <p className="text-sm text-slate-500">{t('trackShipment.orderLabel', 'Order')} {shipment.orderId}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(shipment.status)}`}>
                        {translateStatus(shipment.status)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-slate-500">
                      {t('trackShipment.driverLabel', 'Driver')}: {shipment.driverName || t('trackShipment.notAssignedYet', 'Not assigned yet')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedShipment && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedShipment.trackingNumber}</h2>
                    <p className="text-slate-500">{t('trackShipment.orderNumber', 'Order #{{id}}', { id: selectedShipment.orderId })}</p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusBadgeClass(selectedShipment.status)}`}>
                    {translateStatus(selectedShipment.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.driverLabel', 'Driver')}</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.driverName || t('trackShipment.unassigned', 'Unassigned')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.vehicleLabel', 'Vehicle')}</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.vehiclePlate || t('trackShipment.na', 'N/A')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.estimatedDelivery', 'Estimated Delivery')}</p>
                      <p className="text-slate-900 font-medium">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.itemsLabel', 'Items')}</p>
                      <p className="text-slate-900 font-medium">{t('trackShipment.itemsCount', '{{count}} items', { count: selectedShipment.items?.length || 0 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t('trackShipment.liveTracking', 'Live Tracking')}</h3>
                    <p className="text-slate-500 text-sm">{t('trackShipment.liveTrackingDesc', 'Latest driver location and shipment status.')}</p>
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
                    className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                  >
                    {t('trackShipment.refresh', 'Refresh')}
                  </button>
                </div>

                {liveLocation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-500 text-sm">{t('trackShipment.currentLocation', 'Current Location')}</p>
                        <p className="text-slate-900">{liveLocation.currentLocation || t('trackShipment.waitingDriverUpdate', 'Waiting for driver update')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">{t('trackShipment.lastUpdate', 'Last Update')}</p>
                        <p className="text-slate-900">{liveLocation.lastLocationUpdate ? new Date(liveLocation.lastLocationUpdate).toLocaleString() : t('trackShipment.noUpdatesYet', 'No updates yet')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-500 text-sm">{t('trackShipment.driverLabel', 'Driver')}</p>
                        <p className="text-slate-900">{liveLocation.driverName || t('trackShipment.notAssigned', 'Not assigned')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">{t('trackShipment.driverContact', 'Driver Contact')}</p>
                        <p className="text-slate-900">{liveLocation.driverPhone || t('trackShipment.na', 'N/A')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">{t('trackShipment.shipmentStatus', 'Shipment Status')}</p>
                        <p className="text-slate-900">{translateStatus(liveLocation.status || selectedShipment.status)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">{t('trackShipment.liveTrackingLoading', 'Live tracking is loading for this shipment.')}</p>
                )}

                {liveLocation?.currentLocation ? (
                  <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/80 h-72">
                    <iframe
                      title={t('trackShipment.mapTitle', 'Shipment map')}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(liveLocation.currentLocation)}&output=embed`}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-100/90 p-6 text-center">
                    <p className="text-slate-500">{t('trackShipment.noDriverLocation', 'Driver live location is not available yet.')}</p>
                    <p className="text-slate-500 text-sm mt-2">{t('trackShipment.waitingGps', 'The driver must send GPS updates for this shipment before the map appears.')}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 mt-1">??</div>
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.shippingAddress', 'Shipping Address')}</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.shippingAddress || t('trackShipment.addressNotProvided', 'Address not provided')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 mt-1">??</div>
                    <div>
                      <p className="text-sm text-slate-500">{t('trackShipment.estimatedDelivery', 'Estimated Delivery')}</p>
                      <p className="text-slate-900 font-medium">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}</p>
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





