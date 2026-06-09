import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { orderService, Order } from '../services/orderService';
import { reportService } from '../services/reportService';
import { shipmentService, Shipment } from '../services/shipmentService';
import { productService, Product } from '../services/productService';
import { warehouseService, Warehouse } from '../services/warehouseService';
import { warehouseStockService, LowStockAlert } from '../services/warehouseStockService';
import { ListChecks, Package, TrendingUp, AlertTriangle, Download } from 'lucide-react';

export function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const allowedRoles = ['admin', 'manager'];
  const userRoles = user?.roles?.map((role) => role?.trim().toLowerCase()) ?? [];
  const canDownloadReportPdf = userRoles.some((role) => allowedRoles.includes(role));

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [ordersData, shipmentsData, productsData, warehousesData, alertsData] = await Promise.all([
        orderService.getAll(),
        shipmentService.getAll(),
        productService.getAll(),
        warehouseService.getAll(),
        warehouseStockService.getLowStockAlerts(),
      ]);
      setOrders(ordersData);
      setShipments(shipmentsData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setLowStockAlerts(alertsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError(t('reports.errorLoading', 'Unable to load report metrics. Please check backend status.'));
    } finally {
      setLoading(false);
    }
  };

  const downloadReportPdf = async () => {
    if (!canDownloadReportPdf) {
      setError(t('reports.errorUnauthorized', 'You are not authorized to generate or download report PDFs.'));
      return;
    }

    setPdfLoading(true);
    try {
      const topOrders = orders
        .slice()
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5)
        .map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          itemsCount: order.items?.length || 0,
          totalAmount: `$${order.totalAmount.toLocaleString()}`,
        }));

      const reportData = {
        metrics: {
          totalRevenue: `$${totalRevenue.toLocaleString()}`,
          deliveredShipments,
          inTransitShipments,
          pendingShipments,
          activeProducts,
          activeWarehouses: warehouses.filter((warehouse) => warehouse.isActive).length,
          lowStockAlerts: lowStockAlerts.length,
        },
        topOrders,
        lowStockAlerts: lowStockAlerts.slice(0, 10).map((alert) => ({
          productName: alert.productName,
          warehouseName: alert.warehouseName,
          currentQuantity: alert.currentQuantity,
          minimumLevel: alert.minimumLevel,
          deficit: alert.deficit,
        })),
      };

      const report = await reportService.generate({
        type: 'summary',
        name: `Dashboard Summary ${new Date().toLocaleDateString()}`,
        data: reportData,
      });

      const blob = await reportService.downloadPdf(report.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report PDF:', err);
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('401') || message.includes('403')) {
        setError(t('reports.errorUnauthorized', 'You are not authorized to generate or download report PDFs.'));
      } else {
        setError(t('reports.errorPdf', 'Unable to download report PDF.'));
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const deliveredShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('deliver')).length;
  const inTransitShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('in transit') || shipment.status.toLowerCase().includes('route')).length;
  const pendingShipments = shipments.filter((shipment) => shipment.status.toLowerCase().includes('pending')).length;
  const activeProducts = products.filter((product) => product.isActive).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('reports.loading', 'Loading reports...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('reports.title', 'Reports')}</h1>
          <p className="text-slate-500">{t('reports.description', 'Analytics and business intelligence for logistics operations')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchReports}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition"
          >
            {t('reports.refreshMetrics', 'Refresh Metrics')}
          </button>
          <button
            onClick={downloadReportPdf}
            disabled={pdfLoading || !canDownloadReportPdf}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {pdfLoading ? t('reports.downloadingPdf', 'Downloading PDF...') : t('reports.downloadPdf', 'Download PDF')}
          </button>
        </div>
      </div>
      {!canDownloadReportPdf && (
        <div className="rounded-2xl border border-slate-200 bg-yellow-50 p-4 text-sm text-slate-700">
          {t('reports.pdfPermissionInfo', 'Report PDF generation is restricted to Admin and Manager users.')}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title={t('reports.totalRevenue', 'Total Revenue')} value={`$${totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} />
        <ReportCard title={t('reports.deliveredShipments', 'Delivered Shipments')} value={deliveredShipments.toString()} icon={<Package className="w-5 h-5" />} />
        <ReportCard title={t('reports.activeProducts', 'Active Products')} value={activeProducts.toString()} icon={<ListChecks className="w-5 h-5" />} />
        <ReportCard title={t('reports.lowStockAlerts', 'Low Stock Alerts')} value={lowStockAlerts.length.toString()} icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-slate-100/90 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('reports.topOrders', 'Top Orders')}</h2>
              <p className="text-sm text-slate-500">{t('reports.topOrdersDesc', 'Highest value orders from the last 30 days')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {orders
              .slice()
              .sort((a, b) => b.totalAmount - a.totalAmount)
              .slice(0, 5)
              .map((order) => (
                <div key={order.id} className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div>
                    <p className="text-sm text-slate-500">{t('reports.orderNumber', 'Order #{{number}}', { number: order.orderNumber })}</p>
                    <p className="text-slate-900 font-semibold mt-2">{t('reports.itemsCount', '{{count}} items', { count: order.items?.length || 0 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('orders.statusLabel', 'Status')}</p>
                    <p className="text-slate-900 font-semibold mt-2">{order.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{t('orders.amount', 'Amount')}</p>
                    <p className="text-slate-900 font-semibold mt-2">${order.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-100/90 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('reports.lowStockAlerts', 'Low Stock Alerts')}</h2>
              <p className="text-sm text-slate-500">{t('reports.lowStockDesc', 'Items likely to need replenishment')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {lowStockAlerts.slice(0, 5).map((alert) => (
              <div key={`${alert.warehouseId}-${alert.productId}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-slate-900 font-semibold">{alert.productName}</p>
                <p className="text-slate-500 text-sm">{t('inventory.warehouse', 'Warehouse')}: {alert.warehouseName}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>{t('reports.currentQuantity', 'Current {{count}}', { count: alert.currentQuantity })}</span>
                  <span>{t('reports.needQuantity', 'Need {{count}}', { count: alert.deficit })}</span>
                </div>
              </div>
            ))}
            {lowStockAlerts.length === 0 && (
              <p className="text-slate-500 text-sm">{t('reports.noLowStockAlerts', 'No low stock alerts found')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-semibold text-slate-900 mt-3">{value}</p>
        </div>
        <div className="rounded-3xl bg-white p-3 text-cyan-400">{icon}</div>
      </div>
    </div>
  );
}





