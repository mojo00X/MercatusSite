import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  adminListBrands,
} from "../../api";
import { uploadImage } from "../../lib/cloudinary";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";
import type { ProductVariant } from "../../types";

interface VariantRow {
  id?: number;
  size: string;
  color: string;
  color_hex: string;
  stock: number;
  price_override: string;
  sku: string;
}

const emptyVariant: VariantRow = {
  size: "M",
  color: "",
  color_hex: "#000000",
  stock: 0,
  price_override: "",
  sku: "",
};

// Curated palette so variants can't accidentally save a named color with a
// stale #000000 hex. Click a swatch to fill both `color` and `color_hex`; the
// manual fields stay editable for anything outside the preset list.
const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Grey", hex: "#808080" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Navy", hex: "#000080" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Royal Blue", hex: "#4169E1" },
  { name: "Teal", hex: "#008080" },
  { name: "Sage", hex: "#9CAF88" },
  { name: "Olive", hex: "#708238" },
  { name: "Forest", hex: "#228B22" },
  { name: "Red", hex: "#C8102E" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Blush", hex: "#DE5D83" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Mustard", hex: "#FFDB58" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Sand", hex: "#C2B280" },
  { name: "Khaki", hex: "#C3B091" },
  { name: "Brown", hex: "#8B4513" },
  { name: "Light Wash", hex: "#B5C7D3" },
  { name: "Indigo", hex: "#3F0FB7" },
];

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product-edit", id],
    queryFn: () => getProduct(id!),
    enabled: !!isEdit,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: adminListBrands,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [gender, setGender] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [condition, setCondition] = useState<"new" | "preowned">("new");
  const [isActive, setIsActive] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(String(product.base_price));
      setMaterial(product.material || "");
      setGender(product.gender || "");
      setCategoryId(String(product.category_id || ""));
      setBrandId(product.brand_id ? String(product.brand_id) : "");
      setCondition(product.condition === "preowned" ? "preowned" : "new");
      setIsActive(product.is_active);
      setImageUrls(
        (product.images || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => img.url)
      );
      if (product.variants?.length) {
        setVariants(
          product.variants.map((v: ProductVariant) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            color_hex: v.color_hex,
            stock: v.stock_quantity,
            price_override: v.price_override ? String(v.price_override) : "",
            sku: v.sku,
          }))
        );
      }
    }
  }, [product]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadImage));
      setImageUrls((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const addVariant = () => setVariants([...variants, { ...emptyVariant }]);

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string | number) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const applyPreset = (index: number, preset: { name: string; hex: string }) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], color: preset.name, color_hex: preset.hex };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        name,
        description,
        base_price: parseFloat(price),
        material,
        gender,
        category_id: categoryId ? parseInt(categoryId) : null,
        brand_id: brandId ? parseInt(brandId) : null,
        condition,
        is_active: isActive,
        images: imageUrls.map((url, i) => ({
          url,
          is_primary: i === 0,
          sort_order: i,
        })),
        variants: variants.map((v) => ({
          ...v,
          stock_quantity: Number(v.stock),
          price_override: v.price_override ? parseFloat(v.price_override) : null,
        })),
      };

      if (isEdit) {
        await updateProduct(Number(id), payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product created");
      }
      navigate("/admin/products");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Failed to save product";
      toast.error(
        typeof detail === "string" ? detail : "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? "Edit Product" : "New Product"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic info */}
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
            <Input
              label="Material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Select</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as "new" | "preowned")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="new">New</option>
                <option value="preowned">Pre-Owned</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Images */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Images</h2>
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                {uploading ? "Uploading..." : "Upload Images"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            First image is the primary. Upload multiple at once.
          </p>
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {imageUrls.map((url, i) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt={`Product image ${i + 1}`}
                    className="w-full h-40 object-cover rounded-md border"
                  />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-black text-white rounded">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white border rounded-full text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Variants</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
              Add Variant
            </Button>
          </div>
          <div className="space-y-4">
            {variants.map((v, i) => {
              const presetMatch = COLOR_PRESETS.find(
                (p) => p.hex.toLowerCase() === (v.color_hex || "").toLowerCase()
              );
              return (
                <div
                  key={i}
                  className="p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Size
                      </label>
                      <select
                        value={v.size}
                        onChange={(e) => updateVariant(i, "size", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                      >
                        {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Color"
                      value={v.color}
                      onChange={(e) => updateVariant(i, "color", e.target.value)}
                      className="!py-1.5"
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Hex
                      </label>
                      <input
                        type="color"
                        value={v.color_hex}
                        onChange={(e) => updateVariant(i, "color_hex", e.target.value)}
                        className="w-full h-[34px] rounded border cursor-pointer"
                      />
                    </div>
                    <Input
                      label="Stock"
                      type="number"
                      value={String(v.stock)}
                      onChange={(e) => updateVariant(i, "stock", e.target.value)}
                      className="!py-1.5"
                    />
                    <Input
                      label="Price Override"
                      type="number"
                      step="0.01"
                      value={v.price_override}
                      onChange={(e) => updateVariant(i, "price_override", e.target.value)}
                      placeholder="Optional"
                      className="!py-1.5"
                    />
                    <Input
                      label="SKU"
                      value={v.sku}
                      onChange={(e) => updateVariant(i, "sku", e.target.value)}
                      placeholder="Auto"
                      className="!py-1.5"
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Preset palette {presetMatch ? `· ${presetMatch.name}` : "· custom"}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PRESETS.map((p) => {
                        const isActive =
                          presetMatch?.hex.toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => applyPreset(i, p)}
                            title={`${p.name} (${p.hex})`}
                            className={`w-6 h-6 rounded-full border transition ${
                              isActive
                                ? "ring-2 ring-offset-1 ring-black border-black"
                                : "border-gray-300 hover:border-gray-500"
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" size="lg" loading={saving}>
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
