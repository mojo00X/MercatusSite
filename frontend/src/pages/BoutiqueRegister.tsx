import { useState } from "react";
import { Link } from "react-router-dom";
import { registerBoutique } from "../api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import toast from "react-hot-toast";

export default function BoutiqueRegister() {
  const [boutiqueName, setBoutiqueName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const res = await registerBoutique({
        email,
        password,
        full_name: name,
        boutique_name: boutiqueName,
        bio: bio || undefined,
      });

      // Save the access token so the boutique is signed in when they return
      // from Stripe onboarding.
      localStorage.setItem("token", res.access_token);

      if (res.onboarding_url) {
        toast.success("Account created! Redirecting to Stripe to finish setup…");
        // Send them straight to Stripe Connect Express onboarding. They'll
        // return to /boutique/onboarding/return when done.
        window.location.href = res.onboarding_url;
      } else {
        // Stripe setup failed during signup — they can still sign in and
        // retry from the dashboard.
        toast.success(
          "Account created. We couldn't reach Stripe — finish payment setup from your dashboard."
        );
        window.location.href = "/boutique/dashboard";
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sell on Mirevi</h1>
          <p className="mt-2 text-gray-600">
            Open your boutique. Set up payments in 5 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border-b pb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Your boutique
            </h2>
            <Input
              label="Boutique name"
              value={boutiqueName}
              onChange={(e) => setBoutiqueName(e.target.value)}
              placeholder="e.g. Style Lounge"
              required
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio (optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="What makes your boutique special?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Owner account
            </h2>
            <Input
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
            <div className="mt-3">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="mt-3">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                error={errors.password}
                required
              />
            </div>
            <div className="mt-3">
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                error={errors.confirmPassword}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Continue to Stripe setup
          </Button>
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Next: Stripe will collect your business info and bank details so we
            can pay you out automatically when your products sell.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have a boutique account?{" "}
          <Link to="/login" className="font-medium text-black hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
