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

    # Add image_url column to categories if missing (pragmatic mini-migration)
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE categories ADD COLUMN image_url VARCHAR"))
            logger.info("Added image_url column to categories.")
        except Exception:
            pass  # column already exists

    # Seed a default collection (matches current hero) if none exist
    from app.database import SessionLocal as _S
    from app.models.collection import Collection
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
