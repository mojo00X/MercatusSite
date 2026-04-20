import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../api/products";
import { useCart } from "../context/CartContext";
import SizeSelector from "../components/product/SizeSelector";
import ColorSelector from "../components/product/ColorSelector";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug!),
    enabled: !!slug,
  });

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const availableSizes = useMemo(() => {
    if (!product) return [];
    let variants = product.variants;
    if (selectedColor) {
      variants = variants.filter((v) => v.color === selectedColor);
    }
    return [...new Set(variants.filter((v) => v.stock_quantity > 0).map((v) => v.size))];
  }, [product, selectedColor]);

  const colorOptions = useMemo(() => {
    if (!product) return [];
    const colorMap = new Map<string, { color_hex: string; available: boolean }>();
    for (const v of product.variants) {
      const existing = colorMap.get(v.color);
      const matchesSize = !selectedSize || v.size === selectedSize;
      const available = matchesSize && v.stock_quantity > 0;
      if (!existing) {
        colorMap.set(v.color, { color_hex: v.color_hex, available });
      } else if (available) {
        existing.available = true;
      }
    }
    return Array.from(colorMap.entries()).map(([color, info]) => ({
      color,
      ...info,
    }));
  }, [product, selectedSize]);

  const selectedVariant = useMemo(() => {
    if (!product || !selectedSize || !selectedColor) return null;
    return product.variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    );
  }, [product, selectedSize, selectedColor]);

  const handleAddToCart = () => {
    if (selectedVariant) {
      addToCart(selectedVariant.id, quantity);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images.sort((a, b) => a.sort_order - b.sort_order)
    : [{ id: 0, url: "https://placehold.co/600x800/f3f4f6/9ca3af?text=No+Image", alt_text: "No image", is_primary: true, sort_order: 0 }];

  const price = selectedVariant?.price_override ?? product.base_price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
            <img
              src={images[activeImage]?.url}
              alt={images[activeImage]?.alt_text || product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    i === activeImage ? "border-black" : "border-transparent"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text || ""}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {product.category && (
            <Badge color="gray">{product.category.name}</Badge>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-900">
            ${price.toFixed(2)}
          </p>

          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {product.material && (
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Material:</span>{" "}
              {product.material}
            </p>
          )}

          <SizeSelector
            availableSizes={availableSizes}
            selected={selectedSize}
            onSelect={setSelectedSize}
          />

          <ColorSelector
            colors={colorOptions}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />

          {/* Stock indicator */}
          {selectedVariant && (
            <p
              className={`text-sm font-medium ${
                selectedVariant.stock_quantity > 10
                  ? "text-green-600"
                  : selectedVariant.stock_quantity > 0
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {selectedVariant.stock_quantity > 10
                ? "In Stock"
                : selectedVariant.stock_quantity > 0
                ? `Only ${selectedVariant.stock_quantity} left`
                : "Out of Stock"}
            </p>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-gray-600 hover:text-black"
              >
                -
              </button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 text-gray-600 hover:text-black"
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock_quantity === 0}
            >
              {!selectedSize || !selectedColor
                ? "Select Size & Color"
                : selectedVariant?.stock_quantity === 0
                ? "Out of Stock"
                : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
