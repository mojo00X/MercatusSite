import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories } from "../api";
import ProductGrid from "../components/product/ProductGrid";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";

export default function Home() {
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getProducts({ per_page: 8 }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-4">
              New Season Arrivals
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Shop the Latest Collection
            </h1>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              Discover curated fashion pieces designed for the modern wardrobe.
              Premium materials, timeless style.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/products">
                <Button size="lg">Shop Now</Button>
              </Link>
              <Link to="/products?sort=newest">
                <Button variant="secondary" size="lg" className="!bg-transparent !text-white !border-white hover:!bg-white hover:!text-black">
                  Newest Arrivals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold tracking-wide">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link
            to="/products"
            className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            View All &rarr;
          </Link>
        </div>
        {loadingProducts ? (
          <Spinner className="py-16" />
        ) : (
          <ProductGrid products={productsData?.items || []} />
        )}
      </section>

      {/* Banner */}
      <section className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Free Shipping on Orders Over $100
          </h2>
          <p className="mt-3 text-gray-600">
            Plus easy returns within 30 days. No questions asked.
          </p>
          <Link to="/products" className="inline-block mt-6">
            <Button size="lg">Browse Collection</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
