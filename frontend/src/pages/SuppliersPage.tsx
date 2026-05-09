import { useEffect, useMemo, useState } from 'react';
import { supplierService, Supplier, SupplierOrderDto, CreateSupplierDto, CreateSupplierOrderDto, CreateSupplierOrderItemDto, SupplierProductDto } from '../services/supplierService';
import { productService, Product } from '../services/productService';

export function SuppliersPage() {
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrderDto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState<CreateSupplierDto>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });

  const [orderForm, setOrderForm] = useState<CreateSupplierOrderDto>({
    supplierId: 0,
    items: [{ productId: 0, quantity: 1, unitPrice: 0 }],
  });

  const [selectedOrder, setSelectedOrder] = useState<SupplierOrderDto | null>(null);

  const filteredProducts = useMemo(() => {
    if (!orderForm.supplierId) return [];
    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    return products.filter((product) => supplierProductIds.has(product.id));
  }, [orderForm.supplierId, products, supplierProducts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [supplierData, orderData, productData] = await Promise.all([
        supplierService.getAll(),
        supplierService.getAllOrders(),
        productService.getAll(true),
      ]);
      setSuppliers(supplierData);
      setOrders(orderData);
      setProducts(productData);
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

  const handleCreateSupplier = async () => {
    try {
      setLoading(true);
      await supplierService.create(supplierForm);
      setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      setSuccess('Supplier created successfully');
      await loadData();
    } catch (err) {
      console.error('Failed to create supplier:', err);
      setError('Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderForm.supplierId || orderForm.items.length === 0) {
      setError('Select a supplier and add at least one item to create an order');
      return;
    }

    const supplierProductIds = new Set(supplierProducts.map((supplierProduct) => supplierProduct.productId));
    if (orderForm.items.some((item) => item.productId === 0 || !supplierProductIds.has(item.productId))) {
      setError('Please select valid products from the supplier-specific catalog.');
      return;
    }

    try {
      setLoading(true);
      await supplierService.createOrder(orderForm);
      setOrderForm({ supplierId: 0, items: [{ productId: 0, quantity: 1, unitPrice: 0 }] });
      setSelectedOrder(null);
      setSuccess('Supplier order created successfully');
      await loadData();
    } catch (err) {
      console.error('Failed to create supplier order:', err);
      setError('Failed to create supplier order');
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

  const updateOrderItem = (index: number, key: keyof CreateSupplierOrderItemDto, value: string | number) => {
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
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Suppliers</h1>
          <p className="text-slate-400 mt-1">Manage suppliers, review purchase orders, and connect warehouse reorder requests to supplier orders.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('suppliers')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'suppliers' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'orders' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
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
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Supplier Directory</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700">
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
                          <td colSpan={4} className="p-6 text-center text-slate-400">No suppliers available</td>
                        </tr>
                      ) : (
                        suppliers.map((supplier) => (
                          <tr key={supplier.id} className="border-b border-slate-700 hover:bg-slate-900/40 transition">
                            <td className="p-3 text-white font-medium">{supplier.name}</td>
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
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Purchase Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700">
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
                          <td colSpan={5} className="p-6 text-center text-slate-400">No supplier orders found</td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="border-b border-slate-700 hover:bg-slate-900/40 transition cursor-pointer"
                          >
                            <td className="p-3 text-white font-medium">{order.orderNumber}</td>
                            <td className="p-3">{order.supplierName || 'Unknown'}</td>
                            <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                            <td className="p-3">${order.totalAmount.toFixed(2)}</td>
                            <td className="p-3">{order.status}</td>
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
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Supplier</h2>
              <div className="space-y-3 text-sm text-slate-300">
                <label className="block">
                  <span className="text-slate-300">Name</span>
                  <input
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Contact Person</span>
                  <input
                    value={supplierForm.contactPerson ?? ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Email</span>
                  <input
                    value={supplierForm.email ?? ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Phone</span>
                  <input
                    value={supplierForm.phone ?? ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Address</span>
                  <textarea
                    value={supplierForm.address ?? ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  />
                </label>
                <button
                  onClick={handleCreateSupplier}
                  className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500 transition"
                >
                  Save Supplier
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Supplier Order</h2>
              <div className="space-y-3 text-sm text-slate-300">
                <label className="block">
                  <span className="text-slate-300">Supplier</span>
                  <select
                    value={orderForm.supplierId}
                    onChange={(e) => setOrderForm({ ...orderForm, supplierId: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
                  >
                    <option value={0}>Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>
                {orderForm.items.map((item, index) => (
                  <div key={index} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-slate-300">Product</span>
                        <select
                          value={item.productId}
                          onChange={(e) => updateOrderItem(index, 'productId', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
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
                        <span className="text-slate-300">Quantity</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-300">Unit Price</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, 'unitPrice', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                        />
                      </label>
                    </div>
                    {orderForm.items.length > 1 && (
                      <button
                        onClick={() => removeOrderItem(index)}
                        className="mt-3 text-sm text-red-400 hover:text-red-300"
                      >
                        Remove item
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOrderItem}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-600 transition"
                >
                  Add order item
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500 transition"
                >
                  Create Order
                </button>
              </div>
            </div>

            {selectedOrder && (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Selected Order</h2>
                <p className="text-slate-300">Order {selectedOrder.orderNumber}</p>
                <p className="text-slate-300">Supplier: {selectedOrder.supplierName}</p>
                <p className="text-slate-300">Status: {selectedOrder.status}</p>
                <div className="mt-4 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-900 p-3 text-slate-200">
                      <p className="text-sm">Product ID: {item.productId}</p>
                      <p className="text-sm">Quantity: {item.quantity}</p>
                      <p className="text-sm">Unit Price: ${item.unitPrice.toFixed(2)}</p>
                      <p className="text-sm">Total: ${item.totalPrice.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
