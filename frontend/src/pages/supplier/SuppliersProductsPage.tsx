import { useEffect, useState } from 'react';
import { productService, Product } from '../../services/productService';
import { warehouseStockService, WarehouseStock } from '../../services/warehouseStockService';
import { supplierService } from '../../services/supplierService';
import { Plus, Edit2, Trash2, Package, Building2, TrendingUp, TrendingDown, Eye } from 'lucide-react';

interface ProductWithStock extends Product {
  stocks?: WarehouseStock[];
  totalStock?: number;
  warehousesCount?: number;
}

export function SuppliersProductsPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    cost: '',
    categoryId: '',
    isActive: false,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashboardData = await supplierService.getDashboard();
      if (!dashboardData.supplierId || dashboardData.supplierId <= 0) {
        setProducts([]);
        setWarehouseStocks([]);
        setError('No supplier profile is linked to this account. Ask an admin or manager to register your supplier profile.');
        return;
      }

      const [supplierProductsData, productsData, stocksData] = await Promise.all([
        supplierService.getProductsBySupplier(dashboardData.supplierId),
        productService.getAll(true),
        warehouseStockService.getAll(),
      ]);

      const supplierProductIds = new Set(supplierProductsData.map((mapping) => mapping.productId));
      const productsWithStock = productsData
        .filter((product) => supplierProductIds.has(product.id))
        .map(product => ({
          ...product,
          stocks: stocksData.filter(s => s.productId === product.id),
          totalStock: stocksData.filter(s => s.productId === product.id).reduce((sum, s) => sum + s.quantity, 0),
          warehousesCount: stocksData.filter(s => s.productId === product.id).length
        }));
      
      setProducts(productsWithStock);
      setWarehouseStocks(stocksData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.sku || !formData.price) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const dashboardData = await supplierService.getDashboard();
      if (!dashboardData.supplierId || dashboardData.supplierId <= 0) {
        setError('No supplier profile is linked to this account. Ask an admin or manager to register your supplier profile before adding products.');
        return;
      }

      const createdProduct = await productService.create({
        name: formData.name,
        sku: formData.sku.toUpperCase(),
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        categoryId: parseInt(formData.categoryId) || 1,
        isActive: false,
      });

      await supplierService.addSupplierProduct(dashboardData.supplierId, {
        productId: createdProduct.id,
        supplierSKU: createdProduct.sku,
      });

      await fetchData();
      setShowProductModal(false);
      setFormData({ name: '', sku: '', description: '', price: '', cost: '', categoryId: '', isActive: false });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const viewStockDetails = (product: ProductWithStock) => {
    setSelectedProduct(product);
    setShowStockModal(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">My Products</h1>
          <p className="text-slate-400 mt-1">Manage your products and view stock levels across warehouses</p>
        </div>
        <button onClick={() => setShowProductModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-cyan-500/50 transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                <p className="text-slate-400 text-sm">{product.sku}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {product.isActive ? 'Active' : 'Pending approval'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <Building2 className="w-4 h-4" />
                  <span className="text-2xl font-bold text-white">{product.warehousesCount || 0}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Warehouses</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Package className="w-4 h-4" />
                  <span className="text-2xl font-bold text-white">{product.totalStock || 0}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Total Stock</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => viewStockDetails(product)} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition flex items-center justify-center gap-1">
                <Eye className="w-4 h-4" /> View Stock
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Add New Product</h2>
            <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
            <input type="text" placeholder="SKU" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Price" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
              <input type="number" placeholder="Cost" step="0.01" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              Supplier products are saved as pending approval and stay hidden from other dashboards until activated.
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowProductModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
              <button onClick={handleAddProduct} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}


      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{selectedProduct.name} - Stock Details</h2>
                <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {warehouseStocks.filter(s => s.productId === selectedProduct.id).length === 0 ? (
                <div className="text-center text-slate-400 py-8">No stock records found in any warehouse</div>
              ) : (
                <div className="space-y-3">
                  {warehouseStocks.filter(s => s.productId === selectedProduct.id).map((stock) => (
                    <div key={stock.warehouseId} className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{stock.warehouseName}</p>
                          <p className="text-slate-400 text-sm">Location: {stock.shelfLocation || 'Not specified'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${stock.isOutOfStock ? 'bg-red-500/20 text-red-400' : stock.isLowStock ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                            {stock.isOutOfStock ? 'Out of Stock' : stock.isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                          <p className="text-2xl font-bold text-white mt-2">{stock.quantity} units</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
