import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllOrders, updateOrderStatus } from "../../api";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import type { Order } from "../../types";

const statusColors: Record<string, "gray" | "green" | "red" | "yellow" | "blue" | "purple"> = {
  pending: "yellow",
  paid: "blue",
  processing: "purple",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

const ALL_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

export default function OrderManager() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", filterStatus],
    queryFn: () =>
      getAllOrders(filterStatus ? { status: filterStatus } : undefined),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Order status updated");
      setSelectedOrder(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("")}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            !filterStatus
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full capitalize transition-colors ${
              filterStatus === s
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner className="py-16" />
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Order
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Items
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items?.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">#{order.id}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {order.items?.length || 0}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    ${(order.total_amount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={statusColors[order.status] || "gray"}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openStatusModal(order)}
                      className="text-sm font-medium text-gray-600 hover:text-black"
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Status update modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Update Order #${selectedOrder?.id}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setSelectedOrder(null)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                selectedOrder &&
                statusMutation.mutate({
                  id: selectedOrder.id,
                  status: newStatus,
                })
              }
              className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800"
            >
              Update
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
