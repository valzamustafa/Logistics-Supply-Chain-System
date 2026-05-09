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
        <h2>TAX INVOICE</h2>
        <div className="invoice-number">
          <strong>Invoice No:</strong> {order.orderNumber}
        </div>
        <div className="invoice-date">
          <strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString('en-US')}
        </div>
      </div>

      <div className="company-info">
        <h3>Logistics LLC</h3>
        <p>Address: Bill Clinton Street, Pristina 10000</p>
        <p>Phone: +383 49 123 456</p>
        <p>Email: info@logistics.com</p>
        <p><strong>Bank Account Number: {bankAccount}</strong></p>
        <p>Business Number: 81234567</p>
        <p>VAT: 51234567</p>
      </div>

      <div className="customer-info">
        <h4>Customer:</h4>
        <p>ID: {order.userId}</p>
      </div>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>VAT 18%</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName || `Product ${item.productId}`}</td>
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
            <td><strong>VAT (18%):</strong></td>
            <td>€{calculateTax().toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={3}></td>
            <td><strong>TOTAL:</strong></td>
            <td><strong>€{calculateTotal().toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div className="payment-info">
        <h4>Payment Information:</h4>
        <p><strong>Bank:</strong> Economic Bank</p>
        <p><strong>Account:</strong> {bankAccount}</p>
        <p><strong>IBAN Code:</strong> XK05 1234 5678 9012 3456</p>
        <p><strong>SWIFT Code:</strong> BAKXKS10</p>
        <p><strong>Description:</strong> Payment for order {order.orderNumber}</p>
      </div>

      <button onClick={downloadPDF} className="download-btn">
        Download Invoice (PDF)
      </button>
    </div>
  );
};