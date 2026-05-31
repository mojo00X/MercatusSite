"""Customer-facing boutique endpoints.

Kept separate from /api/boutique (which is owner-only) so the surface area for
customers is obvious and can be hardened independently. Mounted at /api/boutiques."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.boutique import Boutique
from app.models.product import Category, Product
from app.schemas.boutique import BoutiquePublicResponse

router = APIRouter()


@router.get("", response_model=List[BoutiquePublicResponse])
def list_boutiques(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Active boutique directory. If `category` is given, only boutiques that
    have at least one active product in that category are returned (drives
    the nested filter UI exactly like brands)."""
    query = db.query(Boutique).filter(Boutique.is_active == True)  # noqa: E712
    if category:
        query = (
            query.join(Product, Product.boutique_id == Boutique.id)
            .join(Category, Product.category_id == Category.id)
            .filter(
                Category.slug == category,
                Product.is_active == True,  # noqa: E712
            )
            .distinct()
        )
    return query.order_by(Boutique.name.asc()).all()


@router.get("/{slug}", response_model=BoutiquePublicResponse)
def get_boutique(slug: str, db: Session = Depends(get_db)):
    boutique = (
        db.query(Boutique)
        .filter(Boutique.slug == slug, Boutique.is_active == True)  # noqa: E712
        .first()
    )
    if not boutique:
        raise HTTPException(status_code=404, detail="Boutique not found")
    return boutique
