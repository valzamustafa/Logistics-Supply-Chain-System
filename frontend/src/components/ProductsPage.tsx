import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { productService, Product, Category } from '../services/productService';
import { useCart } from '../hooks/useCart';

export function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const { addToCart, getCartItemCount, getCartTotal } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productService.getAll(),
        productService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);
    try {
      await addToCart(product, 1);
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setTimeout(() => setAddingToCart(null), 500);
    }
  };

  const getFilteredProducts = () => {
    let filtered = products;
    

    if (selectedCategory !== null) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }
    
   
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  const getCategoryCount = (categoryId: number) => {
    return products.filter(p => p.categoryId === categoryId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading products...</p>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Products Catalog</h1>
        <p className="text-slate-400">Browse and add products to your cart</p>
      </div>


      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, SKU, or description..."
            className="w-full px-4 py-2 pl-10 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        </div>
        
        
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-white">🛒</span>
            <span className="text-white font-semibold">{getCartItemCount()}</span>
          </div>
          <div className="text-cyan-400 font-semibold">
            ${getCartTotal().toFixed(2)}
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="px-3 py-1 rounded bg-cyan-500 text-white text-sm hover:bg-cyan-600 transition"
          >
            Checkout
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            selectedCategory === null
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Products ({products.length})
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              selectedCategory === category.id
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {category.name} ({getCategoryCount(category.id)})
          </button>
        ))}
      </div>

   
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-slate-400 text-lg">No products found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden hover:border-cyan-500/50 transition-all hover:transform hover:scale-[1.02] duration-200"
            >
            
              <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <span className="text-5xl opacity-50">
                  {product.categoryId === 1 ? '📱' : product.categoryId === 2 ? '💻' : '📦'}
                </span>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-semibold text-lg line-clamp-1">{product.name}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                    {getCategoryName(product.categoryId)}
                  </span>
                </div>
                
                <p className="text-cyan-400 text-2xl font-bold mb-2">
                  ${product.price.toFixed(2)}
                </p>
                
                {product.description && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      product.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {product.isActive ? 'In Stock' : 'Out of Stock'}
                    </span>
                    {product.sku && (
                      <span className="text-xs text-slate-500">SKU: {product.sku}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.isActive || addingToCart === product.id}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      product.isActive && addingToCart !== product.id
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {addingToCart === product.id ? (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </span>
                    ) : (
                      'Add to Cart'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}