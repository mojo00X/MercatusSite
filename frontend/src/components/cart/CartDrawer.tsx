import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import CartItemRow from "./CartItem";
import Button from "../ui/Button";

export default function CartDrawer() {
  const { drawerOpen, setDrawerOpen, items, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              Shopping Bag ({cartCount})
            </h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="mt-4 text-gray-500">Your bag is empty</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate("/products");
                  }}
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              items.map((item) => <CartItemRow key={item.id} item={item} />)
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t px-6 py-4 space-y-3">
              <div className="flex justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">
                Shipping and taxes calculated at checkout.
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate("/checkout");
                }}
              >
                Checkout
              </Button>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  navigate("/cart");
                }}
                className="w-full text-center text-sm text-gray-600 hover:text-black underline"
              >
                View Full Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
