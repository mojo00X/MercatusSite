from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ProductVariantResponse(BaseModel):
    id: int
    size: str
    color: str
    color_hex: Optional[str] = None
    sku: str
    price_override: Optional[float] = None
    stock_quantity: int
    is_active: bool

    model_config = {"from_attributes": True}


class ProductImageResponse(BaseModel):
    id: int
    url: str
    alt_text: Optional[str] = None
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    base_price: float
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    gender: str
    material: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    pages: int
