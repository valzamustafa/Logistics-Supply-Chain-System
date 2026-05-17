import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { Product } from '../services/productService';
import { orderService, CreateOrderDto, Order } from '../services/orderService';

export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getCartItems: () => CartItem[];
  placeOrder: (bankAccount: string, bankAccountNumber: string, paymentMethod?: string, paymentReference?: string, warehouseId?: number) => Promise<Order>;
  isLoading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (e) {
          console.error('Failed to parse cart:', e);
          setCart([]);
        }
      } else {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      if (cart.length > 0) {
        localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
      } else {
        localStorage.removeItem(`cart_${user.id}`);
      }
    }
  }, [cart, user?.id]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        return prevCart.map(item =>
            item.productId === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          product: product,
          quantity: quantity,
          unitPrice: product.price
        }];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
        prevCart.map(item =>
            item.productId === productId
                ? { ...item, quantity }
                : item
        )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getCartItems = () => cart;

  const placeOrder = async (bankAccount: string, bankAccountNumber: string, paymentMethod?: string, paymentReference?: string, warehouseId?: number): Promise<Order> => {
    if (!user) {
      throw new Error('You must be logged in to place an order');
    }

    if (cart.length === 0) {
      throw new Error('Your cart is empty');
    }

    setIsLoading(true);
    setError(null);

    try {
      const orderData: CreateOrderDto = {
        userId: user.id,
        warehouseId,
        shippingAddress: user.shippingAddress || 'No address provided',
        billingAddress: user.billingAddress || 'No address provided',
        paymentMethod,
        paymentReference,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: 0
        })),
        invoice: {
          bankAccount: bankAccountNumber,
          billingName: `${user.firstName} ${user.lastName}`,
          billingEmail: user.email,
          billingPhone: user.phone || 'No phone provided'
        }
      };

      const response = await orderService.create(orderData);
      // response already contains the Order object directly
      const newOrder = response;

      // Clear cart after successful order
      clearCart();

      // Remove cart from localStorage
      if (user?.id) {
        localStorage.removeItem(`cart_${user.id}`);
      }

      return newOrder;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <CartContext.Provider
          value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            getCartTotal,
            getCartItemCount,
            getCartItems,
            placeOrder,
            isLoading,
            error,
          }}
      >
        {children}
      </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}