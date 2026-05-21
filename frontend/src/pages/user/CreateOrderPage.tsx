import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useAuth } from '../../hooks/useAuth';
import { orderService, CreateOrderDto } from '../../services/orderService';
import { API_BASE_URL } from '../../services/api';
import { productService, Product, Category } from '../../services/productService';
import { warehouseStockService, WarehouseStock } from '../../services/warehouseStockService';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { useCart } from '../../hooks/useCart';
import { StripeCheckoutModal } from '../../components/StripeCheckoutModal';
import { Building2, Package, ShoppingCart, MapPin, CreditCard, Landmark } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

export function CreateOrderPage() {
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, getCartTotal, getCartItemCount, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const getProductImageSrc = (imageUrl: string) =>
      imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : imageUrl;
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouseInventory, setWarehouseInventory] = useState<Record<number, WarehouseStock>>({});
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'BankTransfer'>('Stripe');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await productService.getAll();
      const categoriesData = await productService.getCategories();
      setProducts(productsData.filter(p => p.isActive));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    setWarehouseLoading(true);
    try {
      const warehousesData = await warehouseService.getAll();
      setWarehouses(warehousesData.filter(w => w.isActive));
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      setError('Failed to load warehouses');
    } finally {
      setWarehouseLoading(false);
    }
  };

  const loadWarehouseInventory = async (warehouseId: number) => {
    setWarehouseLoading(true);
    try {
      const inventoryData = await warehouseStockService.getByWarehouse(warehouseId);
      const inventoryMap: Record<number, WarehouseStock> = {};
      inventoryData.forEach((item) => {
        inventoryMap[item.productId] = item;
      });
      setWarehouseInventory(inventoryMap);
    } catch (error) {
      console.error('Failed to load warehouse inventory:', error);
      setWarehouseInventory({});
    } finally {
      setWarehouseLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWarehouse !== null) {
      loadWarehouseInventory(selectedWarehouse);
    } else {
      setWarehouseInventory({});
    }
  }, [selectedWarehouse]);

  const validateOrderInputs = () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return false;
    }

    if (!shippingAddress.trim()) {
      alert('Please enter a shipping address');
      return false;
    }

    if (selectedWarehouse === null) {
      alert('Please select a warehouse for this order');
      return false;
    }

    const invalidItem = cart.find((item) => {
      const inventoryItem = warehouseInventory[item.productId];
      const availableQuantity = inventoryItem?.availableQuantity ?? inventoryItem?.quantity ?? 0;
      return !inventoryItem || item.quantity > availableQuantity;
    });

    if (invalidItem) {
      const stock = warehouseInventory[invalidItem.productId];
      const availableQuantity = stock?.availableQuantity ?? stock?.quantity ?? 0;
      alert(`${invalidItem.product.name} exceeds available quantity in the selected warehouse. Available: ${availableQuantity}, in cart: ${invalidItem.quantity}.`);
      return false;
    }

    return true;
  };

  const handleInvoiceSubmit = async () => {
    if ((paymentMethod === 'BankTransfer' && !bankAccount.trim()) || !billingName.trim() || !billingEmail.trim()) {
      alert('Please fill all invoice fields');
      return;
    }

    if (!validateOrderInputs()) {
      return;
    }

    if (paymentMethod === 'Stripe') {
      try {
        setCreatingOrder(true);
        setStripeError(null);
        const response = await orderService.createPaymentIntent({ amount: getCartTotal(), currency: 'eur' });
        setStripeClientSecret(response.clientSecret);
        setShowStripeModal(true);
      } catch (error: any) {
        console.error('Failed to create Stripe payment intent:', error);
        setStripeError(error.message || 'Unable to start Stripe payment');
      } finally {
        setCreatingOrder(false);
      }
      return;
    }

    await createOrder('BankTransfer', bankAccount);
  };

  const resetCheckoutState = () => {
    setShowInvoiceModal(false);
    setShowStripeModal(false);
    setStripeClientSecret(null);
    setStripeError(null);
    setBankAccount('');
    setBillingName('');
    setBillingEmail('');
    setBillingPhone('');
    setPaymentMethod('Stripe');
  };

  const createOrder = async (method: 'Stripe' | 'BankTransfer' = paymentMethod, paymentReference = '') => {
    if (!validateOrderInputs()) {
      return;
    }

    const warehouseId = selectedWarehouse!;

    setCreatingOrder(true);
    try {
      const orderData: CreateOrderDto = {
        userId: user!.id,
        warehouseId,
        shippingAddress: shippingAddress,
        billingAddress: shippingAddress,
        paymentMethod: method,
        paymentReference,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: 0
        })),
        invoice: {
          bankAccount,
          billingName,
          billingEmail,
          billingPhone
        }
      };

      const createdOrder = await orderService.create(orderData);
      clearCart();
      setShippingAddress('');
      resetCheckoutState();

      alert(`Order #${createdOrder.orderNumber} created successfully! A driver will be assigned shortly.`);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleStripePaymentSuccess = async (transactionId: string) => {
    await createOrder('Stripe', transactionId);
  };

  const handleStripeError = (message: string) => {
    setStripeError(message);
  };

  const getAvailableProducts = () => {
    let filtered = products;

    if (selectedCategory !== null) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    if (selectedWarehouse !== null) {
      filtered = filtered.filter(p => warehouseInventory[p.id] !== undefined && warehouseInventory[p.id].quantity > 0);
    }

    return filtered;
  };

  const getProductStock = (productId: number) => {
    if (selectedWarehouse === null) return null;
    return warehouseInventory[productId];
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading products...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-6">
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        </div>
    );
  }

  return (
      <div className="flex flex-col gap-8 p-6 bg-slate-900 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Create New Order</h1>
          <p className="text-slate-400">Select a warehouse, browse products, and add them to your cart</p>
        </div>

        
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Select Warehouse</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {warehouses.map((warehouse) => (
                <button
                    key={warehouse.id}
                    onClick={() => setSelectedWarehouse(warehouse.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedWarehouse === warehouse.id
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                    }`}
                >
                  <Building2 className={`w-5 h-5 mb-2 ${selectedWarehouse === warehouse.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <p className="text-white font-semibold">{warehouse.name}</p>
                  {warehouse.location && (
                      <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {warehouse.location}
                      </p>
                  )}
                </button>
            ))}
          </div>
          {warehouseLoading && (
              <div className="mt-4 flex items-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                Loading inventory...
              </div>
          )}
        </div>

        {selectedWarehouse === null ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
              <Building2 className="w-16 h-16 text-slate-500 mb-4" />
              <p className="text-slate-400 text-lg">Please select a warehouse to start shopping</p>
              <p className="text-slate-500 text-sm mt-2">Products will appear once you choose a warehouse</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur">
                  <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Products</h2>

                    
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <button
                          onClick={() => setSelectedCategory(null)}
                          className={`px-4 py-2 rounded-lg text-sm transition ${
                              selectedCategory === null
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                      >
                        All Products
                      </button>
                      {categories.map(category => (
                          <button
                              key={category.id}
                              onClick={() => setSelectedCategory(category.id)}
                              className={`px-4 py-2 rounded-lg text-sm transition ${
                                  selectedCategory === category.id
                                      ? 'bg-cyan-500 text-white'
                                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                          >
                            {category.name}
                          </button>
                      ))}
                    </div>
                  </div>

                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {getAvailableProducts().map((product) => {
                        const stock = getProductStock(product.id);
                        const availableQuantity = stock?.availableQuantity ?? stock?.quantity ?? 0;
                        const isAvailable = availableQuantity > 0;
                        const inCart = cart.some(item => item.productId === product.id);
                        const cartItem = cart.find(item => item.productId === product.id);

                        return (
                            <div
                                key={product.id}
                                className="group bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-cyan-500/50 hover:shadow-lg transition-all duration-300"
                            >
                              
                              <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
                                {product.images && product.images.length > 0 ? (
                                    <img
                                        src={getProductImageSrc(product.images[0].imageUrl)}
                                        alt={product.name}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <Package className="w-16 h-16 text-slate-600 group-hover:text-cyan-500 transition-colors duration-300" />
                                )}
                                {!isAvailable && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                      <span className="text-red-400 font-bold px-3 py-1 bg-red-500/20 rounded-full">Out of Stock</span>
                                    </div>
                                )}
                                {inCart && (
                                    <div className="absolute top-2 right-2">
                              <span className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-full animate-pulse">
                                In Cart ({cartItem?.quantity})
                              </span>
                                    </div>
                                )}
                              </div>

                              
                              <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition line-clamp-1">
                                    {product.name}
                                  </h3>
                                  <span className="px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300">
                              {getCategoryName(product.categoryId)}
                            </span>
                                </div>

                                <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                                  {product.description || 'No description available'}
                                </p>

                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <p className="text-2xl font-bold text-cyan-400">${product.price.toFixed(2)}</p>
                                    {stock && (
                                        <p className="text-xs text-slate-500 mt-1">{availableQuantity} units available</p>
                                    )}
                                  </div>
                                </div>

                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={!isAvailable}
                                    className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                        isAvailable
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  {inCart ? 'Add More' : 'Add to Cart'}
                                </button>
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    {getAvailableProducts().length === 0 && (
                        <div className="text-center py-12">
                          <Package className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                          <p className="text-slate-400">No products available in this warehouse</p>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur sticky top-6">
                  <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Shopping Cart ({getCartItemCount()})
                    </h2>
                  </div>

                  <div className="p-6 max-h-96 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-6xl mb-3">🛒</div>
                          <p className="text-slate-400">Your cart is empty</p>
                          <p className="text-slate-500 text-sm mt-2">Add products to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                          {cart.map((item) => (
                              <div key={item.productId} className="flex gap-3 pb-3 border-b border-slate-700">
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">{item.product.name}</p>
                                  <p className="text-cyan-400 text-sm">${item.unitPrice.toFixed(2)}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600"
                                    >
                                      -
                                    </button>
                                    <span className="text-white text-sm w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        className="w-6 h-6 rounded bg-slate-700 text-white hover:bg-slate-600"
                                    >
                                      +
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="ml-2 text-red-400 text-xs hover:text-red-300"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-semibold">
                                    ${(item.unitPrice * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                      <div className="p-6 border-t border-slate-700">
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Subtotal:</span>
                            <span className="text-white">${getCartTotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-700">
                            <span className="text-white font-bold">Total:</span>
                            <span className="text-white font-bold">${getCartTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-slate-400 text-sm mb-2">Shipping Address *</label>
                          <textarea
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              placeholder="Enter your full shipping address (street, city, zip code, country)..."
                              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                              rows={3}
                              required
                          />
                        </div>

                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            disabled={creatingOrder || cart.length === 0 || !shippingAddress.trim()}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingOrder ? (
                              <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Order...
                      </span>
                          ) : (
                              'Place Order'
                          )}
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        
        {showInvoiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700 shadow-xl">
                <h2 className="text-2xl font-bold mb-4 text-white">Invoice Details</h2>

                <div className="mb-4">
                  <label className="block text-slate-300 mb-1">
                    Bank Account Number {paymentMethod === 'BankTransfer' ? '*' : ''}
                  </label>
                  <input
                      type="text"
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Enter your bank account number"
                      required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-300 mb-1">Billing Name *</label>
                  <input
                      type="text"
                      value={billingName}
                      onChange={e => setBillingName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Full name for invoice"
                      required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-300 mb-1">Billing Email *</label>
                  <input
                      type="email"
                      value={billingEmail}
                      onChange={e => setBillingEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Email for invoice"
                      required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-300 mb-1">Billing Phone</label>
                  <input
                      type="text"
                      value={billingPhone}
                      onChange={e => setBillingPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Phone number (optional)"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-300 mb-2">Payment Method</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('Stripe');
                          setStripeError(null);
                        }}
                        className={`rounded-lg border p-3 text-left transition ${
                            paymentMethod === 'Stripe'
                                ? 'border-cyan-500 bg-cyan-500/10 text-white'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                    >
                      <CreditCard className="mb-2 h-5 w-5 text-cyan-400" />
                      <p className="font-semibold">Stripe</p>
                      <p className="mt-1 text-xs text-slate-400">Pay instantly by card.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('BankTransfer');
                          setStripeError(null);
                        }}
                        className={`rounded-lg border p-3 text-left transition ${
                            paymentMethod === 'BankTransfer'
                                ? 'border-cyan-500 bg-cyan-500/10 text-white'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                    >
                      <Landmark className="mb-2 h-5 w-5 text-cyan-400" />
                      <p className="font-semibold">Bank Transfer</p>
                      <p className="mt-1 text-xs text-slate-400">Create order with invoice reference.</p>
                    </button>
                  </div>
                </div>

                {stripeError && (
                    <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                      {stripeError}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <button
                      onClick={() => {
                        setShowInvoiceModal(false);
                        setStripeError(null);
                      }}
                      disabled={creatingOrder}
                      className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleInvoiceSubmit}
                      disabled={creatingOrder}
                      className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingOrder ? 'Processing...' : paymentMethod === 'Stripe' ? 'Pay with Stripe' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {showStripeModal && stripeClientSecret && (
            <Elements stripe={stripePromise}>
              <StripeCheckoutModal
                  clientSecret={stripeClientSecret}
                  totalAmount={getCartTotal()}
                  onCancel={() => {
                    setShowStripeModal(false);
                    setStripeClientSecret(null);
                  }}
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripeError}
                  isLoading={creatingOrder}
              />
            </Elements>
        )}
      </div>
  );
}