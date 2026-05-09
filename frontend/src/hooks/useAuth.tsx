import { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser } from '../services/authService';
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '../utils/localStorage';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  lastActive?: string;
  phone?: string;
  shippingAddress?: string;
  billingAddress?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getLocalStorageItem('token');
      const storedUser = getLocalStorageItem('user');
      
      if (storedToken && storedUser) {
        try {
       
          const userData = await getCurrentUser(storedToken);
          setToken(storedToken);
          setUser(userData);
        } catch (error) {
        
          console.error('Token validation failed:', error);
          removeLocalStorageItem('token');
          removeLocalStorageItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setLocalStorageItem('token', newToken);
    setLocalStorageItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    removeLocalStorageItem('token');
    removeLocalStorageItem('user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}