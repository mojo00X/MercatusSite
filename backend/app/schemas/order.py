from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: int
    unit_price: float
    product_name: str
    size: Optional[str] = None
    color: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    total_amount: float
    stripe_session_id: Optional[str] = None
    stripe_payment_intent: Optional[str] = None
    shipping_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    pages: int
