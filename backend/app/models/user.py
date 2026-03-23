import enum
from typing import Optional
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STAFF = "STAFF"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STAFF, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
