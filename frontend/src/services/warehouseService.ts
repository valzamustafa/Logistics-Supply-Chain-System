import { api } from './api';



export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  phone: string | null;
  isActive: boolean;
  zones: WarehouseZone[];
  staff: WarehouseStaff[];
}

export interface WarehouseZone {
  id: number;
  warehouseId: number;
  zoneName: string;
  description: string | null;
  capacity: number;
}

export interface WarehouseStaff {
  id: number;
  userId: number;
  warehouseId: number;
  position: string | null;
  hireDate: string | null;
}

export interface CreateWarehouseDto {
  name: string;
  location?: string;
  phone?: string;
}

export interface UpdateWarehouseDto {
  name: string;
  location?: string;
  phone?: string;
  isActive: boolean;
}

export interface CreateZoneDto {
  warehouseId: number;
  zoneName: string;
  description?: string;
  capacity: number;
}

export interface AssignStaffDto {
  userId: number;
  position?: string;
  hireDate?: string;
}

export interface WarehouseStats {
  totalProducts: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  zonesCount: number;
  staffCount: number;
}

export interface ToggleStatusResponse {
  id: number;
  isActive: boolean;
  message: string;
}

export interface WarehouseSummary {
  totalWarehouses: number;
  activeWarehouses: number;
  totalZones: number;
  totalStaff: number;
  totalStockValue: number;
}



export const warehouseService = {


  getAll: () => api.get<Warehouse[]>('/api/warehouses'),
  

  getById: (id: number) => api.get<Warehouse>(`/api/warehouses/${id}`),
  

  create: (data: CreateWarehouseDto) => api.post<Warehouse>('/api/warehouses', data),
  

  update: (id: number, data: UpdateWarehouseDto) => api.put<Warehouse>(`/api/warehouses/${id}`, data),

  delete: (id: number) => api.delete<void>(`/api/warehouses/${id}`),
  

  forceDelete: (id: number) => api.delete<void>(`/api/warehouses/${id}/force`),

  toggleStatus: (id: number, isActive: boolean) => 
    api.put<ToggleStatusResponse>(`/api/warehouses/${id}/toggle-status`, { isActive }),
  

  getStats: (id: number) => api.get<WarehouseStats>(`/api/warehouses/${id}/stats`),
  

  getSummary: () => api.get<WarehouseSummary>('/api/warehouses/summary'),


  getZones: (warehouseId: number) => api.get<WarehouseZone[]>(`/api/warehouses/${warehouseId}/zones`),
  

  createZone: (data: CreateZoneDto) => api.post<WarehouseZone>('/api/warehouses/zones', data),
  

  updateZone: (id: number, data: Partial<CreateZoneDto>) => 
    api.put<WarehouseZone>(`/api/warehouses/zones/${id}`, data),
  

  deleteZone: (id: number) => api.delete<void>(`/api/warehouses/zones/${id}`),


  getStaff: (warehouseId: number) => api.get<WarehouseStaff[]>(`/api/warehouses/${warehouseId}/staff`),
  

  assignStaff: (warehouseId: number, data: AssignStaffDto) => 
    api.post<WarehouseStaff>(`/api/warehouses/${warehouseId}/staff`, data),
  

  updateStaff: (id: number, data: Partial<AssignStaffDto>) => 
    api.put<WarehouseStaff>(`/api/warehouses/staff/${id}`, data),
  

  removeStaff: (id: number) => api.delete<void>(`/api/warehouses/staff/${id}`),
  

  bulkAssignProducts: (warehouseId: number, products: Array<{ productId: number; quantity: number }>) => 
    api.post(`/api/warehouses/warehouse/${warehouseId}/bulk-assign`, 
      products.map(p => ({
        productId: p.productId,
        initialQuantity: p.quantity,
        minimumStockLevel: 5,
        maximumStockLevel: 1000,
        shelfLocation: null
      }))
    ),
};