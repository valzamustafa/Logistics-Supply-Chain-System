
import { useEffect, useMemo, useState } from 'react';
import { supplierService, Supplier, PurchaseOrderDto, CreatePurchaseOrderDto, SupplierProductDto } from '../services/supplierService';
import { productService, Product } from '../services/productService';
import { warehouseService, Warehouse } from '../services/warehouseService';
import { dashboardSignalRService, OrderUpdateEvent } from '../services/dashboardSignalRService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';

export function SuppliersPage() {
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

  const [orderForm, setOrderForm] = useState<CreatePurchaseOrderDto>({
    supplierId: 0,
    warehouseId: 0,
    items: [{ productId: 0, quantity: 1, unitPrice: 0 }],
  });

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderDto | null>(null);

  const filteredProducts = useMemo(() => {
    if (!orderForm.supplierId) return [];
    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    return products.filter((product) => supplierProductIds.has(product.id));
  }, [orderForm.supplierId, products, supplierProducts]);

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
      setError('Failed to load supplier information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOrderUpdate = (update: OrderUpdateEvent) => {
    setOrders((current) => current.map((order) =>
      order.id === update.orderId ? { ...order, status: update.purchaseOrderStatus || update.status } : order
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
      setError('Select a supplier, warehouse, and add at least one item to create a purchase order');
      return;
    }

    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    if (orderForm.items.some((item) => item.productId === 0 || !supplierProductIds.has(item.productId))) {
      setError('Please select valid products from the supplier-specific catalog.');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate total amount for notification
      const totalAmount = orderForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const selectedSupplier = suppliers.find(s => s.id === orderForm.supplierId);
      const selectedWarehouse = warehouses.find(w => w.id === orderForm.warehouseId);
      
      
      const createdOrder = await supplierService.createPurchaseOrder(orderForm);
      
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'PurchaseOrder',
          title: 'Purchase Order Created Successfully',
          message: `Purchase order #${createdOrder.poNumber} has been created successfully for supplier ${selectedSupplier?.name}. Total amount: $${totalAmount.toFixed(2)}. Warehouse: ${selectedWarehouse?.name}.`,
          actionUrl: `/warehouse/purchase-orders/${createdOrder.id}`
        });
      }
      
      if (selectedSupplier?.email) {
        
        console.log(`Purchase order created for supplier: ${selectedSupplier.email}`);
      }
      
      setOrderForm({ supplierId: 0, warehouseId: 0, items: [{ productId: 0, quantity: 1, unitPrice: 0 }] });
      setSelectedOrder(null);
      setSuccess(`Purchase order #${createdOrder.poNumber} created successfully. The supplier has been notified.`);
      await loadData();
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      setError('Failed to create purchase order');
      
     
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'Error',
          title: 'Purchase Order Creation Failed',
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
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 mt-1">Manage purchase orders and connect warehouse reorder requests with suppliers.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('suppliers')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'suppliers' ? 'bg-cyan-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'orders' ? 'bg-cyan-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
          >
            Orders
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

      {loading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            {tab === 'suppliers' ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Supplier Directory</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">No suppliers available</td>
                        </tr>
                      ) : (
                        suppliers.map((supplier) => (
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
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Purchase Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="p-3">Order</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">No supplier orders found</td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="border-b border-slate-200 hover:bg-slate-50/40 transition cursor-pointer"
                          >
                            <td className="p-3 text-slate-900 font-medium">{order.poNumber}</td>
                            <td className="p-3">{suppliers.find((supplier) => supplier.id === order.supplierId)?.name || `Supplier #${order.supplierId}`}</td>
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
                                {order.status}
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
            {/* Create Supplier Order */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Create Purchase Order</h2>
              <div className="space-y-3 text-sm text-slate-500">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-slate-500">Supplier</span>
                    <select
                      value={orderForm.supplierId}
                      onChange={(e) => setOrderForm({ ...orderForm, supplierId: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      <option value={0}>Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-slate-500">Warehouse</span>
                    <select
                      value={orderForm.warehouseId}
                      onChange={(e) => setOrderForm({ ...orderForm, warehouseId: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                    >
                      <option value={0}>Select warehouse</option>
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
                        <span className="text-slate-500">Product</span>
                        <select
                          value={item.productId}
                          onChange={(e) => updateOrderItem(index, 'productId', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                        >
                          <option value={0}>Select product</option>
                          {filteredProducts.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                          {orderForm.supplierId && filteredProducts.length === 0 && (
                            <option value={0} disabled>No products available for this supplier</option>
                          )}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-slate-500">Quantity</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-cyan-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-500">Unit Price</span>
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
                        Remove item
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addOrderItem}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-slate-500 hover:bg-slate-100 transition"
                >
                  + Add order item
                </button>
                
                <button
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-slate-900 hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>

            {selectedOrder && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-slate-500 hover:text-slate-900 transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-slate-500">
                  <p><span className="text-slate-500">Order Number:</span> <span className="text-slate-900 font-mono">{selectedOrder.poNumber}</span></p>
                  <p><span className="text-slate-500">Supplier:</span> {suppliers.find((supplier) => supplier.id === selectedOrder.supplierId)?.name || `Supplier #${selectedOrder.supplierId}`}</p>
                  <p><span className="text-slate-500">Warehouse:</span> {warehouses.find((warehouse) => warehouse.id === selectedOrder.warehouseId)?.name || `Warehouse #${selectedOrder.warehouseId}`}</p>
                  <p><span className="text-slate-500">Order Date:</span> {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                  <p><span className="text-slate-500">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedOrder.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedOrder.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
                      selectedOrder.status === 'Shipped' ? 'bg-purple-500/20 text-purple-400' :
                      selectedOrder.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                      selectedOrder.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-500/20 text-slate-500'
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                  <p><span className="text-slate-500">Total Amount:</span> <span className="text-slate-900 font-bold">${selectedOrder.totalAmount.toFixed(2)}</span></p>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-slate-500">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-slate-500">Product ID:</span> {item.productId}</p>
                        <p><span className="text-slate-500">Quantity:</span> {item.quantity}</p>
                        <p><span className="text-slate-500">Unit Price:</span> ${item.unitPrice.toFixed(2)}</p>
                        <p><span className="text-slate-500">Total:</span> <span className="text-cyan-400">${item.totalPrice.toFixed(2)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedOrder.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-slate-500 text-sm">Notes:</p>
                    <p className="text-slate-500 text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




