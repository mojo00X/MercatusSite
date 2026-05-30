import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBoutiqueOnboardingLink } from "../api";
import Spinner from "../components/ui/Spinner";

export default function BoutiqueOnboardingRefresh() {
  const navigate = useNavigate();

  useEffect(() => {
    // Stripe lands here if the onboarding link expired or the user bounced
    // before finishing. We mint a fresh one and forward.
    (async () => {
      try {
        const { url } = await getBoutiqueOnboardingLink();
        window.location.href = url;
      } catch {
        navigate("/boutique/dashboard");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600">Reconnecting to Stripe…</p>
      </div>
    </div>
  );
}
