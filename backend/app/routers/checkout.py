from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.cart import Cart
from app.models.user import User
from app.services.stripe_service import create_checkout_session, handle_webhook

router = APIRouter()


class ShippingAddressIn(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    country: str = "US"


class CreateSessionRequest(BaseModel):
    shipping_address: Optional[ShippingAddressIn] = None


@router.post("/create-session")
def create_session(
    payload: Optional[CreateSessionRequest] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )

    # Verify stock for all items
    for item in cart.items:
        variant = item.variant
        if variant.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {variant.product.name} ({variant.size}/{variant.color})",
            )

    shipping = payload.shipping_address if payload else None
    try:
        session = create_checkout_session(
            cart,
            db,
            customer_email=user.email,
            shipping_address=shipping.model_dump() if shipping else None,
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}",
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_webhook(payload, sig_header, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
