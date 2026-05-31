
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripeCheckoutModal } from '../../components/StripeCheckoutModal';
import { orderService } from '../../services/orderService';
import { supplierService, SupplierDashboardDto, SupplierRequestDto, PurchaseOrderDto } from '../../services/supplierService';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { driverService, Driver } from '../../services/driverService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { notificationService } from '../../services/notificationService';
import { dashboardSignalRService, OrderUpdateEvent } from '../../services/dashboardSignalRService';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { vehicleService, Vehicle } from '../../services/driverService';
import { VehicleLiveTracker } from '../../components/vehicles/VehicleLiveTracker';
import { Truck, Navigation, MapPin } from 'lucide-react';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

type ShipmentsByOrder = Record<number, Shipment[]>;
type WarehouseMap = Record<number, Warehouse | null>;

export function SupplierDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<PurchaseOrderDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [trackingLocation, setTrackingLocation] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [showTrackerModal, setShowTrackerModal] = useState<Vehicle | null>(null);
const [vehicleStats, setVehicleStats] = useState<Record<number, { status: string; progress: number; location: string }>>({});

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleShipmentUpdate = (updatedShipment: Shipment) => {
    setShipmentsByOrder((prev) => {
      const orderId = updatedShipment.orderId;
      const shipmentsForOrder = prev[orderId] ?? [];
      const existingIndex = shipmentsForOrder.findIndex((shipment) => shipment.id === updatedShipment.id);
      if (existingIndex >= 0) {
        const updated = [...shipmentsForOrder];
        updated[existingIndex] = updatedShipment;
        return { ...prev, [orderId]: updated };
      }
      return { ...prev, [orderId]: [...shipmentsForOrder, updatedShipment] };
    });
  };

  const handleOrderUpdate = (update: OrderUpdateEvent) => {
    const targetOrderId = update.purchaseOrderId ?? update.orderId;
    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.map((order) =>
          order.id === targetOrderId
            ? { ...order, status: update.purchaseOrderStatus || update.status }
            : order
        ),
      };
    });
  };

  useEffect(() => {
    let removeShipmentUpdate: () => void = () => {};
    let removeOrderUpdate: () => void = () => {};
    let connected = false;

    const initSignalR = async () => {
      try {
        await dashboardSignalRService.connect();
        connected = true;
        removeShipmentUpdate = dashboardSignalRService.onShipmentUpdate(handleShipmentUpdate);
        removeOrderUpdate = dashboardSignalRService.onOrderUpdate(handleOrderUpdate);
      } catch (err) {
        console.error('Supplier dashboard SignalR connection failed:', err);
      }
    };

    initSignalR();

    return () => {
      removeShipmentUpdate();
      removeOrderUpdate();
      if (connected) {
        dashboardSignalRService.disconnect().catch(() => {});
      }
    };
  }, []);
const fetchVehicles = async () => {
  try {
    const vehiclesData = await vehicleService.getAll();
    setVehicles(vehiclesData);
    const newStats: Record<number, any> = {};
    for (const vehicle of vehiclesData) {
      newStats[vehicle.id] = {
        status: vehicle.isAvailable ? 'available' : 'maintenance',
        progress: Math.floor(Math.random() * 100),
        location: Math.random() > 0.5 ? 'In Route - Highway A1' : 'Warehouse',
      };
    }
    setVehicleStats(newStats);
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
  }
};


useEffect(() => {
  fetchVehicles();
}, []);


  const sendNotification = async (type: string, title: string, message: string, actionUrl?: string) => {
    if (user?.id) {
      try {
        await notificationService.sendNotification({
          userId: user.id,
          type,
          title,
          message,
          actionUrl,
        });
      } catch (err) {
        console.error('Failed to send notification:', err);
      }
    }
  };

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
   
        if (dashboardData.supplierId && !localStorage.getItem('welcome_notification_sent')) {
          await sendNotification(
            'Welcome',
            'Welcome to Supplier Dashboard',
            `Welcome ${dashboardData.supplierName}! You can now manage your products, track orders, and arrange shipments from your dashboard.`,
            '/supplier/dashboard'
          );
          localStorage.setItem('welcome_notification_sent', 'true');
        }
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
      
      let result;
      if (selectedShipment) {
        result = await shipmentService.assignDriver(selectedShipment.id, selectedDriverId);
        await sendNotification(
          'Shipment',
          'Driver Assigned Successfully',
          `Driver has been assigned to shipment for purchase order #${selectedShipmentOrder.poNumber}.`,
          `/supplier/orders/${selectedShipmentOrder.id}`
        );
        showToast('success', 'Driver assigned successfully');
      } else {
        if (!estimatedDeliveryDate) {
          throw new Error('Please select an estimated delivery date');
        }

        result = await shipmentService.create({
          orderId: selectedShipmentOrder.id,
          purchaseOrderId: selectedShipmentOrder.id,
          warehouseId: selectedShipmentOrder.warehouseId,
          driverId: selectedDriverId,
          estimatedDeliveryDate: new Date(estimatedDeliveryDate).toISOString(),
          shippingAddress: shipmentAddress,
          items: selectedShipmentOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
        
        await sendNotification(
          'Shipment',
          'Shipment Created Successfully',
          `Shipment has been created for purchase order #${selectedShipmentOrder.poNumber}. Estimated delivery: ${new Date(estimatedDeliveryDate).toLocaleDateString()}`,
          `/supplier/orders/${selectedShipmentOrder.id}`
        );
        showToast('success', 'Shipment created successfully');
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
      await sendNotification(
        'Error',
        'Shipment Creation Failed',
        `Failed to create shipment for purchase order #${selectedShipmentOrder.poNumber}. Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        `/supplier/orders/${selectedShipmentOrder.id}`
      );
      showToast('error', 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (shipment: Shipment) => {
    setTrackingShipment(shipment);
    setTrackingLocation(null);
    setShowTrackingModal(true);
    try {
      const tracking = await shipmentService.getLiveTracking(shipment.id);
      setTrackingLocation(tracking);
    } catch (err) {
      console.error('Failed to fetch live tracking:', err);
      setTrackingLocation({
        currentLocation: null,
        lastLocationUpdate: null,
        status: shipment.status,
        driverName: shipment.driverName,
        eta: shipment.estimatedDeliveryDate,
        trackingNumber: shipment.trackingNumber,
      });
    }
  };

  const getTrackingMapQuery = () => {
    if (trackingLocation?.currentLocation) {
      const coords = trackingLocation.currentLocation.split(',').map((value: string) => value.trim());
      if (coords.length === 2 && !isNaN(Number(coords[0])) && !isNaN(Number(coords[1]))) {
        return `${coords[0]},${coords[1]}`;
      }
    }
    return '';
  };

  const getTrackingMapUrl = () => {
    const query = getTrackingMapQuery();
    return query ? `https://maps.google.com/maps?q=${query}&output=embed` : '';
  };

  const orderStatuses = useMemo(() => {
    const statuses = dashboard?.orders.map((order) => order.status) ?? [];
    return ['All', ...Array.from(new Set(statuses))];
  }, [dashboard]);

  const filteredOrders = useMemo(() => {
    if (!dashboard) return [];

    return dashboard.orders.filter((order) => {
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const query = orderSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        order.poNumber.toLowerCase().includes(query) ||
        getWarehouseLabel(order.warehouseId).toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [dashboard, orderSearch, statusFilter]);

  const updateOrderStatus = async (orderId: number, status: string) => {
    setUpdatingStatus(true);
    try {
      await supplierService.updatePurchaseOrderStatus(orderId, { status });
      const dashboardData = await supplierService.getDashboard();
      setDashboard(dashboardData);
      
      await sendNotification(
        'OrderStatus',
        `Order Status Updated to ${status}`,
        `Purchase order #${dashboardData?.orders.find(o => o.id === orderId)?.poNumber} status has been updated to ${status}.`,
        `/supplier/orders/${orderId}`
      );
      showToast('success', `Order status updated to ${status}`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      showToast('error', 'Failed to update order status');
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
      
      await sendNotification(
        'Invoice',
        'Invoice Downloaded',
        `Invoice for purchase order #${invoiceNumber} has been downloaded successfully.`,
        `/supplier/orders/${purchaseOrderId}`
      );
    } catch (err) {
      console.error('Failed to download invoice:', err);
      showToast('error', 'Failed to download invoice');
    }
  };

  const openPaymentModal = (order: PurchaseOrderDto) => {
    setSelectedPaymentOrder(order);
    setPaymentAmount(order.totalAmount.toFixed(2));
    setPaymentMethod('Stripe');
    setTransactionId('');
    setPaymentNotes('');
    setPaymentError(null);
    setPaymentSuccess(null);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setSelectedPaymentOrder(null);
    setPaymentAmount('');
    setPaymentMethod('Stripe');
    setTransactionId('');
    setPaymentNotes('');
    setPaymentError(null);
    setPaymentSuccess(null);
    setShowPaymentModal(false);
  };

  const handleSavePayment = async () => {
    if (!selectedPaymentOrder) return;

    const amount = Number(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    if (paymentMethod === 'Stripe') {
      await handleStartStripePayment(amount);
      return;
    }

    try {
      setPaymentError(null);
      setLoading(true);
      await supplierService.createPayment(selectedPaymentOrder.id, {
        purchaseOrderId: selectedPaymentOrder.id,
        amount,
        paymentMethod,
        transactionId: transactionId || undefined,
        notes: paymentNotes || undefined,
      });

      await sendNotification(
        'Payment',
        'Payment Recorded Successfully',
        `Payment of $${amount.toFixed(2)} has been recorded for purchase order #${selectedPaymentOrder.poNumber}. Payment method: ${paymentMethod}`,
        `/supplier/orders/${selectedPaymentOrder.id}`
      );
      
      setPaymentSuccess(`Payment recorded successfully for PO ${selectedPaymentOrder.poNumber}.`);
      showToast('success', `Payment of $${amount.toFixed(2)} recorded successfully`);
      closePaymentModal();
      const dashboardData = await supplierService.getDashboard();
      setDashboard(dashboardData);
    } catch (err: any) {
      console.error('Failed to save payment:', err);
      setPaymentError(err.message || 'Unable to save payment.');
      await sendNotification(
        'Error',
        'Payment Failed',
        `Failed to record payment for purchase order #${selectedPaymentOrder.poNumber}. Error: ${err.message || 'Unknown error'}`,
        `/supplier/orders/${selectedPaymentOrder.id}`
      );
      showToast('error', 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStripePayment = async (amount: number) => {
    if (!selectedPaymentOrder) return;

    try {
      setPaymentError(null);
      setStripeError(null);
      setLoading(true);
      const response = await orderService.createPaymentIntent({ amount, currency: 'eur' });
      setStripeClientSecret(response.clientSecret);
      setShowStripeModal(true);
    } catch (err: any) {
      console.error('Failed to create Stripe payment intent:', err);
      setPaymentError(err.message || 'Unable to create Stripe payment intent.');
      await sendNotification(
        'Error',
        'Stripe Payment Failed',
        `Failed to initialize Stripe payment for purchase order #${selectedPaymentOrder.poNumber}. Error: ${err.message || 'Unknown error'}`,
        `/supplier/orders/${selectedPaymentOrder.id}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStripePaymentSuccess = async (transactionId: string) => {
    if (!selectedPaymentOrder) return;

    try {
      setPaymentError(null);
      setStripeError(null);
      setLoading(true);
      await supplierService.createPayment(selectedPaymentOrder.id, {
        purchaseOrderId: selectedPaymentOrder.id,
        amount: Number(paymentAmount),
        paymentMethod: 'Stripe',
        transactionId,
        notes: paymentNotes || undefined,
      });

      await sendNotification(
        'Payment',
        'Stripe Payment Successful',
        `Stripe payment of $${Number(paymentAmount).toFixed(2)} has been processed successfully for purchase order #${selectedPaymentOrder.poNumber}. Transaction ID: ${transactionId}`,
        `/supplier/orders/${selectedPaymentOrder.id}`
      );
      
      setPaymentSuccess(`Stripe payment saved successfully for PO ${selectedPaymentOrder.poNumber}.`);
      showToast('success', `Stripe payment of $${Number(paymentAmount).toFixed(2)} completed`);
      setShowStripeModal(false);
      closePaymentModal();
      const dashboardData = await supplierService.getDashboard();
      setDashboard(dashboardData);
    } catch (err: any) {
      console.error('Stripe order creation failed:', err);
      setStripeError(err.message || 'Failed to save payment after Stripe payment.');
      await sendNotification(
        'Error',
        'Stripe Payment Processing Failed',
        `Failed to save Stripe payment record for purchase order #${selectedPaymentOrder.poNumber}.`,
        `/supplier/orders/${selectedPaymentOrder.id}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStripeError = (message: string) => {
    setStripeError(message);
    setPaymentError(message);
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
   
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 ${
            toastMessage.type === 'success' ? 'bg-emerald-500 text-white' :
            toastMessage.type === 'error' ? 'bg-red-500 text-white' :
            'bg-cyan-500 text-white'
          }`}>
            <span>{toastMessage.type === 'success' ? '✓' : toastMessage.type === 'error' ? '✗' : 'ℹ'}</span>
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Supplier Dashboard</h1>
              <p className="text-slate-500 mt-2">Track warehouse connections, active requests, and shipment assignments.</p>
            </div>
            <button
              onClick={() => navigate('/supplier/products')}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-700"
            >
              Manage My Products
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Supplier</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">{dashboard.supplierName}</h2>
            <p className="text-slate-500 mt-2">{dashboard.supplierEmail ?? 'No email available'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Supplier staff</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">{supplierContact}</h2>
            <p className="text-slate-500 mt-2">{supplierPhone}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Warehouses served</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">{dashboard.warehouseIds.length}</h2>
            <p className="text-slate-500 mt-2">Connected warehouses</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Open requests</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">{pendingRequests.length}</h2>
            <p className="text-slate-500 mt-2">Pending supplier requests</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Shipments Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500 uppercase tracking-wide">Total shipments</p>
                <p className="text-3xl font-semibold text-slate-900 mt-3">{totalShipments}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500 uppercase tracking-wide">Drivers assigned</p>
                <p className="text-3xl font-semibold text-slate-900 mt-3">{assignedDriverCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-slate-500">No pending requests</div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Warehouse</p>
                    <p className="text-slate-900 font-semibold mt-1">{getWarehouseLabel(request.warehouseId)}</p>
                    <p className="text-slate-500 text-sm mt-2">{request.productName ?? 'Requested support'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Purchase Orders</h2>
              <p className="text-slate-500 mt-1">Manage order payments and arrange shipments from your current purchase orders.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {orderStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status ? 'bg-cyan-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Purchase Orders</h2>
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-slate-500">
              {dashboard.orders.length === 0 ? 'No purchase orders found' : 'No orders match the selected filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-500">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="p-3">PO #</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Shipment</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const latestShipment = getLatestShipment(order.id);
                    return (
                      <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50/40">
                        <td className="p-3 text-slate-900 font-mono text-sm">{order.poNumber}</td>
                        <td className="p-3">{getWarehouseLabel(order.warehouseId)}</td>
                        <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td className="p-3">€{order.totalAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            order.status === 'Purchased' ? 'bg-sky-500/20 text-sky-400' :
                            order.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
                            order.status === 'Shipped' ? 'bg-purple-500/20 text-purple-400' :
                            order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-500'
                          }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{getShipmentSummary(order.id)}</td>
                        <td className="p-3 space-y-2">
                          {!latestShipment ? (
                            <button
                              onClick={() => openShipmentModal(order)}
                              className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-cyan-400 transition"
                            >
                              Arrange delivery
                            </button>
                          ) : !latestShipment.driverId ? (
                            <button
                              onClick={() => openShipmentModal(order, latestShipment)}
                              className="w-full rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-blue-400 transition"
                            >
                              Assign driver
                            </button>
                          ) : (
                            <button
                              onClick={() => trackShipment(latestShipment)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:border-cyan-500 hover:text-slate-900 transition"
                            >
                              Track shipment
                            </button>
                          )}
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="w-full rounded-lg border border-slate-200 bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 transition"
                          >
                            Payment / Arrange shipment
                          </button>
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

      {showPaymentModal && selectedPaymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Record payment for {selectedPaymentOrder.poNumber}</h3>
                <p className="text-slate-500 text-sm">Store a supplier payment record for this purchase order.</p>
              </div>
              <button onClick={closePaymentModal} className="rounded-full border border-slate-200 px-3 py-2 text-slate-500 hover:bg-white">Close</button>
            </div>

            {paymentError && <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">{paymentError}</div>}
            {paymentSuccess && <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50 p-3 text-sm text-emerald-200">{paymentSuccess}</div>}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-slate-500">Payment Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                >
                  <option value="Stripe">Stripe</option>
                  <option value="BankTransfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">Transaction ID / Reference</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Txn ID or bank reference"
                  disabled={paymentMethod === 'Stripe'}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional note for the payment"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={closePaymentModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayment}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400"
                >
                  {paymentMethod === 'Stripe' ? 'Pay with Stripe' : 'Save payment'}
                </button>
              </div>
              {paymentMethod === 'BankTransfer' && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <p><strong className="text-slate-900">Bank transfer instructions</strong></p>
                  <p className="mt-2">Use a bank reference for this payment: <strong>{selectedPaymentOrder.poNumber}</strong>.</p>
                  <p className="mt-1">This will be stored as pending until the payment is reconciled.</p>
                </div>
              )}
              {stripeError && (
                <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-200">{stripeError}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStripeModal && stripeClientSecret && selectedPaymentOrder && (
        <Elements stripe={stripePromise}>
          <StripeCheckoutModal
            clientSecret={stripeClientSecret}
            totalAmount={Number(paymentAmount)}
            onCancel={() => setShowStripeModal(false)}
            onSuccess={handleStripePaymentSuccess}
            onError={handleStripeError}
            isLoading={loading}
          />
        </Elements>
      )}

      {/* Shipment Modal */}
      {showShipmentModal && selectedShipmentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{selectedShipment ? 'Assign driver to shipment' : 'Create shipment'}</h3>
                <p className="text-slate-500 text-sm">Order: {selectedShipmentOrder.poNumber}</p>
              </div>
              <button onClick={closeShipmentModal} className="rounded-full border border-slate-200 px-3 py-2 text-slate-500 hover:bg-white">Close</button>
            </div>

            {shipmentError && <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">{shipmentError}</div>}
            {shipmentSuccess && <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50 p-3 text-sm text-emerald-200">{shipmentSuccess}</div>}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-slate-500">Driver</label>
                <select value={selectedDriverId ?? ''} onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500">
                  <option value="">Select driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.firstName ?? 'Driver'} {driver.lastName ?? ''}</option>
                  ))}
                </select>
              </div>
              {!selectedShipment && (
                <div>
                  <label className="text-sm text-slate-500">Estimated delivery date</label>
                  <input type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500" />
                </div>
              )}
              <div>
                <label className="text-sm text-slate-500">Shipping address</label>
                <input type="text" value={shipmentAddress} onChange={(e) => setShipmentAddress(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-500">
                <p className="text-sm text-slate-500">Order items</p>
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
                <button onClick={closeShipmentModal} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 hover:bg-slate-200">Cancel</button>
                <button onClick={handleShipmentSave} className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-400">
                  {selectedShipment ? 'Assign driver' : 'Create shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Tracking Modal */}
      {showTrackingModal && trackingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Live Tracking - {trackingShipment.trackingNumber}</h3>
              <button onClick={() => setShowTrackingModal(false)} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${trackingLocation?.currentLocation ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                <span className="text-sm text-slate-500">
                  {trackingLocation?.currentLocation ? 'Live tracking active' : 'Awaiting driver GPS...'}
                </span>
              </div>
              <div className="bg-slate-200 rounded-xl p-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/80 h-72 flex items-center justify-center">
                  {getTrackingMapUrl() ? (
                    <iframe
                      title="Supplier live tracking map"
                      src={getTrackingMapUrl()}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-center px-4">
                      <p className="text-slate-500">Waiting for live driver GPS data...</p>
                      <p className="text-slate-500 text-sm mt-2">The driver must start tracking before the live map appears.</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-left space-y-2">
                  <p className="text-slate-500 text-sm">Status: <span className="text-slate-900">{trackingLocation?.status || trackingShipment.status}</span></p>
                  <p className="text-slate-500 text-sm">Driver: <span className="text-slate-900">{trackingLocation?.driverName || trackingShipment.driverName || 'Assigned driver'}</span></p>
                  <p className="text-slate-500 text-sm">ETA: <span className="text-slate-900">{trackingLocation?.eta ? new Date(trackingLocation.eta).toLocaleString() : new Date(trackingShipment.estimatedDeliveryDate).toLocaleString()}</span></p>
                  <p className="text-slate-500 text-sm">Last update: <span className="text-slate-900">{trackingLocation?.lastLocationUpdate ? new Date(trackingLocation.lastLocationUpdate).toLocaleString() : 'Awaiting update'}</span></p>
                  <p className="text-slate-500 text-sm">Current Location: <span className="text-slate-900">{trackingLocation?.currentLocation || 'No live GPS yet'}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




