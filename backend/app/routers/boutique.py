import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.boutique import Boutique
from app.models.user import User
from app.schemas.boutique import BoutiqueRegister, BoutiqueResponse, BoutiqueUpdate
from app.schemas.user import Token
from app.services.auth import create_access_token, hash_password
from app.services.stripe_connect import (
    create_express_account,
    create_onboarding_link,
    express_dashboard_link,
    refresh_account_status,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text


def _unique_boutique_slug(db: Session, name: str) -> str:
    base = _slugify(name) or "boutique"
    slug = base
    while db.query(Boutique).filter(Boutique.slug == slug).first():
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


def require_boutique(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Boutique:
    """Resolve and return the signed-in user's boutique, 403 if they don't own one."""
    if current_user.role != "boutique":
        raise HTTPException(status_code=403, detail="Boutique account required")
    boutique = (
        db.query(Boutique).filter(Boutique.owner_user_id == current_user.id).first()
    )
    if not boutique:
        raise HTTPException(status_code=404, detail="Boutique not found for this user")
    return boutique


class RegisterResponse(Token):
    boutique: BoutiqueResponse
    onboarding_url: str | None = None


@router.post(
    "/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED
)
def register_boutique(payload: BoutiqueRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role="boutique",
    )
    db.add(user)
    db.flush()  # need user.id for the FK

    boutique = Boutique(
        name=payload.boutique_name,
        slug=_unique_boutique_slug(db, payload.boutique_name),
        owner_user_id=user.id,
        bio=payload.bio,
    )
    db.add(boutique)
    db.flush()

    # Stripe Connect — best-effort. If it fails (no Stripe key, Connect not
    # enabled, network blip) the boutique row still exists; they'll hit the
    # onboarding-link endpoint from the dashboard to retry.
    onboarding_url: str | None = None
    try:
        account_id = create_express_account(boutique, payload.email)
        boutique.stripe_account_id = account_id
        onboarding_url = create_onboarding_link(boutique)
    except Exception as exc:
        logger.warning("Stripe Connect setup failed during boutique signup: %s", exc)

    db.commit()
    db.refresh(boutique)

    token = create_access_token({"sub": str(user.id)})
    return RegisterResponse(
        access_token=token,
        boutique=BoutiqueResponse.model_validate(boutique),
        onboarding_url=onboarding_url,
    )


@router.get("/me", response_model=BoutiqueResponse)
def get_my_boutique(boutique: Boutique = Depends(require_boutique)):
    return boutique


@router.put("/me", response_model=BoutiqueResponse)
def update_my_boutique(
    payload: BoutiqueUpdate,
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        boutique.name = data["name"]
    if "bio" in data:
        boutique.bio = data["bio"]
    if "logo_url" in data:
        boutique.logo_url = data["logo_url"]
    if "banner_url" in data:
        boutique.banner_url = data["banner_url"]
    db.commit()
    db.refresh(boutique)
    return boutique


@router.post("/onboarding-link")
def get_onboarding_link(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    """Issue a fresh Stripe-hosted onboarding link. If the boutique somehow
    doesn't have a Stripe account yet (signup-time creation failed), create
    one now and link them through."""
    if not boutique.stripe_account_id:
        owner = db.query(User).filter(User.id == boutique.owner_user_id).first()
        try:
            boutique.stripe_account_id = create_express_account(boutique, owner.email)
            db.commit()
        except Exception as exc:
            logger.error("Stripe account creation failed for boutique %s: %s", boutique.id, exc)
            raise HTTPException(status_code=503, detail="Stripe Connect is not available right now")

    try:
        url = create_onboarding_link(boutique)
    except Exception as exc:
        logger.error("Stripe onboarding link failed for boutique %s: %s", boutique.id, exc)
        raise HTTPException(status_code=503, detail="Could not create onboarding link")
    return {"url": url}


@router.post("/refresh-status", response_model=BoutiqueResponse)
def refresh_status(
    boutique: Boutique = Depends(require_boutique),
    db: Session = Depends(get_db),
):
    """Customer hits this after returning from Stripe onboarding so the cached
    state catches up before they see their dashboard."""
    try:
        refresh_account_status(boutique)
        db.commit()
        db.refresh(boutique)
    except Exception as exc:
        logger.error("Stripe status refresh failed for boutique %s: %s", boutique.id, exc)
    return boutique


@router.post("/dashboard-link")
def get_dashboard_link(boutique: Boutique = Depends(require_boutique)):
    """One-time link into the boutique's Stripe Express dashboard."""
    if not boutique.stripe_account_id:
        raise HTTPException(status_code=400, detail="Complete Stripe onboarding first")
    try:
        url = express_dashboard_link(boutique)
    except Exception as exc:
        logger.error("Stripe dashboard link failed for boutique %s: %s", boutique.id, exc)
        raise HTTPException(status_code=503, detail="Could not create dashboard link")
    return {"url": url}
