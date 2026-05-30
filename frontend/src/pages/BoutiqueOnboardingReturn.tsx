import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshBoutiqueStatus } from "../api";
import Spinner from "../components/ui/Spinner";

export default function BoutiqueOnboardingReturn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "incomplete" | "done">(
    "loading"
  );

  useEffect(() => {
    (async () => {
      try {
        const b = await refreshBoutiqueStatus();
        if (b.stripe_charges_enabled && b.stripe_details_submitted) {
          setStatus("done");
          setTimeout(() => navigate("/boutique/dashboard"), 1200);
        } else {
          setStatus("incomplete");
        }
      } catch {
        setStatus("incomplete");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        {status === "loading" && (
          <>
            <Spinner size="lg" />
            <p className="text-gray-600">Confirming with Stripe…</p>
          </>
        )}
        {status === "done" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              You're all set
            </h1>
            <p className="text-gray-600">
              Payment setup is complete. Sending you to your dashboard…
            </p>
          </>
        )}
        {status === "incomplete" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Almost there
            </h1>
            <p className="text-gray-600">
              Stripe needs a few more details before we can route payouts to
              you. You can finish later from your dashboard.
            </p>
            <button
              onClick={() => navigate("/boutique/dashboard")}
              className="mt-2 px-5 py-2 bg-black text-white rounded-md"
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
