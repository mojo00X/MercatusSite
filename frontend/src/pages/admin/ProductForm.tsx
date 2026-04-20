import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProduct, getCategories, createProduct, updateProduct } from "../../api";
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [gender, setGender] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
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
      setIsActive(product.is_active);
      setImageUrl(product.images?.[0]?.url || "");
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

  const addVariant = () => setVariants([...variants, { ...emptyVariant }]);

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string | number) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
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
        is_active: isActive,
        images: imageUrl ? [{ url: imageUrl, is_primary: true, sort_order: 0 }] : [],
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
    } catch {
      toast.error("Failed to save product");
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* Image */}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Image</h2>
          <Input
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-32 h-40 object-cover rounded-md border"
            />
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
            {variants.map((v, i) => (
              <div
                key={i}
                className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end p-4 bg-gray-50 rounded-lg"
              >
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
            ))}
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
