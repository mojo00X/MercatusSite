import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListCategories, adminUpdateCategoryImage } from "../../api";
import { uploadImage } from "../../lib/cloudinary";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function CategoryManager() {
  const qc = useQueryClient();
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: adminListCategories,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, url }: { id: number; url: string | null }) =>
      adminUpdateCategoryImage(id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Saved");
    },
    onError: () => toast.error("Save failed"),
  });

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(categoryId);
    try {
      const url = await uploadImage(file);
      updateMutation.mutate({ id: categoryId, url });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Category Images</h1>
      <p className="text-sm text-gray-500">
        Upload a square-ish image per category. These show on the homepage.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white border rounded-lg p-4 space-y-3"
          >
            <div className="relative aspect-square bg-gray-100 rounded overflow-hidden">
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-500">{cat.slug}</p>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer flex-1">
                <span className="block text-center px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                  {uploadingId === cat.id ? "Uploading..." : "Change Image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e, cat.id)}
                  disabled={uploadingId === cat.id}
                />
              </label>
              {cat.image_url && (
                <button
                  onClick={() =>
                    updateMutation.mutate({ id: cat.id, url: null })
                  }
                  className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
