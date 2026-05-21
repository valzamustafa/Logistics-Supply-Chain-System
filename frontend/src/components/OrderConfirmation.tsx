
import React, { useState } from 'react';
import { Order } from '../services/orderService';

interface OrderConfirmationProps {
  order: Order;
  onConfirm: (bankAccount: string) => void;
  onCancel: () => void;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ 
  order, 
  onConfirm, 
  onCancel 
}) => {
  const [bankAccount, setBankAccount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <div className="order-confirmation-modal">
      <div className="confirmation-content">
        <h2>Konfirmimi i Porosisë</h2>
        
        <div className="order-summary">
          <h3>Përmbledhja e Porosisë</h3>
          <p><strong>Nr. Porosisë:</strong> {order.orderNumber}</p>
          <p><strong>Totali:</strong> €{order.totalAmount.toFixed(2)}</p>
          <p><strong>Statusi:</strong> {order.status}</p>
        </div>

        <div className="bank-details">
          <h3>Të dhënat Bankare për Pagesë</h3>
          <div className="company-bank">
            <p><strong>Përfituesi:</strong> Logjistika SH.P.K.</p>
            <p><strong>Banka:</strong> Banka Ekonomike</p>
            <p><strong>IBAN:</strong> XK05 1234 5678 9012 3456</p>
            <p><strong>SWIFT:</strong> BAKXKS10</p>
          </div>
          
          <div className="user-bank">
            <label>
              Numri i Llogarisë Tuaj Bankare (për konfirmim):
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Shkruani numrin e llogarisë"
                required
              />
            </label>
          </div>
        </div>

        <div className="terms">
          <label>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            Konfirmoj se kam lexuar dhe pranoj kushtet e pagesës. Porosia do të 
            përpunohet pas konfirmimit të pagesës.
          </label>
        </div>

        <div className="confirmation-actions">
          <button onClick={onCancel} className="cancel-btn">Anulo</button>
          <button 
            onClick={() => onConfirm(bankAccount)} 
            disabled={!bankAccount || !agreedToTerms}
            className="confirm-btn"
          >
            Konfirmo Porosinë
          </button>
        </div>
      </div>
    </div>
  );
};