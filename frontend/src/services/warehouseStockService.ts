import { api } from './api';

export interface WarehouseStock {
    id: number;
    warehouseId: number;
    warehouseName: string;
    productId: number;
    productName: string;
    productSku: string;
    quantity: number;
    minimumStockLevel: number;
    maximumStockLevel: number;
    shelfLocation: string | null;
    isLowStock: boolean;
    isOutOfStock: boolean;
    isOverstock: boolean;
}

export interface AssignProductToWarehouseDto {
    productId: number;
    initialQuantity: number;
    minimumStockLevel: number;
    maximumStockLevel: number;
    shelfLocation?: string;
}

export interface UpdateStockDto {
    quantity: number;
    type: 'Inbound' | 'Outbound' | 'Adjustment' | 'Restock';
    reference?: string;
    notes?: string;
}

export interface TransferStockDto {
    sourceWarehouseId: number;
    destinationWarehouseId: number;
    productId: number;
    quantity: number;
    notes?: string;
}

export interface StockMovement {
    id: number;
    productId: number;
    productName: string;
    type: 'Inbound' | 'Outbound' | 'Transfer' | 'TransferIn' | 'Adjustment' | 'Restock';
    typeName: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reference: string | null;
    sourceWarehouseId: number | null;
    sourceWarehouseName: string | null;
    destinationWarehouseId: number | null;
    destinationWarehouseName: string | null;
    notes: string | null;
    createdAt: string;
    createdBy: number;
}

export interface LowStockAlert {
    warehouseId: number;
    warehouseName: string;
    productId: number;
    productName: string;
    productSku: string;
    currentQuantity: number;
    minimumLevel: number;
    deficit: number;
}

export const warehouseStockService = {
    getAll: () => api.get<WarehouseStock[]>('/api/warehousestock'),
    getByWarehouse: (warehouseId: number) =>
        api.get<WarehouseStock[]>(`/api/warehousestock/warehouse/${warehouseId}`),
    getByProduct: (productId: number) =>
        api.get<WarehouseStock[]>(`/api/warehousestock/product/${productId}`),
    getByWarehouseAndProduct: (warehouseId: number, productId: number) =>
        api.get<WarehouseStock>(`/api/warehousestock/warehouse/${warehouseId}/product/${productId}`),
    assignProduct: (warehouseId: number, data: AssignProductToWarehouseDto) =>
        api.post<WarehouseStock>(`/api/warehousestock/warehouse/${warehouseId}/assign`, data),
    updateStock: (warehouseId: number, productId: number, data: UpdateStockDto) =>
        api.put<WarehouseStock>(`/api/warehousestock/warehouse/${warehouseId}/product/${productId}/stock`, data),
    reorderStock: (warehouseId: number, productId: number, quantity: number, notes?: string) =>
        api.put<WarehouseStock>(
            `/api/warehousestock/warehouse/${warehouseId}/product/${productId}/stock`,
            {
                quantity,
                type: 'Restock',
                notes: notes ?? 'Restock triggered from inventory UI',
            }
        ),
    transferStock: (data: TransferStockDto) =>
        api.post<WarehouseStock>('/api/warehousestock/transfer', data),
    getMovements: (warehouseId: number, productId: number, limit?: number) => {
        const url = `/api/warehousestock/warehouse/${warehouseId}/product/${productId}/movements`;
        if (limit) {
            return api.get<StockMovement[]>(`${url}?limit=${limit}`);
        }
        return api.get<StockMovement[]>(url);
    },
    getLowStockAlerts: (warehouseId?: number) => {
        const url = '/api/warehousestock/low-stock';
        if (warehouseId) {
            return api.get<LowStockAlert[]>(`${url}?warehouseId=${warehouseId}`);
        }
        return api.get<LowStockAlert[]>(url);
    },
    checkAvailability: (warehouseId: number, productId: number, quantity: number) =>
        api.get<{ isAvailable: boolean }>(`/api/warehousestock/warehouse/${warehouseId}/product/${productId}/availability?quantity=${quantity}`),
    removeProduct: (warehouseId: number, productId: number) =>
        api.delete<void>(`/api/warehousestock/warehouse/${warehouseId}/product/${productId}`),
};