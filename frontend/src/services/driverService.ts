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
export interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  capacity: number;
  isAvailable: boolean;
  driverId?: number;
  imageUrl?: string;
  vehicleType: 'truck' | 'van' | 'car' | 'motorcycle';
  year?: number;
  color?: string;
  createdAt?: string;
}

export interface VehicleLiveTracking {
  vehicleId: number;
  plateNumber: string;
  model: string;
  shipmentId?: number | null;
  trackingNumber?: string | null;
  currentLocation?: string | null;
  lastLocationUpdate?: string | null;
  status: string;
  estimatedDeliveryDate?: string | null;
  destination?: string | null;
  driverName?: string;
  driverPhone?: string;
}

export type DriverVehicle = Vehicle;

export interface AssignVehicleToDriverDto {
  driverId: number;
  vehicleId: number;
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
  driverId?: number;
  imageUrl?: string | null;
  vehicleType?: 'truck' | 'van' | 'car' | 'motorcycle';
  year?: number;
  color?: string;
}

type VehiclePayload = FormData | Partial<Vehicle> | CreateVehicleDto;
type VehicleMetadata = Pick<Vehicle, 'imageUrl' | 'color' | 'vehicleType' | 'year'>;

const VEHICLE_METADATA_CACHE_KEY = 'vehicle_metadata_cache';

const getVehicleCache = (): Record<string, VehicleMetadata> => {
  try {
    return JSON.parse(localStorage.getItem(VEHICLE_METADATA_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const setVehicleCache = (cache: Record<string, VehicleMetadata>) => {
  localStorage.setItem(VEHICLE_METADATA_CACHE_KEY, JSON.stringify(cache));
};

const cacheVehicleMetadata = (vehicle: Vehicle, data?: Partial<Vehicle> | CreateVehicleDto) => {
  const metadata: VehicleMetadata = {
    imageUrl: data?.imageUrl ?? vehicle.imageUrl,
    color: data?.color ?? vehicle.color,
    vehicleType: data?.vehicleType ?? vehicle.vehicleType,
    year: data?.year ?? vehicle.year,
  };

  const cache = getVehicleCache();
  cache[String(vehicle.id)] = metadata;
  cache[vehicle.plateNumber.toUpperCase()] = metadata;
  setVehicleCache(cache);
};

const applyVehicleMetadata = (vehicle: Vehicle): Vehicle => {
  const cache = getVehicleCache();
  const metadata = cache[String(vehicle.id)] ?? cache[vehicle.plateNumber.toUpperCase()];

  if (!metadata) {
    return vehicle;
  }

  return {
    ...vehicle,
    imageUrl: vehicle.imageUrl ?? metadata.imageUrl,
    color: vehicle.color ?? metadata.color,
    vehicleType: vehicle.vehicleType ?? metadata.vehicleType,
    year: vehicle.year ?? metadata.year,
  };
};

const toVehiclePayload = (data: VehiclePayload) => {
  if (!(data instanceof FormData)) {
    return data;
  }

  const payload: Record<string, string | boolean | number | null> = {};
  data.forEach((value, key) => {
    if (value instanceof File) {
      return;
    }

    if (key === 'capacity' || key === 'year' || key === 'driverId') {
      payload[key] = Number(value);
    } else if (key === 'isAvailable') {
      payload[key] = value === 'true';
    } else {
      payload[key] = value;
    }
  });
  return payload;
};

const saveVehicle = async <T extends Vehicle>(
  request: Promise<T>,
  data?: VehiclePayload
) => {
  const vehicle = await request;
  const payload = data instanceof FormData ? toVehiclePayload(data) as Partial<Vehicle> : data;
  cacheVehicleMetadata(vehicle, payload);
  return applyVehicleMetadata(vehicle) as T;
};

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
   notifySupplier: (shipmentId: string, data: { status: string; location?: string; notes?: string }) =>
    api.post(`/api/shipments/${shipmentId}/notify-supplier`, { ...data, updatedBy: 'driver' }),

  updateLocation: (shipmentId: string, location: { lat: number; lng: number; timestamp: string }) =>
    api.put(`/api/shipments/${shipmentId}/location`, location),
  getLiveTracking: (shipmentId: string) =>
    api.get(`/api/shipments/${shipmentId}/tracking/live`),
  
 
  getStats: () => api.get<DriverStats>('/api/driver/stats'),
  getTodaySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/today'),
  getWeeklySchedule: () => api.get<DriverSchedule[]>('/api/driver/schedule/week'),
  getPerformanceStats: () => api.get<DriverStats>('/api/driver/performance'),
};

export const vehicleService = {
  getAll: async () => (await api.get<Vehicle[]>('/api/vehicles')).map(applyVehicleMetadata),
  getById: async (id: number) => applyVehicleMetadata(await api.get<Vehicle>(`/api/vehicles/${id}`)),
  getAvailable: async () => (await api.get<Vehicle[]>('/api/vehicles/available')).map(applyVehicleMetadata),
  create: (data: VehiclePayload) => saveVehicle(api.post<Vehicle>('/api/vehicles', toVehiclePayload(data)), data),
  update: (id: number, data: VehiclePayload) => saveVehicle(api.put<Vehicle>(`/api/vehicles/${id}`, toVehiclePayload(data)), data),
  delete: (id: number) => api.delete<void>(`/api/vehicles/${id}`),
  assignToDriver: (data: AssignVehicleToDriverDto) => api.post('/api/vehicles/assign', data),
  getLiveTracking: (vehicleId: number) => api.get<VehicleLiveTracking>(`/api/vehicles/${vehicleId}/tracking/live`),
  getByDriver: async (driverId: number) => applyVehicleMetadata(await api.get<Vehicle>(`/api/vehicles/driver/${driverId}`)),
  getMyVehicle: async () => applyVehicleMetadata(await api.get<DriverVehicle>('/api/vehicles/my')),
  createMyVehicle: (data: VehiclePayload) => saveVehicle(api.post<DriverVehicle>('/api/vehicles/my', toVehiclePayload(data)), data),
  updateMyVehicle: (id: number, data: VehiclePayload) => saveVehicle(api.put<DriverVehicle>(`/api/vehicles/my/${id}`, toVehiclePayload(data)), data),
  deleteMyVehicle: (id: number) => api.delete<void>(`/api/vehicles/my/${id}`),
  getDrivers: () => driverService.getAll(),
  uploadImage: (vehicleId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ imageUrl: string }>(`/api/vehicles/${vehicleId}/image`, formData);
  },
};

