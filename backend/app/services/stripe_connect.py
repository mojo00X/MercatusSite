"""Stripe Connect Express helpers for the boutique marketplace flow.

We only use Express accounts: Stripe hosts the boutique-facing dashboard
(taxes, bank info, payout schedule) so we don't have to build it ourselves.
The cached `stripe_*` columns on Boutique mirror the account state so the
frontend can render without round-tripping Stripe on every page load."""

import logging
from typing import Optional

import stripe

from app.config import settings
from app.models.boutique import Boutique

logger = logging.getLogger("uvicorn.error")
stripe.api_key = settings.STRIPE_SECRET_KEY


def _primary_frontend_url() -> str:
    for origin in settings.FRONTEND_URL.split(","):
        origin = origin.strip().rstrip("/")
        if origin.startswith("https://") and "localhost" not in origin:
            return origin
    # Local dev fallback — first entry, usually localhost:5173
    first = settings.FRONTEND_URL.split(",")[0].strip().rstrip("/")
    return first or "http://localhost:5173"


def create_express_account(boutique: Boutique, owner_email: str) -> str:
    """Create a Stripe Connect Express account for a boutique.

    Returns the Stripe account id. Caller is responsible for persisting it
    on the Boutique row.
    """
    account = stripe.Account.create(
        type="express",
        email=owner_email,
        country="US",
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
        business_profile={
            "name": boutique.name,
            "url": f"{_primary_frontend_url()}/boutiques/{boutique.slug}",
        },
        metadata={
            "boutique_id": str(boutique.id),
            "boutique_slug": boutique.slug,
        },
    )
    return account.id


def create_onboarding_link(boutique: Boutique) -> str:
    """Return a fresh Stripe-hosted onboarding URL.

    Onboarding links expire after a few minutes and can only be used once,
    so we always generate a fresh one when the boutique hits the endpoint.
    """
    if not boutique.stripe_account_id:
        raise ValueError("Boutique has no Stripe account yet")

    frontend = _primary_frontend_url()
    link = stripe.AccountLink.create(
        account=boutique.stripe_account_id,
        refresh_url=f"{frontend}/boutique/onboarding/refresh",
        return_url=f"{frontend}/boutique/onboarding/return",
        type="account_onboarding",
    )
    return link.url


def refresh_account_status(boutique: Boutique) -> Optional[dict]:
    """Pull the latest account state from Stripe into the cached columns.

    Returns the raw fields written so the caller can pass them to the response.
    Returns None if the boutique hasn't been connected yet."""
    if not boutique.stripe_account_id:
        return None

    account = stripe.Account.retrieve(boutique.stripe_account_id)
    boutique.stripe_charges_enabled = bool(account.charges_enabled)
    boutique.stripe_payouts_enabled = bool(account.payouts_enabled)
    boutique.stripe_details_submitted = bool(account.details_submitted)
    return {
        "charges_enabled": boutique.stripe_charges_enabled,
        "payouts_enabled": boutique.stripe_payouts_enabled,
        "details_submitted": boutique.stripe_details_submitted,
    }


def express_dashboard_link(boutique: Boutique) -> str:
    """Generate a single-use link into the boutique's Stripe Express dashboard.

    This is what the boutique clicks from their payouts page to see balance,
    payout history, and update bank info."""
    if not boutique.stripe_account_id:
        raise ValueError("Boutique has no Stripe account yet")
    link = stripe.Account.create_login_link(boutique.stripe_account_id)
    return link.url
