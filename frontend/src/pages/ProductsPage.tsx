import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, AlertCircle } from 'lucide-react';
import { productService, Product, Category } from '../services/productService';

export function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        price: '',
        cost: '',
        categoryId: '',
        isActive: true,
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await productService.getAll();
            setProducts(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await productService.getCategories();
            setCategories(data);
            if (data.length > 0) {
                const hasCurrentCategory = data.some((category) => category.id.toString() === formData.categoryId);
                if (!hasCurrentCategory) {
                    setFormData((prev) => ({ ...prev, categoryId: data[0].id.toString() }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handleAddClick = () => {
        setIsEditing(false);
        setEditingProduct(null);
        setFormData({
            name: '',
            sku: '',
            description: '',
            price: '',
            cost: '',
            categoryId: categories.length > 0 ? categories[0].id.toString() : '',
            isActive: true,
        });
        setShowModal(true);
    };

    const handleEditClick = (product: Product) => {
        setIsEditing(true);
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            description: product.description || '',
            price: product.price.toString(),
            cost: product.cost?.toString() || '',
            categoryId: product.categoryId.toString(),
            isActive: product.isActive,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description || undefined,
                price: parseFloat(formData.price),
                cost: formData.cost ? parseFloat(formData.cost) : undefined,
                categoryId: parseInt(formData.categoryId) || 1,
                isActive: formData.isActive,
            };

            if (isEditing && editingProduct) {
                await productService.update(editingProduct.id, payload);
            } else {
                await productService.create(payload);
            }

            await fetchProducts();
            setShowModal(false);
            setFormData({
                name: '',
                sku: '',
                description: '',
                price: '',
                cost: '',
                categoryId: categories.length > 0 ? categories[0].id.toString() : '',
                isActive: true,
            });
        } catch (err) {
            console.error('Failed to save product:', err);
            setError('Failed to save product');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await productService.delete(id);
            await fetchProducts();
        } catch (err) {
            console.error('Failed to delete product:', err);
            setError('Failed to delete product');
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && product.isActive) ||
            (statusFilter === 'inactive' && !product.isActive);

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading products...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Products</h1>
                    <p className="text-slate-400 mt-1">Manage product catalog</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                    <Plus className="w-4 h-4" />
                    Add Product
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">SKU</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Cost</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                    No products found
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-white font-medium">{product.name}</p>
                                            {product.description && (
                                                <p className="text-slate-400 text-sm">{product.description.substring(0, 50)}...</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">{product.sku}</td>
                                    <td className="px-6 py-4 text-right text-white font-medium">${product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right text-slate-400">${(product.cost || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                        <button
                                            onClick={() => handleEditClick(product)}
                                            className="p-2 hover:bg-slate-700 rounded transition text-slate-400 hover:text-cyan-400"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 hover:bg-red-500/20 rounded transition text-slate-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-lg z-50">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {isEditing ? 'Edit Product' : 'Add Product'}
                            </h2>
                            <button onClick={() => setShowModal(false)}>
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Product Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                        />

                        <input
                            type="text"
                            placeholder="SKU"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                        />

                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                            rows={3}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                placeholder="Price"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Cost"
                                step="0.01"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-2">Category</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="">Select category</option>
                                {categories.length > 0 ? (
                                    categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))
                                ) : (
                                    <option value="1">General</option>
                                )}
                            </select>
                        </div>

                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4"
                            />
                            Active
                        </label>

                        <div className="flex gap-2 pt-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
                            >
                                {isEditing ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}