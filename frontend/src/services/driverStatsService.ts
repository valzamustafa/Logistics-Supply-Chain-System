import { api } from './api';

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
  reference: string;
  description: string;
}

export const driverStatsService = {
  getStats: () => api.get<DriverStats>('/api/driver/stats'),
  getTodaySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/today'),
  getWeeklySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/week'),
};