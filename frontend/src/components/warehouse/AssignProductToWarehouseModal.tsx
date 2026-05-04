import { useState, useEffect } from 'react';
import { productService, Product } from '../../services/productService';
import { warehouseStockService } from '../../services/warehouseStockService';
import { X, Package, AlertCircle } from 'lucide-react';

interface AssignProductToWarehouseModalProps {
  warehouseId: number;
  warehouseName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignProductToWarehouseModal({ 
  warehouseId, 
  warehouseName, 
  onClose, 
  onSuccess 
}: AssignProductToWarehouseModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [initialQuantity, setInitialQuantity] = useState('');
  const [minimumStockLevel, setMinimumStockLevel] = useState('');
  const [maximumStockLevel, setMaximumStockLevel] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUnassignedProducts();
  }, [warehouseId]);

  const loadUnassignedProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await productService.getAll();
      const warehouseStocks = await warehouseStockService.getByWarehouse(warehouseId);
      const assignedProductIds = new Set(warehouseStocks.map(s => s.productId));
      const unassigned = allProducts.filter(p => !assignedProductIds.has(p.id));
      setProducts(unassigned);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }
    
    const quantity = parseInt(initialQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError('Please enter a valid initial quantity');
      return;
    }
    
    const minLevel = parseInt(minimumStockLevel);
    if (isNaN(minLevel) || minLevel < 0) {
      setError('Please enter a valid minimum stock level');
      return;
    }
    
    const maxLevel = parseInt(maximumStockLevel);
    if (isNaN(maxLevel) || maxLevel < 0) {
      setError('Please enter a valid maximum stock level');
      return;
    }
    
    if (minLevel >= maxLevel) {
      setError('Minimum stock level must be less than maximum stock level');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await warehouseStockService.assignProductToWarehouse(warehouseId, {
        productId: selectedProductId,
        initialQuantity: quantity,
        minimumStockLevel: minLevel,
        maximumStockLevel: maxLevel,
        shelfLocation: shelfLocation || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign product:', err);
      setError('Failed to assign product to warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Assign Product to Warehouse</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Warehouse</label>
            <p className="text-white font-medium">{warehouseName}</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Select Product *</label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-slate-700/30 rounded-lg p-3 text-center text-slate-400 text-sm">
                No unassigned products available. Create new products first.
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={0}>Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (SKU: {product.sku}) - ${product.price}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {selectedProductId > 0 && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Initial Quantity *</label>
                <input
                  type="number"
                  min="0"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Min Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    value={minimumStockLevel}
                    onChange={(e) => setMinimumStockLevel(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    value={maximumStockLevel}
                    onChange={(e) => setMaximumStockLevel(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Shelf Location (Optional)</label>
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  placeholder="A-12-3"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-3 p-4 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || !selectedProductId}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Assigning...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Assign Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}