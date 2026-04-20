from typing import List, Optional

from pydantic import BaseModel


class CartItemCreate(BaseModel):
    variant_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: int
    product_name: str
    size: str
    color: str
    price: float
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total: float
