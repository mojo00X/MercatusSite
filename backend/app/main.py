from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import admin, auth, cart, checkout, collections, orders, products

app = FastAPI(title="Mirevi API", version="1.0.0")

# CORS
allowed_origins = [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(checkout.router, prefix="/api/checkout", tags=["Checkout"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
def on_startup():
    import logging
    logger = logging.getLogger("uvicorn.error")

    # Import all models so they are registered with Base
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    # Pragmatic mini-migrations: ensure new columns exist on already-deployed DBs.
    # Each ALTER runs in its own transaction — on Postgres, a "column already
    # exists" error aborts the surrounding transaction, which would otherwise
    # silently skip every later ALTER in the same block.
    from sqlalchemy import text

    def _add_column_if_missing(sql: str, label: str) -> None:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
            logger.info(f"Added column: {label}.")
        except Exception:
            pass  # column already exists, or table not yet created

    _add_column_if_missing(
        "ALTER TABLE categories ADD COLUMN image_url VARCHAR",
        "categories.image_url",
    )
    _add_column_if_missing(
        "ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id)",
        "products.brand_id",
    )
    _add_column_if_missing(
        "ALTER TABLE products ADD COLUMN condition VARCHAR NOT NULL DEFAULT 'new'",
        "products.condition",
    )
    _add_column_if_missing(
        "ALTER TABLE products ADD COLUMN boutique_id INTEGER REFERENCES boutiques(id)",
        "products.boutique_id",
    )
    _add_column_if_missing(
        "ALTER TABLE products ADD COLUMN fulfillment_mode VARCHAR NOT NULL DEFAULT 'platform'",
        "products.fulfillment_mode",
    )
    _add_column_if_missing(
        "ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'customer'",
        "users.role",
    )
    # Backfill admins' role so the legacy is_admin flag and the new role enum
    # stay consistent. Idempotent — re-running just touches the same rows.
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role <> 'admin'")
            )
    except Exception:
        pass

    # Seed a default collection (matches current hero) if none exist
    from app.database import SessionLocal as _S
    from app.models.collection import Collection
    from app.models.product import Category
    _db = _S()
    try:
        if _db.query(Collection).count() == 0:
            _db.add(Collection(
                title="Shop the Latest Collection",
                subtitle="Discover curated fashion pieces designed for the modern wardrobe. Premium materials, timeless style.",
                image_url="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
                link_url="/products",
                button_text="Shop Now",
                sort_order=0,
                is_active=True,
            ))
            _db.commit()
            logger.info("Seeded default collection.")

        # Ensure a Pre-Owned "category" row exists so admins can upload its tile
        # image through CategoryManager. The storefront treats this row as the
        # condition=preowned filter, not as an assignable product category.
        if not _db.query(Category).filter(Category.slug == "preowned").first():
            _db.add(Category(name="Pre-Owned", slug="preowned"))
            _db.commit()
            logger.info("Seeded Pre-Owned category placeholder.")
    finally:
        _db.close()

    from app.database import SessionLocal
    from app.models.product import Product

    db = SessionLocal()
    try:
        product_count = db.query(Product).count()
        logger.info(f"Startup: found {product_count} products in database.")
        db.close()
        if product_count == 0:
            logger.info("Database empty — running seed...")
            try:
                from seed import seed
                seed()
                logger.info("Seed complete.")
            except Exception as e:
                logger.error(f"Seed failed: {e}", exc_info=True)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
