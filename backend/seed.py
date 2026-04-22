"""
Seed script for the clothing store database.
Run with: python seed.py
"""

import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.product import Category, Product, ProductVariant, ProductImage
from app.services.auth import hash_password


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded (has products)
        if db.query(Product).first():
            print("Products already seeded. Skipping.")
            return

        # ── Admin User (create only if missing) ─────────────────────────
        if not db.query(User).filter(User.email == "admin@store.com").first():
            admin = User(
                email="admin@store.com",
                hashed_password=hash_password("admin123"),
                full_name="Store Admin",
                is_admin=True,
            )
            db.add(admin)

        # ── Categories ───────────────────────────────────────────────────
        categories_data = [
            ("Tops", "tops"),
            ("Bottoms", "bottoms"),
            ("Outerwear", "outerwear"),
            ("Dresses", "dresses"),
            ("Accessories", "accessories"),
        ]
        categories = {}
        for name, slug in categories_data:
            cat = Category(name=name, slug=slug)
            db.add(cat)
            categories[slug] = cat

        db.flush()

        # ── Products ─────────────────────────────────────────────────────
        products_data = [
            # Tops
            {
                "name": "Classic Cotton T-Shirt",
                "slug": "classic-cotton-tshirt",
                "description": "A timeless everyday essential made from 100% organic cotton. Relaxed fit with a crew neckline, perfect for layering or wearing on its own.",
                "base_price": 29.99,
                "category": "tops",
                "gender": "unisex",
                "material": "100% Organic Cotton",
                "variants": [
                    ("S", "White", "#FFFFFF"), ("M", "White", "#FFFFFF"), ("L", "White", "#FFFFFF"),
                    ("S", "Black", "#000000"), ("M", "Black", "#000000"), ("L", "Black", "#000000"),
                ],
            },
            {
                "name": "Linen Button-Down Shirt",
                "slug": "linen-button-down-shirt",
                "description": "Lightweight linen shirt with a relaxed silhouette. Features mother-of-pearl buttons and a chest pocket. Ideal for warm weather.",
                "base_price": 79.99,
                "category": "tops",
                "gender": "men",
                "material": "100% Linen",
                "variants": [
                    ("S", "Sky Blue", "#87CEEB"), ("M", "Sky Blue", "#87CEEB"), ("L", "Sky Blue", "#87CEEB"),
                    ("M", "Sand", "#C2B280"), ("L", "Sand", "#C2B280"), ("XL", "Sand", "#C2B280"),
                ],
            },
            {
                "name": "Silk Blouse",
                "slug": "silk-blouse",
                "description": "Elegant silk blouse with a draped neckline and relaxed fit. Designed for effortless day-to-night transitions.",
                "base_price": 129.99,
                "category": "tops",
                "gender": "women",
                "material": "100% Mulberry Silk",
                "variants": [
                    ("XS", "Ivory", "#FFFFF0"), ("S", "Ivory", "#FFFFF0"), ("M", "Ivory", "#FFFFF0"),
                    ("XS", "Blush", "#DE5D83"), ("S", "Blush", "#DE5D83"), ("M", "Blush", "#DE5D83"),
                ],
            },
            # Bottoms
            {
                "name": "Slim Fit Chinos",
                "slug": "slim-fit-chinos",
                "description": "Modern slim-fit chinos crafted from stretch cotton twill. Versatile enough for both casual and smart-casual looks.",
                "base_price": 69.99,
                "category": "bottoms",
                "gender": "men",
                "material": "98% Cotton, 2% Elastane",
                "variants": [
                    ("30", "Navy", "#000080"), ("32", "Navy", "#000080"), ("34", "Navy", "#000080"),
                    ("30", "Khaki", "#C3B091"), ("32", "Khaki", "#C3B091"), ("34", "Khaki", "#C3B091"),
                ],
            },
            {
                "name": "High-Waist Wide Leg Jeans",
                "slug": "high-waist-wide-leg-jeans",
                "description": "Retro-inspired wide-leg jeans with a flattering high waist. Made from premium rigid denim that softens beautifully with wear.",
                "base_price": 89.99,
                "category": "bottoms",
                "gender": "women",
                "material": "100% Cotton Denim",
                "variants": [
                    ("24", "Indigo", "#3F0FB7"), ("26", "Indigo", "#3F0FB7"), ("28", "Indigo", "#3F0FB7"),
                    ("24", "Light Wash", "#B5C7D3"), ("26", "Light Wash", "#B5C7D3"), ("28", "Light Wash", "#B5C7D3"),
                ],
            },
            {
                "name": "Jogger Pants",
                "slug": "jogger-pants",
                "description": "Comfortable jogger pants with tapered legs and ribbed cuffs. Perfect for lounging or running errands in style.",
                "base_price": 49.99,
                "category": "bottoms",
                "gender": "unisex",
                "material": "80% Cotton, 20% Polyester",
                "variants": [
                    ("S", "Charcoal", "#36454F"), ("M", "Charcoal", "#36454F"), ("L", "Charcoal", "#36454F"),
                    ("S", "Olive", "#808000"), ("M", "Olive", "#808000"), ("L", "Olive", "#808000"),
                ],
            },
            # Outerwear
            {
                "name": "Wool Blend Overcoat",
                "slug": "wool-blend-overcoat",
                "description": "A sophisticated double-breasted overcoat in a warm wool blend. Fully lined with a notched lapel collar.",
                "base_price": 249.99,
                "category": "outerwear",
                "gender": "men",
                "material": "70% Wool, 30% Polyester",
                "variants": [
                    ("S", "Camel", "#C19A6B"), ("M", "Camel", "#C19A6B"), ("L", "Camel", "#C19A6B"),
                    ("M", "Charcoal", "#36454F"), ("L", "Charcoal", "#36454F"), ("XL", "Charcoal", "#36454F"),
                ],
            },
            {
                "name": "Puffer Jacket",
                "slug": "puffer-jacket",
                "description": "Lightweight yet warm quilted puffer jacket with recycled fill. Water-resistant outer shell and zip pockets.",
                "base_price": 159.99,
                "category": "outerwear",
                "gender": "unisex",
                "material": "Recycled Nylon",
                "variants": [
                    ("S", "Black", "#000000"), ("M", "Black", "#000000"), ("L", "Black", "#000000"),
                    ("S", "Forest Green", "#228B22"), ("M", "Forest Green", "#228B22"), ("L", "Forest Green", "#228B22"),
                ],
            },
            # Dresses
            {
                "name": "Midi Wrap Dress",
                "slug": "midi-wrap-dress",
                "description": "Flattering wrap dress in a flowy midi length. Features a self-tie waist and flutter sleeves. Perfect for any occasion.",
                "base_price": 99.99,
                "category": "dresses",
                "gender": "women",
                "material": "95% Viscose, 5% Elastane",
                "variants": [
                    ("XS", "Burgundy", "#800020"), ("S", "Burgundy", "#800020"), ("M", "Burgundy", "#800020"),
                    ("XS", "Emerald", "#50C878"), ("S", "Emerald", "#50C878"), ("M", "Emerald", "#50C878"),
                ],
            },
            {
                "name": "Knit Sweater Dress",
                "slug": "knit-sweater-dress",
                "description": "Cozy ribbed knit dress with a relaxed turtleneck. Falls just above the knee for a versatile silhouette.",
                "base_price": 119.99,
                "category": "dresses",
                "gender": "women",
                "material": "60% Merino Wool, 40% Acrylic",
                "variants": [
                    ("XS", "Oatmeal", "#D4C5A9"), ("S", "Oatmeal", "#D4C5A9"), ("M", "Oatmeal", "#D4C5A9"),
                    ("S", "Black", "#000000"), ("M", "Black", "#000000"), ("L", "Black", "#000000"),
                ],
            },
            # Accessories
            {
                "name": "Leather Belt",
                "slug": "leather-belt",
                "description": "Handcrafted full-grain leather belt with a brushed silver buckle. A wardrobe staple that ages beautifully.",
                "base_price": 59.99,
                "category": "accessories",
                "gender": "unisex",
                "material": "Full-Grain Leather",
                "variants": [
                    ("S", "Brown", "#8B4513"), ("M", "Brown", "#8B4513"), ("L", "Brown", "#8B4513"),
                    ("S", "Black", "#000000"), ("M", "Black", "#000000"), ("L", "Black", "#000000"),
                ],
            },
            {
                "name": "Cashmere Scarf",
                "slug": "cashmere-scarf",
                "description": "Luxuriously soft cashmere scarf with hand-rolled edges. Generously sized for wrapping and draping.",
                "base_price": 89.99,
                "category": "accessories",
                "gender": "unisex",
                "material": "100% Cashmere",
                "variants": [
                    ("One Size", "Grey", "#808080"),
                    ("One Size", "Camel", "#C19A6B"),
                    ("One Size", "Navy", "#000080"),
                ],
            },
        ]

        for p_data in products_data:
            product = Product(
                name=p_data["name"],
                slug=p_data["slug"],
                description=p_data["description"],
                base_price=p_data["base_price"],
                category_id=categories[p_data["category"]].id,
                gender=p_data["gender"],
                material=p_data["material"],
            )
            db.add(product)
            db.flush()

            # Add a placeholder image
            image = ProductImage(
                product_id=product.id,
                url=f"/static/products/{p_data['slug']}.jpg",
                alt_text=p_data["name"],
                is_primary=True,
                sort_order=0,
            )
            db.add(image)

            # Add variants
            for idx, (size, color, color_hex) in enumerate(p_data["variants"]):
                sku = f"{p_data['slug'][:10].upper().replace('-', '')}-{size}-{color[:3].upper()}-{idx}"
                variant = ProductVariant(
                    product_id=product.id,
                    size=size,
                    color=color,
                    color_hex=color_hex,
                    sku=sku,
                    stock_quantity=25,
                )
                db.add(variant)

        db.commit()
        print("Database seeded successfully!")
        print(f"  - Admin user: admin@store.com / admin123")
        print(f"  - {len(categories_data)} categories")
        print(f"  - {len(products_data)} products with variants")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
