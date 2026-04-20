from typing import List, Optional

from pydantic import BaseModel


class VariantCreate(BaseModel):
    size: str
    color: str
    color_hex: Optional[str] = None
    sku: str
    price_override: Optional[float] = None
    stock_quantity: int = 0


class VariantUpdate(BaseModel):
    stock_quantity: Optional[int] = None
    price_override: Optional[float] = None
    is_active: Optional[bool] = None


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float
    category_id: Optional[int] = None
    gender: str = "unisex"
    material: Optional[str] = None
    variants: List[VariantCreate] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    category_id: Optional[int] = None
    gender: Optional[str] = None
    material: Optional[str] = None
    is_active: Optional[bool] = None


class DashboardStats(BaseModel):
    total_products: int
    total_orders: int
    total_users: int
    total_revenue: float
    recent_orders: int
    low_stock_count: int


class RestockRequest(BaseModel):
    variant_id: int
    quantity: int
