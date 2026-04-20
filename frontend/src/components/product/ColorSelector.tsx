interface ColorOption {
  color: string;
  color_hex: string;
  available: boolean;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  selected: string | null;
  onSelect: (color: string) => void;
}

export default function ColorSelector({
  colors,
  selected,
  onSelect,
}: ColorSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Color{selected ? `: ${selected}` : ""}
      </h3>
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => {
          const isSelected = selected === c.color;
          return (
            <button
              key={c.color}
              onClick={() => c.available && onSelect(c.color)}
              disabled={!c.available}
              title={c.color}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-black border-black"
                  : c.available
                  ? "border-gray-300 hover:border-gray-500"
                  : "opacity-30 cursor-not-allowed"
              }`}
              style={{ backgroundColor: c.color_hex }}
            />
          );
        })}
      </div>
    </div>
  );
}
