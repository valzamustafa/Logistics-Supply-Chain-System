
import { getLocalStorageItem, removeLocalStorageItem } from '../utils/localStorage';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

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
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function register(email: string, password: string, firstName: string, lastName: string): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function getCurrentUser(token?: string): Promise<User> {
  const authToken = token || getLocalStorageItem('token');

  if (!authToken) {
    throw new Error('No authentication token available');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      removeLocalStorageItem('token');
      removeLocalStorageItem('user');
    }

    let errorMessage = `Failed to get current user: HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = `${errorMessage} - ${errorData.message}`;
      }
    } catch {
  
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getUsers(): Promise<User[]> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get users');
  }

  return response.json();
}


export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;  // Shto këtë
}): Promise<User> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}
export async function updateUser(id: number, data: { firstName: string; lastName: string; email: string; isActive: boolean }): Promise<User> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update user');
  }

  return response.json();
}

export async function deleteUser(id: number): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

export async function getRoles(): Promise<Role[]> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/roles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get roles');
  }

  return response.json();
}

export async function createRole(roleData: { name: string; description?: string }): Promise<Role> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(roleData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function assignRoleToUser(userId: number, roleId: number): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${userId}/roles/${roleId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to assign role');
  }
}

export async function removeRoleFromUser(userId: number, roleId: number): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to remove role');
  }
}

export async function getPermissions(): Promise<Permission[]> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/permissions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get permissions');
  }

  return response.json();
}

export async function updateRolePermissions(roleId: number, permissions: string[]): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ permissions })
  });

  if (!response.ok) {
    throw new Error('Failed to update role permissions');
  }
}

export async function assignRole(userId: number, roleId: number): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${userId}/roles/${roleId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to assign role');
  }
}

export async function removeRole(userId: number, roleId: number): Promise<void> {
  const token = getLocalStorageItem('token');
  const response = await fetch(`${apiBaseUrl}/api/auth/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to remove role');
  }
}

export function logout(): void {
  removeLocalStorageItem('token');
  removeLocalStorageItem('user');
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  const token = getLocalStorageItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
