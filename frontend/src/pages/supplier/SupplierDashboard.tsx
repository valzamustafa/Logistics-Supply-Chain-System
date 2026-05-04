import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierService, SupplierDashboardDto, SupplierRequestDto, PurchaseOrderDto } from '../../services/supplierService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { driverService, Driver } from '../../services/driverService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { api } from '../../services/api';

type ShipmentsByOrder = Record<number, Shipment[]>;
type WarehouseMap = Record<number, Warehouse | null>;

export function SupplierDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<SupplierDashboardDto | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseMap>({});
  const [shipmentsByOrder, setShipmentsByOrder] = useState<ShipmentsByOrder>({});
  const [pendingRequests, setPendingRequests] = useState<SupplierRequestDto[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedShipmentOrder, setSelectedShipmentOrder] = useState<PurchaseOrderDto | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [shipmentAddress, setShipmentAddress] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentSuccess, setShipmentSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<PurchaseOrderDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [trackingLocation, setTrackingLocation] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const dashboardData = await supplierService.getDashboard();
        setDashboard(dashboardData);

        const [requests, orderShipments, loadableDrivers] = await Promise.all([
          supplierService.getPendingRequests().catch(() => []),
          Promise.all(
            dashboardData.orders.map(async (order) => {
              try {
                return [order.id, await shipmentService.getByOrderId(order.id)] as const;
              } catch {
                return [order.id, []] as const;
              }
            })
          ),
          driverService.getAvailable().catch(() => []),
        ]);

        const drivers = loadableDrivers.length > 0 ? loadableDrivers : await driverService.getAll().catch(() => []);

        const warehouseIds = Array.from(new Set([
          ...dashboardData.warehouseIds,
          ...requests.map((request) => request.warehouseId),
        ]));

        const warehouseEntries = await Promise.all(
          warehouseIds.map(async (warehouseId) => {
            try {
              return [warehouseId, await warehouseService.getById(warehouseId)] as const;
            } catch {
              return [warehouseId, null] as const;
            }
          })
        );

        setPendingRequests(requests);
        setShipmentsByOrder(Object.fromEntries(orderShipments));
        setWarehouses(Object.fromEntries(warehouseEntries));
        setAvailableDrivers(drivers);
      } catch (err) {
        console.error('Failed to load supplier dashboard:', err);
        setError('Unable to load your supplier dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const totalShipments = useMemo(
    () => Object.values(shipmentsByOrder).reduce((sum, shipments) => sum + shipments.length, 0),
    [shipmentsByOrder]
  );

  const assignedDriverCount = useMemo(
    () => Object.values(shipmentsByOrder).flat().filter((shipment) => shipment.driverId != null).length,
    [shipmentsByOrder]
  );

  const supplierContact = dashboard?.supplierContactPerson || 'Not available';
  const supplierPhone = dashboard?.supplierPhone || 'Not available';

  const getWarehouseLabel = (warehouseId: number) => {
    const warehouse = warehouses[warehouseId];
    return warehouse ? warehouse.name : `Warehouse #${warehouseId}`;
  };

  const getShipmentSummary = (orderId: number) => {
    const shipments = shipmentsByOrder[orderId] ?? [];
    if (shipments.length === 0) return 'No shipment assigned yet';
    const latest = shipments[shipments.length - 1];
    const driverLabel = latest.driverId ? `Driver #${latest.driverId}` : 'No driver assigned';
    return `${shipments.length} shipment${shipments.length > 1 ? 's' : ''} • ${latest.status} • ${driverLabel}`;
  };

  const getLatestShipment = (orderId: number) => {
    const shipments = shipmentsByOrder[orderId] ?? [];
    return shipments.length > 0 ? shipments[shipments.length - 1] : null;
  };

  const getWarehouseAddress = (warehouseId: number) => {
    const warehouse = warehouses[warehouseId];
    return warehouse?.location ?? `Warehouse #${warehouseId}`;
  };

  const openShipmentModal = (order: PurchaseOrderDto, shipment?: Shipment | null) => {
    setSelectedShipmentOrder(order);
    setSelectedShipment(shipment ?? null);
    setSelectedDriverId(shipment?.driverId ?? null);
    setShipmentAddress(getWarehouseAddress(order.warehouseId));
    setEstimatedDeliveryDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setShipmentError(null);
    setShipmentSuccess(null);
    setShowShipmentModal(true);
  };

  const closeShipmentModal = () => {
    setSelectedShipmentOrder(null);
    setSelectedShipment(null);
    setSelectedDriverId(null);
    setShipmentAddress('');
    setEstimatedDeliveryDate('');
    setShipmentError(null);
    setShowShipmentModal(false);
  };

  const handleShipmentSave = async () => {
    if (!selectedShipmentOrder) return;

    if (!selectedDriverId) {
      setShipmentError('Select a driver before creating or assigning the shipment.');
      return;
    }

    try {
      setShipmentError(null);
      setLoading(true);
      if (selectedShipment) {
        await shipmentService.assignDriver(selectedShipment.id, selectedDriverId);
      } else {
        await shipmentService.create({
          orderId: selectedShipmentOrder.id,
          warehouseId: selectedShipmentOrder.warehouseId,
          driverId: selectedDriverId,
          estimatedDeliveryDate: new Date(estimatedDeliveryDate).toISOString(),
          shippingAddress: shipmentAddress,
          items: selectedShipmentOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
      }

      const dashboardData = await supplierService.getDashboard();
      setDashboard(dashboardData);
      const refreshedShipments = await shipmentService.getByOrderId(selectedShipmentOrder.id);
      setShipmentsByOrder((prev) => ({ ...prev, [selectedShipmentOrder.id]: refreshedShipments }));
      setShipmentSuccess(selectedShipment ? 'Driver assigned successfully' : 'Shipment created successfully');
      closeShipmentModal();
    } catch (err) {
      console.error('Failed to save shipment:', err);
      setShipmentError('Unable to create shipment. Check driver and try again.');
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (shipment: Shipment) => {
    setTrackingShipment(shipment);
    setShowTrackingModal(true);
    try {
      const tracking = await shipmentService.getLiveTracking(shipment.id);
      setTrackingLocation(tracking);
    } catch (err) {
      setTrackingLocation({
        status: shipment.status,
        lastUpdate: new Date().toLocaleString(),
        driverName: shipment.driverName,
        eta: shipment.estimatedDeliveryDate,
        trackingNumber: shipment.trackingNumber
      });
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/api/suppliers/orders/${orderId}/status`, { status });
      const dashboardData = await supplierService.getDashboard();
      setDashboard(dashboardData);
      alert(`Order status updated to ${status}`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const downloadInvoice = async (purchaseOrderId: number, invoiceNumber?: string) => {
    try {
      const blob = await supplierService.getInvoicePdf(purchaseOrderId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber ?? `invoice-${purchaseOrderId}`}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-300">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-6 text-yellow-300">
          No supplier profile was found for your account. Please contact an administrator.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h1 className="text-3xl font-bold text-white">Supplier Dashboard</h1>
          <p className="text-slate-400 mt-2">Track warehouse connections, active requests, and shipment assignments.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-400 uppercase tracking-wide">Supplier</p>
            <h2 className="text-xl font-semibold text-white mt-2">{dashboard.supplierName}</h2>
            <p className="text-slate-400 mt-2">{dashboard.supplierEmail ?? 'No email available'}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-400 uppercase tracking-wide">Supplier staff</p>
            <h2 className="text-xl font-semibold text-white mt-2">{supplierContact}</h2>
            <p className="text-slate-400 mt-2">{supplierPhone}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-400 uppercase tracking-wide">Warehouses served</p>
            <h2 className="text-xl font-semibold text-white mt-2">{dashboard.warehouseIds.length}</h2>
            <p className="text-slate-400 mt-2">Connected warehouses</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-400 uppercase tracking-wide">Open requests</p>
            <h2 className="text-xl font-semibold text-white mt-2">{pendingRequests.length}</h2>
            <p className="text-slate-400 mt-2">Pending supplier requests</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Shipments Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-sm text-slate-400 uppercase tracking-wide">Total shipments</p>
                <p className="text-3xl font-semibold text-white mt-3">{totalShipments}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-sm text-slate-400 uppercase tracking-wide">Drivers assigned</p>
                <p className="text-3xl font-semibold text-white mt-3">{assignedDriverCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">No pending requests</div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm text-slate-400">Warehouse</p>
                    <p className="text-white font-semibold mt-1">{getWarehouseLabel(request.warehouseId)}</p>
                    <p className="text-slate-400 text-sm mt-2">{request.productName ?? 'Requested support'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Purchase Orders</h2>
          {dashboard.orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">No purchase orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-3">PO #</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Shipment</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.orders.map((order) => {
                    const latestShipment = getLatestShipment(order.id);
                    return (
                      <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-900/40">
                        <td className="p-3 text-white font-mono text-sm">{order.poNumber}</td>
                        <td className="p-3">{getWarehouseLabel(order.warehouseId)}</td>
                        <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            disabled={updatingStatus}
                            className={`px-2 py-1 rounded-full text-xs cursor-pointer ${
                              order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              order.status === 'Shipped' ? 'bg-blue-500/20 text-blue-400' :
                              order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-200">{getShipmentSummary(order.id)}</td>
                        <td className="p-3 space-y-2">
                          {!latestShipment && (
                            <button
                              onClick={() => openShipmentModal(order)}
                              className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-cyan-400 w-full"
                            >
                              Create shipment
                            </button>
                          )}
                          {latestShipment && !latestShipment.driverId && (
                            <button
                              onClick={() => openShipmentModal(order, latestShipment)}
                              className="rounded-lg bg-blue-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-blue-400 w-full"
                            >
                              Assign driver
                            </button>
                          )}
                          {latestShipment && latestShipment.driverId && (
                            <button
                              onClick={() => trackShipment(latestShipment)}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:border-cyan-500 hover:text-white w-full"
                            >
                              Track shipment
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showShipmentModal && selectedShipmentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedShipment ? 'Assign driver to shipment' : 'Create shipment'}</h3>
                <p className="text-slate-400 text-sm">Order: {selectedShipmentOrder.poNumber}</p>
              </div>
              <button onClick={closeShipmentModal} className="rounded-full border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800">Close</button>
            </div>

            {shipmentError && <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">{shipmentError}</div>}
            {shipmentSuccess && <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50 p-3 text-sm text-emerald-200">{shipmentSuccess}</div>}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-slate-300">Driver</label>
                <select value={selectedDriverId ?? ''} onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500">
                  <option value="">Select driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.firstName ?? 'Driver'} {driver.lastName ?? ''}</option>
                  ))}
                </select>
              </div>
              {!selectedShipment && (
                <div>
                  <label className="text-sm text-slate-300">Estimated delivery date</label>
                  <input type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500" />
                </div>
              )}
              <div>
                <label className="text-sm text-slate-300">Shipping address</label>
                <input type="text" value={shipmentAddress} onChange={(e) => setShipmentAddress(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500" />
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-slate-300">
                <p className="text-sm text-slate-400">Order items</p>
                <div className="mt-3 space-y-2">
                  {selectedShipmentOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm">
                      <span>Product #{item.productId}</span>
                      <span>{item.quantity} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button onClick={closeShipmentModal} className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 hover:bg-slate-700">Cancel</button>
                <button onClick={handleShipmentSave} className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-400">
                  {selectedShipment ? 'Assign driver' : 'Create shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    
      {showTrackingModal && trackingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Live Tracking - {trackingShipment.trackingNumber}</h3>
              <button onClick={() => setShowTrackingModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Live tracking active</span>
              </div>
              <div className="bg-slate-700 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-slate-300">Live map will appear here</p>
                <div className="mt-4 text-left space-y-2">
                  <p className="text-slate-400 text-sm">Status: <span className="text-white">{trackingShipment.status}</span></p>
                  <p className="text-slate-400 text-sm">Driver: <span className="text-white">{trackingShipment.driverName || 'Assigned driver'}</span></p>
                  <p className="text-slate-400 text-sm">ETA: <span className="text-white">{new Date(trackingShipment.estimatedDeliveryDate).toLocaleString()}</span></p>
                  <p className="text-slate-400 text-sm">Last update: <span className="text-white">{new Date().toLocaleString()}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}