import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyBoutique, updateMyBoutique } from "../api";
import { uploadImage } from "../lib/cloudinary";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

export default function BoutiqueSettings() {
  const qc = useQueryClient();
  const { data: boutique, isLoading } = useQuery({
    queryKey: ["my-boutique"],
    queryFn: getMyBoutique,
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (boutique) {
      setName(boutique.name);
      setBio(boutique.bio || "");
      setLogoUrl(boutique.logo_url || null);
      setBannerUrl(boutique.banner_url || null);
    }
  }, [boutique]);

  const mutation = useMutation({
    mutationFn: updateMyBoutique,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-boutique"] });
      toast.success("Saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (kind === "logo") setLogoUrl(url);
      else setBannerUrl(url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, bio, logo_url: logoUrl, banner_url: bannerUrl });
  };

  if (isLoading) return <Spinner size="lg" />;
  if (!boutique) return <p>Boutique not found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Storefront branding and bio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <Input
            label="Boutique name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <span className="inline-block px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                  {uploadingLogo ? "Uploading..." : "Upload logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e, "logo")}
                  disabled={uploadingLogo}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold">Banner</h2>
          <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">No banner</span>
            )}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <span className="inline-block px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                {uploadingBanner ? "Uploading..." : "Upload banner"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoUpload(e, "banner")}
                disabled={uploadingBanner}
              />
            </label>
            {bannerUrl && (
              <button
                type="button"
                onClick={() => setBannerUrl(null)}
                className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <Button type="submit" loading={mutation.isPending}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
