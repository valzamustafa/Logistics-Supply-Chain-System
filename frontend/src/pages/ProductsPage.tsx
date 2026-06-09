import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronDown, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdvancedSearchBar } from '../components/AdvancedSearchBar';
import { Pagination } from '../components/Pagination';
import { API_BASE_URL } from '../services/api';
import { advancedSearch } from '../utils/advancedSearch';
import { productService, Product, ProductImage, Category } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { signalRService } from '../services/signalRService';
import { useTranslation } from 'react-i18next';

export function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'price'>('name');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<ProductImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const isSupplier = !!user?.roles.includes('Supplier');
  const canManageProducts = user?.roles.some((role) => ['Admin', 'Manager', 'WarehouseStaff'].includes(role)) ?? false;
  const showProductImages = !user?.roles.includes('User');
  const getProductImageSrc = (imageUrl: string) =>
    imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : imageUrl;

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
      const allProducts = await productService.getAll();
      if (user?.roles.includes('Supplier')) {
        const dashboardData = await supplierService.getDashboard();
        const supplierMappings = await supplierService.getProductsBySupplier(dashboardData.supplierId);
        const supplierProductIds = new Set(supplierMappings.map((mapping) => mapping.productId));
        setProducts(allProducts.filter((product) => supplierProductIds.has(product.id)));
      } else {
        const supplierMappings = await supplierService.getAllSupplierProducts();
        const supplierProductIds = new Set(supplierMappings.map((mapping) => mapping.productId));
        setProducts(allProducts.filter((product) => !supplierProductIds.has(product.id)));
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(t('products.failedToLoad', 'Failed to load products'));
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
    if (!isLoading) {
      fetchProducts();
    }
    fetchCategories();

    const unsubscribe = signalRService.onEntityUpdated((payload) => {
      try {
        const type = payload?.Type ?? payload?.type ?? payload?.Notification?.type;
        const actionUrl = payload?.Notification?.actionUrl ?? '';
        if (typeof type === 'string' && type.toLowerCase().includes('product')) {
          fetchProducts();
        } else if (typeof actionUrl === 'string' && actionUrl.toLowerCase().includes('/products')) {
          fetchProducts();
        }
      } catch (err) {
        console.error('Error handling entity update:', err);
      }
    });

    return () => unsubscribe();
  }, [isLoading, user]);

  const handleAddClick = () => {
    if (!canManageProducts) {
      showToast('error', t('products.notAuthorizedToManage', 'Only Admin and Manager users can add products.'));
      return;
    }

    setIsEditing(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setRemoveImage(false);
    setSaveError(null);
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
    if (!canManageProducts) {
      showToast('error', t('products.notAuthorizedToManage', 'Only Admin and Manager users can edit products.'));
      return;
    }

    setIsEditing(true);
    setEditingProduct(product);
    setSaveError(null);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      categoryId: product.categoryId.toString(),
      isActive: product.isActive,
    });
    const primaryImage = product.images?.find((image) => image.isPrimary) ?? product.images?.[0] ?? null;
    setExistingImage(primaryImage || null);
    setImagePreview(primaryImage?.imageUrl ?? null);
    setImageFile(null);
    setRemoveImage(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaveError(null);

    if (!formData.name.trim()) {
      setSaveError(t('products.nameRequired', 'Product name is required.'));
      return;
    }
    if (!formData.sku.trim()) {
      setSaveError(t('products.skuRequired', 'Product SKU is required.'));
      return;
    }

    const price = parseFloat(formData.price as any);
    if (Number.isNaN(price) || price < 0) {
      setSaveError(t('products.validPriceRequired', 'Please enter a valid product price.'));
      return;
    }

    const categoryId = parseInt(formData.categoryId, 10);
    if (Number.isNaN(categoryId) || categoryId <= 0) {
      setSaveError(t('products.validCategoryRequired', 'Please select a valid product category.'));
      return;
    }

    try {
      if (!canManageProducts) {
        setSaveError(t('products.notAuthorizedToManage', 'Only Admin and Manager users can manage products.'));
        return;
      }

      const payload = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        price,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        categoryId,
        isActive: formData.isActive,
      } as any;

      let savedProduct: Product;
      if (isEditing && editingProduct) {
        savedProduct = await productService.update(editingProduct.id, payload);
      } else {
        savedProduct = await productService.create(payload);
      }

      if (removeImage && existingImage) {
        await productService.deleteImage(savedProduct.id, existingImage.id);
      }

      if (imageFile) {
        if (existingImage && !removeImage) {
          await productService.deleteImage(savedProduct.id, existingImage.id);
        }
        await productService.uploadImage(savedProduct.id, imageFile);
      }

      await fetchProducts();
      setShowModal(false);
      setSaveError(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        price: '',
        cost: '',
        categoryId: categories.length > 0 ? categories[0].id.toString() : '',
        isActive: true,
      });
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
      setRemoveImage(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setSaveError(err?.message || t('products.failedToSave', 'Failed to save product'));
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      title: t('products.deleteProduct', 'Delete Product'),
      message: t('products.deleteConfirmation', 'Are you sure you want to delete this product?'),
      onConfirm: async () => {
        try {
          await productService.delete(id);
          await fetchProducts();
          showToast('success', t('products.deletedSuccessfully', 'Product deleted successfully'));
        } catch (err) {
          console.error('Failed to delete product:', err);
          showToast('error', t('products.failedToDelete', 'Failed to delete product'));
        }
      }
    });
  };

  const filteredProducts = advancedSearch(products, {
    query: searchQuery,
    searchFields: ['name', 'sku', 'description'],
    filterPredicates: {
      category: (product, value) => product.categoryId === parseInt(value, 10),
      status: (product, value) => {
        const normalized = value.toLowerCase();
        if (normalized === 'active') return product.isActive;
        if (normalized === 'inactive') return !product.isActive;
        return true;
      },
      minprice: (product, value) => product.price >= Number(value),
      maxprice: (product, value) => product.price <= Number(value),
    },
    sortBy,
    sortDir,
  }).filter((product) => {
    const matchesCategory = categoryFilter === null || product.categoryId === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'inactive' && !product.isActive);

    return matchesCategory && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, filteredProducts.length]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('products.loading', 'Loading products...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('products.title', 'Products')}</h1>
          <p className="text-slate-500 mt-1">{t('products.manageCatalog', 'Manage product catalog')}</p>
          {isSupplier && (
            <p className="text-sm text-amber-300 mt-2">
              {t('products.supplierCreationHint', 'Supplier product creation is only available from your Supplier dashboard. Manage your products from the supplier section.')}
            </p>
          )}
        </div>
        {!isSupplier && canManageProducts && (
          <button
            onClick={handleAddClick}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('products.addProduct', 'Add Product')}
          </button>
        )}
        {!isSupplier && !canManageProducts && (
          <div className="text-sm text-slate-500 mt-2">
            {t('products.manageProductsInfo', 'Browse products here. Only Admin and Manager roles can add or edit products.')}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {saveError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {saveError}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        <AdvancedSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          sortBy={sortBy}
          sortDir={sortDir}
          sortOptions={[
            { value: 'name', label: t('products.name', 'Product Name') },
            { value: 'sku', label: t('common.sku', 'SKU') },
            { value: 'price', label: t('products.price', 'Price') },
          ]}
          onSortByChange={(value) => setSortBy(value as typeof sortBy)}
          onSortDirChange={setSortDir}
          showClear
          onClear={() => {
            setSearchQuery('');
            setCategoryFilter(null);
            setStatusFilter('all');
            setSortBy('name');
            setSortDir('asc');
          }}
          placeholder={t('products.searchPlaceholder', 'Search product name, SKU, description or use tokens like status:active minPrice:10')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={categoryFilter ?? ''}
            onChange={(e) => setCategoryFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:border-cyan-500 outline-none"
          >
            <option value="">{t('products.allCategories', 'All Categories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:border-cyan-500 outline-none"
          >
            <option value="all">{t('orders.status.all', 'All Status')}</option>
            <option value="active">{t('products.active', 'Active')}</option>
            <option value="inactive">{t('products.inactive', 'Inactive')}</option>
          </select>
        </div>
      </div>

  
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-sm text-slate-500">
            {t('products.showingSummary', 'Showing {{start}} - {{end}} of {{total}} products', {
              start: filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, filteredProducts.length),
              total: filteredProducts.length,
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
            label={t('products.title', 'Products')}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">{t('common.productLabel', 'Product')}</th>
                {showProductImages && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">{t('products.image', 'Image')}</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">{t('products.category', 'Category')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">{t('common.sku', 'SKU')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">{t('products.price', 'Price')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">{t('products.cost', 'Cost')}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500">{t('orders.statusLabel', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={showProductImages ? 8 : 7} className="px-6 py-8 text-center text-slate-500">
                    {t('products.noProductsFound', 'No products found')}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-100/90 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-slate-900 font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-slate-500 text-sm">{product.description.substring(0, 50)}...</p>
                        )}
                      </div>
                    </td>
                    {showProductImages && (
                      <td className="px-6 py-4">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={getProductImageSrc(product.images[0].imageUrl)}
                            alt={product.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                            {t('products.noImage', 'No Image')}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-500">{product.categoryName || categories.find((category) => category.id === product.categoryId)?.name || t('products.uncategorized', 'Uncategorized')}</td>
                    <td className="px-6 py-4 text-slate-500">{product.sku}</td>
                    <td className="px-6 py-4 text-right text-slate-900 font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-slate-500">${(product.cost || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.isActive ? t('products.active', 'Active') : t('products.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                      {canManageProducts ? (
                        <>
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-2 hover:bg-slate-200 rounded transition text-slate-500 hover:text-cyan-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-red-500/20 rounded transition text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">{t('products.viewOnly', 'View only')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-lg z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-96 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {isEditing ? t('products.editProduct', 'Edit Product') : t('products.addProduct', 'Add Product')}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <input
              type="text"
              placeholder={t('products.name', 'Product Name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none"
            />

            <input
              type="text"
              placeholder={t('common.sku', 'SKU')}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none"
            />

            <textarea
              placeholder={t('products.description', 'Description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none"
              rows={3}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder={t('products.price', 'Price')}
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none"
              />
              <input
                type="number"
                placeholder={t('products.cost', 'Cost')}
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-500 mb-2">{t('products.category', 'Category')}</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 focus:border-cyan-500 outline-none"
              >
                <option value="">{t('products.selectCategory', 'Select category')}</option>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="1">{t('products.general', 'General')}</option>
                )}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-slate-500">{t('products.productImage', 'Product Image')}</label>
              {imagePreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt={t('products.previewAlt', 'Product preview')}
                    className="h-20 w-20 rounded-xl object-cover border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setRemoveImage(true);
                    }}
                    className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition"
                  >
                    {t('products.removeImage', 'Remove image')}
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                    setRemoveImage(false);
                    if (file) {
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-slate-200 border border-slate-600 rounded px-3 py-2 text-slate-900 focus:border-cyan-500 outline-none"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-slate-500">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              {t('products.active', 'Active')}
            </label>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-ghost"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn-primary"
              >
                {isEditing ? t('common.update', 'Update') : t('common.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={t('common.delete', 'Delete')}
          cancelLabel={t('common.cancel', 'Cancel')}
          onConfirm={async () => {
            await confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}





