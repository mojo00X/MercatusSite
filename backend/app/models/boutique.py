from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Boutique(Base):
    __tablename__ = "boutiques"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True
    )

    # Storefront presentation
    bio = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)

    # Stripe Connect — cached state mirrors Stripe's account status so we don't
    # call the API on every page load. Webhooks/refresh endpoints keep it fresh.
    stripe_account_id = Column(String, unique=True, nullable=True, index=True)
    stripe_charges_enabled = Column(Boolean, default=False, nullable=False)
    stripe_payouts_enabled = Column(Boolean, default=False, nullable=False)
    stripe_details_submitted = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    owner = relationship("User", back_populates="boutique")
    products = relationship("Product", back_populates="boutique")
