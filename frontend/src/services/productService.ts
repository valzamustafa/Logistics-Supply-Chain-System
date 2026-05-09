import { api } from './api';

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId: number;
  categoryName?: string;
  isActive: boolean;
  images?: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentCategoryId?: number;
}

export const productService = {
  getAll: (includeInactive = false) => api.get<Product[]>(`/api/products${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) => api.get<Product>(`/api/products/${id}`),
  getBySku: (sku: string) => api.get<Product>(`/api/products/sku/${sku}`),
  getByCategory: (categoryId: number) => api.get<Product[]>(`/api/products/category/${categoryId}`),
  create: (data: Omit<Product, 'id'>) => api.post<Product>('/api/products', data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/api/products/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/products/${id}`),
  uploadImage: (productId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ProductImage>(`/api/products/${productId}/images`, formData);
  },
  deleteImage: (productId: number, imageId: number) =>
    api.delete<void>(`/api/products/${productId}/images/${imageId}`),
  getCategories: () => api.get<Category[]>('/api/products/categories'),
  createCategory: (data: Omit<Category, 'id'>) => 
    api.post<Category>('/api/products/categories', data),
};
