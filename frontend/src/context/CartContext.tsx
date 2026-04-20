import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Cart, CartItem } from "../types";
import * as cartApi from "../api/cart";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

function getSessionId(): string {
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem("session_id", sid);
  }
  return sid;
}

interface CartContextType {
  cart: Cart | null;
  items: CartItem[];
  loading: boolean;
  addToCart: (variantId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  cartCount: number;
  cartTotal: number;
  refreshCart: () => Promise<void>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();

  // Ensure session_id exists for guests
  useEffect(() => {
    if (!user) getSessionId();
  }, [user]);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const c = await cartApi.getCart();
      setCart(c);
    } catch {
      // cart may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart, user]);

  // Merge cart on login
  useEffect(() => {
    if (user) {
      cartApi.mergeCart().then(setCart).catch(() => {});
    }
  }, [user]);

  const addToCart = useCallback(
    async (variantId: number, quantity: number) => {
      try {
        const c = await cartApi.addToCart(variantId, quantity);
        setCart(c);
        toast.success("Added to cart");
        setDrawerOpen(true);
      } catch {
        toast.error("Failed to add to cart");
      }
    },
    []
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      try {
        const c = await cartApi.updateCartItem(itemId, quantity);
        setCart(c);
      } catch {
        toast.error("Failed to update quantity");
      }
    },
    []
  );

  const removeItem = useCallback(async (itemId: number) => {
    try {
      const c = await cartApi.removeCartItem(itemId);
      setCart(c);
      toast.success("Removed from cart");
    } catch {
      toast.error("Failed to remove item");
    }
  }, []);

  const items = cart?.items ?? [];
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        cartCount,
        cartTotal,
        refreshCart,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
