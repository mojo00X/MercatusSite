import type { CartItem as CartItemType } from "../../types";
import { useCart } from "../../context/CartContext";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItemRow({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const imageUrl =
    item.product?.images?.find((i) => i.is_primary)?.url ||
    item.product?.images?.[0]?.url ||
    "https://placehold.co/80x80/f3f4f6/9ca3af?text=Item";

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100">
      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={item.product?.name || "Product"}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {item.product?.name || "Product"}
        </h4>
        <div className="mt-0.5 text-xs text-gray-500 space-x-2">
          {item.variant?.size && <span>Size: {item.variant.size}</span>}
          {item.variant?.color && <span>Color: {item.variant.color}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center border border-gray-200 rounded-md">
            <button
              onClick={() =>
                item.quantity > 1
                  ? updateQuantity(item.id, item.quantity - 1)
                  : removeItem(item.id)
              }
              className="px-2 py-1 text-sm text-gray-600 hover:text-black"
            >
              -
            </button>
            <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="px-2 py-1 text-sm text-gray-600 hover:text-black"
            >
              +
            </button>
          </div>
          <span className="text-sm font-medium">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
      <button
        onClick={() => removeItem(item.id)}
        className="self-start p-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Remove item"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
