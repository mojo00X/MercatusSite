const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

interface SizeSelectorProps {
  availableSizes: string[];
  selected: string | null;
  onSelect: (size: string) => void;
}

export default function SizeSelector({
  availableSizes,
  selected,
  onSelect,
}: SizeSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
      <div className="flex flex-wrap gap-2">
        {ALL_SIZES.map((size) => {
          const available = availableSizes.includes(size);
          const isSelected = selected === size;
          return (
            <button
              key={size}
              onClick={() => available && onSelect(size)}
              disabled={!available}
              className={`px-4 py-2 text-sm font-medium border rounded-md transition-all duration-200 ${
                isSelected
                  ? "bg-black text-white border-black"
                  : available
                  ? "bg-white text-gray-900 border-gray-300 hover:border-black"
                  : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
