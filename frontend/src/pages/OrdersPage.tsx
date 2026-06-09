import { useState, useEffect } from 'react';
import { signalRService } from '../services/signalRService';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { orderService, Order, CreateOrderDto, CreateOrderItemDto } from '../services/orderService';
import { productService, Product } from '../services/productService';
import { Plus, Edit2, Trash2, Search, Filter, AlertCircle } from 'lucide-react';
import { AdvancedSearchBar } from '../components/AdvancedSearchBar';
import { advancedSearch } from '../utils/advancedSearch';
import { Pagination } from '../components/Pagination';

export function OrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'orderDate' | 'totalAmount' | 'status'>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<{ productId: number; quantity: number; unitPrice: number }[]>([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();

    const unsubscribe = signalRService.onEntityUpdated((payload) => {
      try {
        const type = payload?.Type ?? payload?.type ?? payload?.Notification?.type;
        const actionUrl = payload?.Notification?.actionUrl ?? '';
        if (typeof type === 'string' && type.toLowerCase().includes('order')) {
          loadData();
        } else if (typeof actionUrl === 'string' && actionUrl.toLowerCase().includes('/orders')) {
          loadData();
        }
      } catch (err) {
        console.error('Error handling entity update:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const isManagerView = user?.roles?.some(role => ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse', 'Driver'].includes(role));
      const [ordersData, productsData] = await Promise.all([
        isManagerView ? orderService.getAll() : user ? orderService.getByUser(user.id) : orderService.getAll(),
        productService.getAll(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(t('orders.errorLoading', 'Failed to load orders. Make sure the backend is running.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!user || selectedProducts.length === 0) {
      setError(t('orders.errorSelectProduct', 'Please select at least one product'));
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
      setError(t('orders.errorCreate', 'Failed to create order'));
    }
  };

  const filteredOrders = advancedSearch(orders, {
    query: searchQuery,
    searchFields: ['orderNumber', 'shippingAddress', 'status'],
    filterPredicates: {
      status: (order, value) => order.status.toLowerCase() === value.toLowerCase(),
      minamount: (order, value) => order.totalAmount >= Number(value),
      maxamount: (order, value) => order.totalAmount <= Number(value),
    },
    sortBy,
    sortDir,
  }).filter((order) => statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase());

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowViewModal(false);
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'pending') return 'bg-yellow-500/20 text-yellow-400';
    if (lower === 'processing') return 'bg-blue-500/20 text-blue-400';
    if (lower === 'shipped') return 'bg-purple-500/20 text-purple-400';
    if (lower === 'delivered') return 'bg-green-500/20 text-green-400';
    return 'bg-slate-500/20 text-slate-500';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('orders.loading', 'Loading orders...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('orders.title', 'Orders')}</h1>
          <p className="text-slate-500">{t('orders.description', 'Manage and track all orders')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('orders.createOrder', 'Create Order')}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-4 mb-4">
        <AdvancedSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          sortBy={sortBy}
          sortDir={sortDir}
          sortOptions={[
            { value: 'orderDate', label: t('orders.sort.orderDate', 'Order Date') },
            { value: 'totalAmount', label: t('orders.sort.amount', 'Amount') },
            { value: 'status', label: t('orders.sort.status', 'Status') },
          ]}
          onSortByChange={(value) => setSortBy(value as typeof sortBy)}
          onSortDirChange={setSortDir}
          showClear
          onClear={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setSortBy('orderDate');
            setSortDir('desc');
          }}
          placeholder={t('orders.searchPlaceholder', 'Search orders by number, address, status or use tokens like status:pending minAmount:100')}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-200 border border-slate-600 rounded-lg text-slate-900 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">{t('orders.status.all', 'All Status')}</option>
            <option value="pending">{t('orders.status.pending', 'Pending')}</option>
            <option value="processing">{t('orders.status.processing', 'Processing')}</option>
            <option value="shipped">{t('orders.status.shipped', 'Shipped')}</option>
            <option value="delivered">{t('orders.status.delivered', 'Delivered')}</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
        <div>
          {t('orders.showingSummary', 'Showing {start} - {end} of {total} orders', {
            start: filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
            end: Math.min(currentPage * pageSize, filteredOrders.length),
            total: filteredOrders.length,
          })}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          label={t('orders.title', 'Orders')}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-100/90">
            <tr className="border-b border-slate-200">
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.orderId', 'Order #')}</th>
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.date', 'Date')}</th>
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.amount', 'Amount')}</th>
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.itemsLabel', 'Items')}</th>
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.statusLabel', 'Status')}</th>
              <th className="text-left py-4 px-6 text-slate-500 font-medium">{t('orders.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-200/50 hover:bg-slate-100/80">
                  <td className="py-4 px-6 text-slate-900 font-medium">{order.orderNumber}</td>
                  <td className="py-4 px-6 text-slate-500">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="py-4 px-6 text-slate-900 font-medium">${order.totalAmount.toLocaleString()}</td>
                  <td className="py-4 px-6 text-slate-500">{order.items?.length || 0}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {t(`orders.status.${order.status.toLowerCase()}`, order.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6 flex gap-2">
                    <button
                      onClick={() => openOrderDetails(order)}
                      className="text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {t('orders.view', 'View')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 px-6 text-center text-slate-500">
                  {t('orders.noOrdersFound', 'No orders found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('orders.viewOrder', 'Order Details')}</h2>
                <p className="text-sm text-slate-500">{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={closeOrderDetails}
                className="rounded-full p-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500 mb-2">{t('orders.date', 'Date')}</p>
                  <p className="text-slate-900">{new Date(selectedOrder.orderDate).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500 mb-2">{t('orders.statusLabel', 'Status')}</p>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                    {t(`orders.status.${selectedOrder.status.toLowerCase()}`, selectedOrder.status)}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('orders.itemsLabel', 'Items')}</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-slate-500">{t('orders.product', 'Product')}</th>
                        <th className="px-4 py-3 text-slate-500">{t('orders.quantity', 'Qty')}</th>
                        <th className="px-4 py-3 text-slate-500">{t('orders.unitPrice', 'Unit Price')}</th>
                        <th className="px-4 py-3 text-slate-500">{t('orders.total', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-slate-900">{item.productName ?? `Product ${item.productId}`}</td>
                          <td className="px-4 py-3 text-slate-500">{item.quantity}</td>
                          <td className="px-4 py-3 text-slate-500">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-900">${item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500 mb-2">{t('orders.shippingAddress', 'Shipping Address')}</p>
                  <p className="text-slate-900">{selectedOrder.shippingAddress || t('orders.notProvided', 'Not provided')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500 mb-2">{t('orders.totalAmount', 'Order Total')}</p>
                  <p className="text-slate-900">${selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={closeOrderDetails}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-600 hover:bg-slate-50 transition"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

     
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('orders.createNewOrder', 'Create New Order')}</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">{t('orders.shippingAddress', 'Shipping Address')}</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder={t('orders.shippingAddressPlaceholder', 'Enter shipping address')}
                  className="w-full px-3 py-2 bg-slate-200 border border-slate-600 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('orders.selectProducts', 'Select Products')}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.filter(p => p.isActive).map((product) => {
                    const selected = selectedProducts.find(sp => sp.productId === product.id);
                    return (
                      <div key={product.id} className="flex items-center gap-4 p-3 bg-slate-100/80 rounded-lg">
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
                          <p className="text-slate-900 font-medium">{product.name}</p>
                          <p className="text-sm text-slate-500">${product.price}</p>
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
                            className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-slate-900 text-center"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-400 font-medium">
                    {t('orders.totalLabel', 'Total')}: ${selectedProducts.reduce((sum, sp) => sum + (sp.unitPrice * sp.quantity), 0).toLocaleString()}
                  </p>
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
                className="px-4 py-2 bg-slate-200 hover:bg-slate-100 text-slate-900 rounded-lg transition"
              >
                {t('orders.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={selectedProducts.length === 0}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('orders.createOrder', 'Create Order')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





