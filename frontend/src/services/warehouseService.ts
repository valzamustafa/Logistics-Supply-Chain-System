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

export const warehouseService = {
  // Warehouses
  getAll: () => api.get<Warehouse[]>('/api/warehouses'),
  getById: (id: number) => api.get<Warehouse>(`/api/warehouses/${id}`),
  create: (data: CreateWarehouseDto) => api.post<Warehouse>('/api/warehouses', data),
  update: (id: number, data: UpdateWarehouseDto) => api.put<Warehouse>(`/api/warehouses/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/warehouses/${id}`),
  
  // Zones
  getZones: (warehouseId: number) => api.get<WarehouseZone[]>(`/api/warehouses/${warehouseId}/zones`),
  createZone: (data: CreateZoneDto) => api.post<WarehouseZone>('/api/warehouses/zones', data),
  deleteZone: (id: number) => api.delete<void>(`/api/warehouses/zones/${id}`),
  
  // Staff
  getStaff: (warehouseId: number) => api.get<WarehouseStaff[]>(`/api/warehouses/${warehouseId}/staff`),
  assignStaff: (warehouseId: number, data: AssignStaffDto) => 
    api.post<WarehouseStaff>(`/api/warehouses/${warehouseId}/staff`, data),
  removeStaff: (id: number) => api.delete<void>(`/api/warehouses/staff/${id}`),
};
