import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
} from "../../api";
import { uploadImage } from "../../lib/cloudinary";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";
import type { Collection } from "../../types";

const empty: Partial<Collection> = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "/products",
  button_text: "Shop Now",
  sort_order: 0,
  is_active: true,
};

export default function CollectionManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Collection> | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: adminListCollections,
  });

  const saveMutation = useMutation({
    mutationFn: async (c: Partial<Collection>) => {
      if (c.id) return adminUpdateCollection(c.id, c);
      return adminCreateCollection(c);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection saved");
      setEditing(null);
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Deleted");
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setEditing({ ...editing, image_url: url });
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Slideshow Collections</h1>
        {!editing && (
          <Button onClick={() => setEditing({ ...empty })}>New Collection</Button>
        )}
      </div>

      {editing && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editing.id ? "Edit Collection" : "New Collection"}
          </h2>
          <Input
            label="Title"
            value={editing.title || ""}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              value={editing.subtitle || ""}
              onChange={(e) =>
                setEditing({ ...editing, subtitle: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Link URL"
              value={editing.link_url || ""}
              onChange={(e) =>
                setEditing({ ...editing, link_url: e.target.value })
              }
              placeholder="/products?category=tops"
            />
            <Input
              label="Button Text"
              value={editing.button_text || ""}
              onChange={(e) =>
                setEditing({ ...editing, button_text: e.target.value })
              }
              placeholder="Shop Now"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sort Order"
              type="number"
              value={String(editing.sort_order ?? 0)}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  sort_order: parseInt(e.target.value) || 0,
                })
              }
            />
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) =>
                  setEditing({ ...editing, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <label className="cursor-pointer inline-block">
              <span className="inline-flex items-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                {uploading ? "Uploading..." : "Upload Image"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
            {editing.image_url && (
              <img
                src={editing.image_url}
                alt="Preview"
                className="mt-3 w-full max-w-lg h-48 object-cover rounded-md border"
              />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => saveMutation.mutate(editing)}
              loading={saveMutation.isPending}
              disabled={!editing.title || !editing.image_url}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {collections.map((c) => (
          <div
            key={c.id}
            className="bg-white border rounded-lg p-4 flex items-center gap-4"
          >
            <img
              src={c.image_url}
              alt={c.title}
              className="w-28 h-20 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{c.title}</p>
              <p className="text-sm text-gray-500 truncate">{c.subtitle}</p>
              <p className="text-xs text-gray-400 mt-1">
                Order #{c.sort_order} · {c.is_active ? "Active" : "Hidden"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(c)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm(`Delete "${c.title}"?`)) {
                    deleteMutation.mutate(c.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {collections.length === 0 && !editing && (
          <p className="text-gray-500 text-center py-8">
            No collections yet. Click "New Collection" above.
          </p>
        )}
      </div>
    </div>
  );
}
