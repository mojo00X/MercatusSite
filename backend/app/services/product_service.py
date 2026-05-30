"""Shared product create/update helpers.

These are called by both the admin router (full power, can set any boutique_id)
and the boutique router (scoped to the signed-in boutique). Keeping the variant
matching + SKU collision logic in one place so they can't drift apart."""

import re
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.product import Product, ProductImage, ProductVariant


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text


def unique_product_slug(db: Session, name: str) -> str:
    base = slugify(name) or "product"
    slug = base
    while db.query(Product.id).filter(Product.slug == slug).first():
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


def generate_sku(db: Session, slug: str, size: str, color: str) -> str:
    """Build a unique SKU. Used when callers leave the SKU blank."""
    base = "-".join(
        p for p in (slugify(slug), slugify(size or ""), slugify(color or "")) if p
    ) or "sku"
    sku = base
    while db.query(ProductVariant.id).filter(ProductVariant.sku == sku).first():
        sku = f"{base}-{uuid.uuid4().hex[:6]}"
    return sku


def apply_variants(
    db: Session, product: Product, new_variants: List[Dict[str, Any]]
) -> None:
    """Reconcile a product's variants against the payload.

    Matches by id first, then falls back to SKU so a payload whose id was
    lost in form state still updates the right row instead of crashing with
    a duplicate-SKU INSERT. Variants present in the DB but missing from the
    payload are deleted."""
    existing_by_id = {v.id: v for v in product.variants}
    existing_by_sku = {v.sku: v for v in product.variants}
    kept_ids = set()
    for v in new_variants:
        vid = v.get("id")
        payload_sku = (v.get("sku") or "").strip()

        variant: Optional[ProductVariant] = None
        if vid and vid in existing_by_id:
            variant = existing_by_id[vid]
        elif payload_sku and payload_sku in existing_by_sku:
            variant = existing_by_sku[payload_sku]

        if variant is not None:
            variant.size = v["size"]
            variant.color = v["color"]
            variant.color_hex = v.get("color_hex")
            variant.price_override = v.get("price_override")
            variant.stock_quantity = v.get("stock_quantity", 0)
            if payload_sku and payload_sku != variant.sku:
                conflict = (
                    db.query(ProductVariant.id)
                    .filter(
                        ProductVariant.sku == payload_sku,
                        ProductVariant.id != variant.id,
                    )
                    .first()
                )
                if not conflict:
                    variant.sku = payload_sku
            kept_ids.add(variant.id)
        else:
            sku = payload_sku or generate_sku(
                db, product.slug, v["size"], v["color"]
            )
            if (
                db.query(ProductVariant.id)
                .filter(ProductVariant.sku == sku)
                .first()
            ):
                sku = generate_sku(db, product.slug, v["size"], v["color"])
            db.add(
                ProductVariant(
                    product_id=product.id,
                    size=v["size"],
                    color=v["color"],
                    color_hex=v.get("color_hex"),
                    sku=sku,
                    price_override=v.get("price_override"),
                    stock_quantity=v.get("stock_quantity", 0),
                )
            )
    for vid, variant in existing_by_id.items():
        if vid not in kept_ids:
            db.delete(variant)


def replace_images(
    db: Session, product: Product, new_images: List[Dict[str, Any]]
) -> None:
    db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
    for img in new_images:
        db.add(
            ProductImage(
                product_id=product.id,
                url=img["url"],
                alt_text=img.get("alt_text"),
                is_primary=img.get("is_primary", False),
                sort_order=img.get("sort_order", 0),
            )
        )


def create_variants_for_new_product(
    db: Session, product: Product, variants: List[Any]
) -> None:
    """For freshly-created products. `variants` may be a list of Pydantic
    models or dicts."""
    for v in variants:
        # Accept both Pydantic objects and dicts.
        if hasattr(v, "model_dump"):
            v_dict = v.model_dump()
        else:
            v_dict = v
        sku = (v_dict.get("sku") or "").strip() or generate_sku(
            db, product.slug, v_dict["size"], v_dict["color"]
        )
        db.add(
            ProductVariant(
                product_id=product.id,
                size=v_dict["size"],
                color=v_dict["color"],
                color_hex=v_dict.get("color_hex"),
                sku=sku,
                price_override=v_dict.get("price_override"),
                stock_quantity=v_dict.get("stock_quantity", 0),
            )
        )


def create_images_for_new_product(
    db: Session, product: Product, images: List[Any]
) -> None:
    for img in images:
        if hasattr(img, "model_dump"):
            img_dict = img.model_dump()
        else:
            img_dict = img
        db.add(
            ProductImage(
                product_id=product.id,
                url=img_dict["url"],
                alt_text=img_dict.get("alt_text"),
                is_primary=img_dict.get("is_primary", False),
                sort_order=img_dict.get("sort_order", 0),
            )
        )
