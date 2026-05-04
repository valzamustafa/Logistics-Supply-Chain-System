
import { useState, useEffect } from 'react';
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { orderService, CreateOrderDto } from '../../services/orderService';
import { productService, Product, Category } from '../../services/productService';
import { useCart } from '../../hooks/useCart';

export function CreateOrderPage() {
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, getCartTotal, getCartItemCount, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await productService.getAll();
      const categoriesData = await productService.getCategories();
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSubmit = async () => {
    if (!bankAccount.trim() || !billingName.trim() || !billingEmail.trim()) {
      alert('Please fill all invoice fields');
      return;
    }
    await createOrder();
    setShowInvoiceModal(false);
    setBankAccount('');
    setBillingName('');
    setBillingEmail('');
    setBillingPhone('');
  };

  const createOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    if (!shippingAddress.trim()) {
      alert('Please enter a shipping address');
      return;
    }

    setCreatingOrder(true);
    try {
      const orderData: CreateOrderDto = {
        userId: user!.id,
        shippingAddress: shippingAddress,
        billingAddress: shippingAddress,
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

      const newOrder = await orderService.create(orderData);
      clearCart();
      setShippingAddress('');
      
      alert(`Order #${newOrder.orderNumber} created successfully!`);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const getFilteredProducts = () => {
    if (selectedCategory === null) return products;
    return products.filter(p => p.categoryId === selectedCategory);
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

  return (
    <div className="flex flex-col gap-8 p-6 bg-slate-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Create New Order</h1>
        <p className="text-slate-400">Browse products and add them to your cart</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Products</h2>
              
              {/* Category Filter */}
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

            {/* Products Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {getFilteredProducts().map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{product.name}</h3>
                        <p className="text-cyan-400 text-xl font-bold mt-1">${product.price.toFixed(2)}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                            {getCategoryName(product.categoryId)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {product.isActive ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-slate-400 text-sm mt-2 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!product.isActive}
                        className={`ml-4 px-4 py-2 rounded-lg text-sm transition ${
                          product.isActive
                            ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {getFilteredProducts().length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400">No products found in this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shopping Cart Section */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur sticky top-6">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Shopping Cart ({getCartItemCount()})</h2>
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

      {/* Invoice Modal  */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-white">Invoice Details</h2>
            
            <div className="mb-4">
              <label className="block text-slate-300 mb-1">Bank Account Number *</label>
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
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceSubmit}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}