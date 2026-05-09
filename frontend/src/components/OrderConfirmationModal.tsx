import React, { useState } from 'react';
import { Order } from '../services/orderService';

interface OrderConfirmationModalProps {
  order: Order;
  totalAmount: number;
  onConfirm: (bankOwnerName: string, bankAccountNumber: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  totalAmount,
  onConfirm,
  onCancel,
  isLoading
}) => {
  const [bankOwnerName, setBankOwnerName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleConfirm = () => {
    if (bankOwnerName && bankAccountNumber && agreedToTerms) {
      onConfirm(bankOwnerName, bankAccountNumber);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Order Confirmation</h2>
        
        <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <h3 className="font-semibold text-white text-lg mb-2">Order Summary</h3>
          <p className="text-slate-300"><strong className="text-white">Order Number:</strong> {order.orderNumber}</p>
          <p className="text-slate-300"><strong className="text-white">Order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
          <p className="text-slate-300"><strong className="text-white">Total Amount:</strong> €{totalAmount.toFixed(2)}</p>
          <p className="text-slate-300"><strong className="text-white">Status:</strong> {order.status}</p>
        </div>

        <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <h3 className="font-semibold text-white text-lg mb-2">Payment Information</h3>
          <p className="text-slate-300 text-sm mb-3">
            Please make the payment to the following bank account:
          </p>
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
            <p className="text-slate-300"><strong className="text-white">Beneficiary:</strong> Logjistika SH.P.K.</p>
            <p className="text-slate-300"><strong className="text-white">Bank:</strong> Banka Ekonomike</p>
            <p className="text-slate-300"><strong className="text-white">IBAN:</strong> XK05 1234 5678 9012 3456</p>
            <p className="text-slate-300"><strong className="text-white">SWIFT:</strong> BAKXKS10</p>
            <p className="text-slate-300"><strong className="text-white">Reference:</strong> Order #{order.orderNumber}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-white text-lg mb-2">Your Bank Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Bank Account Owner Name
              </label>
              <input
                type="text"
                value={bankOwnerName}
                onChange={(e) => setBankOwnerName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Bank Account Number / IBAN
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g., XK05 1234 5678 9012 3456"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-slate-300">
              I confirm that I have read and agree to the payment terms. The order will be 
              processed after payment confirmation. I understand that I can download the 
              invoice after order confirmation.
            </span>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!bankOwnerName || !bankAccountNumber || !agreedToTerms || isLoading}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Confirm Order'}
          </button>
        </div>
      </div>
    </div>
  );
};