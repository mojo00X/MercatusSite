import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminVariants, updateVariantStock } from "../../api";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function InventoryManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState(0);

  const { data: variants, isLoading } = useQuery({
    queryKey: ["admin", "variants"],
    queryFn: getAdminVariants,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      updateVariantStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "variants"] });
      toast.success("Stock updated");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const startEdit = (id: number, currentStock: number) => {
    setEditingId(id);
    setEditStock(currentStock);
  };

  const saveEdit = (id: number) => {
    updateMutation.mutate({ id, stock: editStock });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">SKU</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Product</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Size</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Color</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Stock</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants?.map((v: any) => {
              const isLow = v.stock_quantity > 0 && v.stock_quantity <= 10;
              const isOut = v.stock_quantity === 0;
              return (
                <tr key={v.id} className={`hover:bg-gray-50 ${isOut ? "bg-red-50/50" : isLow ? "bg-yellow-50/50" : ""}`}>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {v.sku}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {v.product_name || `Product #${v.product_id}`}
                  </td>
                  <td className="px-6 py-4">{v.size}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: v.color_hex }}
                      />
                      {v.color}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === v.id ? (
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                        min={0}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{v.stock_quantity}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      color={isOut ? "red" : isLow ? "yellow" : "green"}
                    >
                      {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === v.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveEdit(v.id)}
                          className="text-sm font-medium text-green-600 hover:text-green-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(v.id, v.stock_quantity)}
                        className="text-sm font-medium text-gray-600 hover:text-black"
                      >
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!variants || variants.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No variants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
