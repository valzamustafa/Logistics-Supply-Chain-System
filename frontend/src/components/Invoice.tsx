
import React from 'react';
import { Order } from '../services/orderService';

interface InvoiceProps {
  order: Order;
  bankAccount: string;
}

export const Invoice: React.FC<InvoiceProps> = ({ order, bankAccount }) => {
  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; 
  };

  const calculateTotal = () => {
    return order.totalAmount;
  };

  const downloadPDF = async () => {
  
    const response = await fetch(`/api/orders/${order.id}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  return (
    <div className="invoice-container">
      <div className="invoice-header">
        <h2>FATURA TATIMORE</h2>
        <div className="invoice-number">
          <strong>Nr. Fatures:</strong> {order.orderNumber}
        </div>
        <div className="invoice-date">
          <strong>Data:</strong> {new Date(order.orderDate).toLocaleDateString('sq-AL')}
        </div>
      </div>

      <div className="company-info">
        <h3>Logjistika SH.P.K.</h3>
        <p>Adresa: Rr. Bill Clinton, Prishtinë 10000</p>
        <p>Tel: +383 49 123 456</p>
        <p>Email: info@logjistika.com</p>
        <p><strong>Nr. Gjirollogarisë: {bankAccount}</strong></p>
        <p>NUIS: 81234567</p>
        <p>TVSH: 51234567</p>
      </div>

      <div className="customer-info">
        <h4>Klienti:</h4>
        <p>ID: {order.userId}</p>
      </div>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>Përshkrimi</th>
            <th>Sasia</th>
            <th>Çmimi Unit</th>
            <th>TVSH 18%</th>
            <th>Totali</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName || `Produkti ${item.productId}`}</td>
              <td>{item.quantity}</td>
              <td>€{item.unitPrice.toFixed(2)}</td>
              <td>€{(item.unitPrice * item.quantity * 0.18).toFixed(2)}</td>
              <td>€{item.totalPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}></td>
            <td><strong>Subtotal:</strong></td>
            <td>€{calculateSubtotal().toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={3}></td>
            <td><strong>TVSH (18%):</strong></td>
            <td>€{calculateTax().toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={3}></td>
            <td><strong>TOTALI:</strong></td>
            <td><strong>€{calculateTotal().toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div className="payment-info">
        <h4>Informata për Pagesë:</h4>
        <p><strong>Banka:</strong> Banka Ekonomike</p>
        <p><strong>Llogaria:</strong> {bankAccount}</p>
        <p><strong>Kodi IBAN:</strong> XK05 1234 5678 9012 3456</p>
        <p><strong>Kodi SWIFT:</strong> BAKXKS10</p>
        <p><strong>Përshkrimi:</strong> Pagesë për porosinë {order.orderNumber}</p>
      </div>

      <button onClick={downloadPDF} className="download-btn">
        Shkarko Faturën (PDF)
      </button>
    </div>
  );
};