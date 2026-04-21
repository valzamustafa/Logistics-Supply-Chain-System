import { api } from './api';

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
}

export interface Category {
    id: number;
    name: string;
    description?: string;
    parentCategoryId?: number;
}

export const productService = {
    getAll: () => api.get<Product[]>('/api/products'),
    getById: (id: number) => api.get<Product>(`/api/products/${id}`),
    getBySku: (sku: string) => api.get<Product>(`/api/products/sku/${sku}`),
    getByCategory: (categoryId: number) => api.get<Product[]>(`/api/products/category/${categoryId}`),
    create: (data: Omit<Product, 'id'>) => api.post<Product>('/api/products', data),
    update: (id: number, data: Partial<Product>) => api.put<Product>(`/api/products/${id}`, data),
    delete: (id: number) => api.delete<void>(`/api/products/${id}`),
    getCategories: () => api.get<Category[]>('/api/products/categories'),
    createCategory: (data: Omit<Category, 'id'>) =>
        api.post<Category>('/api/products/categories', data),
};
