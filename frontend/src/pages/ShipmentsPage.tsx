import { useEffect, useState } from 'react';
import { Truck, Clock, CheckCircle, AlertCircle, Search, Plus } from 'lucide-react';
import { shipmentService, Shipment } from '../services/shipmentService';
import { ChatWidget } from '../components/ChatWidget';
import { AdvancedSearchBar } from '../components/AdvancedSearchBar';
import { advancedSearch } from '../utils/advancedSearch';
import { signalRService } from '../services/signalRService';
import { ShipmentStatusModal } from '../components/warehouse/ShipmentStatusModal';
import { useTranslation } from 'react-i18next';

export function ShipmentsPage() {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trackingNumber' | 'estimatedDeliveryDate' | 'status'>('estimatedDeliveryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-route' | 'delivered'>('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState<number | null>(null);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const data = await shipmentService.getAll();
      setShipments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setError(t('shipments.errorLoading', 'Failed to load shipments. Make sure the backend is running.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();

    const unsubscribe = signalRService.onEntityUpdated((payload) => {
      try {
        const type = payload?.Type ?? payload?.type ?? payload?.Notification?.type;
        const actionUrl = payload?.Notification?.actionUrl ?? '';
        if (typeof type === 'string' && type.toLowerCase().includes('shipment')) {
          fetchShipments();
        } else if (typeof actionUrl === 'string' && actionUrl.toLowerCase().includes('/shipments')) {
          fetchShipments();
        }
      } catch (err) {
        console.error('Error handling entity update:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleUpdateStatus = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setShowStatusModal(true);
  };

  const filteredShipments = advancedSearch(shipments, {
    query: searchQuery,
    searchFields: ['trackingNumber', 'driverName', 'shippingAddress', 'status'],
    filterPredicates: {
      status: (shipment, value) => shipment.status.toLowerCase() === value.toLowerCase(),
      driver: (shipment, value) => shipment.driverName?.toLowerCase().includes(value.toLowerCase()) ?? false,
      destination: (shipment, value) => shipment.shippingAddress?.toLowerCase().includes(value.toLowerCase()) ?? false,
    },
    sortBy,
    sortDir,
  }).filter((shipment) =>
    statusFilter === 'all' ||
    (statusFilter === 'pending' && shipment.status.toLowerCase().includes('pending')) ||
    (statusFilter === 'in-route' && (shipment.status.toLowerCase().includes('in transit') || shipment.status.toLowerCase().includes('route'))) ||
    (statusFilter === 'delivered' && shipment.status.toLowerCase().includes('delivered'))
  );

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('in') || lower.includes('route')) return 'bg-blue-500/20 text-blue-400';
    if (lower.includes('deliver')) return 'bg-green-500/20 text-green-400';
    if (lower.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    if (lower.includes('processing')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-slate-500/20 text-slate-500';
  };

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('deliver')) return <CheckCircle className="w-5 h-5" />;
    if (lower.includes('route')) return <Truck className="w-5 h-5" />;
    if (lower.includes('pending')) return <Clock className="w-5 h-5" />;
    if (lower.includes('processing')) return <Clock className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
          <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('shipments.loading', 'Loading shipments...')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('shipments.title', 'Shipments')}</h1>
            <p className="text-slate-500 mt-1">{t('shipments.description', 'Manage and monitor all shipments')}</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('shipments.newShipment', 'New Shipment')}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('shipments.quickChat', 'Quick Chat (demo)')}</h2>
          <div className="flex gap-2 mb-3">
            <input type="number" placeholder={t('shipments.recipientIdPlaceholder', 'Recipient user id')} value={chatRecipientId ?? ''} onChange={(e) => setChatRecipientId(e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border border-slate-200 rounded w-48" />
          </div>
          {chatRecipientId && <ChatWidget otherUserId={chatRecipientId} otherUserName={undefined} />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-200">
            <div className="text-2xl font-bold text-slate-900">{shipments.length}</div>
            <p className="text-slate-500 text-sm">{t('shipments.stats.total', 'Total Shipments')}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-200">
            <div className="text-2xl font-bold text-blue-400">{shipments.filter(s => s.status.toLowerCase().includes('in transit')).length}</div>
            <p className="text-slate-500 text-sm">{t('shipments.stats.inTransit', 'In Transit')}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-200">
            <div className="text-2xl font-bold text-green-400">{shipments.filter(s => s.status.toLowerCase().includes('delivered')).length}</div>
            <p className="text-slate-500 text-sm">{t('shipments.stats.delivered', 'Delivered')}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-200">
            <div className="text-2xl font-bold text-yellow-400">{shipments.filter(s => s.status.toLowerCase().includes('pending')).length}</div>
            <p className="text-slate-500 text-sm">{t('shipments.stats.pending', 'Pending')}</p>
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <AdvancedSearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            sortBy={sortBy}
            sortDir={sortDir}
            sortOptions={[
              { value: 'estimatedDeliveryDate', label: t('shipments.sort.deliveryDate', 'Delivery Date') },
              { value: 'trackingNumber', label: t('shipments.sort.trackingNumber', 'Tracking number') },
              { value: 'status', label: t('shipments.sort.status', 'Status') },
            ]}
            onSortByChange={(value) => setSortBy(value as typeof sortBy)}
            onSortDirChange={setSortDir}
            showClear
            onClear={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSortBy('estimatedDeliveryDate');
              setSortDir('asc');
            }}
            placeholder={t('shipments.searchPlaceholder', 'Search tracking, driver, destination or use tokens like status:delivered driver:Anna')}
          />
          <div className="w-full sm:w-64">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:border-cyan-500 outline-none"
            >
              <option value="all">{t('common.allStatus', 'All Status')}</option>
              <option value="pending">{t('shipments.status.pending', 'Pending')}</option>
              <option value="in-route">{t('shipments.status.inTransit', 'In Transit')}</option>
              <option value="delivered">{t('shipments.status.delivered', 'Delivered')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredShipments.length === 0 ? (
            <div className="bg-slate-100/90 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('shipments.noShipments', 'No shipments found')}</p>
            </div>
          ) : (
            filteredShipments.map((shipment) => (
              <div key={shipment.id} className="bg-slate-100/90 rounded-xl border border-slate-200 p-6 hover:border-cyan-500/50 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(shipment.status)}`}>
                      {getStatusIcon(shipment.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{shipment.trackingNumber}</h3>
                      <p className="text-slate-500 text-sm">{t('shipments.orderLabel', 'Order')} #{shipment.orderId}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(shipment.status)}`}>
                    {shipment.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {shipment.driverName && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{t('shipments.driverLabel', 'Driver')}</p>
                      <p className="text-slate-900 font-medium">{shipment.driverName}</p>
                    </div>
                  )}
                  {shipment.vehiclePlate && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{t('shipments.vehicleLabel', 'Vehicle')}</p>
                      <p className="text-slate-900 font-medium">{shipment.vehiclePlate}</p>
                    </div>
                  )}
                  {shipment.estimatedDeliveryDate && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{t('shipments.estimatedDelivery', 'Est. Delivery')}</p>
                      <p className="text-slate-900 font-medium">
                        {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {shipment.shippingAddress && (
                  <div className="bg-slate-50/50 rounded p-3 mb-4">
                    <p className="text-slate-500 text-sm mb-1">{t('shipments.shippingAddress', 'Shipping Address')}</p>
                    <p className="text-slate-900">{shipment.shippingAddress}</p>
                  </div>
                )}

                {(shipment.currentLocation || shipment.lastLocationUpdate) && (
                  <div className="bg-slate-50/50 rounded p-3 mb-4 space-y-2">
                    {shipment.currentLocation && (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">{t('shipments.liveLocation', 'Live Location')}</p>
                        <p className="text-slate-900">{shipment.currentLocation}</p>
                      </div>
                    )}
                    {shipment.lastLocationUpdate && (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">{t('shipments.lastUpdate', 'Last Update')}</p>
                        <p className="text-slate-900 text-sm">{new Date(shipment.lastLocationUpdate).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {shipment.items && shipment.items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-500 text-sm mb-2">{t('shipments.itemsCount', 'Items')} ({shipment.items.length})</p>
                    <div className="flex gap-2 flex-wrap">
                      {shipment.items.map((item) => (
                          <span key={item.id} className="bg-slate-200 px-3 py-1 rounded text-xs text-slate-500">
                          {t('shipments.productLabel', 'Product')} #{item.productId} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 btn-ghost text-sm">
                    {t('shipments.viewDetails', 'View Details')}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(shipment)}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-slate-900 rounded-lg transition text-sm"
                  >
                    {t('shipments.updateStatus', 'Update Status')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showStatusModal && selectedShipment && (
        <ShipmentStatusModal
          shipment={selectedShipment}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedShipment(null);
          }}
          onSuccess={() => {
            fetchShipments();
          }}
        />
      )}
    </>
  );
}




