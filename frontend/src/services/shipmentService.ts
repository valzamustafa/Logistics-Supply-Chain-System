import { api } from './api';

export interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: number;
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  status: string;
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  shippingAddress?: string;
  priority?: number;
  items: ShipmentItem[];
}

export interface ShipmentItem {
  id: number;
  productId: number;
  quantity: number;
}

export interface CreateShipmentDto {
  orderId: number;
  driverId?: number;
  vehicleId?: number;
  estimatedDeliveryDate: string;
  shippingAddress?: string;
  items: CreateShipmentItemDto[];
}

export interface CreateShipmentItemDto {
  productId: number;
  quantity: number;
}

export interface UpdateShipmentStatusDto {
  status: string;
  location?: string;
}

export interface ReorderShipmentDto {
  newPriority: number;
}

export const shipmentService = {
  getAll: () => api.get<Shipment[]>('/api/shipments'),
  getById: (id: string) => api.get<Shipment>(`/api/shipments/${id}`),
  getByOrderId: (orderId: number) => api.get<Shipment[]>(`/api/shipments/order/${orderId}`),
  create: (data: CreateShipmentDto) => api.post<Shipment>('/api/shipments', data),
  updateStatus: (id: string, data: UpdateShipmentStatusDto) => 
    api.put<Shipment>(`/api/shipments/${id}/status`, data),
  reorder: (id: string, data: { newPriority: number }) => 
    api.put<Shipment>(`/api/shipments/${id}/reorder`, data),
};