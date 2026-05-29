from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class BoutiqueResponse(BaseModel):
    id: int
    name: str
    slug: str
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    stripe_charges_enabled: bool = False
    stripe_payouts_enabled: bool = False
    stripe_details_submitted: bool = False
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class BoutiquePublicResponse(BaseModel):
    """Trimmed shape for the customer-facing directory and storefront —
    omits Stripe account state and other operational fields."""

    id: int
    name: str
    slug: str
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None

    model_config = {"from_attributes": True}


class BoutiqueRegister(BaseModel):
    """Payload posted to /api/boutique/register. Creates the User + Boutique
    in one shot and kicks off Stripe Connect Express onboarding."""

    email: EmailStr
    password: str
    full_name: str
    boutique_name: str
    bio: Optional[str] = None


class BoutiqueUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
