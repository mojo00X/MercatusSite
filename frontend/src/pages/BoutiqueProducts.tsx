import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBoutiqueProducts,
  deleteBoutiqueProduct,
} from "../api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

export default function BoutiqueProducts() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["boutique-products"],
    queryFn: getBoutiqueProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBoutiqueProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boutique-products"] });
      qc.invalidateQueries({ queryKey: ["boutique-stats"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} active product{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/boutique/products/new">
          <Button>+ New product</Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-600">
            You haven't added any products yet. Hit{" "}
            <span className="font-medium">+ New product</span> to list your first.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variants
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fulfillment
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((p) => {
                const primary =
                  p.images?.find((i) => i.is_primary) || p.images?.[0];
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {primary?.url ? (
                          <img
                            src={primary.url}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${p.base_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.variants?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.fulfillment_mode === "platform"
                        ? "Mirevi warehouse"
                        : "Self-ship"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        to={`/boutique/products/${p.id}/edit`}
                        className="text-sm text-gray-700 hover:text-black underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
