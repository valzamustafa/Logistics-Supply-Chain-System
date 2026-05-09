import React from 'react';
import { Order } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const { token } = useAuth();

  const calculateSubtotal = () => {
    return (order.items || []).reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18;
  };

  const downloadPDF = async () => {
    try {
      const apiUrl = import.meta.env?.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/orders/${order.id}/invoice`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        
       
        if (blob.type === 'application/pdf' || blob.type === 'application/octet-stream') {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice-${order.orderNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          console.error('Response is not a PDF:', blob.type);
          alert('Invalid response format from server');
        }
      } else {
   
        console.warn('PDF download failed, using HTML print fallback');
        printInvoiceAsPDF();
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);

      printInvoiceAsPDF();
    }
  };


  const printInvoiceAsPDF = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) {
      alert('Unable to print invoice. Please try again.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${order.orderNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total-row { font-weight: bold; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-xl">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Tax Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-2xl">
            ×
          </button>
        </div>

        <div id="invoice-content">
          <div className="text-center mb-6 pb-4 border-b border-slate-700">
            <h3 className="text-xl font-bold text-cyan-400">LOGJISTIKA SH.P.K.</h3>
            <p className="text-slate-300 text-sm">Rr. Bill Clinton, Prishtinë 10000</p>
            <p className="text-slate-300 text-sm">Tel: +383 49 123 456 | Email: info@logjistika.com</p>
            <p className="text-slate-400 text-xs mt-2"><strong>NUIS: 81234567 | TVSH: 51234567</strong></p>
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <p className="text-slate-300 text-sm"><strong className="text-white">Invoice Number:</strong> {order.orderNumber}</p>
              <p className="text-slate-300 text-sm"><strong className="text-white">Invoice Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-300 text-sm"><strong className="text-white">Customer ID:</strong> {order.userId}</p>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700">
                  <th className="border border-slate-700 p-2 text-left text-slate-300 text-sm">Description</th>
                  <th className="border border-slate-700 p-2 text-right text-slate-300 text-sm">Quantity</th>
                  <th className="border border-slate-700 p-2 text-right text-slate-300 text-sm">Unit Price</th>
                  <th className="border border-slate-700 p-2 text-right text-slate-300 text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, index) => (
                  <tr key={index} className="border-b border-slate-700">
                    <td className="border border-slate-700 p-2 text-slate-300">{item.productName || `Product ${item.productId}`}</td>
                    <td className="border border-slate-700 p-2 text-right text-slate-300">{item.quantity}</td>
                    <td className="border border-slate-700 p-2 text-right text-slate-300">€{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="border border-slate-700 p-2 text-right text-slate-300">€{(item.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-b border-slate-700">
                  <td colSpan={3} className="border border-slate-700 p-2 text-right font-bold text-white">Subtotal:</td>
                  <td className="border border-slate-700 p-2 text-right text-cyan-400">€{calculateSubtotal().toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td colSpan={3} className="border border-slate-700 p-2 text-right font-bold text-white">VAT (18%):</td>
                  <td className="border border-slate-700 p-2 text-right text-cyan-400">€{calculateTax().toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border border-slate-700 p-2 text-right font-bold text-white">TOTAL:</td>
                  <td className="border border-slate-700 p-2 text-right font-bold text-cyan-400">€{(order.totalAmount || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <h4 className="font-bold text-white mb-2">Payment Information:</h4>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-300 text-sm">Bank: <span className="text-white">Banka Ekonomike</span></p>
              <p className="text-slate-300 text-sm">IBAN: <span className="text-white">XK05 1234 5678 9012 3456</span></p>
              <p className="text-slate-300 text-sm">SWIFT: <span className="text-white">BAKXKS10</span></p>
              <p className="text-slate-300 text-sm">Reference: <span className="text-cyan-400">Order #{order.orderNumber}</span></p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition"
          >
            Close
          </button>
          <button
            onClick={downloadPDF}
            className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};