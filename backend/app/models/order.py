from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")
    total_amount = Column(Float, nullable=False)
    # Sum of platform fees across all boutique items on this order.
    # Useful for reporting; not used by Stripe directly (Stripe sees per-item
    # transfer amounts at payout time).
    platform_fee_amount = Column(Float, nullable=False, default=0.0)
    stripe_session_id = Column(String, nullable=True)
    stripe_payment_intent = Column(String, nullable=True)
    stripe_charge_id = Column(String, nullable=True)
    shipping_address = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship(
        "Shipment", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False)
    # Set on order creation by the fulfillment grouping logic. Nullable so
    # legacy orders from before this column existed still load.
    shipment_id = Column(
        Integer, ForeignKey("shipments.id"), nullable=True, index=True
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    product_name = Column(String, nullable=False)
    size = Column(String)
    color = Column(String)

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant")
    shipment = relationship("Shipment", back_populates="items")
