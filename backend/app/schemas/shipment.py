from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ShipmentItemBrief(BaseModel):
    """Slim item shape embedded inside a ShipmentResponse — the customer
    cares about product/size/color, not the full OrderItem schema."""

    id: int
    quantity: int
    product_name: str
    size: Optional[str] = None
    color: Optional[str] = None

    model_config = {"from_attributes": True}


class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    fulfillment_mode: str  # "self" | "platform"
    boutique_id: Optional[int] = None
    status: str  # "pending" | "shipped" | "delivered" | "cancelled"
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    created_at: datetime
    items: List[ShipmentItemBrief] = []

    model_config = {"from_attributes": True}


class ShipmentShipPayload(BaseModel):
    """Payload for marking a shipment as shipped."""

    tracking_number: str
    carrier: str
    tracking_url: Optional[str] = None
