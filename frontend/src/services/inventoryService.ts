import { api } from './api';

export interface InventoryItem {
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    warehouseId: number;
    warehouseName: string;
    quantity: number;
    reservedQuantity: number;
    reorderLevel: number | null;
    availableQuantity: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export interface LowStockAlertItem {
    id: number;
    inventoryId: number;
    productId: number;
    currentQuantity: number;
    thresholdLevel: number;
    isResolved: boolean;
    resolvedAt: string | null;
    createdAt: string;
}

export interface UpdateStockRequest {
    productId: number;
    warehouseId: number;
    quantity: number;
    type: 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUST';
    referenceType?: string;
    referenceId?: number;
    notes?: string;
}

export interface StockMovementRecord {
    id: number;
    inventoryId: number;
    productId: number;
    quantity: number;
    type: string;
    referenceType: string | null;
    referenceId: number | null;
    notes: string | null;
    movementDate: string;
}

export const inventoryService = {
    getAll: () => api.get<InventoryItem[]>('/api/inventory'),
    getById: (productId: number, warehouseId: number) =>
        api.get<InventoryItem>(`/api/inventory/${productId}/${warehouseId}`),
    getByWarehouse: (warehouseId: number) =>
        api.get<InventoryItem[]>(`/api/inventory/warehouse/${warehouseId}`),
    updateStock: (data: UpdateStockRequest) =>
        api.post<InventoryItem>('/api/inventory/stock', data),
    getLowStockAlerts: () =>
        api.get<LowStockAlertItem[]>('/api/inventory/low-stock-alerts'),
    getStockMovements: (productId: number, warehouseId: number) =>
        api.get<StockMovementRecord[]>(`/api/inventory/${productId}/${warehouseId}/movements`),
    associateProductWarehouse: (productId: number, warehouseId: number, data: {
        initialQuantity: number;
        reorderLevel?: number;
    }) =>
        api.post<InventoryItem>(
            `/api/inventory/${productId}/${warehouseId}`,
            data
        ),
};