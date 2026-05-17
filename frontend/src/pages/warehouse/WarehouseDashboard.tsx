import { useEffect, useMemo, useState } from 'react';
import { Package, AlertTriangle, Building2, PieChart, TrendingUp, TrendingDown, Box, Truck, Clock, CheckCircle, XCircle, Plus, Edit, Trash2, Users, MapPin, Phone, AlertCircle, Edit2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripeCheckoutModal } from '../../components/StripeCheckoutModal';
import { warehouseService, Warehouse, WarehouseZone, WarehouseStaff } from '../../services/warehouseService';
import { warehouseStockService, WarehouseStock } from '../../services/warehouseStockService';
import { API_BASE_URL } from '../../services/api';
import { productService, Product, Category } from '../../services/productService';
import { orderService, Order } from '../../services/orderService';
import { shipmentService } from '../../services/shipmentService';
import { driverService, Driver } from '../../services/driverService';
import { supplierService, Supplier, SupplierProductDto, PurchaseOrderDto } from '../../services/supplierService';
import { WarehouseInventory } from './Inventory';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

type WarehouseDashboardView = 'warehouses' | 'inventory';

export function WarehouseDashboard() {
  const [activeView, setActiveView] = useState<WarehouseDashboardView>('warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const getProductImageSrc = (imageUrl: string) =>
      imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : imageUrl;
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', location: '', phone: '' });
  const [zoneForm, setZoneForm] = useState({ warehouseId: 0, zoneName: '', description: '', capacity: 0 });
  const [staffForm, setStaffForm] = useState({ userId: 0, position: '', hireDate: '' });
  const [warehouseStocks, setWarehouseStocks] = useState<Record<number, WarehouseStock[]>>({});
  const [stocksLoading, setStocksLoading] = useState(false);

  // Supplier quick order states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductDto[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [selectedSupplierProductId, setSelectedSupplierProductId] = useState<number | null>(null);
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false);
  const [selectedSupplierQuickOrder, setSelectedSupplierQuickOrder] = useState<SupplierProductDto | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [orderUnitPrice, setOrderUnitPrice] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'BankTransfer'>('BankTransfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderDto | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isEmergencyOrder, setIsEmergencyOrder] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderShipmentModal, setShowOrderShipmentModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [shipmentDate, setShipmentDate] = useState('');
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentSuccess, setShipmentSuccess] = useState<string | null>(null);

  // Edit Stock Modal states
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<WarehouseStock | null>(null);
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [editStockError, setEditStockError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        productService.getAll(),
        productService.getCategories(),
        supplierService.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Failed to fetch products or suppliers:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getAll();
      const [driversData, ordersData] = await Promise.all([
        driverService.getAvailable().catch(() => [] as Driver[]),
        orderService.getAll().catch(() => [] as Order[])
      ]);
      setWarehouses(data);
      setAvailableDrivers(driversData);
      setOrders(ordersData);
      setError(null);
      await fetchWarehouseStocks(data);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
      setError('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseStocks = async (warehousesList: Warehouse[]) => {
    if (!warehousesList || warehousesList.length === 0) return;

    setStocksLoading(true);
    try {
      const stocksData: Record<number, WarehouseStock[]> = {};

      await Promise.all(
          warehousesList.map(async (warehouse) => {
            try {
              const stock = await warehouseStockService.getByWarehouse(warehouse.id);
              stocksData[warehouse.id] = stock;
            } catch (err) {
              console.error(`Failed to fetch stock for warehouse ${warehouse.id}:`, err);
              stocksData[warehouse.id] = [];
            }
          })
      );

      setWarehouseStocks(stocksData);
    } catch (err) {
      console.error('Failed to fetch warehouse stocks:', err);
    } finally {
      setStocksLoading(false);
    }
  };

  const refreshAllStocks = async () => {
    if (warehouses.length > 0) {
      await fetchWarehouseStocks(warehouses);
    }
  };

  const openOrderShipmentModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedDriverId(availableDrivers[0]?.id ?? null);
    setShipmentDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setShipmentError(null);
    setShipmentSuccess(null);
    setShowOrderShipmentModal(true);
  };

  const closeOrderShipmentModal = () => {
    setSelectedOrder(null);
    setSelectedDriverId(null);
    setShipmentDate('');
    setShipmentError(null);
    setShipmentSuccess(null);
    setShowOrderShipmentModal(false);
  };

  const handleCreateOrderShipment = async () => {
    if (!selectedOrder) return;
    if (!selectedDriverId) {
      setShipmentError('Please select an available driver');
      return;
    }

    try {
      setShipmentError(null);
      setLoading(true);
      await shipmentService.create({
        orderId: selectedOrder.id,
        warehouseId: selectedOrder.warehouseId ?? selectedWarehouse?.id ?? 0,
        driverId: selectedDriverId,
        estimatedDeliveryDate: new Date(shipmentDate).toISOString(),
        shippingAddress: selectedOrder.shippingAddress || selectedWarehouse?.location || '',
        items: selectedOrder.items?.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })) || []
      });

      setShipmentSuccess('Shipment arranged successfully');
      await fetchWarehouses();
      closeOrderShipmentModal();
    } catch (err: any) {
      console.error('Failed to create shipment:', err);
      setShipmentError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    const loadSupplierProducts = async () => {
      if (!selectedSupplierId) {
        setSupplierProducts([]);
        setSelectedSupplierProductId(null);
        return;
      }
      try {
        const products = await supplierService.getProductsBySupplier(selectedSupplierId);
        setSupplierProducts(products);
        setSelectedSupplierProductId(products[0]?.productId ?? null);
      } catch (err) {
        console.error('Failed to load supplier product catalog:', err);
        setSupplierProducts([]);
        setSelectedSupplierProductId(null);
      }
    };

    loadSupplierProducts();
  }, [selectedSupplierId]);

  // Edit Stock functions
  const openEditStockModal = (stock: WarehouseStock) => {
    setSelectedStockItem(stock);
    setEditStockQuantity(stock.quantity.toString());
    setEditStockError(null);
    setShowEditStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedStockItem) return;

    const quantity = parseInt(editStockQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      setEditStockError('Enter a valid quantity');
      return;
    }

    try {
      await warehouseStockService.updateStock(selectedStockItem.warehouseId, selectedStockItem.productId, {
        quantity,
        type: 'Adjustment',
        notes: 'Updated manually from warehouse dashboard',
      });

      await refreshAllStocks();
      setShowEditStockModal(false);
      setSelectedStockItem(null);
      setEditStockQuantity('');
      setEditStockError(null);
      alert('Stock updated successfully!');
    } catch (err) {
      console.error('Failed to update stock:', err);
      setEditStockError('Failed to update stock. Please try again.');
    }
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }
    try {
      await warehouseService.create(warehouseForm);
      await fetchWarehouses();
      setShowWarehouseModal(false);
      setWarehouseForm({ name: '', location: '', phone: '' });
      alert('Warehouse created successfully!');
    } catch (err) {
      console.error('Failed to create warehouse:', err);
      alert('Failed to create warehouse');
    }
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }
    try {
      await warehouseService.update(editingWarehouse.id, {
        name: warehouseForm.name,
        location: warehouseForm.location,
        phone: warehouseForm.phone,
        isActive: editingWarehouse.isActive
      });
      await fetchWarehouses();
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: '', location: '', phone: '' });
      alert('Warehouse updated successfully!');
    } catch (err) {
      console.error('Failed to update warehouse:', err);
      alert('Failed to update warehouse');
    }
  };

  const handleDeleteWarehouse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await warehouseService.delete(id);
      await fetchWarehouses();
      alert('Warehouse deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete warehouse:', err);
      alert(err?.response?.data?.message || 'Cannot delete warehouse with existing stock. Transfer or remove stock first.');
    }
  };

  const handleCreateZone = async () => {
    if (!selectedWarehouse) return;
    if (!zoneForm.zoneName.trim()) {
      alert('Zone name is required');
      return;
    }
    try {
      await warehouseService.createZone({
        ...zoneForm,
        warehouseId: selectedWarehouse.id
      });
      await fetchWarehouses();
      setShowZoneModal(false);
      setZoneForm({ warehouseId: 0, zoneName: '', description: '', capacity: 0 });
      alert('Zone created successfully!');
    } catch (err) {
      console.error('Failed to create zone:', err);
      alert('Failed to create zone');
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    try {
      await warehouseService.deleteZone(zoneId);
      await fetchWarehouses();
      alert('Zone deleted successfully!');
    } catch (err) {
      console.error('Failed to delete zone:', err);
      alert('Failed to delete zone');
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedWarehouse) return;
    if (!staffForm.userId || staffForm.userId <= 0) {
      alert('Valid User ID is required');
      return;
    }
    try {
      await warehouseService.assignStaff(selectedWarehouse.id, {
        userId: staffForm.userId,
        position: staffForm.position,
        hireDate: staffForm.hireDate
      });
      await fetchWarehouses();
      setShowStaffModal(false);
      setStaffForm({ userId: 0, position: '', hireDate: '' });
      alert('Staff assigned successfully!');
    } catch (err) {
      console.error('Failed to assign staff:', err);
      alert('Failed to assign staff');
    }
  };

  const handleRemoveStaff = async (staffId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await warehouseService.removeStaff(staffId);
      await fetchWarehouses();
      alert('Staff removed successfully!');
    } catch (err) {
      console.error('Failed to remove staff:', err);
      alert('Failed to remove staff');
    }
  };

  const totalWarehouses = warehouses.length;
  const totalZones = warehouses.reduce((sum, w) => sum + (w.zones?.length || 0), 0);
  const totalStaff = warehouses.reduce((sum, w) => sum + (w.staff?.length || 0), 0);

  const totalCapacity = warehouses.reduce((sum, w) =>
      sum + (w.zones?.reduce((zoneSum, z) => zoneSum + (z.capacity || 0), 0) || 0), 0);

  const totalProducts = Object.values(warehouseStocks).reduce(
      (sum, stocks) => sum + (stocks?.length || 0), 0
  );
  const totalStockQuantity = Object.values(warehouseStocks).reduce(
      (sum, stocks) => sum + (stocks?.reduce((s, stock) => s + (stock.quantity || 0), 0) || 0), 0
  );

  const selectedSupplierProduct = useMemo(
      () => products.find((product) => product.id === selectedSupplierProductId) ?? null,
      [products, selectedSupplierProductId]
  );

  const orderTotal = useMemo(() => {
    const quantity = parseInt(orderQuantity, 10);
    const unitPrice = parseFloat(orderUnitPrice);
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) return 0;
    return quantity * unitPrice;
  }, [orderQuantity, orderUnitPrice]);

  const openSupplierCatalogOrderModal = (mapping: SupplierProductDto) => {
    if (!selectedWarehouse && warehouses.length > 0) {
      setSelectedWarehouse(warehouses[0]);
    }

    setSelectedSupplierId(mapping.supplierId);
    setSelectedSupplierProductId(mapping.productId);
    setSelectedSupplierQuickOrder(mapping);
    setOrderQuantity('1');
    setOrderUnitPrice('0');
    setPaymentMethod('Stripe');
    setPaymentNotes('');
    setOrderError(null);
    setIsEmergencyOrder(false);
    setEmergencyReason('');
    setShowSupplierOrderModal(true);
  };

  const handleSupplierOrder = async () => {
    if (!selectedSupplierQuickOrder) {
      setOrderError('Select a supplier product before placing the order.');
      return;
    }

    if (!selectedSupplierId) {
      setOrderError('Select a supplier first.');
      return;
    }

    if (!selectedWarehouse) {
      setOrderError('Select a warehouse before placing an order.');
      return;
    }

    const quantity = parseInt(orderQuantity, 10);
    const price = parseFloat(orderUnitPrice);
    const productId = selectedSupplierProductId ?? selectedSupplierQuickOrder.productId;

    if (!quantity || quantity <= 0) {
      setOrderError('Enter a valid quantity');
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setOrderError('Enter a valid unit price');
      return;
    }

    try {
      setLoading(true);
      const purchaseOrder = await supplierService.createPurchaseOrder({
        supplierId: selectedSupplierId,
        warehouseId: selectedWarehouse.id,
        items: [
          {
            productId,
            quantity,
            unitPrice: price,
          },
        ],
        notes: `Reorder generated from warehouse dashboard for supplier ${selectedSupplierId}`,
      });

      setSelectedPurchaseOrder(purchaseOrder);
      setOrderQuantity(quantity.toString());
      setOrderUnitPrice(price.toFixed(2));

      if (paymentMethod === 'Stripe') {
        await handleStartStripePayment(quantity * price, purchaseOrder);
        return;
      }

      await supplierService.createPayment(purchaseOrder.id, {
        purchaseOrderId: purchaseOrder.id,
        amount: quantity * price,
        paymentMethod: 'BankTransfer',
        transactionId: `WH-${purchaseOrder.poNumber}`,
        notes: paymentNotes || 'Recorded payment from warehouse dashboard',
      });

      setShowSupplierOrderModal(false);
      setSelectedSupplierQuickOrder(null);
      setSelectedSupplierProductId(null);
      setPaymentMethod('BankTransfer');
      setPaymentNotes('');
    } catch (err: any) {
      console.error('Failed to create supplier order:', err);
      setOrderError(err?.message || 'Failed to create supplier order, please try again');
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
        amount: Number(orderTotal),
        paymentMethod: 'Stripe',
        transactionId,
        notes: paymentNotes || 'Stripe payment completed from warehouse dashboard',
      });

      await fetchWarehouses();
      setShowStripeModal(false);
      setShowSupplierOrderModal(false);
      setSelectedSupplierQuickOrder(null);
      setSelectedSupplierProductId(null);
      setPaymentMethod('BankTransfer');
      setPaymentNotes('');
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

  if (activeView === 'inventory') {
    return (
        <div className="space-y-4">
          <div className="p-6 bg-slate-900">
            <div className="flex items-center gap-4 mb-6">
              <button
                  onClick={() => setActiveView('warehouses')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                â† Back to Warehouses
              </button>
              <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
            </div>
          </div>
          <WarehouseInventory />
        </div>
    );
  }

  if (loading) {
    return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading warehouses...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Warehouse Management</h1>
            <p className="text-slate-400 mt-1">Manage your warehouses, zones, staff, and product stock</p>
          </div>
          <div className="flex gap-2">
            <button
                onClick={() => setActiveView('inventory')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <TrendingDown className="w-4 h-4" />
              View Inventory
            </button>
            <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setWarehouseForm({ name: '', location: '', phone: '' });
                  setShowWarehouseModal(true);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{totalWarehouses}</h3>
              <p className="text-slate-400 text-sm">Warehouses</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Box className="w-6 h-6 text-purple-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{totalZones}</h3>
              <p className="text-slate-400 text-sm">Zones</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{totalStaff}</h3>
              <p className="text-slate-400 text-sm">Staff Members</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{totalProducts}</h3>
              <p className="text-slate-400 text-sm">Unique Products</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <PieChart className="w-6 h-6 text-blue-400" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{totalStockQuantity.toLocaleString()}</h3>
              <p className="text-slate-400 text-sm">Total Units</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Supplier Reorder</h2>
              <p className="text-slate-400 mt-1">Pick a supplier and order products directly from the warehouse dashboard.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-slate-400 text-sm mb-1">Warehouse</label>
                <select
                    value={selectedWarehouse?.id ?? ''}
                    onChange={(e) => {
                      const warehouseId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setSelectedWarehouse(warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null);
                    }}
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
                Select a supplier to show available products and reorder options.
              </div>
          ) : supplierProducts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">
                No products published for this supplier. Try another supplier or update the supplier catalog.
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
                    const product = products.find((item) => item.id === mapping.productId);
                    return (
                        <tr key={mapping.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                          <td className="p-3 text-white">{product?.name ?? `Product #${mapping.productId}`}</td>
                          <td className="p-3">{product?.sku ?? mapping.supplierSKU ?? 'â€”'}</td>
                          <td className="p-3 text-slate-300">{mapping.leadTimeDays ? `${mapping.leadTimeDays} days` : 'N/A'}</td>
                          <td className="p-3">
                            <button
                                onClick={() => openSupplierCatalogOrderModal(mapping)}
                                className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-500 transition"
                            >
                              Reorder
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

        {/* Warehouses List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {warehouses.map((warehouse) => {
            const stocks = warehouseStocks[warehouse.id] || [];
            const totalUnits = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const lowStockCount = stocks.filter(s => s.isLowStock).length;
            const outOfStockCount = stocks.filter(s => s.isOutOfStock).length;

            return (
                <div key={warehouse.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-cyan-500/50 transition-all">
                  <div className="p-5 border-b border-slate-700 bg-slate-800/80">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="w-5 h-5 text-cyan-400" />
                          <h3 className="text-lg font-semibold text-white">{warehouse.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                              warehouse.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </span>
                        </div>
                        {(warehouse.location || warehouse.phone) && (
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                              {warehouse.location && (
                                  <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                                    {warehouse.location}
                          </span>
                              )}
                              {warehouse.phone && (
                                  <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                                    {warehouse.phone}
                          </span>
                              )}
                            </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                            onClick={() => {
                              setEditingWarehouse(warehouse);
                              setWarehouseForm({
                                name: warehouse.name,
                                location: warehouse.location || '',
                                phone: warehouse.phone || ''
                              });
                              setShowWarehouseModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-600 rounded-lg transition"
                            title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                            onClick={() => handleDeleteWarehouse(warehouse.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition"
                            title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Products/Stock Section - Cards like in the photo */}
                  <div className="p-5 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400" />
                        <h4 className="font-medium text-white">Products in Stock</h4>
                        <span className="text-xs text-slate-500">({stocks.length} products)</span>
                      </div>
                    </div>

                    {stocksLoading ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-slate-400 text-sm mt-2">Loading products...</p>
                        </div>
                    ) : stocks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {stocks.map((stock) => {
                            const product = products.find(p => p.id === stock.productId);
                            const category = categories.find(c => c.id === product?.categoryId);
                            const isLowStock = stock.quantity < stock.minimumStockLevel;
                            const isOutOfStock = stock.quantity === 0;

                            return (
                                <div key={stock.id} className="bg-slate-900/50 rounded-lg p-4 hover:bg-slate-900/70 transition-all group">
                                  <div className="relative mb-3">
                                    <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                                      {product?.images && product.images.length > 0 ? (
                                          <img
                                              src={getProductImageSrc(product.images[0].imageUrl)}
                                              alt={product?.name || `Product ${stock.productId}`}
                                              className="h-full w-full object-cover"
                                          />
                                      ) : (
                                          <Package className="w-12 h-12 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                      )}
                                    </div>
                                    {(isLowStock || isOutOfStock) && (
                                        <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isOutOfStock ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : ''}
                                </span>
                                        </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <h5 className="font-semibold text-white text-sm line-clamp-1">{product?.name || `Product #${stock.productId}`}</h5>
                                      <p className="text-slate-400 text-xs">{product?.sku || 'N/A'}</p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-2xl font-bold text-cyan-400">${product?.price.toFixed(2) || '0.00'}</p>
                                      </div>
                                      {category && (
                                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
                                  {category.name}
                                </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                                      <div>
                                        <p className="text-xs text-slate-500">Quantity</p>
                                        <p className={`text-lg font-semibold ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-white'}`}>
                                          {stock.quantity}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">Min Level</p>
                                        <p className="text-white text-lg font-semibold">{stock.minimumStockLevel}</p>
                                      </div>
                                    </div>

                                    <button
                                        onClick={() => openEditStockModal(stock)}
                                        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Update Stock
                                    </button>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                          <Package className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No products in this warehouse</p>
                          <p className="text-slate-600 text-xs mt-1">Add products from Supplier or Create new product</p>
                        </div>
                    )}
                  </div>

                  {/* Zones Section */}
                  <div className="p-5 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-purple-400" />
                        <h4 className="font-medium text-white">Zones</h4>
                        <span className="text-xs text-slate-500">({warehouse.zones?.length || 0})</span>
                      </div>
                      <button
                          onClick={() => {
                            setSelectedWarehouse(warehouse);
                            setZoneForm({ warehouseId: warehouse.id, zoneName: '', description: '', capacity: 0 });
                            setShowZoneModal(true);
                          }}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-lg flex items-center gap-1 transition"
                      >
                        <Plus className="w-3 h-3" /> Add Zone
                      </button>
                    </div>
                    {warehouse.zones && warehouse.zones.length > 0 ? (
                        <div className="space-y-2">
                          {warehouse.zones.map((zone) => (
                              <div key={zone.id} className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="text-white text-sm font-medium">{zone.zoneName}</p>
                                  {zone.description && (
                                      <p className="text-slate-400 text-xs">{zone.description}</p>
                                  )}
                                  <p className="text-slate-500 text-xs mt-1">Capacity: {zone.capacity.toLocaleString()} units</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteZone(zone.id)}
                                    className="p-1.5 hover:bg-red-500/20 rounded transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                          ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-4">No zones defined</p>
                    )}
                  </div>

                  {/* Staff Section */}
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <h4 className="font-medium text-white">Staff</h4>
                        <span className="text-xs text-slate-500">({warehouse.staff?.length || 0})</span>
                      </div>
                      <button
                          onClick={() => {
                            setSelectedWarehouse(warehouse);
                            setStaffForm({ userId: 0, position: '', hireDate: '' });
                            setShowStaffModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg flex items-center gap-1 transition"
                      >
                        <Plus className="w-3 h-3" /> Assign Staff
                      </button>
                    </div>
                    {warehouse.staff && warehouse.staff.length > 0 ? (
                        <div className="space-y-2">
                          {warehouse.staff.map((staff) => (
                              <div key={staff.id} className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="text-white text-sm font-medium">User ID: {staff.userId}</p>
                                  {staff.position && (
                                      <p className="text-slate-400 text-xs">{staff.position}</p>
                                  )}
                                  {staff.hireDate && (
                                      <p className="text-slate-500 text-xs">Hired: {new Date(staff.hireDate).toLocaleDateString()}</p>
                                  )}
                                </div>
                                <button
                                    onClick={() => handleRemoveStaff(staff.id)}
                                    className="p-1.5 hover:bg-red-500/20 rounded transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                          ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-4">No staff assigned</p>
                    )}
                  </div>
                </div>
            );
          })}
        </div>

        {/* Customer Orders */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Customer Orders</h2>
              <p className="text-slate-400 mt-1">View orders assigned to your warehouses and arrange shipment.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                  value={selectedWarehouse?.id ?? ''}
                  onChange={(e) => {
                    const warehouseId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedWarehouse(warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null);
                  }}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white outline-none"
              >
                <option value="">All warehouses</option>
                {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/70">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Warehouse</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Action</th>
              </tr>
              </thead>
              <tbody>
              {(selectedWarehouse ? orders.filter(o => o.warehouseId === selectedWarehouse.id) : orders).map((order) => (
                  <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition">
                    <td className="p-3 text-white">{order.orderNumber}</td>
                    <td className="p-3 text-slate-300">{order.warehouseId ?? 'Unassigned'}</td>
                    <td className="p-3 text-white">€{order.totalAmount.toFixed(2)}</td>
                    <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status?.toLowerCase().includes('pending') ? 'bg-yellow-500/20 text-yellow-400' :
                            order.status?.toLowerCase().includes('processing') ? 'bg-blue-500/20 text-blue-400' :
                                order.status?.toLowerCase().includes('shipped') ? 'bg-purple-500/20 text-purple-400' :
                                    order.status?.toLowerCase().includes('delivered') ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>{order.status}</span>
                    </td>
                    <td className="p-3 text-slate-300">{order.billingName || 'Customer'}</td>
                    <td className="p-3">
                      <button
                          onClick={() => openOrderShipmentModal(order)}
                          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-500 transition"
                      >
                        Arrange Shipment
                      </button>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {showOrderShipmentModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">Arrange Shipment for Order {selectedOrder.orderNumber}</h3>
                    <p className="text-slate-400 mt-2">Select driver and delivery date for the shipment.</p>
                  </div>
                  <button onClick={closeOrderShipmentModal} className="text-slate-400 hover:text-white">Close</button>
                </div>

                {shipmentError && (
                    <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                      {shipmentError}
                    </div>
                )}
                {shipmentSuccess && (
                    <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
                      {shipmentSuccess}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Available Driver</label>
                    <select
                        value={selectedDriverId ?? ''}
                        onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select driver</option>
                      {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>{driver.firstName ?? 'Driver'} {driver.lastName ?? ''} ({driver.licenseNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Estimated Delivery Date</label>
                    <input
                        type="date"
                        value={shipmentDate}
                        onChange={(e) => setShipmentDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                      onClick={closeOrderShipmentModal}
                      className="px-4 py-2 rounded-2xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleCreateOrderShipment}
                      className="px-4 py-2 rounded-2xl bg-cyan-600 text-slate-900 font-semibold hover:bg-cyan-500 transition"
                  >
                    Create Shipment
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Edit Stock Modal */}
        {showEditStockModal && selectedStockItem && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Update Stock</h2>
                  <button onClick={() => setShowEditStockModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm">Product</p>
                    <p className="text-white font-semibold">{selectedStockItem.productName || `Product #${selectedStockItem.productId}`}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Warehouse</p>
                    <p className="text-white">{selectedStockItem.warehouseName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Current Quantity</p>
                    <p className="text-2xl font-bold text-cyan-400">{selectedStockItem.quantity}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">New Quantity</label>
                    <input
                        type="number"
                        min={0}
                        value={editStockQuantity}
                        onChange={(e) => setEditStockQuantity(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {editStockError && (
                      <p className="text-red-400 text-sm">{editStockError}</p>
                  )}
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button
                      onClick={() => setShowEditStockModal(false)}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleStockUpdate}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
                  >
                    Update Stock
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Warehouse Modal */}
        {showWarehouseModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Warehouse Name *</label>
                    <input
                        type="text"
                        value={warehouseForm.name}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="e.g., Main Warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Location</label>
                    <input
                        type="text"
                        value={warehouseForm.location}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="City, Address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Phone</label>
                    <input
                        type="text"
                        value={warehouseForm.phone}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="+1234567890"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => { setShowWarehouseModal(false); setEditingWarehouse(null); setWarehouseForm({ name: '', location: '', phone: '' }); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Cancel</button>
                  <button onClick={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition">{editingWarehouse ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
        )}

        {/* Zone Modal */}
        {showZoneModal && selectedWarehouse && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Add Zone to {selectedWarehouse.name}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Zone Name *</label>
                    <input
                        type="text"
                        value={zoneForm.zoneName}
                        onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="e.g., Aisle A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea
                        value={zoneForm.description}
                        onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        rows={2}
                        placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Capacity</label>
                    <input
                        type="number"
                        value={zoneForm.capacity || ''}
                        onChange={(e) => setZoneForm({ ...zoneForm, capacity: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Max units"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => setShowZoneModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
                  <button onClick={handleCreateZone} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Create Zone</button>
                </div>
              </div>
            </div>
        )}

        {/* Staff Modal */}
        {showStaffModal && selectedWarehouse && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Assign Staff to {selectedWarehouse.name}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">User ID *</label>
                    <input
                        type="number"
                        value={staffForm.userId || ''}
                        onChange={(e) => setStaffForm({ ...staffForm, userId: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter user ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Position</label>
                    <input
                        type="text"
                        value={staffForm.position}
                        onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="e.g., Warehouse Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Hire Date</label>
                    <input
                        type="date"
                        value={staffForm.hireDate}
                        onChange={(e) => setStaffForm({ ...staffForm, hireDate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                  <button onClick={() => setShowStaffModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
                  <button onClick={handleAssignStaff} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Assign Staff</button>
                </div>
              </div>
            </div>
        )}

        {/* Supplier Order Modal */}
        {showSupplierOrderModal && selectedSupplierQuickOrder && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-3xl w-full max-w-3xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="flex flex-col gap-3 p-5 border-b border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Supplier Reorder</h2>
                    <p className="text-slate-400">Create a purchase order and pay instantly using Stripe.</p>
                  </div>
                  <button
                      onClick={() => setShowSupplierOrderModal(false)}
                      className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid gap-6 p-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
                      <h3 className="text-lg font-semibold text-white">Product</h3>
                      <p className="mt-2 text-slate-300">{selectedSupplierProduct?.name || 'Selected product'}</p>
                      <p className="text-slate-400 text-sm">Supplier SKU: {selectedSupplierQuickOrder.supplierSKU || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                        <input
                            type="number"
                            min={1}
                            value={orderQuantity}
                            onChange={(e) => setOrderQuantity(e.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Unit Price (€)</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={orderUnitPrice}
                            onChange={(e) => setOrderUnitPrice(e.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as 'Stripe' | 'BankTransfer')}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
                        >
                          <option value="Stripe">Stripe</option>
                          <option value="BankTransfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={isEmergencyOrder}
                            onChange={(e) => setIsEmergencyOrder(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500"
                        />
                        <span>Emergency reorder</span>
                      </div>
                      {isEmergencyOrder && (
                          <div>
                            <label className="block text-sm text-slate-400 mb-1">Emergency Reason</label>
                            <textarea
                                rows={2}
                                value={emergencyReason}
                                onChange={(e) => setEmergencyReason(e.target.value)}
                                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
                            />
                          </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
                      <h3 className="text-lg font-semibold text-white">Order Summary</h3>
                      <div className="mt-4 space-y-3 text-slate-300">
                        <div className="flex justify-between">
                          <span>Warehouse</span>
                          <span className="text-white">{selectedWarehouse?.name || 'Select warehouse'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Supplier</span>
                          <span className="text-white">{suppliers.find((s) => s.id === selectedSupplierId)?.name || 'Supplier'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantity</span>
                          <span>{orderQuantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unit Price</span>
                          <span>€{parseFloat(orderUnitPrice || '0').toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 font-semibold text-white">
                          <span>Total</span>
                          <span>€{orderTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {orderError && (
                        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
                          {orderError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                          onClick={() => setShowSupplierOrderModal(false)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                          onClick={handleSupplierOrder}
                          disabled={loading}
                          className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-60"
                      >
                        {paymentMethod === 'Stripe' ? 'Proceed to Stripe' : 'Place Order'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {showStripeModal && stripeClientSecret && selectedPurchaseOrder && (
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripeCheckoutModal
                  clientSecret={stripeClientSecret}
                  totalAmount={orderTotal}
                  onCancel={() => setShowStripeModal(false)}
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripeError}
                  isLoading={loading}
              />
            </Elements>
        )}

      </div>
  );
}

