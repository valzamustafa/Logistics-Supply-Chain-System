import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { warehouseStockService, WarehouseStock } from '../services/warehouseStockService';
import { signalRService } from '../services/signalRService';
import { Pagination } from '../components/Pagination';

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchInventory();

    const unsubscribe = signalRService.onEntityUpdated((payload) => {
      try {
        const type = payload?.Type ?? payload?.type ?? payload?.Notification?.type;
        const actionUrl = payload?.Notification?.actionUrl ?? '';
        if (typeof type === 'string' && (type.toLowerCase().includes('stock') || type.toLowerCase().includes('inventory') || type.toLowerCase().includes('lowstock') || type.toLowerCase().includes('stockmovement'))) {
          fetchInventory();
        } else if (typeof actionUrl === 'string' && (actionUrl.toLowerCase().includes('/inventory') || actionUrl.toLowerCase().includes('/warehouse') || actionUrl.toLowerCase().includes('/stock'))) {
          fetchInventory();
        }
      } catch (err) {
        console.error('Error handling entity update:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await warehouseStockService.getAll();
      setInventory(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError(t('inventory.errorLoading', 'Failed to load inventory data.'));
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(inventory.length / pageSize));
  const paginatedInventory = inventory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, inventory.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-500">{t('inventory.loading', 'Loading inventory...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('inventory.managementTitle', 'Inventory Management')}</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{t('inventory.showingAllStock', 'Showing all warehouse stock items')}</p>
            <p className="text-xl font-semibold text-slate-900">{t('inventory.recordsCount', '{{count}} records', { count: inventory.length })}</p>
          </div>
          <div className="text-sm text-slate-500">
            {t('inventory.showingSummary', 'Showing {{start}} - {{end}} of {{total}}', {
              start: inventory.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, inventory.length),
              total: inventory.length,
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.productLabel', 'Product')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.sku', 'SKU')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('inventory.stockLevel', 'Stock Level')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('inventory.minLevel', 'Min Level')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('inventory.maxLevel', 'Max Level')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('warehouseStaffDashboard.status', 'Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('inventory.warehouse', 'Warehouse')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('inventory.location', 'Location')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-700">
              {paginatedInventory.map((item) => (
                <tr key={`${item.warehouseId}-${item.productId}`} className="hover:bg-slate-100/80 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.productName || t('adminDashboard.na', 'N/A')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.productSku || t('adminDashboard.na', 'N/A')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.minimumStockLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.maximumStockLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.isOutOfStock ? 'bg-red-500/20 text-red-400' :
                      item.isLowStock ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.isOutOfStock ? t('inventory.outOfStock', 'Out of Stock') : item.isLowStock ? t('inventory.lowStock', 'Low Stock') : t('inventory.good', 'Good')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.warehouseName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.shelfLocation || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-8 text-slate-500">{t('inventory.emptyInventory', 'No inventory items found.')}</div>
        )}

        {inventory.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(inventory.length / pageSize))}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
              label={t('inventory.title', 'Inventory')}
            />
          </div>
        )}
      </div>
    </div>
  );
};




