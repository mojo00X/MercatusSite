import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderListResponse, OrderResponse

router = APIRouter()


@router.get("/", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Order)
        .filter(Order.user_id == user.id)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
    )

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1
    offset = (page - 1) * per_page
    orders = query.offset(offset).limit(per_page).all()

    return OrderListResponse(items=orders, total=total, page=page, pages=pages)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order",
        )
    return order
