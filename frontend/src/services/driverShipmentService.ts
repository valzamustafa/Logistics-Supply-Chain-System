
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
    const result = await api.put<DriverShipment>(`/api/shipments/${id}/status`, data);
 
    try {
      await api.post(`/api/shipments/${id}/notify-supplier`, {
        status: data.status,
        location: data.location,
        notes: data.notes,
        updatedBy: 'driver'
      });
    } catch (error) {
      console.warn('Failed to notify supplier:', error);
    }
    
    return result;
  },
  
  startDelivery: (id: string) => 
    api.post<DriverShipment>(`/api/shipments/${id}/start`),
  completeDelivery: (id: string, proof?: string) => 
    api.post<DriverShipment>(`/api/shipments/${id}/complete`, { proof }),
};