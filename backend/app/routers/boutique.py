import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.boutique import Boutique
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User
from app.schemas.admin import ProductCreate, ProductUpdate
from app.schemas.boutique import BoutiqueRegister, BoutiqueResponse, BoutiqueUpdate
from app.schemas.order import OrderResponse
from app.schemas.product import ProductResponse
from app.schemas.user import Token
from app.services.auth import create_access_token, hash_password
from app.services.product_service import (
    apply_variants,
    create_images_for_new_product,
    create_variants_for_new_product,
    replace_images,
    slugify,
    unique_product_slug,
)
from app.services.stripe_connect import (
    create_express_account,
    create_onboarding_link,
    express_dashboard_link,
    refresh_account_status,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


def _unique_boutique_slug(db: Session, name: str) -> str:
    base = slugify(name) or "boutique"
    slug = base
    while db.query(Boutique).filter(Boutique.slug == slug).first():
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


def require_boutique(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Boutique:
    """Resolve and return the signed-in user's boutique, 403 if they don't own one."""
    if current_user.role != "boutique":
        raise HTTPException(status_code=403, detail="Boutique account required")
    boutique = (
        db.query(Boutique).filter(Boutique.owner_user_id == current_user.id).first()
    )
    if not boutique:
        raise HTTPException(status_code=404, detail="Boutique not found for this user")
    return boutique


class RegisterResponse(Token):
    boutique: BoutiqueResponse
    onboarding_url: str | None = None


@router.post(
    "/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED
)
def register_boutique(payload: BoutiqueRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role="boutique",
    )
    db.add(user)
    db.flush()  # need user.id for the FK

    boutique = Boutique(
        name=payload.boutique_name,
        slug=_unique_boutique_slug(db, payload.boutique_name),
        owner_user_id=user.id,
        bio=payload.bio,
    )
    db.add(boutique)
    db.flush()

    # Stripe Connect — best-effort. If it fails (no Stripe key, Connect not
    # enabled, network blip) the boutique row still exists; they'll hit the
    # onboarding-link endpoint from the dashboard to retry.
    onboarding_url: str | None = None
    try:
        account_id = create_express_account(boutique, payload.email)
        boutique.stripe_account_id = account_id
        onboarding_url = create_onboarding_link(boutique)
    except Exception as exc:
        logger.warning("Stripe Connect setup failed during boutique signup: %s", exc)

    db.commit()
    db.refresh(boutique)

    token = create_access_token({"sub": str(user.id)})
    return RegisterResponse(
        access_token=token,
        boutique=BoutiqueResponse.model_validate(boutique),
        onboarding_url=onboarding_url,
    )


@router.get("/me", response_model=BoutiqueResponse)
def get_my_boutique(boutique: Boutique = Depends(require_boutique)):
    return boutique


@router.put("/me", response_model=BoutiqueResponse)
def update_my_boutique(
    payload: BoutiqueUpdate,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        boutique.name = data["name"]
    if "bio" in data:
        boutique.bio = data["bio"]
    if "logo_url" in data:
        boutique.logo_url = data["logo_url"]
    if "banner_url" in data:
        boutique.banner_url = data["banner_url"]
    db.commit()
    db.refresh(boutique)
    return boutique


@router.post("/onboarding-link")
def get_onboarding_link(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    """Issue a fresh Stripe-hosted onboarding link. If the boutique somehow
    doesn't have a Stripe account yet (signup-time creation failed), create
    one now and link them through."""
    if not boutique.stripe_account_id:
        owner = db.query(User).filter(User.id == boutique.owner_user_id).first()
        try:
            boutique.stripe_account_id = create_express_account(boutique, owner.email)
            db.commit()
        except Exception as exc:
            logger.error("Stripe account creation failed for boutique %s: %s", boutique.id, exc)
            raise HTTPException(status_code=503, detail="Stripe Connect is not available right now")

    try:
        url = create_onboarding_link(boutique)
    except Exception as exc:
        logger.error("Stripe onboarding link failed for boutique %s: %s", boutique.id, exc)
        raise HTTPException(status_code=503, detail="Could not create onboarding link")
    return {"url": url}


@router.post("/refresh-status", response_model=BoutiqueResponse)
def refresh_status(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    """Customer hits this after returning from Stripe onboarding so the cached
    state catches up before they see their dashboard."""
    try:
        refresh_account_status(boutique)
        db.commit()
        db.refresh(boutique)
    except Exception as exc:
        logger.error("Stripe status refresh failed for boutique %s: %s", boutique.id, exc)
    return boutique


@router.post("/dashboard-link")
def get_dashboard_link(boutique: Boutique = Depends(require_boutique)):
    """One-time link into the boutique's Stripe Express dashboard."""
    if not boutique.stripe_account_id:
        raise HTTPException(status_code=400, detail="Complete Stripe onboarding first")
    try:
        url = express_dashboard_link(boutique)
    except Exception as exc:
        logger.error("Stripe dashboard link failed for boutique %s: %s", boutique.id, exc)
        raise HTTPException(status_code=503, detail="Could not create dashboard link")
    return {"url": url}


# ── Products (boutique-scoped) ──────────────────────────────────────────────


def _load_product_for_boutique(
    db: Session, product_id: int, boutique: Boutique
) -> Product:
    product = (
        db.query(Product)
        .options(
            joinedload(Product.variants),
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.brand),
            joinedload(Product.boutique),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.boutique_id != boutique.id:
        # Don't leak existence of products the boutique doesn't own.
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products", response_model=List[ProductResponse])
def list_my_products(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    return (
        db.query(Product)
        .options(
            joinedload(Product.variants),
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.brand),
            joinedload(Product.boutique),
        )
        .filter(Product.boutique_id == boutique.id, Product.is_active == True)  # noqa: E712
        .order_by(Product.created_at.desc())
        .all()
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_my_product(
    product_id: int,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    return _load_product_for_boutique(db, product_id, boutique)


@router.post(
    "/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED
)
def create_my_product(
    payload: ProductCreate,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    # Boutique can never assign a product to another boutique, regardless of
    # what they POST.
    product = Product(
        name=payload.name,
        slug=unique_product_slug(db, payload.name),
        description=payload.description,
        base_price=payload.base_price,
        category_id=payload.category_id,
        brand_id=payload.brand_id,
        boutique_id=boutique.id,
        gender=payload.gender,
        condition=payload.condition,
        fulfillment_mode=payload.fulfillment_mode,
        material=payload.material,
    )
    db.add(product)
    db.flush()
    create_variants_for_new_product(db, product, payload.variants)
    create_images_for_new_product(db, product, payload.images)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_my_product(
    product_id: int,
    payload: ProductUpdate,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    product = _load_product_for_boutique(db, product_id, boutique)

    update_dict = payload.model_dump(exclude_unset=True)
    # Boutique cannot reassign ownership of their product to someone else.
    update_dict.pop("boutique_id", None)
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
def delete_my_product(
    product_id: int,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    product = _load_product_for_boutique(db, product_id, boutique)
    # Soft delete — same reasoning as admin delete: cart/order items still
    # reference variants and FK-cascading would destroy history.
    product.is_active = False
    for variant in product.variants:
        variant.is_active = False
    db.commit()


# ── Orders (boutique-scoped) ────────────────────────────────────────────────


def _boutique_order_query(db: Session, boutique_id: int):
    """Orders that contain at least one item belonging to this boutique."""
    return (
        db.query(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(ProductVariant, ProductVariant.id == OrderItem.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(Product.boutique_id == boutique_id)
        .distinct()
    )


@router.get("/orders", response_model=List[OrderResponse])
def list_my_orders(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    return (
        _boutique_order_query(db, boutique.id)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_my_order(
    order_id: int,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    order = (
        _boutique_order_query(db, boutique.id)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── Stats ───────────────────────────────────────────────────────────────────


@router.get("/stats")
def boutique_stats(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    """Top-line numbers for the boutique dashboard. Revenue only counts items
    belonging to this boutique, not the full order total (other boutiques may
    have items on the same order)."""

    # Revenue = sum(unit_price * quantity) across this boutique's items.
    revenue_q = (
        db.query(
            func.coalesce(
                func.sum(OrderItem.unit_price * OrderItem.quantity), 0
            )
        )
        .join(ProductVariant, ProductVariant.id == OrderItem.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(Product.boutique_id == boutique.id)
    )
    total_revenue = float(revenue_q.scalar() or 0)

    total_orders = _boutique_order_query(db, boutique.id).count()

    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_orders = (
        _boutique_order_query(db, boutique.id)
        .filter(Order.created_at >= week_ago)
        .count()
    )

    total_products = (
        db.query(func.count(Product.id))
        .filter(Product.boutique_id == boutique.id, Product.is_active == True)  # noqa: E712
        .scalar()
        or 0
    )

    low_stock_count = (
        db.query(func.count(ProductVariant.id))
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(
            Product.boutique_id == boutique.id,
            ProductVariant.stock_quantity < 10,
            ProductVariant.is_active == True,  # noqa: E712
        )
        .scalar()
        or 0
    )

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "recent_orders": recent_orders,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
    }
