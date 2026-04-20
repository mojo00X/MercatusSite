from sqlalchemy.orm import Session

from app.models.product import ProductVariant


def check_stock(db: Session, variant_id: int, quantity: int) -> bool:
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        return False
    return variant.stock_quantity >= quantity


def reserve_stock(db: Session, variant_id: int, quantity: int) -> bool:
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant or variant.stock_quantity < quantity:
        return False
    variant.stock_quantity -= quantity
    log_inventory_change(db, variant_id, -quantity, "reserved")
    db.commit()
    return True


def release_stock(db: Session, variant_id: int, quantity: int) -> bool:
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        return False
    variant.stock_quantity += quantity
    log_inventory_change(db, variant_id, quantity, "released")
    db.commit()
    return True


def log_inventory_change(
    db: Session, variant_id: int, quantity_change: int, reason: str
) -> None:
    # In production, this would write to an inventory_log table.
    # For now we just track via the variant's stock_quantity field.
    pass
