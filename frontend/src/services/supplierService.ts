import { api } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface SupplierOrderItemDto {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierOrderDto {
  id: number;
  supplierId: number;
  supplierName?: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  items: SupplierOrderItemDto[];
}

export interface SupplierRequestDto {
  id: number;
  warehouseId: number;
  requestedBy: number;
  productCategory?: string | null;
  productName?: string | null;
  quantityNeeded?: number;
  status: string;
  urgency?: string | null;
  notes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface SupplierDashboardDto {
  supplierId: number;
  supplierName: string;
  supplierEmail?: string;
  supplierContactPerson?: string | null;
  supplierPhone?: string | null;
  warehouseIds: number[];
  orders: PurchaseOrderDto[];
}

export interface PurchaseOrderItemDto {
  id: number;
  productId: number;
  quantity: number;
  quantityReceived?: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrderDto {
  id: number;
  supplierId: number;
  warehouseId: number;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  totalAmount: number;
  notes?: string;
  invoiceNumber?: string;
  items: PurchaseOrderItemDto[];
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateSupplierOrderItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSupplierOrderDto {
  supplierId: number;
  warehouseId?: number;
  items: CreateSupplierOrderItemDto[];
}

export interface CreatePurchaseOrderDto {
  supplierId: number;
  warehouseId: number;
  items: { productId: number; quantity: number; unitPrice: number }[];
  notes?: string;
}

export interface CreateEmergencyPurchaseDto {
  warehouseId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
}

export interface CreatePaymentDto {
  purchaseOrderId: number;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
}

export interface PaymentResponseDto {
  id: number;
  purchaseOrderId: number;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  paymentDate: string;
}

export const supplierService = {
  getAll: () => api.get<Supplier[]>('/api/suppliers'),
  getById: (id: number) => api.get<Supplier>(`/api/suppliers/${id}`),
  create: (data: CreateSupplierDto) => api.post<Supplier>('/api/suppliers', data),
  update: (id: number, data: CreateSupplierDto) => api.put<Supplier>(`/api/suppliers/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/suppliers/${id}`),
  getAllOrders: () => api.get<SupplierOrderDto[]>('/api/suppliers/orders'),
  getOrderById: (id: number) => api.get<SupplierOrderDto>(`/api/suppliers/orders/${id}`),
  createOrder: (data: CreateSupplierOrderDto) => api.post<any>('/api/suppliers/orders', data),
  getDashboard: () => api.get<SupplierDashboardDto>('/api/suppliers/dashboard/me'),
  getPendingRequests: () => api.get<SupplierRequestDto[]>('/api/suppliers/requests/pending'),
  getMyClaims: () => api.get<any>('/api/suppliers/debug/claims'),
  
  confirmShipment: (orderId: number, data: { actualDeliveryDate?: string | null; notes?: string }) =>
    api.put(`/api/suppliers/orders/${orderId}/confirm-shipment`, data),
  
  getInvoicePdf: async (orderId: number) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/suppliers/orders/${orderId}/invoice-pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to download invoice');
    return response.blob();
  },
  
createPayment: (orderId: number, data: CreatePaymentDto) =>
  api.post<PaymentResponseDto>(`/api/suppliers/orders/${orderId}/payments`, data),
  
  createPurchaseOrder: (data: CreatePurchaseOrderDto) =>
    api.post<any>('/api/purchaseorders', data),
  
  createEmergencyPurchase: (data: CreateEmergencyPurchaseDto) =>
    api.post('/api/suppliers/emergency-purchases', data),
  
  getAllPurchaseOrders: () => api.get<any[]>('/api/purchaseorders'),
};