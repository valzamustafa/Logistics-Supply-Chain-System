import { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingDown, Search, Filter, Edit2, AlertCircle } from 'lucide-react';
import { warehouseStockService, WarehouseStock } from '../services/warehouseStockService';
import { warehouseService, Warehouse } from '../services/warehouseService';

export function InventoryPage() {
    const [stocks, setStocks] = useState<WarehouseStock[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingStock, setEditingStock] = useState<WarehouseStock | null>(null);
    const [quantity, setQuantity] = useState('');
    const [movementType, setMovementType] = useState<'Inbound' | 'Outbound' | 'Adjustment' | 'Restock'>('Inbound');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [stocksData, warehousesData] = await Promise.all([
                warehouseStockService.getAll(),
                warehouseService.getAll(),
            ]);
            setStocks(stocksData);
            setWarehouses(warehousesData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateStock = async () => {
        if (!editingStock || !quantity) return;
        try {
            const parsedQuantity = parseInt(quantity, 10);
            if (movementType === 'Restock') {
                await warehouseStockService.reorderStock(
                    editingStock.warehouseId,
                    editingStock.productId,
                    parsedQuantity,
                    `Restock from company inventory UI`
                );
            } else {
                await warehouseStockService.updateStock(
                    editingStock.warehouseId,
                    editingStock.productId,
                    {
                        quantity: parsedQuantity,
                        type: movementType,
                        notes: `Stock ${movementType.toLowerCase()} adjustment`,
                    }
                );
            }

            await fetchData();
            setShowModal(false);
            setEditingStock(null);
            setQuantity('');
        } catch (err) {
            console.error('Failed to update stock:', err);
            setError('Failed to update stock');
        }
    };

    const openReorderModal = (stock: WarehouseStock) => {
        setEditingStock(stock);
        setMovementType('Restock');
        const suggestedQty = Math.max(stock.minimumStockLevel - stock.quantity, 1);
        setQuantity(suggestedQty.toString());
        setShowModal(true);
    };

    const filteredStocks = stocks.filter((stock) => {
        const matchesSearch =
            stock.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.productSku.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesWarehouse = selectedWarehouse === null || stock.warehouseId === selectedWarehouse;

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'instock' && !stock.isLowStock && !stock.isOutOfStock) ||
            (statusFilter === 'lowstock' && stock.isLowStock) ||
            (statusFilter === 'outofstock' && stock.isOutOfStock);

        return matchesSearch && matchesWarehouse && matchesStatus;
    });

    const lowStockCount = stocks.filter(s => s.isLowStock).length;
    const outOfStockCount = stocks.filter(s => s.isOutOfStock).length;
    const totalProducts = stocks.length;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading inventory...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Company Inventory</h1>
                    <p className="text-slate-400 mt-1">View your company stock across warehouses and reorder low-stock items directly.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <Package className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-white">{totalProducts}</h3>
                        <p className="text-slate-400 text-sm">Total Products</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Package className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-white">
                            {totalProducts - lowStockCount - outOfStockCount}
                        </h3>
                        <p className="text-slate-400 text-sm">In Stock</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-white">{lowStockCount}</h3>
                        <p className="text-slate-400 text-sm">Low Stock</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-white">{outOfStockCount}</h3>
                        <p className="text-slate-400 text-sm">Out of Stock</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    value={selectedWarehouse || ''}
                    onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                >
                    <option value="">All Warehouses</option>
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="instock">In Stock</option>
                    <option value="lowstock">Low Stock</option>
                    <option value="outofstock">Out of Stock</option>
                </select>
            </div>

            <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Warehouse</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Quantity</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300">Location</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredStocks.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                    No inventory items found
                                </td>
                            </tr>
                        ) : (
                            filteredStocks.map((stock) => (
                                <tr key={`${stock.warehouseId}-${stock.productId}`} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-medium">{stock.productName}</p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 text-sm">{stock.productSku}</td>
                                    <td className="px-6 py-4 text-slate-300 text-sm">{stock.warehouseName}</td>
                                    <td className="px-6 py-4 text-right text-white font-medium">{stock.quantity}</td>
                                    <td className="px-6 py-4 text-center">
                                        {stock.isOutOfStock ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Out of Stock
                        </span>
                                        ) : stock.isLowStock ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Low Stock
                        </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          In Stock
                        </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-300">
                                        {stock.shelfLocation || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingStock(stock);
                                                setQuantity('');
                                                setMovementType('Inbound');
                                                setShowModal(true);
                                            }}
                                            className="p-2 hover:bg-slate-700 rounded transition text-slate-400 hover:text-cyan-400"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {(stock.isLowStock || stock.isOutOfStock) && (
                                            <button
                                                onClick={() => openReorderModal(stock)}
                                                className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg text-yellow-300 border border-yellow-500/20 transition"
                                            >
                                                Reorder
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && editingStock && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-lg z-50">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 w-96 p-6 space-y-4">
                        <h2 className="text-xl font-bold text-white">
                            Update Stock: {editingStock.productName}
                        </h2>

                        <div className="bg-slate-700/50 p-3 rounded text-sm text-slate-300">
                            <p>Current: {editingStock.quantity} units</p>
                            <p>Warehouse: {editingStock.warehouseName}</p>
                        </div>

                        <select
                            value={movementType}
                            onChange={(e) => setMovementType(e.target.value as any)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                        >
                            <option value="Inbound">Inbound (Receive)</option>
                            <option value="Outbound">Outbound (Ship)</option>
                            <option value="Adjustment">Adjustment</option>
                            <option value="Restock">Restock</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Quantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-500 outline-none"
                        />

                        <div className="flex gap-2 pt-4">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingStock(null);
                                    setQuantity('');
                                }}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateStock}
                                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
