import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { Category } from "../../types";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const GENDERS = ["men", "women", "unisex"];

interface FilterPanelProps {
  categories: Category[];
}

export default function FilterPanel({ categories }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category") || "";
  const selectedGender = searchParams.get("gender") || "";
  const selectedSize = searchParams.get("size") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";

  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchParams({});
  };

  const applyPriceRange = () => {
    const params = new URLSearchParams(searchParams);
    if (localMin) params.set("min_price", localMin);
    else params.delete("min_price");
    if (localMax) params.set("max_price", localMax);
    else params.delete("max_price");
    params.delete("page");
    setSearchParams(params);
  };

  const hasFilters =
    selectedCategory || selectedGender || selectedSize || minPrice || maxPrice;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-black underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategory === cat.slug}
                onChange={() =>
                  updateFilter(
                    "category",
                    selectedCategory === cat.slug ? "" : cat.slug
                  )
                }
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-black">
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Gender</h3>
        <div className="space-y-2">
          {GENDERS.map((g) => (
            <label key={g} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="gender"
                checked={selectedGender === g}
                onChange={() =>
                  updateFilter("gender", selectedGender === g ? "" : g)
                }
                className="h-4 w-4 border-gray-300 text-black focus:ring-black"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-black capitalize">
                {g}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => updateFilter("size", selectedSize === s ? "" : s)}
              className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                selectedSize === s
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:border-black"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <button
          onClick={applyPriceRange}
          className="mt-2 w-full py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
