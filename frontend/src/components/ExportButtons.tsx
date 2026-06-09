import { Download, FileText } from 'lucide-react';
import { exportToCSV, formatExportData, ExportData } from '../utils/csvExport';

interface ExportButtonsProps {
  data: {
    orders?: any[];
    shipments?: any[];
    products?: any[];
    inventory?: any[];
    users?: any[];
    drivers?: any[];
    vehicles?: any[];
    warehouses?: any[];
  };
  label?: string;
}

export function ExportButtons({ data, label = 'Export Data' }: ExportButtonsProps) {
  const handleExport = (entityType: keyof typeof data) => {
    const entityData = data[entityType];
    
    if (!entityData || entityData.length === 0) {
      alert(`No ${entityType} data to export`);
      return;
    }

    const formatted = formatExportData(entityData, entityType);
    const filename = `${entityType}`;
    exportToCSV(formatted, filename);
  };

  const handleExportAll = () => {
    const allData: ExportData[] = [];
    const headers = new Set<string>();

   
    Object.entries(data).forEach(([type, items]: [string, any[] | undefined]) => {
      if (items && items.length > 0) {
        const formatted = formatExportData(items, type as any);
        formatted.forEach((item: ExportData) => {
          Object.keys(item).forEach(h => headers.add(h));
        });
        allData.push(...formatted);
      }
    });

    if (allData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers2 = Array.from(headers);
    exportToCSV(allData, 'dashboard-report', headers2);
  };

  const availableExports = Object.keys(data).filter(
    key => (data as any)[key as keyof typeof data] && (data as any)[key as keyof typeof data]?.length > 0
  );

  if (availableExports.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportAll}
        className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
        title="Export all data"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export All</span>
      </button>

      <div className="relative group">
        <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
          <FileText size={16} />
          <span className="hidden sm:inline">Export</span>
          <span className="ml-1">▼</span>
        </button>

        <div className="absolute right-0 mt-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-50">
          {availableExports.map(type => (
            <button
              key={type}
              onClick={() => handleExport(type as keyof typeof data)}
              className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 text-sm capitalize border-b last:border-b-0"
            >
              Export {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
