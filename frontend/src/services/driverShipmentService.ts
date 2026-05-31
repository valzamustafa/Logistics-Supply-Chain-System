

import { api } from './api';

export interface DriverShipment {
  id: string;
  trackingNumber: string;
  orderId: number;
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  status: 'Pending' | 'In Transit' | 'Delivered';
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  shippingAddress?: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  distance?: string;
  eta?: string;
  items: DriverShipmentItem[];
}

export interface DriverShipmentItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
}

export interface UpdateShipmentStatusDto {
  status: string;
  location?: string;
  notes?: string;
}

export const driverShipmentService = {
  getMyShipments: () => api.get<DriverShipment[]>('/api/shipments/driver/assigned'),
  getById: (id: string) => api.get<DriverShipment>(`/api/shipments/${id}`),
  

  updateStatus: async (id: string, data: UpdateShipmentStatusDto) => {
 
    return api.put<DriverShipment>(`/api/shipments/${id}/status`, data);
  },
  
  startDelivery: (id: string) => 
    api.post<DriverShipment>(`/api/shipments/${id}/start`),
  completeDelivery: (id: string, proof?: string) => 
    api.post<DriverShipment>(`/api/shipments/${id}/complete`, { proof }),
};