import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListBrands,
  adminCreateBrand,
  adminUpdateBrand,
  adminDeleteBrand,
} from "../../api";
import { uploadImage } from "../../lib/cloudinary";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";
import type { Brand } from "../../types";

export default function BrandManager() {
  const qc = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: adminListBrands,
  });

  const [newName, setNewName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-brands"] });
    qc.invalidateQueries({ queryKey: ["brands"] });
  };

  const createMutation = useMutation({
    mutationFn: adminCreateBrand,
    onSuccess: () => {
      invalidate();
      setNewName("");
      setNewLogoUrl(null);
      toast.success("Brand created");
    },
    onError: () => toast.error("Failed to create brand"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; logo_url?: string | null };
    }) => adminUpdateBrand(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteBrand,
    onSuccess: () => {
      invalidate();
      toast.success("Brand deleted");
    },
    onError: () => toast.error("Failed to delete brand"),
  });

  const handleNewLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNew(true);
    try {
      const url = await uploadImage(file);
      setNewLogoUrl(url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingNew(false);
      e.target.value = "";
    }
  };

  const handleExistingLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    brandId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(brandId);
    try {
      const url = await uploadImage(file);
      updateMutation.mutate({ id: brandId, payload: { logo_url: url } });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  const handleRename = (brand: Brand) => {
    const next = window.prompt("New brand name", brand.name);
    if (!next || next.trim() === brand.name) return;
    updateMutation.mutate({ id: brand.id, payload: { name: next.trim() } });
  };

  const handleDelete = (brand: Brand) => {
    if (
      window.confirm(
        `Delete "${brand.name}"? Products assigned to this brand will be unassigned.`
      )
    ) {
      deleteMutation.mutate(brand.id);
    }
  };

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
      <p className="text-sm text-gray-500">
        Brands appear as a filter nested under each category on the storefront.
      </p>

      {/* New brand */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold">Add Brand</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Nike"
            />
          </div>
          <label className="cursor-pointer">
            <span className="inline-block px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50">
              {uploadingNew ? "Uploading..." : newLogoUrl ? "Replace Logo" : "Upload Logo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleNewLogo}
              disabled={uploadingNew}
            />
          </label>
          <Button
            type="button"
            onClick={() =>
              createMutation.mutate({
                name: newName.trim(),
                logo_url: newLogoUrl,
              })
            }
            disabled={!newName.trim() || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </div>
        {newLogoUrl && (
          <div className="flex items-center gap-3">
            <img
              src={newLogoUrl}
              alt="New brand logo preview"
              className="w-16 h-16 object-contain border rounded"
            />
            <button
              type="button"
              onClick={() => setNewLogoUrl(null)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Existing brands */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white border rounded-lg p-4 space-y-3"
          >
            <div className="relative aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-gray-400 text-sm">No logo</div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{brand.name}</p>
              <p className="text-xs text-gray-500">{brand.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer flex-1 min-w-[120px]">
                <span className="block text-center px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                  {uploadingId === brand.id ? "Uploading..." : "Change Logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleExistingLogo(e, brand.id)}
                  disabled={uploadingId === brand.id}
                />
              </label>
              <button
                onClick={() => handleRename(brand)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(brand)}
                className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {brands.length === 0 && (
          <p className="col-span-full text-sm text-gray-500 italic">
            No brands yet — add one above.
          </p>
        )}
      </div>
    </div>
  );
}
