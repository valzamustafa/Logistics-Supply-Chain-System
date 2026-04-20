import { api } from './api';

export interface Driver {
  id: number;
  userId: number;
  licenseNumber: string;
  phoneNumber?: string;
  isAvailable: boolean;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  capacity: number;
  isAvailable: boolean;
  createdAt?: string;
}

export interface DriverProfile {
  id: number;
  userId: number;
  licenseNumber: string;
  phoneNumber?: string;
  isAvailable: boolean;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DriverShipment {
  id: string;
  trackingNumber: string;
  orderId: number;
  status: 'Pending' | 'In Transit' | 'Delivered';
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  shippingAddress?: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  distance?: string;
  eta?: string;
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  items: DriverShipmentItem[];
}

export interface DriverShipmentItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
}

export interface DriverStats {
  todaysDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  totalDistance: number;
  totalDeliveries: number;
  onTimeRate: number;
  averageRating: number;
}

export interface DriverSchedule {
  id: string;
  time: string;
  type: 'pickup' | 'delivery';
  location: string;
  shipmentId: string;
  trackingNumber: string;
  description: string;
}

export interface CreateDriverDto {
  userId: number;
  licenseNumber: string;
  phoneNumber?: string;
  isAvailable?: boolean;
}

export interface CreateVehicleDto {
  plateNumber: string;
  model: string;
  capacity: number;
  isAvailable?: boolean;
}

export const driverService = {
  getAll: () => api.get<Driver[]>('/api/drivers'),
  getById: (id: number) => api.get<Driver>(`/api/drivers/${id}`),
  getAvailable: () => api.get<Driver[]>('/api/drivers/available'),
  create: (data: CreateDriverDto) => api.post<Driver>('/api/drivers', data),
  update: (id: number, data: Partial<Driver>) => api.put<Driver>(`/api/drivers/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/drivers/${id}`),
  
  getProfile: () => api.get<DriverProfile>('/api/driver/profile'),
  updateProfile: (data: Partial<DriverProfile>) => api.put<DriverProfile>('/api/driver/profile', data),
  updateAvailability: (isAvailable: boolean) => api.put('/api/driver/availability', { isAvailable }),
  
  getMyShipments: () => api.get<DriverShipment[]>('/api/shipments/driver/assigned'),
  getShipmentById: (id: string) => api.get<DriverShipment>(`/api/shipments/${id}`),
  startDelivery: (id: string) => api.post(`/api/shipments/${id}/start`, {}),
  completeDelivery: (id: string, proof?: string, signature?: string) => 
    api.post(`/api/shipments/${id}/complete`, { proof, signature }),
  updateStatus: (id: string, status: string, location?: string) => 
    api.put(`/api/shipments/${id}/status`, { status, location }),
  
  getStats: () => api.get<DriverStats>('/api/driver/stats'),
  getTodaySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/today'),
  getWeeklySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/week'),
};

export const vehicleService = {
  getAll: () => api.get<Vehicle[]>('/api/vehicles'),
  getById: (id: number) => api.get<Vehicle>(`/api/vehicles/${id}`),
  getAvailable: () => api.get<Vehicle[]>('/api/vehicles/available'),
  create: (data: CreateVehicleDto) => api.post<Vehicle>('/api/vehicles', data),
  update: (id: number, data: Partial<Vehicle>) => api.put<Vehicle>(`/api/vehicles/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/vehicles/${id}`),
};