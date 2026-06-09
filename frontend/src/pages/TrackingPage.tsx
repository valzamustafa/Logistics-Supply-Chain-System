import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { shipmentService, Shipment } from '../services/shipmentService';
import { orderService } from '../services/orderService';
import { driverService } from '../services/driverService';
import { dashboardSignalRService, OrderUpdateEvent } from '../services/dashboardSignalRService';
import { Truck, MapPin, Calendar, User, AlertCircle, RefreshCcw, Activity, BellRing } from 'lucide-react';

interface LiveTrackingInfo {
  trackingNumber?: string;
  currentLocation?: string;
  lastLocationUpdate?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
}

interface LiveEvent {
  id: string;
  type: 'shipment' | 'order' | 'system';
  title: string;
  summary: string;
  details: string;
  source: string;
  shipmentId?: string;
  orderId?: number;
  status?: string;
  timestamp: string;
}

export function TrackingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const selectedShipmentRef = useRef<Shipment | null>(null);
  const [liveTracking, setLiveTracking] = useState<LiveTrackingInfo | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadShipments();
  }, [user?.roles]);

  useEffect(() => {
    selectedShipmentRef.current = selectedShipment;
  }, [selectedShipment]);

  useEffect(() => {
    if (!selectedShipment) {
      setLiveTracking(null);
      return;
    }

    let intervalId: number | undefined;

    refreshLiveTracking();
    intervalId = window.setInterval(refreshLiveTracking, 12000);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [selectedShipment]);

  useEffect(() => {
    let removeShipmentUpdate: () => void = () => {};
    let removeOrderUpdate: () => void = () => {};
    let connected = false;

    const handleShipmentUpdate = (updatedShipment: Shipment) => {
      setShipments((prev) => {
        const index = prev.findIndex((shipment) => shipment.id === updatedShipment.id);
        if (index >= 0) {
          return prev.map((shipment) => shipment.id === updatedShipment.id ? updatedShipment : shipment);
        }
        return [updatedShipment, ...prev];
      });

      if (selectedShipmentRef.current?.id === updatedShipment.id) {
        setSelectedShipment(updatedShipment);
      }

      setLiveEvents((prev) => [
        {
          id: `shipment-${updatedShipment.id}-${Date.now()}`,
          type: 'shipment' as const,
          title: `Shipment ${updatedShipment.trackingNumber} status updated`,
          summary: `${updatedShipment.trackingNumber} is now ${updatedShipment.status}.`,
          details: `Driver: ${updatedShipment.driverName || 'Unassigned'} • Location: ${updatedShipment.currentLocation || 'Unknown'} • Order: #${updatedShipment.orderId}`,
          source: updatedShipment.updatedBy ? `Updated by ${updatedShipment.updatedBy}` : 'Shipment Service',
          shipmentId: updatedShipment.id,
          status: updatedShipment.status,
          timestamp: new Date().toISOString(),
        },
        ...prev
      ].slice(0, 20));
    };

    const handleOrderUpdate = (update: OrderUpdateEvent) => {
      setLiveEvents((prev) => [
        {
          id: `order-${update.orderId}-${Date.now()}`,
          type: 'order' as const,
          title: `Order #${update.orderId} status change`,
          summary: `Order status updated to ${update.purchaseOrderStatus || update.status}.`,
          details: `Shipment: ${update.shipmentId || 'N/A'} • Actor: ${update.actor || 'System'}`,
          source: update.actor ? `Changed by ${update.actor}` : 'Order Service',
          orderId: update.orderId,
          status: update.purchaseOrderStatus || update.status,
          timestamp: new Date().toISOString(),
        },
        ...prev
      ].slice(0, 20));
    };

    const pushSystemEvent = (summary: string, details: string) => {
      setLiveEvents((prev) => [
        {
          id: `system-${Date.now()}-${prev.length}`,
          type: 'system' as const,
          title: 'Real-time feed update',
          summary,
          details,
          source: 'Tracking Page',
          timestamp: new Date().toISOString(),
        },
        ...prev
      ].slice(0, 20));
    };

    const initRealtime = async () => {
      try {
        await dashboardSignalRService.connect();
        connected = true;
        setRealtimeConnected(true);
        removeShipmentUpdate = dashboardSignalRService.onShipmentUpdate(handleShipmentUpdate);
        removeOrderUpdate = dashboardSignalRService.onOrderUpdate(handleOrderUpdate);
        pushSystemEvent('Realtime connection established.', 'Live shipment feed is now connected to the operations hub.');
      } catch (err) {
        console.error('Tracking page SignalR connection failed:', err);
        setRealtimeConnected(false);
        pushSystemEvent('Realtime connection failed.', 'Live shipment feed is offline. Updates will resume once connection is restored.');
      }
    };

    initRealtime();

    return () => {
      removeShipmentUpdate();
      removeOrderUpdate();
      if (connected) {
        dashboardSignalRService.disconnect().catch(() => {});
      }
    };
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);

    const rolePriority = ['Admin', 'Manager', 'Supplier', 'Driver', 'WarehouseStaff', 'Warehouse', 'User'];
    const userRole = user?.roles?.find((role) => rolePriority.includes(role)) || 'User';

    try {
      let data: Shipment[] = [];

      if (userRole === 'User' && user?.id) {
        const orders = await orderService.getByUser(user.id);
        const shipmentsByOrder = await Promise.all(
          orders.map(async (order) => {
            try {
              return await shipmentService.getByOrderId(order.id);
            } catch (err) {
              console.warn(`Failed loading shipment for order ${order.id}:`, err);
              return [] as Shipment[];
            }
          })
        );
        data = shipmentsByOrder.flat();
      } else if (userRole === 'Driver') {
        const driverShipments = await driverService.getMyShipments();
        data = driverShipments as unknown as Shipment[];
      } else {
        data = await shipmentService.getAll();
      }

      setShipments(data);
      if (data.length > 0) setSelectedShipment(data[0]);
    } catch (err) {
      console.error('Failed to load shipments:', err);
      setError(t('shipments.errorLoading', 'Failed to load shipments. Make sure the backend is running.'));
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
      { label: t('trackShipment.timeline.orderPlaced', 'Order Placed'), completed: true },
      { label: t('trackShipment.timeline.processing', 'Processing'), completed: ['Processing', 'Shipped', 'In Transit', 'Delivered'].includes(status) },
      { label: t('orders.shipped', 'Shipped'), completed: ['Shipped', 'In Transit', 'Delivered'].includes(status) },
      { label: t('trackShipment.timeline.inTransit', 'In Transit'), completed: ['In Transit', 'Delivered'].includes(status) },
      { label: t('trackShipment.timeline.delivered', 'Delivered'), completed: status === 'Delivered' },
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
        return 'bg-slate-500/20 text-slate-500';
    }
  };

  const getMapQuery = () => {
    if (liveTracking?.currentLocation) {
      const coords = liveTracking.currentLocation.split(',').map((value) => value.trim());
      if (coords.length === 2 && !isNaN(Number(coords[0])) && !isNaN(Number(coords[1]))) {
        return `${coords[0]},${coords[1]}`;
      }
    }
    return '';
  };

  const mapUrl = getMapQuery() ? `https://maps.google.com/maps?q=${getMapQuery()}&output=embed` : '';

  const refreshLiveTracking = async () => {
    if (!selectedShipment) return;
    try {
      const data = await shipmentService.getLiveTracking(selectedShipment.id);
      setLiveTracking(data);
    } catch (err) {
      console.error('Failed to refresh live tracking:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('shipments.loading', 'Loading shipments...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('tracking.title', 'Shipment Tracking')}</h1>
        <p className="text-slate-500">{t('tracking.description', 'Real-time tracking and monitoring of all shipments')}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List of Shipments */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur h-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('shipments.title', 'Shipments')}</h2>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder={t('tracking.searchPlaceholder', 'Search tracking #...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-200 border border-slate-600 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
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
                        : 'bg-slate-100/80 border border-slate-600/30 hover:bg-slate-100/80'
                    }`}
                  >
                    <p className="text-slate-900 font-medium text-sm">{shipment.trackingNumber}</p>
                    <p className="text-xs text-slate-500 mt-1">{shipment.shippingAddress || t('tracking.noAddress', 'No address')}</p>
                    <span className={`text-xs mt-2 inline-block px-2 py-1 rounded ${getStatusBadge(shipment.status)}`}>
                      {t(`trackShipment.status.${shipment.status.toLowerCase().replace(/\s+/g, '')}`, shipment.status)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4 text-sm">{t('shipments.noShipments', 'No shipments found')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tracking Details */}
        {selectedShipment && (
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedShipment.trackingNumber}</h2>
                  <p className="text-slate-500">{t('trackShipment.orderNumber', 'Order #{{id}}', { id: selectedShipment.orderId })}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedShipment.status)}`}>
                  {t(`trackShipment.status.${selectedShipment.status.toLowerCase().replace(/\s+/g, '')}`, selectedShipment.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('trackShipment.driverLabel', 'Driver')}</p>
                  <p className="text-slate-900 font-medium">{selectedShipment.driverName || t('trackShipment.notAssigned', 'Not assigned')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('trackShipment.vehicleLabel', 'Vehicle')}</p>
                  <p className="text-slate-900 font-medium">{selectedShipment.vehiclePlate || t('trackShipment.na', 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('shipments.estimatedDelivery', 'Est. Delivery')}</p>
                  <p className="text-slate-900 font-medium">
                    {new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('trackShipment.itemsLabel', 'Items')}</p>
                  <p className="text-slate-900 font-medium">{t('trackShipment.itemsCount', '{{count}} items', { count: selectedShipment.items?.length || 0 })}</p>
                </div>
              </div>
            </div>

            {/* Live Tracking Panel */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{t('trackShipment.liveTracking', 'Live Tracking')}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${realtimeConnected ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {realtimeConnected ? t('tracking.realtimeConnected', 'Real-time connected') : t('tracking.liveUpdatesOffline', 'Live updates offline')}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">{t('trackShipment.liveTrackingDesc', 'Latest driver location and shipment status.')}</p>
                </div>
                <button
                  onClick={refreshLiveTracking}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                >
                  {t('trackShipment.refresh', 'Refresh')}
                </button>
              </div>
              {liveTracking ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-500 text-sm">{t('trackShipment.currentLocation', 'Current Location')}</p>
                      <p className="text-slate-900">{liveTracking.currentLocation || t('trackShipment.waitingDriverUpdate', 'Waiting for driver update')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">{t('trackShipment.lastUpdate', 'Last Update')}</p>
                      <p className="text-slate-900">{liveTracking.lastLocationUpdate ? new Date(liveTracking.lastLocationUpdate).toLocaleString() : t('trackShipment.noUpdatesYet', 'No updates yet')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-500 text-sm">{t('trackShipment.driverLabel', 'Driver')}</p>
                      <p className="text-slate-900">{liveTracking.driverName || t('trackShipment.notAssigned', 'Not assigned')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">{t('trackShipment.driverContact', 'Driver Contact')}</p>
                      <p className="text-slate-900">{liveTracking.driverPhone || t('trackShipment.na', 'N/A')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">{t('trackShipment.shipmentStatus', 'Shipment Status')}</p>
                      <p className="text-slate-900">{t(`trackShipment.status.${(liveTracking.status || selectedShipment.status).toLowerCase().replace(/\s+/g, '')}`, liveTracking.status || selectedShipment.status)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">{t('trackShipment.liveTrackingLoading', 'Live tracking is loading for this shipment.')}</p>
              )}

              {liveTracking?.currentLocation ? (
                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/80 h-72">
                  <iframe
                    title={t('trackShipment.mapTitle', 'Shipment map')}
                    src={mapUrl}
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

            {/* Live Event Stream */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t('tracking.liveShipmentFeed', 'Live Shipment Feed')}</h3>
                  <p className="text-slate-500 text-sm">{t('tracking.liveShipmentFeedDesc', 'Real-time shipment and order events from the operations center.')}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  <BellRing className="h-4 w-4 text-cyan-500" />
                  {t('tracking.eventsCount', '{{count}} events', { count: liveEvents.length })}
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {liveEvents.length > 0 ? liveEvents.map((event, index) => (
                  <div key={event.id} className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="absolute left-4 top-5 h-full w-px bg-slate-200" />
                    <div className="relative flex items-start gap-4">
                      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                        {event.type === 'shipment' ? (
                          <Truck className="h-5 w-5" />
                        ) : event.type === 'order' ? (
                          <Activity className="h-5 w-5" />
                        ) : (
                          <BellRing className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                            {event.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{event.summary}</p>
                        <p className="text-sm text-slate-400 mt-2">{event.details}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.70rem] text-slate-400">
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{event.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                    <p>{t('tracking.noLiveEvents', 'No live events yet. Real-time updates will appear here.')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
              <h3 className="text-lg font-bold text-slate-900 mb-6">{t('tracking.liveOperationTimeline', 'Live Operation Timeline')}</h3>
              <div className="relative border-l border-slate-200 pl-6">
                {liveEvents.length > 0 ? liveEvents.map((event, index) => (
                  <div key={event.id} className="relative mb-8 last:mb-0">
                    <span className="absolute -left-3 top-1 h-6 w-6 rounded-full border-4 border-white bg-cyan-500 shadow-sm"></span>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mt-1">{t('tracking.eventType', '{{type}} event', { type: event.type })}</p>
                        </div>
                        <span className="text-[0.70rem] text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-3">{event.summary}</p>
                      <p className="text-sm text-slate-400 mt-2">{event.details}</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                    <p>{t('tracking.noTimelineEvents', 'No operational timeline events yet. Events populate here as shipments and orders update.')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Info */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500">{t('trackShipment.shippingAddress', 'Shipping Address')}</p>
                    <p className="text-slate-900 font-medium">{selectedShipment.shippingAddress || t('trackShipment.addressNotProvided', 'Address not provided')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-500">{t('trackShipment.estimatedDelivery', 'Estimated Delivery')}</p>
                    <p className="text-slate-900 font-medium">
                      {new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedShipment.actualDeliveryDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">{t('orders.delivered', 'Delivered')}</p>
                      <p className="text-slate-900 font-medium">
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





