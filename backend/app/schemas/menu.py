import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.models.menu import TaxType


class MenuItemCreate(BaseModel):
    category_id: uuid.UUID
    name: str
    price: Decimal
    tax_type: TaxType = TaxType.STANDARD_10
    description: Optional[str] = None
    is_available: bool = True
    sort_order: int = 0
    image_url: Optional[str] = None


class MenuItemUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    price: Optional[Decimal] = None
    tax_type: Optional[TaxType] = None
    description: Optional[str] = None
    is_available: Optional[bool] = None
    sort_order: Optional[int] = None
    image_url: Optional[str] = None


class MenuItemResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    price: Decimal
    tax_type: TaxType
    description: Optional[str] = None
    is_available: bool
    sort_order: int
    image_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    is_active: bool
    items: List[MenuItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
