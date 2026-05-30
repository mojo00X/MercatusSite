import { useQuery } from "@tanstack/react-query";
import {
  getMyBoutique,
  getBoutiqueOnboardingLink,
  getBoutiqueDashboardLink,
  getBoutiqueStats,
} from "../api";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function BoutiqueDashboard() {
  const { data: boutique, isLoading: loadingBoutique } = useQuery({
    queryKey: ["my-boutique"],
    queryFn: getMyBoutique,
  });

  const { data: stats } = useQuery({
    queryKey: ["boutique-stats"],
    queryFn: getBoutiqueStats,
    // Stats only meaningful once Stripe is connected and they can take orders.
    enabled: !!boutique?.stripe_charges_enabled,
  });

  if (loadingBoutique) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!boutique) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-600">Boutique not found.</p>
      </div>
    );
  }

  const fullyOnboarded =
    boutique.stripe_charges_enabled && boutique.stripe_details_submitted;

  const continueOnboarding = async () => {
    try {
      const { url } = await getBoutiqueOnboardingLink();
      window.location.href = url;
    } catch {
      toast.error("Could not open Stripe right now");
    }
  };

  const openStripeDashboard = async () => {
    try {
      const { url } = await getBoutiqueDashboardLink();
      window.open(url, "_blank");
    } catch {
      toast.error("Stripe dashboard isn't available yet");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{boutique.name}</h1>
        <p className="text-sm text-gray-500 mt-1">/boutiques/{boutique.slug}</p>
      </div>

      {!fullyOnboarded && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-start gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-yellow-900">
              Finish payment setup
            </h2>
            <p className="text-sm text-yellow-800 mt-1">
              Stripe still needs a few details before we can accept payments
              and pay you out.
            </p>
          </div>
          <Button onClick={continueOnboarding}>Continue setup</Button>
        </div>
      )}

      {fullyOnboarded && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-green-900">
            Payments are live. Payouts go out on Stripe's schedule.
          </p>
          <Button variant="secondary" size="sm" onClick={openStripeDashboard}>
            Open Stripe dashboard
          </Button>
        </div>
      )}

      {fullyOnboarded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Revenue"
            value={`$${(stats?.total_revenue ?? 0).toFixed(2)}`}
            hint="Your share, all time"
          />
          <StatCard
            label="Orders"
            value={String(stats?.total_orders ?? 0)}
            hint={`${stats?.recent_orders ?? 0} this week`}
          />
          <StatCard
            label="Active products"
            value={String(stats?.total_products ?? 0)}
          />
          <StatCard
            label="Low stock"
            value={String(stats?.low_stock_count ?? 0)}
            hint="Variants under 10"
          />
        </div>
      )}
    </div>
  );
}
