
import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { OrderConfirmationModal } from '../components/OrderConfirmationModal';

export const CheckoutPage: React.FC = () => {
  const { cart, getCartTotal, placeOrder, isLoading, error } = useCart();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const navigate = useNavigate();

  const handlePlaceOrder = () => {
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async (bankOwnerName: string, bankAccountNumber: string) => {
    try {
      const order = await placeOrder(bankOwnerName, bankAccountNumber);
      setPlacedOrder(order);
      setShowConfirmation(false);
      navigate(`/my-orders`);
    } catch (err: any) {
      console.error('Order failed:', err.message);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between py-2 border-b">
              <span>{item.product.name} x {item.quantity}</span>
              <span>€{(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold">
            <span>Total</span>
            <span>€{getCartTotal().toFixed(2)}</span>
          </div>
        </div>
        
        <div>
          <button
            onClick={handlePlaceOrder}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Place Order'}
          </button>
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
    </div>
  );
};