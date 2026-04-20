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
  shippingAddress?: string;
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

export interface CreateOrderDto {
  userId: number;
  shippingAddress?: string;
  billingAddress?: string;
  items: CreateOrderItemDto[];
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
  create: (data: CreateOrderDto) => api.post<Order>('/api/orders', data),
  updateStatus: (id: number, status: string) => 
    api.put<Order>(`/api/orders/${id}/status`, { status }),
  cancel: (id: number) => api.post<void>(`/api/orders/${id}/cancel`),
};