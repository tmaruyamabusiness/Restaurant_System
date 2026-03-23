"""Seed data script for initial menu items, seats, and admin user."""
import asyncio
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from passlib.context import CryptContext

from app.config import get_settings
from app.models.base import Base
from app.models.seat import Seat, SeatType
from app.models.menu import MenuCategory, MenuItem, TaxType
from app.models.user import User, UserRole

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # --- Seats ---
        seats_data = []
        # 6 counter seats
        for i in range(1, 7):
            seats_data.append(Seat(
                seat_number=f"C{i}",
                seat_type=SeatType.COUNTER,
                capacity=1,
                sort_order=i,
            ))
        # 2 two-person tables
        for i in range(1, 3):
            seats_data.append(Seat(
                seat_number=f"T2-{i}",
                seat_type=SeatType.TABLE_2,
                capacity=2,
                sort_order=10 + i,
            ))
        # 2 four-person tables
        for i in range(1, 3):
            seats_data.append(Seat(
                seat_number=f"T4-{i}",
                seat_type=SeatType.TABLE_4,
                capacity=4,
                sort_order=20 + i,
            ))

        for seat in seats_data:
            db.add(seat)

        # --- Menu Categories and Items ---
        appetizer_cat = MenuCategory(name="Appetizers", sort_order=1)
        main_cat = MenuCategory(name="Main Dishes", sort_order=2)
        side_cat = MenuCategory(name="Side Dishes", sort_order=3)
        drink_cat = MenuCategory(name="Drinks", sort_order=4)
        dessert_cat = MenuCategory(name="Desserts", sort_order=5)

        for cat in [appetizer_cat, main_cat, side_cat, drink_cat, dessert_cat]:
            db.add(cat)
        await db.flush()

        menu_items = [
            # Appetizers
            MenuItem(category_id=appetizer_cat.id, name="Edamame", price=Decimal("380"), tax_type=TaxType.STANDARD_10, sort_order=1),
            MenuItem(category_id=appetizer_cat.id, name="Gyoza (6pc)", price=Decimal("480"), tax_type=TaxType.STANDARD_10, sort_order=2),
            MenuItem(category_id=appetizer_cat.id, name="Agedashi Tofu", price=Decimal("420"), tax_type=TaxType.STANDARD_10, sort_order=3),
            MenuItem(category_id=appetizer_cat.id, name="Takoyaki (8pc)", price=Decimal("520"), tax_type=TaxType.STANDARD_10, sort_order=4),
            # Main Dishes
            MenuItem(category_id=main_cat.id, name="Tonkotsu Ramen", price=Decimal("980"), tax_type=TaxType.STANDARD_10, sort_order=1),
            MenuItem(category_id=main_cat.id, name="Shoyu Ramen", price=Decimal("880"), tax_type=TaxType.STANDARD_10, sort_order=2),
            MenuItem(category_id=main_cat.id, name="Miso Ramen", price=Decimal("920"), tax_type=TaxType.STANDARD_10, sort_order=3),
            MenuItem(category_id=main_cat.id, name="Chicken Katsu Curry", price=Decimal("1100"), tax_type=TaxType.STANDARD_10, sort_order=4),
            MenuItem(category_id=main_cat.id, name="Salmon Don", price=Decimal("1200"), tax_type=TaxType.STANDARD_10, sort_order=5),
            MenuItem(category_id=main_cat.id, name="Gyudon", price=Decimal("850"), tax_type=TaxType.STANDARD_10, sort_order=6),
            # Side Dishes
            MenuItem(category_id=side_cat.id, name="Rice", price=Decimal("200"), tax_type=TaxType.STANDARD_10, sort_order=1),
            MenuItem(category_id=side_cat.id, name="Miso Soup", price=Decimal("150"), tax_type=TaxType.STANDARD_10, sort_order=2),
            MenuItem(category_id=side_cat.id, name="Pickled Vegetables", price=Decimal("180"), tax_type=TaxType.STANDARD_10, sort_order=3),
            # Drinks
            MenuItem(category_id=drink_cat.id, name="Green Tea", price=Decimal("250"), tax_type=TaxType.REDUCED_8, sort_order=1),
            MenuItem(category_id=drink_cat.id, name="Oolong Tea", price=Decimal("280"), tax_type=TaxType.REDUCED_8, sort_order=2),
            MenuItem(category_id=drink_cat.id, name="Cola", price=Decimal("300"), tax_type=TaxType.REDUCED_8, sort_order=3),
            MenuItem(category_id=drink_cat.id, name="Draft Beer", price=Decimal("550"), tax_type=TaxType.STANDARD_10, sort_order=4),
            MenuItem(category_id=drink_cat.id, name="Sake (Glass)", price=Decimal("480"), tax_type=TaxType.STANDARD_10, sort_order=5),
            # Desserts
            MenuItem(category_id=dessert_cat.id, name="Matcha Ice Cream", price=Decimal("350"), tax_type=TaxType.STANDARD_10, sort_order=1),
            MenuItem(category_id=dessert_cat.id, name="Mochi (3pc)", price=Decimal("400"), tax_type=TaxType.STANDARD_10, sort_order=2),
        ]

        for item in menu_items:
            db.add(item)

        # --- Admin User ---
        admin = User(
            username="admin",
            email="admin@restaurant.local",
            hashed_password=pwd_context.hash("admin123"),
            role=UserRole.OWNER,
        )
        db.add(admin)

        staff = User(
            username="staff",
            email="staff@restaurant.local",
            hashed_password=pwd_context.hash("staff123"),
            role=UserRole.STAFF,
        )
        db.add(staff)

        await db.commit()

    await engine.dispose()
    print("Seed data created successfully!")
    print("  - 10 seats (6 counter + 2 two-person tables + 2 four-person tables)")
    print("  - 5 menu categories with 20 items")
    print("  - 2 users: admin/admin123 (OWNER), staff/staff123 (STAFF)")


if __name__ == "__main__":
    asyncio.run(seed())
