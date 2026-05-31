import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBoutique, getProducts } from "../api";
import ProductGrid from "../components/product/ProductGrid";
import Spinner from "../components/ui/Spinner";

export default function BoutiqueStorefront() {
  const { slug } = useParams<{ slug: string }>();

  const { data: boutique, isLoading: loadingBoutique } = useQuery({
    queryKey: ["public-boutique", slug],
    queryFn: () => getPublicBoutique(slug!),
    enabled: !!slug,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["public-boutique-products", slug],
    queryFn: () => getProducts({ boutique: slug, per_page: 60 }),
    enabled: !!slug,
  });

  if (loadingBoutique) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!boutique) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Boutique not found</h1>
        <Link
          to="/boutiques"
          className="inline-block mt-4 text-sm text-gray-600 hover:text-black underline"
        >
          Back to all boutiques
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Banner */}
      <div className="relative aspect-[5/1] sm:aspect-[6/1] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {boutique.banner_url ? (
          <img
            src={boutique.banner_url}
            alt={`${boutique.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end gap-5 -mt-12 pb-8 border-b border-gray-200">
          <div className="w-24 h-24 bg-white border-2 border-white rounded-full overflow-hidden flex items-center justify-center shadow-md flex-shrink-0">
            {boutique.logo_url ? (
              <img
                src={boutique.logo_url}
                alt={`${boutique.name} logo`}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {boutique.name}
            </h1>
            {boutique.bio && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl">
                {boutique.bio}
              </p>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            {products && (
              <p className="text-sm text-gray-500">
                {products.total} item{products.total === 1 ? "" : "s"}
              </p>
            )}
          </div>
          {loadingProducts ? (
            <Spinner className="py-16" />
          ) : products?.items.length === 0 ? (
            <p className="text-gray-600">
              {boutique.name} hasn't listed any products yet.
            </p>
          ) : (
            <ProductGrid products={products?.items || []} />
          )}
        </div>
      </div>
    </div>
  );
}
