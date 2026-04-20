import { Link } from "react-router-dom";
import type { Product } from "../../types";
import Badge from "../ui/Badge";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.url || "https://placehold.co/400x500/f3f4f6/9ca3af?text=No+Image";

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {product.category && (
          <div className="absolute top-3 left-3">
            <Badge color="gray">{product.category.name}</Badge>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors truncate">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-black">
          ${product.base_price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
