import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supplierService, Supplier, PurchaseOrderDto, CreatePurchaseOrderDto, SupplierProductDto } from '../services/supplierService';
import { orderService } from '../services/orderService';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripeCheckoutModal } from '../components/StripeCheckoutModal';
import { productService, Product } from '../services/productService';
import { warehouseService, Warehouse } from '../services/warehouseService';
import { dashboardSignalRService, OrderUpdateEvent } from '../services/dashboardSignalRService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/Pagination';

export function SuppliersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<'suppliers' | 'orders'>('orders');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductDto[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPageSuppliers, setCurrentPageSuppliers] = useState(1);
  const [pageSizeSuppliers, setPageSizeSuppliers] = useState(10);
  const [currentPageOrders, setCurrentPageOrders] = useState(1);
  const [pageSizeOrders, setPageSizeOrders] = useState(10);

  const [orderForm, setOrderForm] = useState<CreatePurchaseOrderDto>({
    supplierId: 0,
    warehouseId: 0,
    items: [{ productId: 0, quantity: 1, unitPrice: 0 }],
  });

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderDto | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'BankTransfer'>('BankTransfer');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderDto | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');
  const [pendingPurchaseOrderPayload, setPendingPurchaseOrderPayload] = useState<CreatePurchaseOrderDto | null>(null);
  const [pendingOrderTotal, setPendingOrderTotal] = useState<number>(0);

  const filteredProducts = useMemo(() => {
    if (!orderForm.supplierId) return [];
    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    return products.filter((product) => supplierProductIds.has(product.id));
  }, [orderForm.supplierId, products, supplierProducts]);

  const totalSupplierPages = Math.max(1, Math.ceil(suppliers.length / pageSizeSuppliers));
  const totalOrderPages = Math.max(1, Math.ceil(orders.length / pageSizeOrders));
  const paginatedSuppliers = suppliers.slice((currentPageSuppliers - 1) * pageSizeSuppliers, currentPageSuppliers * pageSizeSuppliers);
  const paginatedOrders = orders.slice((currentPageOrders - 1) * pageSizeOrders, currentPageOrders * pageSizeOrders);

  useEffect(() => {
    if (currentPageSuppliers > totalSupplierPages) {
      setCurrentPageSuppliers(totalSupplierPages);
    }
  }, [currentPageSuppliers, totalSupplierPages]);

  useEffect(() => {
    if (currentPageOrders > totalOrderPages) {
      setCurrentPageOrders(totalOrderPages);
    }
  }, [currentPageOrders, totalOrderPages]);

  useEffect(() => {
    setCurrentPageSuppliers(1);
  }, [pageSizeSuppliers, suppliers.length]);

  useEffect(() => {
    setCurrentPageOrders(1);
  }, [pageSizeOrders, orders.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [supplierData, orderData, productData, warehouseData] = await Promise.all([
        supplierService.getAll(),
        supplierService.getAllPurchaseOrders(),
        productService.getAll(true),
        warehouseService.getAll(),
      ]);
      setSuppliers(supplierData);
      setOrders(orderData);
      setProducts(productData);
      setWarehouses(warehouseData);
      setError(null);
    } catch (err) {
      console.error('Failed to load supplier page data:', err);
      setError(t('suppliers.failedToLoad', 'Failed to load supplier information'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStripePaymentSuccess = async (transactionId: string) => {
    if (!pendingPurchaseOrderPayload) return;

    try {
    
      const createdOrder = await supplierService.createPurchaseOrder(pendingPurchaseOrderPayload);

   
      await supplierService.createPayment(createdOrder.id, {
        purchaseOrderId: createdOrder.id,
        amount: pendingOrderTotal,
        paymentMethod: 'Stripe',
        transactionId,
        notes: 'Stripe payment from suppliers page'
      });

      setShowStripeModal(false);
      setStripeClientSecret(null);
      setPendingPurchaseOrderPayload(null);
      setPendingOrderTotal(0);
      await loadData();
      setSuccess(t('payments.paymentSaved', 'Payment saved successfully'));
    } catch (err) {
      console.error('Failed to save stripe payment:', err);
      setStripeError(t('payments.failedToSave', 'Failed to save payment'));
      setPendingPurchaseOrderPayload(null);
      setPendingOrderTotal(0);
    }
  };

  const handleStripeCancel = () => {
    setShowStripeModal(false);
    setStripeClientSecret(null);
  };

  const handleStripeErrorLocal = (message: string) => {
    setStripeError(message);
    setShowStripeModal(false);
  };

  const handleOrderUpdate = (update: OrderUpdateEvent) => {
    const rawTarget = update.purchaseOrderId ?? update.orderId;
    const targetId = typeof rawTarget === 'string' ? parseInt(rawTarget, 10) : Number(rawTarget);
    if (!targetId || Number.isNaN(targetId)) return;

    setOrders((current) => current.map((order) =>
      order.id === targetId ? { ...order, status: update.purchaseOrderStatus || update.status } : order
    ));
  };

  useEffect(() => {
    let removeOrderUpdate: () => void = () => {};
    let connected = false;

    const initSignalR = async () => {
      try {
        await dashboardSignalRService.connect();
        connected = true;
        removeOrderUpdate = dashboardSignalRService.onOrderUpdate(handleOrderUpdate);
      } catch (err) {
        console.error('Suppliers page SignalR connection failed:', err);
      }
    };

    initSignalR();

    return () => {
      removeOrderUpdate();
      if (connected) {
        dashboardSignalRService.disconnect().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const loadSupplierProducts = async () => {
      if (!orderForm.supplierId) {
        setSupplierProducts([]);
        return;
      }

      try {
        const supplierData = await supplierService.getProductsBySupplier(orderForm.supplierId);
        setSupplierProducts(supplierData);
      } catch (err) {
        console.error('Failed to load supplier products:', err);
        setSupplierProducts([]);
      }
    };

    loadSupplierProducts();
  }, [orderForm.supplierId]);

  const handleCreateOrder = async () => {
    if (!orderForm.supplierId || !orderForm.warehouseId || orderForm.items.length === 0) {
      setError(t('suppliers.selectSupplierWarehouseItem', 'Select a supplier, warehouse, and add at least one item to create a purchase order'));
      return;
    }

    console.log('handleCreateOrder invoked, paymentMethod=', paymentMethod);
    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    if (orderForm.items.some((item) => item.productId === 0 || !supplierProductIds.has(item.productId))) {
      setError(t('suppliers.selectValidProducts', 'Please select valid products from the supplier-specific catalog.'));
      return;
    }
    try {
      setLoading(true);

      const totalAmount = orderForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const selectedSupplier = suppliers.find(s => s.id === orderForm.supplierId);
      const selectedWarehouse = warehouses.find(w => w.id === orderForm.warehouseId);

      const payload = { ...orderForm };
      setPendingPurchaseOrderPayload(payload);
      setPendingOrderTotal(totalAmount);

      if (paymentMethod === 'Stripe') {
        try {
          const resp = await orderService.createPaymentIntent({ amount: totalAmount, currency: 'eur' });
          console.log('createPaymentIntent succeeded, resp=', resp);
          console.log('Payment intent response:', resp);
          setStripeClientSecret(resp.clientSecret);
          setShowStripeModal(true);
          return;
        } catch (err) {
          console.error('Failed to create payment intent:', err);
          setStripeError(t('payments.failedToInit', 'Failed to initialize payment.'));
          setPendingPurchaseOrderPayload(null);
          setPendingOrderTotal(0);
          setLoading(false);
          return; // stop the flow if Stripe initialization fails
        }
      }

      // Bank transfer: create order immediately and record payment
      const createdOrder = await supplierService.createPurchaseOrder(orderForm);
      try {
        await supplierService.createPayment(createdOrder.id, {
          purchaseOrderId: createdOrder.id,
          amount: totalAmount,
          paymentMethod: 'BankTransfer',
          transactionId: `SUP-${createdOrder.poNumber}`,
          notes: 'Recorded bank transfer from suppliers page'
        });
      } catch (err) {
        console.error('Failed to record bank transfer:', err);
      }

      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'PurchaseOrder',
          title: t('suppliers.purchaseOrderCreatedTitle', 'Purchase Order Created Successfully'),
          message: `Purchase order #${createdOrder.poNumber} has been created successfully for supplier ${selectedSupplier?.name}. Total amount: $${totalAmount.toFixed(2)}. Warehouse: ${selectedWarehouse?.name}.`,
          actionUrl: `/warehouse/purchase-orders/${createdOrder.id}`
        });
      }

      setOrderForm({ supplierId: 0, warehouseId: 0, items: [{ productId: 0, quantity: 1, unitPrice: 0 }] });
      setSelectedOrder(null);
      setSuccess(t('suppliers.purchaseOrderCreated', 'Purchase order #{{number}} created successfully. The supplier has been notified.', { number: createdOrder.poNumber }));
      await loadData();
      } catch (err) {
      console.error('Failed to create purchase order:', err);
      setError(t('suppliers.failedToCreateOrder', 'Failed to create purchase order'));
      
     
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'Error',
          title: t('suppliers.purchaseOrderFailedTitle', 'Purchase Order Creation Failed'),
          message: `Failed to create purchase order. Error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
          actionUrl: '/suppliers'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const addOrderItem = () => {
    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: 0, quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeOrderItem = (index: number) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const updateOrderItem = (
    index: number,
    key: keyof CreatePurchaseOrderDto['items'][number],
    value: string | number
  ) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === index
          ? { ...item, [key]: key === 'quantity' || key === 'productId' ? Number(value) : Number(value) }
          : item
      ),
    }));
  };

  useEffect(() => {
    if (!orderForm.supplierId) return;

    const supplierProductIdSet = new Set(supplierProducts.map((mapping) => mapping.productId));
    const updatedItems = orderForm.items.map((item) => ({
      ...item,
      productId: supplierProductIdSet.has(item.productId) ? item.productId : filteredProducts[0]?.id ?? 0,
    }));

    const itemsChanged = updatedItems.some((item, index) => item.productId !== orderForm.items[index]?.productId);
    if (itemsChanged) {
      setOrderForm((prev) => ({ ...prev, items: updatedItems }));
    }
  }, [orderForm.supplierId, orderForm.items, supplierProducts, filteredProducts]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('suppliers.purchaseOrders', 'Purchase Orders')}</h1>
          <p className="text-slate-500 mt-1">{t('suppliers.description', 'Manage purchase orders and connect warehouse reorder requests with suppliers.')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('suppliers')}
            className={`${tab === 'suppliers' ? 'btn-primary' : 'btn-ghost'} text-sm font-semibold`}
          >
            {t('navigation.suppliers', 'Suppliers')}
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`${tab === 'orders' ? 'btn-primary' : 'btn-ghost'} text-sm font-semibold`}
          >
            {t('navigation.orders', 'Orders')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {stripeClientSecret && pendingPurchaseOrderPayload && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div className="mb-2 font-medium">Stripe debug</div>
          <div className="text-xs break-words">Client Secret: {stripeClientSecret}</div>
          <div className="text-xs">Amount: ${pendingOrderTotal.toFixed(2)}</div>
          <div className="mt-2">
            <button onClick={() => setShowStripeModal(true)} className="rounded-lg bg-cyan-600 px-3 py-1 text-sm text-slate-900 hover:bg-cyan-500">Open Stripe Checkout</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            {tab === 'suppliers' ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('suppliers.directory', 'Supplier Directory')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="p-3">{t('users.name', 'Name')}</th>
                        <th className="p-3">{t('suppliers.contact', 'Contact')}</th>
                        <th className="p-3">{t('users.email', 'Email')}</th>
                        <th className="p-3">{t('settings.companyPhone', 'Company Phone')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">{t('suppliers.noSuppliersAvailable', 'No suppliers available')}</td>
                        </tr>
                      ) : (
                        paginatedSuppliers.map((supplier) => (
                          <tr key={supplier.id} className="border-b border-slate-200 hover:bg-slate-50/40 transition">
                            <td className="p-3 text-slate-900 font-medium">{supplier.name}</td>
                            <td className="p-3">{supplier.contactPerson || '-'}</td>
                            <td className="p-3">{supplier.email || '-'}</td>
                            <td className="p-3">{supplier.phone || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('suppliers.purchaseOrders', 'Purchase Orders')}</h2>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
                  <div>
                    {t('orders.showingSummary', 'Showing {{start}} - {{end}} of {{total}} orders', {
                      start: orders.length === 0 ? 0 : (currentPageOrders - 1) * pageSizeOrders + 1,
                      end: Math.min(currentPageOrders * pageSizeOrders, orders.length),
                      total: orders.length,
                    })}
                  </div>
                  <Pagination
                    currentPage={currentPageOrders}
                    totalPages={totalOrderPages}
                    onPageChange={setCurrentPageOrders}
                    pageSize={pageSizeOrders}
                    onPageSizeChange={setPageSizeOrders}
                    pageSizeOptions={[10, 20, 50]}
                    label={t('navigation.orders', 'Orders')}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="p-3">{t('orders.orderId', 'Order ID')}</th>
                        <th className="p-3">{t('sidebar.supplier', 'Supplier')}</th>
                        <th className="p-3">{t('orders.date', 'Date')}</th>
                        <th className="p-3">{t('orders.total', 'Total')}</th>
                        <th className="p-3">{t('orders.statusLabel', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">{t('suppliers.noSupplierOrdersFound', 'No supplier orders found')}</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="border-b border-slate-200 hover:bg-slate-50/40 transition cursor-pointer"
                          >
                            <td className="p-3 text-slate-900 font-medium">{order.poNumber}</td>
                            <td className="p-3">{suppliers.find((supplier) => supplier.id === order.supplierId)?.name || t('suppliers.supplierNumber', 'Supplier #{{id}}', { id: order.supplierId })}</td>
                            <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                            <td className="p-3">${order.totalAmount.toFixed(2)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                order.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
                                order.status === 'Shipped' ? 'bg-purple-500/20 text-purple-400' :
                                order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                                order.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                order.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                                'bg-slate-500/20 text-slate-500'
                              }`}>
                                {t(`myOrders.status.${order.status.toLowerCase().replace(/\s+/g, '')}`, order.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
          
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('suppliers.createPurchaseOrder', 'Create Purchase Order')}</h2>
              <div className="space-y-3 text-sm text-slate-500">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-slate-500">{t('sidebar.supplier', 'Supplier')}</span>
                    <select
                      value={orderForm.supplierId}
                      onChange={(e) => setOrderForm({ ...orderForm, supplierId: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      <option value={0}>{t('suppliers.selectSupplier', 'Select supplier')}</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-slate-500">{t('inventory.warehouse', 'Warehouse')}</span>
                    <select
                      value={orderForm.warehouseId}
                      onChange={(e) => setOrderForm({ ...orderForm, warehouseId: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      <option value={0}>{t('checkout.selectWarehouse', 'Select warehouse')}</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                
                {orderForm.items.map((item, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-slate-500">{t('common.productLabel', 'Product')}</span>
                        <select
                          value={item.productId}
                          onChange={(e) => updateOrderItem(index, 'productId', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                        >
                          <option value={0}>{t('suppliers.selectProduct', 'Select product')}</option>
                          {filteredProducts.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                          {orderForm.supplierId && filteredProducts.length === 0 && (
                            <option value={0} disabled>{t('suppliers.noProductsForSupplier', 'No products available for this supplier')}</option>
                          )}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-slate-500">{t('common.quantity', 'Quantity')}</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-500">{t('suppliers.unitPrice', 'Unit Price')}</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, 'unitPrice', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                        />
                      </label>
                    </div>
                    {orderForm.items.length > 1 && (
                      <button
                        onClick={() => removeOrderItem(index)}
                        className="mt-3 text-sm text-red-400 hover:text-red-300 transition"
                      >
                        {t('suppliers.removeItem', 'Remove item')}
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addOrderItem}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-slate-500 hover:bg-slate-100 transition"
                >
                  {t('suppliers.addOrderItem', '+ Add order item')}
                </button>
                <div className="mt-3 grid sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-slate-500 text-sm mb-1 block">{t('payments.methodLabel', 'Payment Method')}</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      <option value="BankTransfer">{t('payments.bankTransfer', 'Bank Transfer')}</option>
                      <option value="Stripe">{t('payments.stripe', 'Stripe')}</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-slate-900 hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('suppliers.creating', 'Creating...') : t('orders.createOrder', 'Create Order')}
                </button>
              </div>
            </div>

            {selectedOrder && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">{t('suppliers.orderDetails', 'Order Details')}</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-slate-500 hover:text-slate-900 transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-slate-500">
                  <p><span className="text-slate-500">{t('suppliers.orderNumberLabel', 'Order Number')}:</span> <span className="text-slate-900 font-mono">{selectedOrder.poNumber}</span></p>
                  <p><span className="text-slate-500">{t('sidebar.supplier', 'Supplier')}:</span> {suppliers.find((supplier) => supplier.id === selectedOrder.supplierId)?.name || t('suppliers.supplierNumber', 'Supplier #{{id}}', { id: selectedOrder.supplierId })}</p>
                  <p><span className="text-slate-500">{t('inventory.warehouse', 'Warehouse')}:</span> {warehouses.find((warehouse) => warehouse.id === selectedOrder.warehouseId)?.name || t('suppliers.warehouseNumber', 'Warehouse #{{id}}', { id: selectedOrder.warehouseId })}</p>
                  <p><span className="text-slate-500">{t('suppliers.orderDate', 'Order Date')}:</span> {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                  <p><span className="text-slate-500">{t('orders.statusLabel', 'Status')}:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedOrder.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedOrder.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
                      selectedOrder.status === 'Shipped' ? 'bg-purple-500/20 text-purple-400' :
                      selectedOrder.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                      selectedOrder.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-500/20 text-slate-500'
                    }`}>
                      {t(`myOrders.status.${selectedOrder.status.toLowerCase().replace(/\s+/g, '')}`, selectedOrder.status)}
                    </span>
                  </p>
                  <p><span className="text-slate-500">{t('suppliers.totalAmount', 'Total Amount')}:</span> <span className="text-slate-900 font-bold">${selectedOrder.totalAmount.toFixed(2)}</span></p>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">{t('orders.itemsLabel', 'Items')}</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-slate-500">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-slate-500">{t('suppliers.productId', 'Product ID')}:</span> {item.productId}</p>
                        <p><span className="text-slate-500">{t('common.quantity', 'Quantity')}:</span> {item.quantity}</p>
                        <p><span className="text-slate-500">{t('suppliers.unitPrice', 'Unit Price')}:</span> ${item.unitPrice.toFixed(2)}</p>
                        <p><span className="text-slate-500">{t('orders.total', 'Total')}:</span> <span className="text-cyan-400">${item.totalPrice.toFixed(2)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedOrder.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-slate-500 text-sm">{t('suppliers.notes', 'Notes')}:</p>
                    <p className="text-slate-500 text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {showStripeModal && stripeClientSecret && pendingPurchaseOrderPayload && (
        <Elements stripe={stripePromise}>
          <StripeCheckoutModal
            clientSecret={stripeClientSecret}
            totalAmount={pendingOrderTotal}
            onCancel={() => {
              setShowStripeModal(false);
              setStripeClientSecret(null);
              setPendingPurchaseOrderPayload(null);
              setPendingOrderTotal(0);
            }}
            onSuccess={handleStripePaymentSuccess}
            onError={(msg) => {
              setStripeError(msg);
              setShowStripeModal(false);
              setPendingPurchaseOrderPayload(null);
              setPendingOrderTotal(0);
            }}
            isLoading={loading}
          />
        </Elements>
      )}
    </div>
  );
}




