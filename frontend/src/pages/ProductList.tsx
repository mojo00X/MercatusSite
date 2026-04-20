import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories } from "../api/products";
import ProductGrid from "../components/product/ProductGrid";
import FilterPanel from "../components/product/FilterPanel";
import Spinner from "../components/ui/Spinner";

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    category: searchParams.get("category") || undefined,
    gender: searchParams.get("gender") || undefined,
    size: searchParams.get("size") || undefined,
    color: searchParams.get("color") || undefined,
    min_price: searchParams.get("min_price")
      ? Number(searchParams.get("min_price"))
      : undefined,
    max_price: searchParams.get("max_price")
      ? Number(searchParams.get("max_price"))
      : undefined,
    search: searchParams.get("search") || undefined,
    page: Number(searchParams.get("page")) || 1,
    per_page: 12,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <FilterPanel categories={categories} />
        </div>

        {/* Main */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              {data && (
                <p className="text-sm text-gray-500 mt-1">
                  {data.total} result{data.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {isLoading ? (
            <Spinner className="py-16" />
          ) : (
            <>
              <ProductGrid products={data?.items || []} />

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    onClick={() => goToPage(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          page === filters.page
                            ? "bg-black text-white"
                            : "text-gray-700 bg-white border hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => goToPage(filters.page + 1)}
                    disabled={filters.page >= data.pages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
