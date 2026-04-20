import uuid
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_current_user_optional, get_db
from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemResponse, CartItemUpdate, CartResponse

router = APIRouter()


def _get_or_create_cart(
    db: Session,
    user: Optional[User] = None,
    session_id: Optional[str] = None,
) -> Cart:
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if cart:
            return cart
    if session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        if cart:
            return cart

    cart = Cart(
        user_id=user.id if user else None,
        session_id=session_id if not user else None,
    )
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def _build_cart_response(cart: Cart, db: Session) -> CartResponse:
    items = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id)
        .options(joinedload(CartItem.variant))
        .all()
    )
    total = 0.0
    cart_items = []
    for item in items:
        variant = item.variant
        product = variant.product
        price = variant.price_override if variant.price_override else product.base_price
        total += price * item.quantity

        primary_image = None
        for img in product.images:
            if img.is_primary:
                primary_image = img.url
                break
        if not primary_image and product.images:
            primary_image = product.images[0].url

        cart_items.append(
            CartItemResponse(
                id=item.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                product_name=product.name,
                size=variant.size,
                color=variant.color,
                price=price,
                image_url=primary_image,
            )
        )

    return CartResponse(items=cart_items, total=round(total, 2))


@router.get("/", response_model=CartResponse)
def get_cart(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not user and not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie("session_id", session_id, httponly=True, max_age=60 * 60 * 24 * 30)

    cart = _get_or_create_cart(db, user=user, session_id=session_id)
    return _build_cart_response(cart, db)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    item_data: CartItemCreate,
    response: Response,
    session_id: Optional[str] = Cookie(None),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not user and not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie("session_id", session_id, httponly=True, max_age=60 * 60 * 24 * 30)

    variant = db.query(ProductVariant).filter(ProductVariant.id == item_data.variant_id).first()
    if not variant or not variant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    if variant.stock_quantity < item_data.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")

    cart = _get_or_create_cart(db, user=user, session_id=session_id)

    existing = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.variant_id == item_data.variant_id)
        .first()
    )
    if existing:
        existing.quantity += item_data.quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            variant_id=item_data.variant_id,
            quantity=item_data.quantity,
        )
        db.add(cart_item)

    db.commit()
    return _build_cart_response(cart, db)


@router.put("/items/{item_id}", response_model=CartResponse)
def update_item(
    item_id: int,
    update_data: CartItemUpdate,
    session_id: Optional[str] = Cookie(None),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, user=user, session_id=session_id)
    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    if update_data.quantity <= 0:
        db.delete(item)
    else:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        if variant and variant.stock_quantity < update_data.quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
        item.quantity = update_data.quantity

    db.commit()
    return _build_cart_response(cart, db)


@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_item(
    item_id: int,
    session_id: Optional[str] = Cookie(None),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, user=user, session_id=session_id)
    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return _build_cart_response(cart, db)


@router.post("/merge", response_model=CartResponse)
def merge_cart(
    session_id: Optional[str] = Cookie(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not session_id:
        cart = _get_or_create_cart(db, user=user)
        return _build_cart_response(cart, db)

    guest_cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    user_cart = _get_or_create_cart(db, user=user)

    if guest_cart and guest_cart.id != user_cart.id:
        for guest_item in guest_cart.items:
            existing = (
                db.query(CartItem)
                .filter(
                    CartItem.cart_id == user_cart.id,
                    CartItem.variant_id == guest_item.variant_id,
                )
                .first()
            )
            if existing:
                existing.quantity += guest_item.quantity
            else:
                new_item = CartItem(
                    cart_id=user_cart.id,
                    variant_id=guest_item.variant_id,
                    quantity=guest_item.quantity,
                )
                db.add(new_item)
        # Delete guest cart
        db.delete(guest_cart)
        db.commit()

    return _build_cart_response(user_cart, db)
