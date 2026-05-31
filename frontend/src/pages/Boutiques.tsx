import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBoutiques } from "../api";
import Spinner from "../components/ui/Spinner";

export default function Boutiques() {
  const { data: boutiques = [], isLoading } = useQuery({
    queryKey: ["public-boutiques"],
    queryFn: () => getPublicBoutiques(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Boutiques</h1>
        <p className="text-sm text-gray-500 mt-2">
          Shop directly from independent boutiques on Mirevi.
        </p>
      </div>

      {isLoading ? (
        <Spinner className="py-16" />
      ) : boutiques.length === 0 ? (
        <p className="text-gray-600">No boutiques yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boutiques.map((b) => (
            <Link
              key={b.id}
              to={`/boutiques/${b.slug}`}
              className="group bg-white border rounded-lg overflow-hidden hover:shadow-md transition"
            >
              <div className="relative aspect-[5/2] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {b.banner_url ? (
                  <img
                    src={b.banner_url}
                    alt={`${b.name} banner`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-5 flex items-start gap-4">
                <div className="w-14 h-14 -mt-12 bg-white border rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={`${b.name} logo`}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No logo</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {b.name}
                  </h2>
                  {b.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {b.bio}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
