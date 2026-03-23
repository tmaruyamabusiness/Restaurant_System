"""Initial migration - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-03-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum types
    seat_type = postgresql.ENUM("COUNTER", "TABLE_2", "TABLE_4", name="seattype", create_type=True)
    session_status = postgresql.ENUM("VACANT", "GUIDED", "ORDERING", "BILLING", "CLEANING", name="sessionstatus", create_type=True)
    order_type = postgresql.ENUM("DINE_IN", "TAKEOUT", name="ordertype", create_type=True)
    order_status = postgresql.ENUM("OPEN", "CLOSED", "CANCELLED", name="orderstatus", create_type=True)
    order_item_status = postgresql.ENUM("PENDING", "COOKING", "READY", "SERVED", "CANCELLED", name="orderitemstatus", create_type=True)
    discount_type = postgresql.ENUM("NONE", "PERCENTAGE", "FIXED", name="discounttype", create_type=True)
    takeout_status = postgresql.ENUM("RECEIVED", "PREPARING", "READY", "PICKED_UP", name="takeoutstatus", create_type=True)
    payment_status_enum = postgresql.ENUM("UNPAID", "PAID", name="paymentstatus", create_type=True)
    payment_method = postgresql.ENUM("CASH", "CREDIT_CARD", "QR", name="paymentmethod", create_type=True)
    tax_type = postgresql.ENUM("STANDARD_10", "REDUCED_8", name="taxtype", create_type=True)
    user_role = postgresql.ENUM("OWNER", "MANAGER", "STAFF", name="userrole", create_type=True)

    for enum in [seat_type, session_status, order_type, order_status, order_item_status, discount_type, takeout_status, payment_status_enum, payment_method, tax_type, user_role]:
        enum.create(op.get_bind(), checkfirst=True)

    # seats
    op.create_table(
        "seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("seat_number", sa.String(20), unique=True, nullable=False),
        sa.Column("seat_type", seat_type, nullable=False),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("sort_order", sa.Integer, default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # seat_sessions
    op.create_table(
        "seat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("seat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("seats.id"), nullable=False),
        sa.Column("status", session_status, nullable=False),
        sa.Column("party_size", sa.Integer, default=1, nullable=False),
        sa.Column("seated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("billed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cleaned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # takeout_orders
    op.create_table(
        "takeout_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_name", sa.String(100), nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("pickup_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", takeout_status, nullable=False),
        sa.Column("payment_status", payment_status_enum, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # menu_categories
    op.create_table(
        "menu_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("sort_order", sa.Integer, default=0, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # menu_items
    op.create_table(
        "menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("menu_categories.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_type", tax_type, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_available", sa.Boolean, default=True, nullable=False),
        sa.Column("sort_order", sa.Integer, default=0, nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # orders
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("seat_sessions.id"), nullable=True),
        sa.Column("takeout_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("takeout_orders.id"), nullable=True),
        sa.Column("order_type", order_type, nullable=False),
        sa.Column("subtotal", sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 4), default=0.10, nullable=False),
        sa.Column("tax_amount", sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column("discount_amount", sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column("discount_type", discount_type, nullable=False),
        sa.Column("status", order_status, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # order_items
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("menu_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("menu_items.id"), nullable=False),
        sa.Column("item_name", sa.String(200), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer, default=1, nullable=False),
        sa.Column("status", order_item_status, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # payments
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("payment_method", payment_method, nullable=False),
        sa.Column("paid_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("change_amount", sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column("is_split", sa.Boolean, default=False, nullable=False),
        sa.Column("receipt_issued", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # payment_splits
    op.create_table(
        "payment_splits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=False),
        sa.Column("split_index", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_method", payment_method, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("email", sa.String(200), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(200), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("payment_splits")
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("menu_items")
    op.drop_table("menu_categories")
    op.drop_table("takeout_orders")
    op.drop_table("seat_sessions")
    op.drop_table("seats")
    op.drop_table("users")

    for name in ["userrole", "taxtype", "paymentmethod", "paymentstatus", "takeoutstatus",
                  "discounttype", "orderitemstatus", "orderstatus", "ordertype", "sessionstatus", "seattype"]:
        op.execute(f"DROP TYPE IF EXISTS {name}")
