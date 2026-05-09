import { api } from './api';

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  orderDate: string;
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingCost?: number;
  status: string;
  warehouseId?: number;
  paymentMethod?: string;
  paymentReference?: string;
  shippingAddress?: string;
  billingName?: string;
  billingAddress?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  totalPrice: number;
}

export interface InvoiceInfo {
  bankAccount: string;
  billingName: string;
  billingEmail: string;
  billingPhone?: string;
}

export interface CreateOrderDto {
  userId: number;
  warehouseId?: number;
  shippingAddress?: string;
  billingAddress?: string;
  paymentMethod?: string;
  paymentReference?: string;
  items: CreateOrderItemDto[];
  invoice?: InvoiceInfo;
}

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export const orderService = {
  getAll: () => api.get<Order[]>('/api/orders'),
  getById: (id: number) => api.get<Order>(`/api/orders/${id}`),
  getByUser: (userId: number) => api.get<Order[]>(`/api/orders/user/${userId}`),
  createPaymentIntent: (data: { amount: number; currency?: string }) =>
    api.post<{ clientSecret: string }>('/api/orders/payment-intent', data),
  create: (data: CreateOrderDto) => api.post<Order>('/api/orders', data),
  assignWarehouse: (orderId: number, warehouseId: number) =>
    api.put<Order>(`/api/orders/${orderId}/assign-warehouse/${warehouseId}`, {}),
  updateStatus: (id: number, status: string) => 
    api.put<Order>(`/api/orders/${id}/status`, { status }),
  cancel: (id: number) => api.post<void>(`/api/orders/${id}/cancel`),
};