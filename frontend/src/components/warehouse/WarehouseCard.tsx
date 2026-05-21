import { Building2, Edit2, Eye, MapPin, Package, Phone, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { Warehouse } from '../../services/warehouseService';

interface WarehouseStats {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
}

interface WarehouseCardProps {
  warehouse: Warehouse;
  stats: WarehouseStats;
  onViewDetails: (warehouse: Warehouse) => void;
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (id: number) => void;
  onAddProduct?: (warehouseId: number) => void;
  showExtraActions?: boolean;
}

export function WarehouseCard({ 
  warehouse, 
  stats, 
  onViewDetails, 
  onEdit, 
  onDelete,
  onAddProduct,
  showExtraActions = false
}: WarehouseCardProps) {
  const hasLowStock = stats.lowStock > 0;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden hover:border-cyan-500/50 transition">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-800/80">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">{warehouse.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs ${warehouse.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {warehouse.location && (
              <div className="flex items-center gap-1 mt-2 text-sm text-slate-400">
                <MapPin className="w-3 h-3" />
                {warehouse.location}
              </div>
            )}
            {warehouse.phone && (
              <div className="flex items-center gap-1 mt-1 text-sm text-slate-400">
                <Phone className="w-3 h-3" />
                {warehouse.phone}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {onAddProduct && showExtraActions && (
              <button
                onClick={() => onAddProduct(warehouse.id)}
                className="p-2 hover:bg-green-600/20 rounded-lg transition"
                title="Add Product"
              >
                <Package className="w-4 h-4 text-green-400" />
              </button>
            )}
            <button
              onClick={() => onEdit(warehouse)}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
              title="Edit warehouse"
            >
              <Edit2 className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => onDelete(warehouse.id)}
              className="p-2 hover:bg-red-500/20 rounded-lg transition"
              title="Delete warehouse"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Content */}
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <Package className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.totalProducts}</p>
            <p className="text-xs text-slate-400">Products</p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.totalStock}</p>
            <p className="text-xs text-slate-400">Total Stock</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${hasLowStock ? 'bg-yellow-500/20' : 'bg-slate-900/50'}`}>
            <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${hasLowStock ? 'text-yellow-400' : 'text-slate-400'}`} />
            <p className={`text-xl font-bold ${hasLowStock ? 'text-yellow-400' : 'text-white'}`}>{stats.lowStock}</p>
            <p className={`text-xs ${hasLowStock ? 'text-yellow-400/70' : 'text-slate-400'}`}>Low Stock</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {hasLowStock && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
            <p className="text-sm text-yellow-400">⚠️ {stats.lowStock} item(s) below minimum stock level</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onViewDetails(warehouse)}
          className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" /> View Details
        </button>
      </div>
    </div>
  );
}
