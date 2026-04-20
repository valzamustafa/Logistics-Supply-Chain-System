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
};

export const vehicleService = {
  getAll: () => api.get<Vehicle[]>('/api/vehicles'),
  getById: (id: number) => api.get<Vehicle>(`/api/vehicles/${id}`),
  getAvailable: () => api.get<Vehicle[]>('/api/vehicles/available'),
  create: (data: CreateVehicleDto) => api.post<Vehicle>('/api/vehicles', data),
  update: (id: number, data: Partial<Vehicle>) => api.put<Vehicle>(`/api/vehicles/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/vehicles/${id}`),
};