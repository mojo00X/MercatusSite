from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Shipment(Base):
    """One physical shipment belonging to an Order.

    An order can have multiple shipments — one per boutique that self-ships,
    plus one shared platform shipment containing every platform-fulfilled item
    regardless of which boutique owns the product. Items are linked via
    OrderItem.shipment_id."""

    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)

    # "self" = a boutique fulfills, "platform" = your warehouse fulfills
    fulfillment_mode = Column(String, nullable=False)
    # Set when fulfillment_mode == "self". Null for platform shipments.
    boutique_id = Column(
        Integer, ForeignKey("boutiques.id"), nullable=True, index=True
    )

    # "pending" | "shipped" | "delivered" | "cancelled"
    status = Column(String, nullable=False, default="pending")
    tracking_number = Column(String, nullable=True)
    carrier = Column(String, nullable=True)
    tracking_url = Column(String, nullable=True)
    shipped_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="shipments")
    boutique = relationship("Boutique")
    items = relationship("OrderItem", back_populates="shipment")
