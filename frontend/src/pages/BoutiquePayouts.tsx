import { useQuery } from "@tanstack/react-query";
import {
  getMyBoutique,
  getBoutiqueDashboardLink,
  getBoutiqueOnboardingLink,
} from "../api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

export default function BoutiquePayouts() {
  const { data: boutique, isLoading } = useQuery({
    queryKey: ["my-boutique"],
    queryFn: getMyBoutique,
  });

  if (isLoading) return <Spinner size="lg" />;
  if (!boutique) return <p>Boutique not found.</p>;

  const fullyOnboarded =
    boutique.stripe_charges_enabled && boutique.stripe_details_submitted;

  const openStripe = async () => {
    try {
      const { url } = await getBoutiqueDashboardLink();
      window.open(url, "_blank");
    } catch {
      toast.error("Could not open Stripe");
    }
  };

  const continueOnboarding = async () => {
    try {
      const { url } = await getBoutiqueOnboardingLink();
      window.location.href = url;
    } catch {
      toast.error("Could not open Stripe");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Payouts go through Stripe Connect — no manual requests needed.
        </p>
      </div>

      {fullyOnboarded ? (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold">Stripe Express dashboard</h2>
          <p className="text-sm text-gray-600">
            View your current balance, payout schedule, completed payouts, tax
            forms, and update your bank info directly in Stripe.
          </p>
          <Button onClick={openStripe}>Open Stripe dashboard</Button>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-3">
          <h2 className="font-semibold text-yellow-900">
            Finish payment setup
          </h2>
          <p className="text-sm text-yellow-800">
            You need to finish Stripe Connect onboarding before payouts can
            reach your bank account.
          </p>
          <Button onClick={continueOnboarding}>Continue setup</Button>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6 space-y-3 text-sm text-gray-600">
        <h2 className="text-base font-semibold text-gray-900">How payouts work</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            When a customer buys one of your products, Stripe automatically
            splits the payment — your share minus the Mirevi platform fee goes
            to your connected Stripe account.
          </li>
          <li>
            Stripe deposits your balance to your bank on a rolling schedule
            (default 2 business days). You can view and adjust this in the
            Stripe dashboard.
          </li>
          <li>
            Stripe handles your tax forms (1099-K in the US) at year end.
          </li>
        </ul>
      </div>
    </div>
  );
}
