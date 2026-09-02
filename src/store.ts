import { create } from 'zustand';
import axios from 'axios';
import { User, Product, CartItem } from './types';

// Create consistent axios instance
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true // Extremely important for httpOnly cookies!
});

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  checkAuth: () => Promise<User | null>;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { email: string; password: string; nombre: string; apellido: string; telefono?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { nombre: string; apellido: string; telefono?: string }) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  clearError: () => set({ error: null }),
  checkAuth: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, loading: false });
      return res.data.user;
    } catch (err) {
      set({ user: null, loading: false });
      return null;
    }
  },
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', credentials);
      set({ user: res.data.user, loading: false });
      return res.data.user;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Error al iniciar sesión.';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },
  register: async (formData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/registro', formData);
      set({ user: res.data.user, loading: false });
      return res.data.user;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Error al registrarse.';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Silent failure on backend logout call');
    } finally {
      set({ user: null, loading: false });
    }
  },
  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put('/auth/perfil', profileData);
      set({ user: res.data.user, loading: false });
      return res.data.user;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Error al actualizar perfil.';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },
  requestPasswordReset: async (email) => {
    try {
      const res = await api.post('/auth/recuperar', { email });
      return res.data.message as string;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error al solicitar la recuperación.');
    }
  },
  resetPassword: async (token, password) => {
    try {
      const res = await api.post('/auth/restablecer', { token, password });
      return res.data.message as string;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error al restablecer la contraseña.');
    }
  },
  changePassword: async (currentPassword, newPassword) => {
    try {
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      return res.data.message as string;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error al cambiar la contraseña.');
    }
  }
}));

interface CartState {
  items: CartItem[];
  total: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  loadCartFromStorage: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  loadCartFromStorage: () => {
    try {
      const local = localStorage.getItem('jaguar_cart');
      if (local) {
        const parsed: CartItem[] = JSON.parse(local);
        const total = parsed.reduce((sum, item) => sum + (item.product ? item.product.precio * item.cantidad : 0), 0);
        set({ items: parsed, total });
      }
    } catch (err) {
      console.error('Error loading cart from storage', err);
    }
  },
  addToCart: (product, quantity = 1) => {
    const currentItems = [...get().items];
    const existing = currentItems.find(item => item.product_id === product.id);

    if (existing) {
      const newQty = existing.cantidad + quantity;
      if (newQty > product.stock) {
        throw new Error(`Sólo quedan ${product.stock} unidades en inventario.`);
      }
      existing.cantidad = newQty;
    } else {
      if (quantity > product.stock) {
        throw new Error(`Sólo quedan ${product.stock} unidades en inventario.`);
      }
      currentItems.push({
        product_id: product.id,
        cantidad: quantity,
        product
      });
    }

    const total = currentItems.reduce((sum, item) => sum + (item.product ? item.product.precio * item.cantidad : 0), 0);
    set({ items: currentItems, total });
    localStorage.setItem('jaguar_cart', JSON.stringify(currentItems));
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const currentItems = get().items.map(item => {
      if (item.product_id === productId) {
        const stockLimit = item.product?.stock ?? 99;
        if (quantity > stockLimit) {
          throw new Error(`Límite de stock alcanzado: ${stockLimit} unidades.`);
        }
        return { ...item, cantidad: quantity };
      }
      return item;
    });

    const total = currentItems.reduce((sum, item) => sum + (item.product ? item.product.precio * item.cantidad : 0), 0);
    set({ items: currentItems, total });
    localStorage.setItem('jaguar_cart', JSON.stringify(currentItems));
  },
  removeFromCart: (productId) => {
    const currentItems = get().items.filter(item => item.product_id !== productId);
    const total = currentItems.reduce((sum, item) => sum + (item.product ? item.product.precio * item.cantidad : 0), 0);
    set({ items: currentItems, total });
    localStorage.setItem('jaguar_cart', JSON.stringify(currentItems));
  },
  clearCart: () => {
    set({ items: [], total: 0 });
    localStorage.removeItem('jaguar_cart');
  }
}));
