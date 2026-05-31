import json
import logging
from collections import defaultdict
from typing import Any, Dict, Optional

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.boutique import Boutique
from app.models.cart import Cart
from app.models.order import Order, OrderItem
from app.models.shipment import Shipment

logger = logging.getLogger("uvicorn.error")
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    cart: Cart,
    db: Session,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    shipping_address: Optional[Dict[str, Any]] = None,
    customer_email: Optional[str] = None,
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

    # Pass the customer's email through so Stripe sends its automatic receipt
    # (you also need to enable receipts in Stripe Dashboard → Settings → Emails).
    if customer_email:
        session_kwargs["customer_email"] = customer_email

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

    fee_pct = float(settings.PLATFORM_FEE_PERCENT) / 100.0

    # Build order items and accumulate per-boutique totals so we can issue
    # one Stripe Transfer per boutique after the charge clears.
    total = 0.0
    platform_fee_total = 0.0
    order_items = []
    # boutique_id -> {"gross": cents, "fee": cents}
    boutique_totals: Dict[int, Dict[str, int]] = defaultdict(
        lambda: {"gross": 0, "fee": 0}
    )
    # Group order items by who fulfills them so we can spin up one Shipment
    # per group below. Key is ("self", boutique_id) or ("platform", None).
    shipment_groups: Dict[tuple, list] = defaultdict(list)

    for item in cart.items:
        variant = item.variant
        product = variant.product
        price = variant.price_override if variant.price_override else product.base_price
        line_total = price * item.quantity
        total += line_total

        # Platform-owned items (boutique_id is None) generate no transfer and
        # no platform fee — the money belongs to the platform either way.
        if product.boutique_id is not None:
            fee = round(line_total * fee_pct, 2)
            platform_fee_total += fee
            line_total_cents = int(round(line_total * 100))
            fee_cents = int(round(fee * 100))
            boutique_totals[product.boutique_id]["gross"] += line_total_cents
            boutique_totals[product.boutique_id]["fee"] += fee_cents

        oi = OrderItem(
            variant_id=variant.id,
            quantity=item.quantity,
            unit_price=price,
            product_name=product.name,
            size=variant.size,
            color=variant.color,
        )
        order_items.append(oi)

        # Determine which shipment bucket this item lands in.
        if product.fulfillment_mode == "self" and product.boutique_id is not None:
            shipment_groups[("self", product.boutique_id)].append(oi)
        else:
            # platform-ship items (or boutique items with no fulfillment_mode
            # set, which fall back to platform default) all go through the
            # warehouse.
            shipment_groups[("platform", None)].append(oi)

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

    # Resolve the Stripe charge id from the PaymentIntent so transfers can
    # tie back to it (better dispute/refund accounting).
    charge_id: Optional[str] = None
    payment_intent_id = session.get("payment_intent")
    if payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(payment_intent_id)
            charges = pi.get("charges", {}).get("data") or []
            if charges:
                charge_id = charges[0].get("id")
            else:
                charge_id = pi.get("latest_charge")
        except Exception as exc:
            logger.warning("Failed to retrieve PaymentIntent %s: %s", payment_intent_id, exc)

    order = Order(
        user_id=int(user_id),
        status="paid",
        total_amount=total,
        platform_fee_amount=round(platform_fee_total, 2),
        stripe_session_id=session.get("id"),
        stripe_payment_intent=payment_intent_id,
        stripe_charge_id=charge_id,
        shipping_address=shipping_json,
        items=order_items,
    )
    db.add(order)
    db.flush()  # need order.id for the idempotency keys and shipments

    # Materialize shipments. Each group becomes one Shipment row; its items
    # get back-linked via shipment_id.
    for (mode, boutique_id), items_in_group in shipment_groups.items():
        if not items_in_group:
            continue
        shipment = Shipment(
            order_id=order.id,
            fulfillment_mode=mode,
            boutique_id=boutique_id,
            status="pending",
        )
        db.add(shipment)
        db.flush()  # need shipment.id
        for oi in items_in_group:
            oi.shipment_id = shipment.id

    # Clear cart
    for item in cart.items:
        db.delete(item)

    db.commit()
    db.refresh(order)

    # Fan out per-boutique Stripe Transfers. Each uses an idempotency key tied
    # to (order, boutique) so webhook retries are safe.
    if boutique_totals:
        _payout_to_boutiques(db, order.id, boutique_totals, charge_id)


def _payout_to_boutiques(
    db: Session,
    order_id: int,
    boutique_totals: Dict[int, Dict[str, int]],
    charge_id: Optional[str],
) -> None:
    for boutique_id, amounts in boutique_totals.items():
        boutique = (
            db.query(Boutique).filter(Boutique.id == boutique_id).first()
        )
        if not boutique or not boutique.stripe_account_id:
            logger.warning(
                "Skipping payout for order %s boutique %s: no Stripe account",
                order_id,
                boutique_id,
            )
            continue

        # Amount to transfer = gross to that boutique, minus platform fee.
        transfer_amount = amounts["gross"] - amounts["fee"]
        if transfer_amount <= 0:
            continue

        try:
            transfer_kwargs: Dict[str, Any] = dict(
                amount=transfer_amount,
                currency="usd",
                destination=boutique.stripe_account_id,
                metadata={
                    "order_id": str(order_id),
                    "boutique_id": str(boutique_id),
                },
            )
            # source_transaction ties the transfer to the originating charge
            # so Stripe handles partial refunds / disputes correctly.
            if charge_id:
                transfer_kwargs["source_transaction"] = charge_id
            stripe.Transfer.create(
                **transfer_kwargs,
                idempotency_key=f"order_{order_id}_boutique_{boutique_id}",
            )
            logger.info(
                "Transferred %s cents to boutique %s for order %s",
                transfer_amount,
                boutique_id,
                order_id,
            )
        except Exception as exc:
            # Don't blow up the webhook on a transfer failure — funds are
            # safely in the platform balance and an admin can reconcile later.
            logger.error(
                "Stripe transfer failed for order %s boutique %s: %s",
                order_id,
                boutique_id,
                exc,
            )
