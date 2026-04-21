import { api } from './api';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  lastActive?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

export interface Permission {
  id: number;
  name: string;
  category: string;
  description: string;
}

export const userService = {
  getAll: () => api.get<User[]>('/api/auth/users'),
  getById: (id: number) => api.get<User>(`/api/auth/${id}`),
  create: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post<User>('/api/auth/register', data),
  update: (id: number, data: { firstName: string; lastName: string; email: string; isActive: boolean }) =>
    api.put<User>(`/api/auth/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/auth/${id}`),
  assignRole: (userId: number, roleId: number) =>
    api.post<void>(`/api/auth/${userId}/roles/${roleId}`),
  removeRole: (userId: number, roleId: number) =>
    api.delete<void>(`/api/auth/${userId}/roles/${roleId}`),
};

export const roleService = {
  getAll: () => api.get<Role[]>('/api/auth/roles'),
  getById: (id: number) => api.get<Role>(`/api/auth/roles/${id}`),
  create: (data: { name: string; description: string; permissions: string[] }) =>
    api.post<Role>('/api/auth/roles', data),
  update: (id: number, data: Partial<Role>) =>
    api.put<Role>(`/api/auth/roles/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/auth/roles/${id}`),
  getPermissions: () => api.get<Permission[]>('/api/auth/permissions'),
};