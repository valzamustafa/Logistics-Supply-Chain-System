import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, BarChart3, AlertCircle, Search } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripeCheckoutModal } from '../../components/StripeCheckoutModal';
import { orderService } from '../../services/orderService';
import { warehouseStockService, LowStockAlert, StockMovement, WarehouseStock } from '../../services/warehouseStockService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { productService, Product } from '../../services/productService';
import { supplierService, Supplier, SupplierProductDto, PurchaseOrderDto } from '../../services/supplierService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

export function WarehouseInventory() {
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductDto[]>([]);
  const [selectedSupplierProductId, setSelectedSupplierProductId] = useState<number | null>(null);
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false);
  const [selectedSupplierOrderAlert, setSelectedSupplierOrderAlert] = useState<LowStockAlert | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [orderUnitPrice, setOrderUnitPrice] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'BankTransfer'>('BankTransfer');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderDto | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const orderTotal = useMemo(() => {
    const quantity = parseInt(orderQuantity, 10);
    const unitPrice = parseFloat(orderUnitPrice);
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) return 0;
    return quantity * unitPrice;
  }, [orderQuantity, orderUnitPrice]);
  const [isEmergencyOrder, setIsEmergencyOrder] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [selectedStockForEdit, setSelectedStockForEdit] = useState<WarehouseStock | null>(null);
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [stockUpdateError, setStockUpdateError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesData, alerts, stocks, suppliersData, productsData] = await Promise.all([
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(selectedWarehouse || undefined),
        selectedWarehouse ? warehouseStockService.getByWarehouse(selectedWarehouse) : warehouseStockService.getAll(),
        supplierService.getAll(),
        productService.getAll(),
      ]);

      setWarehouses(warehousesData);
      setLowStockAlerts(alerts);
      setWarehouseStocks(stocks);
      setSuppliers(suppliersData);
      setAllProducts(productsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // Fix: Handle unknown error type safely
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load warehouse inventory data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse]);

  useEffect(() => {
    if (suppliers.length > 0 && selectedSupplierId === 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  useEffect(() => {
    const loadSupplierProducts = async () => {
      if (!selectedSupplierId) {
        setSupplierProducts([]);
        return;
      }

      try {
        const products = await supplierService.getProductsBySupplier(selectedSupplierId);
        setSupplierProducts(products);

        if (selectedSupplierOrderAlert) {
          const hasAlertProduct = products.some((product) => product.productId === selectedSupplierOrderAlert.productId);
          setSelectedSupplierProductId(hasAlertProduct ? selectedSupplierOrderAlert.productId : products[0]?.productId ?? selectedSupplierOrderAlert.productId);
        } else {
          setSelectedSupplierProductId(products[0]?.productId ?? null);
        }
      } catch (err) {
        console.error('Failed to load supplier product catalog:', err);
        setSupplierProducts([]);
      }
    };

    loadSupplierProducts();
  }, [selectedSupplierId, selectedSupplierOrderAlert]);

  const selectedSupplierProduct = allProducts.find((product) => product.id === selectedSupplierProductId);
  const alertProduct = selectedSupplierOrderAlert ? allProducts.find((product) => product.id === selectedSupplierOrderAlert.productId) : null;
  const supplierCatalogHasAlertProduct = selectedSupplierOrderAlert
      ? supplierProducts.some((product) => product.productId === selectedSupplierOrderAlert.productId)
      : false;

  const filteredAlerts = lowStockAlerts.filter((alert) =>
      alert.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocks = warehouseStocks.filter((stock) =>
      stock.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalAlerts = lowStockAlerts.filter(a => a.deficit > 50);
  const warningAlerts = lowStockAlerts.filter(a => a.deficit <= 50);

  const openReorderModal = (alert: LowStockAlert) => {
    openSupplierOrderModal(alert);
  };

  const openSupplierCatalogOrderModal = (catalogProduct: SupplierProductDto) => {
    if (!selectedWarehouse) {
      setOrderError('Select a warehouse before ordering from a supplier catalog.');
      return;
    }

    const warehouse = warehouses.find((w) => w.id === selectedWarehouse);
    const product = allProducts.find((p) => p.id === catalogProduct.productId);
    if (!warehouse || !product) {
      setOrderError('Unable to initialize order for the selected supplier product.');
      return;
    }

    setSelectedSupplierOrderAlert({
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      currentQuantity: 0,
      minimumLevel: 0,
      deficit: 1,
    });
    setSelectedSupplierId(catalogProduct.supplierId);
    setSelectedSupplierProductId(catalogProduct.productId);
    setOrderQuantity('1');
    setOrderUnitPrice('0');
    setPaymentAmount('0');
    setPaymentMethod('BankTransfer');
    setPaymentNotes('');
    setSelectedPurchaseOrder(null);
    setShowStripeModal(false);
    setStripeClientSecret(null);
    setStripeError(null);
    setIsEmergencyOrder(false);
    setEmergencyReason('');
    setOrderError(null);
    setShowSupplierOrderModal(true);
  };

  const openSupplierOrderModal = (alert: LowStockAlert) => {
    setSelectedSupplierOrderAlert(alert);
    setOrderQuantity(Math.max(alert.deficit, 1).toString());
    setSelectedSupplierId(suppliers[0]?.id ?? 0);
    setSelectedSupplierProductId(alert.productId);
    setOrderUnitPrice('0');
    setPaymentAmount('0');
    setPaymentMethod('BankTransfer');
    setPaymentNotes('');
    setSelectedPurchaseOrder(null);
    setShowStripeModal(false);
    setStripeClientSecret(null);
    setStripeError(null);
    setIsEmergencyOrder(false);
    setEmergencyReason('');
    setOrderError(null);
    setShowSupplierOrderModal(true);
  };

  const openEditStockModal = (stock: WarehouseStock) => {
    setSelectedStockForEdit(stock);
    setEditStockQuantity(stock.quantity.toString());
    setStockUpdateError(null);
    setShowEditStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedStockForEdit) return;

    const quantity = parseInt(editStockQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      setStockUpdateError('Enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      await warehouseStockService.updateStock(selectedStockForEdit.warehouseId, selectedStockForEdit.productId, {
        quantity,
        type: 'Adjustment',
        notes: 'Updated manually from inventory dashboard',
      });

      await fetchData();
      setShowEditStockModal(false);
      setSelectedStockForEdit(null);
      setEditStockQuantity('');
      setStockUpdateError(null);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setStockUpdateError('Failed to update stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierOrder = async () => {
    if (!selectedSupplierOrderAlert) return;
    const quantity = parseInt(orderQuantity, 10);
    const price = parseFloat(orderUnitPrice);
    const productId = selectedSupplierProductId ?? selectedSupplierOrderAlert.productId;

    if (!isEmergencyOrder && !selectedSupplierId) {
      setOrderError('Select a supplier or switch to emergency purchase');
      return;
    }

    if (!quantity || quantity <= 0) {
      setOrderError('Enter a valid quantity');
      return;
    }

    if (isNaN(price) || price < 0) {
      setOrderError('Enter a valid unit price');
      return;
    }

    try {
      setLoading(true);

      if (isEmergencyOrder || selectedSupplierId === 0) {
        await supplierService.createEmergencyPurchase({
          warehouseId: selectedSupplierOrderAlert.warehouseId,
          productName: selectedSupplierOrderAlert.productName,
          quantity,
          unitPrice: price,
          reason: emergencyReason || 'Emergency supplier request for unavailable product',
        });
      } else {
        const purchaseOrder = await supplierService.createPurchaseOrder({
          supplierId: selectedSupplierId,
          warehouseId: selectedSupplierOrderAlert.warehouseId,
          items: [
            {
              productId,
              quantity,
              unitPrice: price,
            },
          ],
          notes: `Reorder generated from warehouse inventory alert`,
        });

        setSelectedPurchaseOrder(purchaseOrder);
        setPaymentAmount((quantity * price).toFixed(2));

        if (paymentMethod === 'Stripe') {
          await handleStartStripePayment(quantity * price, purchaseOrder);
          return;
        }

        await supplierService.createPayment(purchaseOrder.id, {
          purchaseOrderId: purchaseOrder.id,
          amount: quantity * price,
          paymentMethod: 'BankTransfer',
          transactionId: `WH-${purchaseOrder.poNumber}`,
          notes: paymentNotes || 'Recorded payment from warehouse purchase order creation',
        });
      }

      await fetchData();
      setShowSupplierOrderModal(false);
      setSelectedSupplierOrderAlert(null);
      setOrderQuantity('');
      setOrderUnitPrice('0');
      setSelectedSupplierId(0);
      setSelectedSupplierProductId(null);
      setPaymentMethod('BankTransfer');
      setPaymentNotes('');
      setSelectedPurchaseOrder(null);
      setIsEmergencyOrder(false);
      setEmergencyReason('');
    } catch (err) {
      console.error('Failed to create supplier order:', err);
      setOrderError('Failed to create supplier order, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStripePayment = async (amount: number, purchaseOrder: PurchaseOrderDto) => {
    try {
      setStripeError(null);
      setLoading(true);
      const response = await orderService.createPaymentIntent({ amount, currency: 'eur' });
      setStripeClientSecret(response.clientSecret);
      setShowStripeModal(true);
      setSelectedPurchaseOrder(purchaseOrder);
    } catch (err: any) {
      console.error('Failed to create Stripe payment intent:', err);
      setOrderError(err.message || 'Unable to create Stripe payment intent.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePaymentSuccess = async (transactionId: string) => {
    if (!selectedPurchaseOrder) return;

    try {
      setStripeError(null);
      setLoading(true);
      await supplierService.createPayment(selectedPurchaseOrder.id, {
        purchaseOrderId: selectedPurchaseOrder.id,
        amount: Number(paymentAmount),
        paymentMethod: 'Stripe',
        transactionId,
        notes: paymentNotes || 'Stripe payment completed from warehouse dashboard',
      });

      await fetchData();
      setShowStripeModal(false);
      setShowSupplierOrderModal(false);
      setSelectedSupplierOrderAlert(null);
      setOrderQuantity('');
      setOrderUnitPrice('0');
      setSelectedSupplierId(0);
      setSelectedSupplierProductId(null);
      setPaymentMethod('BankTransfer');
      setPaymentNotes('');
      setSelectedPurchaseOrder(null);
      setIsEmergencyOrder(false);
      setEmergencyReason('');
    } catch (err: any) {
      console.error('Stripe payment processing failed:', err);
      setStripeError(err.message || 'Failed to save Stripe payment after payment success.');
      setOrderError(err.message || 'Failed to save Stripe payment after payment success.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeError = (message: string) => {
    setStripeError(message);
    setOrderError(message);
  };

  if (loading) {
    return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading inventory...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Warehouse Inventory</h1>
            <p className="text-slate-400 mt-1">Monitor warehouse stock, low stock alerts, and reorder items by warehouse.</p>
          </div>
          <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
            ))}
          </select>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{criticalAlerts.length}</h3>
              <p className="text-slate-400 text-sm">Critical Items</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{warningAlerts.length}</h3>
              <p className="text-slate-400 text-sm">Low Stock Items</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{lowStockAlerts.length}</h3>
              <p className="text-slate-400 text-sm">Total Alerts</p>
            </div>
          </div>
        </div>

        {/* Supplier Catalog Panel */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Supplier Product Catalog</h2>
              <p className="text-slate-400 mt-1">Choose a supplier and browse their catalog before placing a warehouse purchase.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <label className="text-slate-400 text-sm mb-1">Warehouse</label>
                <select
                    value={selectedWarehouse || ''}
                    onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white outline-none"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-slate-400 text-sm mb-1">Supplier</label>
                <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white outline-none"
                >
                  <option value={0}>Select supplier</option>
                  {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedSupplierId === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">
                Select a supplier to load their product catalog.
              </div>
          ) : supplierProducts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">
                No products are currently published for this supplier. Choose another supplier or create a catalog entry in the supplier service.
              </div>
          ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Lead time</th>
                    <th className="p-3">Action</th>
                  </tr>
                  </thead>
                  <tbody>
                  {supplierProducts.map((mapping) => {
                    const product = allProducts.find((item) => item.id === mapping.productId);
                    return (
                        <tr key={mapping.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                          <td className="p-3 text-white">{product?.name ?? `Product #${mapping.productId}`}</td>
                          <td className="p-3">{product?.sku ?? mapping.supplierSKU ?? '—'}</td>
                          <td className="p-3 text-slate-300">{mapping.leadTimeDays ? `${mapping.leadTimeDays} days` : 'N/A'}</td>
                          <td className="p-3">
                            <button
                                onClick={() => openSupplierCatalogOrderModal(mapping)}
                                className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-500"
                            >
                              Order
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

        {/* Warehouse Stock Summary */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Warehouse Inventory Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
                </thead>
                <tbody>
                {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No stock items found.</td>
                    </tr>
                ) : (
                    filteredStocks.map((stock) => (
                        <tr key={`${stock.warehouseId}-${stock.productId}`} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3 text-white">{stock.productName}</td>
                          <td className="px-4 py-3">{stock.productSku}</td>
                          <td className="px-4 py-3">{stock.quantity}</td>
                          <td className="px-4 py-3">{stock.warehouseName}</td>
                          <td className="px-4 py-3">
                            {stock.isOutOfStock ? (
                                <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">Out of Stock</span>
                            ) : stock.isLowStock ? (
                                <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Low Stock</span>
                            ) : (
                                <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">In Stock</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                                onClick={() => openEditStockModal(stock)}
                                className="px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                    ))
                )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Low Stock Alerts</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
                <div className="bg-slate-800/50 rounded-lg p-6 text-center text-slate-400">
                  No low stock alerts
                </div>
            ) : (
                filteredAlerts.map((alert) => (
                    <div
                        key={`${alert.warehouseId}-${alert.productId}`}
                        className={`rounded-lg p-4 border ${
                            alert.deficit > 50
                                ? 'bg-red-500/10 border-red-500/50'
                                : 'bg-yellow-500/10 border-yellow-500/50'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-medium">{alert.productName}</h3>
                            <span className="text-slate-400 text-sm">({alert.productSku})</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                alert.deficit > 50
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                        {alert.deficit > 50 ? 'Critical' : 'Warning'}
                      </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Warehouse</p>
                              <p className="text-white font-medium">{alert.warehouseName}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Current Level</p>
                              <p className="text-white font-medium">{alert.currentQuantity} units</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Minimum Level</p>
                              <p className="text-white font-medium">{alert.minimumLevel} units</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-400">{alert.deficit}</div>
                          <div className="text-xs text-slate-400">units needed</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
                        <div className="text-slate-400 text-sm">Warehouse: {alert.warehouseName}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                              onClick={() => openSupplierOrderModal(alert)}
                              className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg text-cyan-300 border border-cyan-500/20 transition"
                          >
                            Order from supplier
                          </button>
                          <button
                              onClick={() => openReorderModal(alert)}
                              className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg text-yellow-300 border border-yellow-500/20 transition"
                          >
                            Reorder from supplier
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full ${
                                alert.deficit > 50 ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            style={{
                              width: `${Math.min((alert.currentQuantity / alert.minimumLevel) * 100, 100)}%`,
                            }}
                        />
                      </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Stock Edit Modal */}
        {showEditStockModal && selectedStockForEdit && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
                <h2 className="text-xl font-bold text-white">Update Stock for {selectedStockForEdit.productName}</h2>
                <p className="text-slate-400 text-sm">
                  Warehouse: {selectedStockForEdit.warehouseName} • Current: {selectedStockForEdit.quantity} units
                </p>
                {stockUpdateError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-3 py-2 rounded">
                      {stockUpdateError}
                    </div>
                )}
                <label className="text-slate-300 text-sm">New quantity</label>
                <input
                    type="number"
                    min={0}
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                />
                <div className="flex gap-2 pt-2">
                  <button
                      onClick={() => {
                        setShowEditStockModal(false);
                        setSelectedStockForEdit(null);
                        setEditStockQuantity('');
                        setStockUpdateError(null);
                      }}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleStockUpdate}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Supplier Order Modal */}
        {showSupplierOrderModal && selectedSupplierOrderAlert && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-6">
              <div className="w-full max-w-2xl rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-700">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Reorder Product</h2>
                    <p className="text-slate-400 mt-1">Create a purchase order to a supplier</p>
                  </div>
                  <button
                      onClick={() => {
                        setShowSupplierOrderModal(false);
                        setSelectedSupplierOrderAlert(null);
                        setOrderQuantity('');
                        setOrderUnitPrice('0');
                        setSelectedSupplierId(0);
                        setSelectedSupplierProductId(null);
                        setPaymentMethod('BankTransfer');
                        setPaymentNotes('');
                        setSelectedPurchaseOrder(null);
                        setOrderError(null);
                        setStripeClientSecret(null);
                        setStripeError(null);
                      }}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid gap-4 mt-6">
                  <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                    <div className="text-sm text-slate-400">Product</div>
                    <div className="mt-2 text-lg font-semibold text-white">{selectedSupplierOrderAlert.productName}</div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                      <label className="text-sm text-slate-400">Select supplier</label>
                      {!isEmergencyOrder ? (
                          <select
                              value={selectedSupplierId}
                              onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                          >
                            <option value={0}>Select supplier</option>
                            {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                            ))}
                          </select>
                      ) : (
                          <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-300">Emergency purchase mode</div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm text-slate-400">Emergency purchase</label>
                        <label className="flex items-center gap-2 text-slate-300 text-sm">
                          <input
                              type="checkbox"
                              checked={isEmergencyOrder}
                              onChange={(e) => setIsEmergencyOrder(e.target.checked)}
                              className="accent-cyan-500"
                          />
                          Yes
                        </label>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">Use when no supplier catalog product is available.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                      <label className="text-sm text-slate-400">Quantity</label>
                      <input
                          type="number"
                          min={1}
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                      <label className="text-sm text-slate-400">Unit Price ($)</label>
                      <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={orderUnitPrice}
                          onChange={(e) => setOrderUnitPrice(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                      <label className="text-sm text-slate-400">Total Amount</label>
                      <div className="mt-3 text-3xl font-semibold text-white">${orderTotal.toFixed(2)}</div>
                    </div>
                  </div>

                  {!isEmergencyOrder && (
                      <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                        <label className="text-sm text-slate-400">Payment method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as 'Stripe' | 'BankTransfer')}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                        >
                          <option value="BankTransfer">Bank transfer</option>
                          <option value="Stripe">Stripe</option>
                        </select>
                        <label className="text-sm text-slate-400 mt-4 block">Payment notes</label>
                        <textarea
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                            rows={3}
                            placeholder="Add payment instructions or reference"
                        />
                      </div>
                  )}

                  {isEmergencyOrder && (
                      <div className="rounded-3xl border border-slate-700 bg-slate-800 p-5">
                        <label className="text-sm text-slate-400">Emergency reason</label>
                        <textarea
                            value={emergencyReason}
                            onChange={(e) => setEmergencyReason(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                            rows={3}
                            placeholder="Why is this reorder urgent?"
                        />
                      </div>
                  )}

                  {orderError && (
                      <div className="rounded-3xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-200">{orderError}</div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        onClick={() => {
                          setShowSupplierOrderModal(false);
                          setSelectedSupplierOrderAlert(null);
                          setOrderQuantity('');
                          setOrderUnitPrice('0');
                          setSelectedSupplierId(0);
                          setSelectedSupplierProductId(null);
                          setPaymentMethod('BankTransfer');
                          setPaymentNotes('');
                          setSelectedPurchaseOrder(null);
                          setOrderError(null);
                          setStripeClientSecret(null);
                          setStripeError(null);
                        }}
                        className="w-full sm:w-auto rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={handleSupplierOrder}
                        className="w-full sm:w-auto rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition"
                    >
                      Create Purchase Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {showStripeModal && stripeClientSecret && selectedPurchaseOrder && (
            <Elements stripe={stripePromise}>
              <StripeCheckoutModal
                  clientSecret={stripeClientSecret}
                  totalAmount={Number(paymentAmount)}
                  isLoading={loading}
                  onCancel={() => setShowStripeModal(false)}
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripeError}
              />
            </Elements>
        )}
      </div>
  );
}