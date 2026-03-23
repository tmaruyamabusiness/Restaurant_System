import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.menu import MenuCategory, MenuItem
from app.schemas.menu import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    MenuItemCreate, MenuItemUpdate, MenuItemResponse,
)

router = APIRouter(prefix="/api/menu", tags=["menu"])


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MenuCategory)
        .options(selectinload(MenuCategory.items))
        .order_by(MenuCategory.sort_order)
    )
    return list(result.scalars().all())


@router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    cat = MenuCategory(**data.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return CategoryResponse(
        id=cat.id, name=cat.name, sort_order=cat.sort_order,
        is_active=cat.is_active, items=[], created_at=cat.created_at,
    )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: uuid.UUID, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MenuCategory).options(selectinload(MenuCategory.items)).where(MenuCategory.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, key, value)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.get("/items", response_model=List[MenuItemResponse])
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).order_by(MenuItem.sort_order))
    return list(result.scalars().all())


@router.post("/items", response_model=MenuItemResponse)
async def create_item(data: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    cat = await db.get(MenuCategory, data.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    item = MenuItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=MenuItemResponse)
async def update_item(item_id: uuid.UUID, data: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item
