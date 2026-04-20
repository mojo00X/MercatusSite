import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db
from app.models.product import Category, Product, ProductVariant
from app.schemas.product import (
    CategoryResponse,
    ProductListResponse,
    ProductResponse,
)

router = APIRouter()


@router.get("/", response_model=ProductListResponse)
def list_products(
    category: Optional[str] = None,
    gender: Optional[str] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    sort: Optional[str] = Query(None, description="price_asc, price_desc, newest, name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Product)
        .options(joinedload(Product.variants), joinedload(Product.images), joinedload(Product.category))
        .filter(Product.is_active == True)
    )

    if category:
        query = query.join(Category).filter(Category.slug == category)
    if gender:
        query = query.filter(Product.gender == gender)
    if min_price is not None:
        query = query.filter(Product.base_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.base_price <= max_price)
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%"),
            )
        )
    if size or color:
        query = query.join(ProductVariant)
        if size:
            query = query.filter(ProductVariant.size == size)
        if color:
            query = query.filter(ProductVariant.color.ilike(f"%{color}%"))

    # Sorting
    if sort == "price_asc":
        query = query.order_by(Product.base_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.base_price.desc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    elif sort == "name":
        query = query.order_by(Product.name.asc())
    else:
        query = query.order_by(Product.created_at.desc())

    # Get unique results count before pagination
    total = query.distinct().count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page

    products = query.distinct().offset(offset).limit(per_page).all()

    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories


@router.get("/{slug}", response_model=ProductResponse)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(joinedload(Product.variants), joinedload(Product.images), joinedload(Product.category))
        .filter(Product.slug == slug)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product
