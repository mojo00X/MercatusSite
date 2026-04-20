import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrder } from "../api/orders";
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

const statusSteps = ["pending", "paid", "processing", "shipped", "delivered"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Order #{order.id}
        </h1>
        <Badge color={statusColors[order.status] || "gray"}>
          {order.status}
        </Badge>
      </div>

      {/* Status Timeline */}
      {order.status !== "cancelled" && (
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= currentStep
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < currentStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="mt-2 text-xs text-gray-600 capitalize">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Items</h2>
          <div className="border rounded-lg divide-y">
            {order.items?.map((item) => (
              <div key={item.id} className="p-4 flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.product_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Size: {item.size} / Color: {item.color} / Qty: {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span>
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {order.shipping_address && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="font-semibold mb-3">Shipping Address</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{order.shipping_address}</p>
                <p>
                  {order.shipping_city}, {order.shipping_state}{" "}
                  {order.shipping_zip}
                </p>
                <p>{order.shipping_country}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
