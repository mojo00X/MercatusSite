import json
from typing import List, Optional

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import ProductVariant

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    cart: Cart,
    db: Session,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
) -> stripe.checkout.Session:
    if not success_url:
        success_url = f"{settings.FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    if not cancel_url:
        cancel_url = f"{settings.FRONTEND_URL}/cart"

    line_items = []
    for item in cart.items:
        variant = item.variant
        product = variant.product
        price = variant.price_override if variant.price_override else product.base_price

        line_items.append(
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{product.name} - {variant.size}/{variant.color}",
                        "description": product.description[:500] if product.description else "",
                    },
                    "unit_amount": int(price * 100),  # cents
                },
                "quantity": item.quantity,
            }
        )

    checkout_session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "cart_id": str(cart.id),
            "user_id": str(cart.user_id) if cart.user_id else "",
        },
    )

    return checkout_session


def handle_webhook(payload: bytes, sig_header: str, db: Session) -> dict:
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise ValueError("Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        _process_completed_checkout(session, db)

    return {"status": "success"}


def _process_completed_checkout(session: dict, db: Session) -> None:
    cart_id = session.get("metadata", {}).get("cart_id")
    user_id = session.get("metadata", {}).get("user_id")

    if not cart_id or not user_id:
        return

    cart = db.query(Cart).filter(Cart.id == int(cart_id)).first()
    if not cart:
        return

    # Calculate total
    total = 0.0
    order_items = []
    for item in cart.items:
        variant = item.variant
        product = variant.product
        price = variant.price_override if variant.price_override else product.base_price
        total += price * item.quantity

        order_items.append(
            OrderItem(
                variant_id=variant.id,
                quantity=item.quantity,
                unit_price=price,
                product_name=product.name,
                size=variant.size,
                color=variant.color,
            )
        )

        # Decrement stock
        variant.stock_quantity = max(0, variant.stock_quantity - item.quantity)

    order = Order(
        user_id=int(user_id),
        status="paid",
        total_amount=total,
        stripe_session_id=session.get("id"),
        stripe_payment_intent=session.get("payment_intent"),
        items=order_items,
    )
    db.add(order)

    # Clear cart
    for item in cart.items:
        db.delete(item)

    db.commit()
