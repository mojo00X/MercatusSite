from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.collection import Collection
from app.schemas.collection import CollectionResponse

router = APIRouter()


@router.get("/", response_model=List[CollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    return (
        db.query(Collection)
        .filter(Collection.is_active == True)  # noqa: E712
        .order_by(Collection.sort_order.asc(), Collection.id.asc())
        .all()
    )
