import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { OrderConfirmationModal } from '../components/OrderConfirmationModal';
import { StripeCheckoutModal } from '../components/StripeCheckoutModal';
import { orderService } from '../services/orderService';
import { warehouseService, Warehouse } from '../services/warehouseService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

export const CheckoutPage: React.FC = () => {
  const { cart, getCartTotal, placeOrder, isLoading, error } = useCart();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'BankTransfer'>('Stripe');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const navigate = useNavigate();

  const handlePlaceOrder = async () => {
    if (!selectedWarehouseId) {
      setStripeError('Ju lutem zgjidhni një magazinë për të vazhduar me porosinë.');
      return;
    }

    if (paymentMethod === 'Stripe') {
      try {
        setStripeError(null);
        const response = await orderService.createPaymentIntent({ amount: getCartTotal(), currency: 'eur' });
        setStripeClientSecret(response.clientSecret);
        setShowStripeModal(true);
      } catch (err: any) {
        setStripeError(err.message || 'Unable to create payment intent');
      }
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmOrder = async (bankOwnerName: string, bankAccountNumber: string) => {
    try {
      const order = await placeOrder(bankOwnerName, bankAccountNumber, 'BankTransfer', bankAccountNumber, selectedWarehouseId ?? undefined);
      setPlacedOrder(order);
      setShowConfirmation(false);
      navigate(`/my-orders`);
    } catch (err: any) {
      console.error('Order failed:', err.message);
    }
  };

  const handleStripePaymentSuccess = async (transactionId: string) => {
    try {
      const order = await placeOrder('Stripe', '', 'Stripe', transactionId, selectedWarehouseId ?? undefined);
      setPlacedOrder(order);
      setShowStripeModal(false);
      navigate(`/my-orders`);
    } catch (err: any) {
      console.error('Stripe order creation failed:', err.message);
      setStripeError(err.message || 'Failed to save order after Stripe payment');
    }
  };

  const handleStripeError = (message: string) => {
    setStripeError(message);
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <button onClick={() => navigate('/products')} className="bg-blue-600 text-white px-4 py-2 rounded">
          Continue Shopping
        </button>
      </div>
    );
  }

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await warehouseService.getAll();
        setWarehouses(data);
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };

    loadWarehouses();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between py-2 border-b border-slate-700">
              <span>{item.product.name} x {item.quantity}</span>
              <span>€{(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold text-white">
            <span>Total</span>
            <span>€{getCartTotal().toFixed(2)}</span>
          </div>
        </div>
        
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold mb-4">Warehouse Selection</h2>
          <div className="mb-6">
            <label className="block text-sm text-slate-300 mb-2">Choose warehouse</label>
            <select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setSelectedWarehouseId(Number(e.target.value) || null)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.location ? ` — ${warehouse.location}` : ''}</option>
              ))}
            </select>
          </div>

          <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="Stripe"
                checked={paymentMethod === 'Stripe'}
                onChange={() => setPaymentMethod('Stripe')}
              />
              <div>
                <div className="font-semibold text-white">Stripe</div>
                <div className="text-sm text-slate-400">Pay instantly with Stripe test card.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="BankTransfer"
                checked={paymentMethod === 'BankTransfer'}
                onChange={() => setPaymentMethod('BankTransfer')}
              />
              <div>
                <div className="font-semibold text-white">Bank Transfer</div>
                <div className="text-sm text-slate-400">Pay later by bank transfer and confirm when ready.</div>
              </div>
            </label>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isLoading}
            className="mt-6 w-full rounded-3xl bg-cyan-500 px-4 py-3 text-slate-900 font-semibold hover:bg-cyan-400 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : `Pay €${getCartTotal().toFixed(2)}`}
          </button>

          {stripeError && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-200">{stripeError}</div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-200">{error}</div>
          )}
        </div>
      </div>

      {showConfirmation && (
        <OrderConfirmationModal
          order={{ orderNumber: 'NEW', orderDate: new Date().toISOString(), status: 'Pending' } as any}
          totalAmount={getCartTotal()}
          onConfirm={handleConfirmOrder}
          onCancel={() => setShowConfirmation(false)}
          isLoading={isLoading}
        />
      )}

      {showStripeModal && stripeClientSecret && (
        <Elements stripe={stripePromise}>
          <StripeCheckoutModal
            clientSecret={stripeClientSecret}
            totalAmount={getCartTotal()}
            onCancel={() => setShowStripeModal(false)}
            onSuccess={handleStripePaymentSuccess}
            onError={handleStripeError}
            isLoading={isLoading}
          />
        </Elements>
      )}
    </div>
  );
};