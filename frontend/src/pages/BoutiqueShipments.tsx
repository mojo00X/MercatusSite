import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBoutiqueShipments,
  markBoutiqueShipmentShipped,
} from "../api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";
import type { Shipment } from "../types";

const CARRIER_TRACKING_URLS: Record<string, (tn: string) => string> = {
  USPS: (tn) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`,
  UPS: (tn) => `https://www.ups.com/track?tracknum=${tn}`,
  FedEx: (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
  DHL: (tn) => `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${tn}`,
};

function ShipModal({
  shipment,
  onClose,
  onShipped,
}: {
  shipment: Shipment;
  onClose: () => void;
  onShipped: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("USPS");
  const [trackingUrl, setTrackingUrl] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      markBoutiqueShipmentShipped(shipment.id, {
        tracking_number: trackingNumber.trim(),
        carrier,
        tracking_url:
          trackingUrl.trim() ||
          CARRIER_TRACKING_URLS[carrier]?.(trackingNumber.trim()),
      }),
    onSuccess: () => {
      toast.success("Marked as shipped");
      onShipped();
      onClose();
    },
    onError: () => toast.error("Failed to mark as shipped"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Mark shipment #{shipment.id} as shipped
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Order #{shipment.order_id} · {shipment.items.length} item
            {shipment.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option>USPS</option>
              <option>UPS</option>
              <option>FedEx</option>
              <option>DHL</option>
              <option>Other</option>
            </select>
          </div>
          <Input
            label="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
          />
          <Input
            label="Tracking URL (optional)"
            placeholder="Leave blank to auto-generate"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!trackingNumber.trim()}
          >
            Mark shipped
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BoutiqueShipments() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Shipment | null>(null);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["boutique-shipments"],
    queryFn: getBoutiqueShipments,
  });

  if (isLoading) return <Spinner size="lg" />;

  const pending = shipments.filter((s) => s.status === "pending");
  const shipped = shipments.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Self-ship orders you're fulfilling.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Pending · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-500">
            Nothing to ship right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <ShipmentCard
                key={s.id}
                shipment={s}
                onShip={() => setActive(s)}
              />
            ))}
          </div>
        )}
      </section>

      {shipped.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Shipped · {shipped.length}
          </h2>
          <div className="space-y-3">
            {shipped.map((s) => (
              <ShipmentCard key={s.id} shipment={s} />
            ))}
          </div>
        </section>
      )}

      {active && (
        <ShipModal
          shipment={active}
          onClose={() => setActive(null)}
          onShipped={() =>
            qc.invalidateQueries({ queryKey: ["boutique-shipments"] })
          }
        />
      )}
    </div>
  );
}

function ShipmentCard({
  shipment,
  onShip,
}: {
  shipment: Shipment;
  onShip?: () => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              Shipment #{shipment.id}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                shipment.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {shipment.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Order #{shipment.order_id} ·{" "}
            {new Date(shipment.created_at).toLocaleDateString()}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            {shipment.items.map((it) => (
              <li key={it.id}>
                {it.quantity}× {it.product_name}
                {(it.size || it.color) && (
                  <span className="text-gray-500">
                    {" "}
                    · {[it.size, it.color].filter(Boolean).join(" / ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {shipment.status !== "pending" && shipment.tracking_number && (
            <p className="mt-3 text-xs text-gray-600">
              {shipment.carrier} · {shipment.tracking_number}
              {shipment.tracking_url && (
                <>
                  {" · "}
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-black underline"
                  >
                    Track
                  </a>
                </>
              )}
            </p>
          )}
        </div>
        {onShip && (
          <Button size="sm" onClick={onShip}>
            Mark shipped
          </Button>
        )}
      </div>
    </div>
  );
}
