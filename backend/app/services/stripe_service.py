import json
import logging
from typing import Any, Dict, List, Optional

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import ProductVariant

logger = logging.getLogger("uvicorn.error")
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    cart: Cart,
    db: Session,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    shipping_address: Optional[Dict[str, Any]] = None,
) -> stripe.checkout.Session:
    primary_frontend = ""
    for origin in settings.FRONTEND_URL.split(","):
        origin = origin.strip().rstrip("/")
        if origin.startswith("https://") and "localhost" not in origin:
            primary_frontend = origin
            break
    if not primary_frontend:
        primary_frontend = "https://www.mirevi.app"

    if not success_url:
        success_url = f"{primary_frontend}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    if not cancel_url:
        cancel_url = f"{primary_frontend}/cart"

    logger.info(f"Stripe checkout success_url={success_url} cancel_url={cancel_url}")

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

    metadata: Dict[str, str] = {
        "cart_id": str(cart.id),
        "user_id": str(cart.user_id) if cart.user_id else "",
    }

    session_kwargs: Dict[str, Any] = dict(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
    )

    # Persist the shipping address the user typed on our checkout page through
    # to the Order via webhook. Stripe metadata values are capped at 500 chars,
    # which is plenty for a serialized address.
    if shipping_address:
        metadata["shipping_address"] = json.dumps(shipping_address)[:500]
        country = (shipping_address.get("country") or "US").upper()
        session_kwargs["shipping_address_collection"] = {
            "allowed_countries": [country],
        }

    session_kwargs["metadata"] = metadata
    return stripe.checkout.Session.create(**session_kwargs)


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

    # Prefer Stripe's collected shipping_details (validated on their hosted
    # page); fall back to what the user typed on our checkout form, which we
    # round-tripped through session metadata.
    shipping_json: Optional[str] = None
    shipping_details = session.get("shipping_details") or session.get("shipping")
    if shipping_details and shipping_details.get("address"):
        addr = shipping_details["address"]
        shipping_json = json.dumps(
            {
                "name": shipping_details.get("name"),
                "street": " ".join(
                    p for p in (addr.get("line1"), addr.get("line2")) if p
                ).strip(),
                "city": addr.get("city"),
                "state": addr.get("state"),
                "zip": addr.get("postal_code"),
                "country": addr.get("country"),
            }
        )
    else:
        meta_shipping = session.get("metadata", {}).get("shipping_address")
        if meta_shipping:
            shipping_json = meta_shipping

    order = Order(
        user_id=int(user_id),
        status="paid",
        total_amount=total,
        stripe_session_id=session.get("id"),
        stripe_payment_intent=session.get("payment_intent"),
        shipping_address=shipping_json,
        items=order_items,
    )
    db.add(order)

    # Clear cart
    for item in cart.items:
        db.delete(item)

    db.commit()
