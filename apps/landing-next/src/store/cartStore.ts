import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // ID único generado (producto_id + variante_id)
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
  color?: string;
  size?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (newItem) => set((state) => {
        // Buscamos si ya existe EXACTAMENTE la misma variante en el carrito
        const existingItem = state.items.find(item => item.id === newItem.id);
        
        if (existingItem) {
          // Si existe, solo sumamos la cantidad
          return {
            items: state.items.map(item =>
              item.id === newItem.id 
                ? { ...item, quantity: item.quantity + newItem.quantity } 
                : item
            )
          };
        }
        // Si es nuevo, lo agregamos al array
        return { items: [...state.items, newItem] };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),

      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      
      getTotalPrice: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
    }),
    {
      name: 'aether-cart-storage', // Nombre clave en el localStorage
    }
  )
);