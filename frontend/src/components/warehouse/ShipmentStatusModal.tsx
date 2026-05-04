
import { useState, useEffect } from 'react';
import { X, Truck, Package, MapPin, Building2, AlertCircle } from 'lucide-react';
import { shipmentService, Shipment } from '../../services/shipmentService';
import { supplierService, PurchaseOrderDto } from '../../services/supplierService';

interface ShipmentStatusModalProps {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipmentStatusModal({ shipment, onClose, onSuccess }: ShipmentStatusModalProps) {
  const [status, setStatus] = useState(shipment.status);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderDto | null>(null);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const statusOptions = [
    'Pending',
    'Processing',
    'In Transit',
    'Out for Delivery',
    'Delivered',
    'Failed Delivery',
    'Returned'
  ];


  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoadingPOs(true);
      try {
        const pos = await supplierService.getAllPurchaseOrders();
        setPurchaseOrders(pos);
        
    
        const matchingPO = pos.find(po => po.id === shipment.orderId || po.poNumber?.includes(String(shipment.orderId)));
        if (matchingPO) {
          setSelectedPO(matchingPO);
        }
      } catch (err) {
        console.error('Failed to fetch purchase orders:', err);
      } finally {
        setLoadingPOs(false);
      }
    };
    
    fetchPurchaseOrders();
  }, [shipment.orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
   
      await shipmentService.updateStatus(shipment.id, { 
        status, 
        location: location || undefined 
      });

   
      if (selectedPO) {
        try {
        
          const supplierStatus = mapToSupplierStatus(status);
          
          await supplierService.confirmShipment(selectedPO.id, {
            actualDeliveryDate: status === 'Delivered' ? new Date().toISOString() : null,
            notes: `Shipment ${shipment.trackingNumber} status updated to ${status}. Location: ${location || 'Warehouse'}`
          });
          
          console.log(`✅ Purchase order ${selectedPO.poNumber} updated to ${supplierStatus}`);
        } catch (supplierError) {
          console.error('Failed to update purchase order:', supplierError);
          setError('Shipment updated but purchase order update failed. Please check supplier dashboard.');
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const mapToSupplierStatus = (warehouseStatus: string): string => {
    const statusMap: Record<string, string> = {
      'Pending': 'Processing',
      'Processing': 'Processing',
      'In Transit': 'Shipped',
      'Out for Delivery': 'Out for Delivery',
      'Delivered': 'Delivered',
      'Failed Delivery': 'Delivery Issue',
      'Returned': 'Returned'
    };
    return statusMap[warehouseStatus] || warehouseStatus;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Update Shipment Status</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

 
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
            <div>
              <label className="text-xs text-slate-400">Tracking Number</label>
              <p className="text-white font-mono text-sm">{shipment.trackingNumber}</p>
            </div>
            <div>
              <label className="text-xs text-slate-400">Order ID</label>
              <p className="text-white text-sm">#{shipment.orderId}</p>
            </div>
            {selectedPO && (
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Related Purchase Order
                </label>
                <p className="text-green-400 text-sm">{selectedPO.poNumber}</p>
              </div>
            )}
          </div>


          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
              required
            >
              {statusOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>


          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Location (Optional)
              </div>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., City, Warehouse, Distribution Center"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            />
          </div>

  
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-xs">
              <Truck className="w-3 h-3 inline mr-1" />
              {selectedPO 
                ? `This will also update purchase order ${selectedPO.poNumber} status to: ${mapToSupplierStatus(status)}`
                : 'Status will be updated in warehouse system only'}
            </p>
          </div>

 
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Update Status
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}