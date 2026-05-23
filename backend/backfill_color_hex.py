"""Backfill ProductVariant.color_hex where it's missing or stuck at #000000.

Targets rows where the named color clearly isn't black but the hex is null,
empty, or #000000 — symptom of variants saved before the admin form had a
preset palette. Idempotent: rows that already match the palette, plus genuine
Black variants, are left alone.

Usage::

    cd backend
    python backfill_color_hex.py           # report only
    python backfill_color_hex.py --apply   # write changes

Reads DATABASE_URL from the same place the app does (``app.config``), so it
works against local sqlite and against the Render-hosted database when run
with the production env vars loaded.
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional

from app.database import SessionLocal
from app.models.product import ProductVariant


# Keep in sync with COLOR_PRESETS in frontend/src/pages/admin/ProductForm.tsx.
COLOR_PRESETS: dict[str, str] = {
    "black": "#000000",
    "white": "#FFFFFF",
    "ivory": "#FFFFF0",
    "cream": "#FFFDD0",
    "grey": "#808080",
    "gray": "#808080",
    "charcoal": "#36454F",
    "navy": "#000080",
    "sky blue": "#87CEEB",
    "royal blue": "#4169E1",
    "blue": "#4169E1",
    "teal": "#008080",
    "sage": "#9CAF88",
    "olive": "#708238",
    "forest": "#228B22",
    "green": "#228B22",
    "red": "#C8102E",
    "burgundy": "#800020",
    "blush": "#DE5D83",
    "pink": "#FFC0CB",
    "mustard": "#FFDB58",
    "yellow": "#FFDB58",
    "camel": "#C19A6B",
    "sand": "#C2B280",
    "khaki": "#C3B091",
    "tan": "#C3B091",
    "brown": "#8B4513",
    "light wash": "#B5C7D3",
    "indigo": "#3F0FB7",
    "purple": "#3F0FB7",
}


def guess_hex(color_name: str) -> Optional[str]:
    key = (color_name or "").strip().lower()
    if not key:
        return None
    if key in COLOR_PRESETS:
        return COLOR_PRESETS[key]
    # Try a loose "contains" match — e.g. "Light Sky Blue" → Sky Blue.
    for name, hex_ in COLOR_PRESETS.items():
        if name in key:
            return hex_
    return None


def _is_placeholder_hex(value: Optional[str]) -> bool:
    if not value:
        return True
    return value.strip().lower() in {"#000000", "000000"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes. Without this flag the script only reports.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        variants = db.query(ProductVariant).all()
        to_update: list[tuple[ProductVariant, str]] = []
        unknown: list[ProductVariant] = []

        for v in variants:
            if not _is_placeholder_hex(v.color_hex):
                continue
            # Genuine Black variants are fine — skip them.
            if (v.color or "").strip().lower() == "black":
                continue
            guess = guess_hex(v.color or "")
            if guess:
                to_update.append((v, guess))
            else:
                unknown.append(v)

        print(f"Scanned {len(variants)} variants.")
        print(f"  Will update: {len(to_update)}")
        for v, new_hex in to_update:
            print(f"    #{v.id} product={v.product_id} '{v.color}' "
                  f"{v.color_hex!r} → {new_hex}")
        if unknown:
            print(f"  Unknown color names ({len(unknown)}) — left untouched:")
            for v in unknown:
                print(f"    #{v.id} product={v.product_id} color={v.color!r}")

        if not args.apply:
            print("\nDry run. Re-run with --apply to write changes.")
            return 0

        if not to_update:
            print("Nothing to do.")
            return 0

        for v, new_hex in to_update:
            v.color_hex = new_hex
        db.commit()
        print(f"Updated {len(to_update)} variants.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
