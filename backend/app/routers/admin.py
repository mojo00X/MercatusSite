import math
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db, require_admin
from app.models.collection import Collection
from app.models.order import Order, OrderItem
from app.models.product import Brand, Category, Product, ProductImage, ProductVariant
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.admin import (
    BrandCreate,
    BrandUpdate,
    DashboardStats,
    ProductCreate,
    ProductUpdate,
    RestockRequest,
    VariantUpdate,
)
from app.schemas.shipment import ShipmentResponse, ShipmentShipPayload
from app.schemas.collection import (
    CategoryImageUpdate,
    CollectionCreate,
    CollectionResponse,
    CollectionUpdate,
)
from app.schemas.order import OrderListResponse, OrderResponse
from app.schemas.product import BrandResponse, CategoryResponse, ProductResponse
from app.schemas.user import UserResponse
from app.services.product_service import (
    apply_variants,
    create_images_for_new_product,
    create_variants_for_new_product,
    generate_sku,
    replace_images,
    slugify,
    unique_product_slug,
)

router = APIRouter()


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text


# ── Dashboard ────────────────────────────────────────────────────────────────


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_products = db.query(func.count(Product.id)).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar()

    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_orders = (
        db.query(func.count(Order.id)).filter(Order.created_at >= week_ago).scalar()
    )

    low_stock_count = (
        db.query(func.count(ProductVariant.id))
        .filter(ProductVariant.stock_quantity < 10, ProductVariant.is_active == True)
        .scalar()
    )

    return DashboardStats(
        total_products=total_products,
        total_orders=total_orders,
        total_users=total_users,
        total_revenue=float(total_revenue),
        recent_orders=recent_orders,
        low_stock_count=low_stock_count,
    )


# ── Products ─────────────────────────────────────────────────────────────────


@router.get("/products", response_model=List[ProductResponse])
def admin_list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    products = (
        db.query(Product)
        .options(
            joinedload(Product.variants),
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.brand),
        )
        .filter(Product.is_active == True)  # noqa: E712
        .order_by(Product.created_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return products


@router.get("/products/{product_id}", response_model=ProductResponse)
def admin_get_product(
    product_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.variants),
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.brand),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = Product(
        name=product_data.name,
        slug=unique_product_slug(db, product_data.name),
        description=product_data.description,
        base_price=product_data.base_price,
        category_id=product_data.category_id,
        brand_id=product_data.brand_id,
        boutique_id=product_data.boutique_id,
        gender=product_data.gender,
        condition=product_data.condition,
        fulfillment_mode=product_data.fulfillment_mode,
        material=product_data.material,
    )
    db.add(product)
    db.flush()
    create_variants_for_new_product(db, product, product_data.variants)
    create_images_for_new_product(db, product, product_data.images)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    update_data: ProductUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.variants),
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.brand),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    new_images = update_dict.pop("images", None)
    new_variants = update_dict.pop("variants", None)
    for key, value in update_dict.items():
        setattr(product, key, value)

    if "name" in update_dict:
        product.slug = slugify(update_dict["name"])

    if new_images is not None:
        replace_images(db, product, new_images)
    if new_variants is not None:
        apply_variants(db, product, new_variants)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    # Soft delete: variants are referenced by past orders, so we deactivate
    # instead of hard-deleting to preserve order history.
    product.is_active = False
    for variant in product.variants:
        variant.is_active = False
    db.commit()


# ── Product Images ───────────────────────────────────────────────────────────


@router.post("/products/{product_id}/images", response_model=ProductResponse)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Save file
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("static", "products", filename)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    is_primary = len(product.images) == 0
    image = ProductImage(
        product_id=product_id,
        url=f"/static/products/{filename}",
        alt_text=product.name,
        is_primary=is_primary,
        sort_order=len(product.images),
    )
    db.add(image)
    db.commit()
    db.refresh(product)
    return product


# ── Variants ─────────────────────────────────────────────────────────────────


@router.put("/products/{product_id}/variants/{variant_id}")
def update_variant(
    product_id: int,
    variant_id: int,
    update_data: VariantUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(variant, key, value)

    db.commit()
    db.refresh(variant)
    return {"id": variant.id, "stock_quantity": variant.stock_quantity, "is_active": variant.is_active}


# ── Orders ───────────────────────────────────────────────────────────────────


@router.get("/orders", response_model=OrderListResponse)
def admin_list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter(Order.status == status_filter)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page
    orders = query.offset(offset).limit(per_page).all()

    return OrderListResponse(items=orders, total=total, page=page, pages=pages)


@router.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_update: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    new_status = status_update.get("status")
    if new_status not in ("pending", "paid", "processing", "shipped", "delivered", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    order.status = new_status
    db.commit()
    return {"id": order.id, "status": order.status}


# ── Users ────────────────────────────────────────────────────────────────────


@router.get("/users", response_model=List[UserResponse])
def admin_list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(per_page).all()
    return users


# ── Inventory ────────────────────────────────────────────────────────────────


@router.get("/inventory/low-stock")
def low_stock(
    threshold: int = Query(10),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.stock_quantity < threshold, ProductVariant.is_active == True)
        .all()
    )
    results = []
    for v in variants:
        results.append(
            {
                "variant_id": v.id,
                "product_id": v.product_id,
                "product_name": v.product.name if v.product else "",
                "sku": v.sku,
                "size": v.size,
                "color": v.color,
                "stock_quantity": v.stock_quantity,
            }
        )
    return results


@router.post("/inventory/restock")
def restock(
    request: RestockRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == request.variant_id).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    variant.stock_quantity += request.quantity
    db.commit()
    return {
        "variant_id": variant.id,
        "new_stock_quantity": variant.stock_quantity,
    }


# ── Categories ───────────────────────────────────────────────────────────────


@router.get("/categories", response_model=List[CategoryResponse])
def admin_list_categories(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Category).order_by(Category.name.asc()).all()


@router.put("/categories/{category_id}/image", response_model=CategoryResponse)
def admin_update_category_image(
    category_id: int,
    payload: CategoryImageUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.image_url = payload.image_url
    db.commit()
    db.refresh(category)
    return category


# ── Shipments (admin warehouse queue) ───────────────────────────────────────


@router.get("/shipments", response_model=List[ShipmentResponse])
def admin_list_shipments(
    fulfillment_mode: Optional[str] = None,
    status_filter: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """All shipments across the platform. By default the admin warehouse view
    filters to platform-fulfilled pending shipments — that's the work queue."""
    query = db.query(Shipment).options(joinedload(Shipment.items))
    if fulfillment_mode:
        query = query.filter(Shipment.fulfillment_mode == fulfillment_mode)
    if status_filter:
        query = query.filter(Shipment.status == status_filter)
    return query.order_by(Shipment.created_at.desc()).all()


@router.put("/shipments/{shipment_id}/ship", response_model=ShipmentResponse)
def admin_mark_shipment_shipped(
    shipment_id: int,
    payload: ShipmentShipPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    shipment.tracking_number = payload.tracking_number
    shipment.carrier = payload.carrier
    shipment.tracking_url = payload.tracking_url
    shipment.status = "shipped"
    shipment.shipped_at = datetime.utcnow()
    db.commit()
    db.refresh(shipment)
    return shipment


# ── Brands ───────────────────────────────────────────────────────────────────


@router.get("/brands", response_model=List[BrandResponse])
def admin_list_brands(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Brand).order_by(Brand.name.asc()).all()


@router.post("/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def admin_create_brand(
    payload: BrandCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    slug = _slugify(payload.name)
    if db.query(Brand).filter(Brand.slug == slug).first():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    brand = Brand(name=payload.name, slug=slug, logo_url=payload.logo_url)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.put("/brands/{brand_id}", response_model=BrandResponse)
def admin_update_brand(
    brand_id: int,
    payload: BrandUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        brand.name = data["name"]
        brand.slug = _slugify(data["name"])
    if "logo_url" in data:
        brand.logo_url = data["logo_url"]
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_brand(
    brand_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    # Unassign brand from any products that reference it, then drop the row.
    db.query(Product).filter(Product.brand_id == brand_id).update({"brand_id": None})
    db.delete(brand)
    db.commit()


# ── Collections ──────────────────────────────────────────────────────────────


@router.get("/collections", response_model=List[CollectionResponse])
def admin_list_collections(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(Collection)
        .order_by(Collection.sort_order.asc(), Collection.id.asc())
        .all()
    )


@router.post("/collections", response_model=CollectionResponse, status_code=201)
def admin_create_collection(
    payload: CollectionCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    collection = Collection(**payload.model_dump())
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


@router.put("/collections/{collection_id}", response_model=CollectionResponse)
def admin_update_collection(
    collection_id: int,
    payload: CollectionUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(collection, key, value)
    db.commit()
    db.refresh(collection)
    return collection


@router.delete("/collections/{collection_id}", status_code=204)
def admin_delete_collection(
    collection_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(collection)
    db.commit()
