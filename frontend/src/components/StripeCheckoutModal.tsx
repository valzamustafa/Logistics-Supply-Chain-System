import React, { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';

interface StripeCheckoutModalProps {
  clientSecret: string;
  totalAmount: number;
  onCancel: () => void;
  onSuccess: (transactionId: string) => void;
  onError: (message: string) => void;
  isLoading: boolean;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  clientSecret,
  totalAmount,
  onCancel,
  onSuccess,
  onError,
  isLoading
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleConfirmPayment = async () => {
    if (!stripe || !elements) {
      setCardError('Stripe is still loading. Please wait and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError('The card input is not ready yet.');
      return;
    }

    setCardError(null);
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardholderName || 'Guest'
        }
      }
    });

    if (error) {
      setProcessing(false);
      setCardError(error.message || 'Payment failed.');
      onError(error.message || 'Payment failed.');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setProcessing(false);
      const message = 'Payment could not be completed. Please try again.';
      setCardError(message);
      onError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Stripe Payment</h2>
            <p className="text-slate-400 mt-1">Pay €{totalAmount.toFixed(2)} securely with test card details.</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {cardError && <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-200">{cardError}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Cardholder Name</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <label className="block text-sm text-slate-300 mb-2">Card details</label>
            <div className="rounded-xl border border-slate-600 bg-slate-900 p-3">
              <CardElement options={{
                style: {
                  base: {
                    color: '#e2e8f0',
                    fontSize: '16px',
                    '::placeholder': { color: '#94a3b8' }
                  },
                  invalid: {
                    color: '#f87171'
                  }
                }
              }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            <p>Use Stripe test card: <strong>4242 4242 4242 4242</strong> and any future expiry / CVC.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={processing || isLoading}
            className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={!stripe || processing || isLoading}
            className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-900 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing || isLoading ? 'Processing...' : `Pay €${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
