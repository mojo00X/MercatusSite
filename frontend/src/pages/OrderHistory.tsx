import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getOrders } from "../api";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";

const statusColors: Record<string, "gray" | "green" | "red" | "yellow" | "blue" | "purple"> = {
  pending: "yellow",
  paid: "blue",
  processing: "purple",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

export default function OrderHistory() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No orders yet</p>
          <Link
            to="/products"
            className="mt-4 inline-block text-sm font-medium text-black underline"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white border rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Order #{order.id}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge color={statusColors[order.status] || "gray"}>
                    {order.status}
                  </Badge>
                  <p className="mt-1 text-sm font-semibold">
                    ${(order.total_amount ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                {order.items?.length || 0} item
                {(order.items?.length || 0) !== 1 ? "s" : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
