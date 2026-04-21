import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { orderService, Order, CreateOrderDto } from '../services/orderService';
import { productService, Product } from '../services/productService';
import { Plus, Search, AlertCircle } from 'lucide-react';

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<{ productId: number; quantity: number; unitPrice: number }[]>([]);
  const [shippingAddress, setShippingAddress] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData] = await Promise.all([
        user ? orderService.getByUser(user.id) : orderService.getAll(),
        productService.getAll(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Failed to load orders. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!user || selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    try {
      const orderData: CreateOrderDto = {
        userId: user.id,
        shippingAddress: shippingAddress || undefined,
        items: selectedProducts.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      await orderService.create(orderData);
      await loadData();
      setShowCreateModal(false);
      setSelectedProducts([]);
      setShippingAddress('');
    } catch (err) {
      console.error('Failed to create order:', err);
      setError('Failed to create order');
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.shippingAddress?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'pending') return 'bg-yellow-500/20 text-yellow-400';
    if (lower === 'processing') return 'bg-blue-500/20 text-blue-400';
    if (lower === 'shipped') return 'bg-purple-500/20 text-purple-400';
    if (lower === 'delivered') return 'bg-green-500/20 text-green-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
          <p className="text-slate-400">Manage and track all orders</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr className="border-b border-slate-700">
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Order #</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Date</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Amount</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Items</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Status</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                  <td className="py-4 px-6 text-white font-medium">{order.orderNumber}</td>
                  <td className="py-4 px-6 text-slate-300">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="py-4 px-6 text-white font-medium">${order.totalAmount.toLocaleString()}</td>
                  <td className="py-4 px-6 text-slate-300">{order.items?.length || 0}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 flex gap-2">
                    <button className="text-cyan-400 hover:text-cyan-300">View</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 px-6 text-center text-slate-400">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Order</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Shipping Address</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter shipping address"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select Products</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.filter(p => p.isActive).map((product) => {
                    const selected = selectedProducts.find(sp => sp.productId === product.id);
                    return (
                      <div key={product.id} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, { productId: product.id, quantity: 1, unitPrice: product.price }]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(sp => sp.productId !== product.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-sm text-slate-400">${product.price}</p>
                        </div>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={selected.quantity}
                            onChange={(e) => {
                              setSelectedProducts(
                                selectedProducts.map(sp =>
                                  sp.productId === product.id ? { ...sp, quantity: parseInt(e.target.value) || 1 } : sp
                                )
                              );
                            }}
                            className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-center"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-400 font-medium">Total: ${selectedProducts.reduce((sum, sp) => sum + (sp.unitPrice * sp.quantity), 0).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedProducts([]);
                  setShippingAddress('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={selectedProducts.length === 0}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}