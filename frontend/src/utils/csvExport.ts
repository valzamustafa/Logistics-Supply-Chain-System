
export interface ExportData {
  [key: string]: any;
}


export function convertToCSV(data: ExportData[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

 
  const cols = headers || Object.keys(data[0]);


  const headerRow = cols.map(col => `"${col}"`).join(',');


  const dataRows = data.map(row => {
    return cols.map(col => {
      const value = row[col];
      
    
      if (value === null || value === undefined) {
        return '""';
      }

  
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }

    
      if (typeof value === 'boolean') {
        return `"${value ? 'Yes' : 'No'}"`;
      }

      
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }


      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return `"${stringValue}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}


export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



export function exportToCSV(
  data: ExportData[],
  filename: string,
  headers?: string[]
): void {
  const csv = convertToCSV(data, headers);
  if (csv) {
    downloadCSV(csv, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  }
}


export function formatExportData(
  data: any[],
  entityType: 'orders' | 'shipments' | 'products' | 'inventory' | 'users' | 'drivers' | 'vehicles' | 'warehouses'
): ExportData[] {
  switch (entityType) {
    case 'orders':
      return data.map(order => ({
        'Order ID': order.id || '',
        'Order Number': order.orderNumber || '',
        'Customer': order.customerName || order.customer?.name || '',
        'Status': order.status || '',
        'Total Amount': order.totalAmount || 0,
        'Items Count': order.items?.length || 0,
        'Created Date': order.createdDate || order.createdAt || '',
        'Updated Date': order.updatedDate || order.updatedAt || '',
        'Notes': order.notes || '',
      }));

    case 'shipments':
      return data.map(shipment => ({
        'Shipment ID': shipment.id || '',
        'Order ID': shipment.orderId || '',
        'Tracking Number': shipment.trackingNumber || '',
        'Driver': shipment.driverName || shipment.driver?.name || '',
        'Vehicle': shipment.vehiclePlateNumber || shipment.vehicle?.plateNumber || '',
        'Status': shipment.status || '',
        'From': shipment.originLocation || '',
        'To': shipment.destinationLocation || shipment.shippingAddress || '',
        'Estimated Delivery': shipment.estimatedDeliveryDate || '',
        'Actual Delivery': shipment.actualDeliveryDate || '',
        'Created Date': shipment.createdDate || shipment.createdAt || '',
      }));

    case 'products':
      return data.map(product => ({
        'Product ID': product.id || '',
        'Name': product.name || '',
        'SKU': product.sku || '',
        'Category': product.category || '',
        'Price': product.price || 0,
        'Cost': product.cost || 0,
        'Quantity': product.quantity || 0,
        'Unit': product.unit || '',
        'Description': product.description || '',
        'Active': product.isActive ? 'Yes' : 'No',
        'Created Date': product.createdDate || product.createdAt || '',
      }));

    case 'inventory':
      return data.map(inv => ({
        'Warehouse': inv.warehouseName || inv.warehouse?.name || '',
        'Product': inv.productName || inv.product?.name || '',
        'Quantity': inv.quantity || 0,
        'Reorder Level': inv.reorderLevel || 0,
        'Status': inv.quantity <= (inv.reorderLevel || 10) ? 'Low Stock' : 'OK',
        'Last Updated': inv.lastUpdated || inv.updatedAt || '',
      }));

    case 'users':
      return data.map(user => ({
        'User ID': user.id || '',
        'Email': user.email || '',
        'First Name': user.firstName || '',
        'Last Name': user.lastName || '',
        'Role': user.role || '',
        'Status': user.isActive ? 'Active' : 'Inactive',
        'Created Date': user.createdDate || user.createdAt || '',
      }));

    case 'drivers':
      return data.map(driver => ({
        'Driver ID': driver.id || '',
        'Name': driver.name || driver.user?.firstName + ' ' + driver.user?.lastName || '',
        'License Number': driver.licenseNumber || '',
        'Phone': driver.phoneNumber || '',
        'Status': driver.isAvailable ? 'Available' : 'Unavailable',
        'Created Date': driver.createdDate || driver.createdAt || '',
      }));

    case 'vehicles':
      return data.map(vehicle => ({
        'Vehicle ID': vehicle.id || '',
        'Plate Number': vehicle.plateNumber || '',
        'Model': vehicle.model || '',
        'Capacity': vehicle.capacity || 0,
        'Status': vehicle.isAvailable ? 'Available' : 'In Maintenance',
        'Created Date': vehicle.createdDate || vehicle.createdAt || '',
      }));

    case 'warehouses':
      return data.map(warehouse => ({
        'Warehouse ID': warehouse.id || '',
        'Name': warehouse.name || '',
        'Location': warehouse.location || '',
        'Phone': warehouse.phoneNumber || '',
        'Email': warehouse.email || '',
        'Total Products': warehouse.totalProducts || 0,
        'Created Date': warehouse.createdDate || warehouse.createdAt || '',
      }));

    default:
      return data;
  }
}

export function exportMultipleToCSV(
  dataMap: Record<string, any[]>,
  filename: string
): void {
  const allRows: ExportData[] = [];

  Object.entries(dataMap).forEach(([entityType, data]) => {
    if (data && data.length > 0) {
      const formatted = formatExportData(data, entityType as any);
   
      formatted.forEach(row => {
        row['__Type'] = entityType;
      });
      allRows.push(...formatted);
    }
  });

  if (allRows.length > 0) {
    const csv = convertToCSV(allRows);
    downloadCSV(csv, filename);
  }
}
