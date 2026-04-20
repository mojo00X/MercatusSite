import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";

export default function CartSummary() {
  const { cartTotal, cartCount } = useCart();
  const navigate = useNavigate();
  const shipping = cartTotal > 100 ? 0 : 9.99;
  const total = cartTotal + shipping;

  return (
    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({cartCount} items)</span>
          <span className="font-medium">${cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        {shipping > 0 && (
          <p className="text-xs text-gray-500">
            Free shipping on orders over $100
          </p>
        )}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <Button
        onClick={() => navigate("/checkout")}
        className="w-full"
        size="lg"
        disabled={cartCount === 0}
      >
        Proceed to Checkout
      </Button>
    </div>
  );
}
