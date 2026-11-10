import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
from .encryption import encrypted

def now():
    return datetime.now(timezone.utc)

class Identity:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Owned:
    # Null is reserved for pre-isolation records awaiting an explicit admin review.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=True, index=True)

class Ingredient(Owned, Identity, Base):
    __tablename__ = 'ingredients'
    name = mapped_column(encrypted('ingredients', 'name'), nullable=False)
    measurement_unit = mapped_column(encrypted('ingredients', 'measurement_unit'), nullable=False)
    package_quantity = mapped_column(encrypted('ingredients', 'package_quantity'), nullable=False)
    package_price = mapped_column(encrypted('ingredients', 'package_price'), nullable=False)
    is_active = mapped_column(encrypted('ingredients', 'is_active'), nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Recipe(Owned, Identity, Base):
    __tablename__ = 'recipes'
    kind: Mapped[str] = mapped_column(String(16), default='recipe', server_default='recipe')
    additional_costs = mapped_column(encrypted('recipes', 'additional_costs'), nullable=True)
    name = mapped_column(encrypted('recipes', 'name'), nullable=False)
    description = mapped_column(encrypted('recipes', 'description'), nullable=True)
    yield_quantity = mapped_column(encrypted('recipes', 'yield_quantity'), nullable=False)
    production_time_minutes = mapped_column(encrypted('recipes', 'production_time_minutes'), nullable=False)
    packaging_unit_cost = mapped_column(encrypted('recipes', 'packaging_unit_cost'), nullable=False)
    packaging_quantity = mapped_column(encrypted('recipes', 'packaging_quantity'), nullable=False)
    operational_expense_percentage = mapped_column(encrypted('recipes', 'operational_expense_percentage'), nullable=False)
    hourly_labor_cost = mapped_column(encrypted('recipes', 'hourly_labor_cost'), nullable=False)
    desired_markup_percentage = mapped_column(encrypted('recipes', 'desired_markup_percentage'), nullable=False)
    selling_price = mapped_column(encrypted('recipes', 'selling_price'), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    ingredients: Mapped[list['RecipeIngredient']] = relationship(cascade='all, delete-orphan', lazy='selectin')

class RecipeIngredient(Identity, Base):
    __tablename__ = 'recipe_ingredients'
    __table_args__ = (UniqueConstraint('recipe_id', 'ingredient_id'),)
    recipe_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('recipes.id', ondelete='CASCADE'))
    ingredient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('ingredients.id', ondelete='RESTRICT'))
    quantity_used = mapped_column(encrypted('recipe_ingredients', 'quantity_used'), nullable=False)
    measurement_unit = mapped_column(encrypted('recipe_ingredients', 'measurement_unit'), nullable=False)
    ingredient: Mapped[Ingredient] = relationship(lazy='joined')

class RevenueSimulation(Owned, Identity, Base):
    __tablename__ = 'revenue_simulations'
    recipe_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('recipes.id', ondelete='SET NULL'), nullable=True)
    quantity_sold = mapped_column(encrypted('revenue_simulations', 'quantity_sold'), nullable=False)
    selling_price = mapped_column(encrypted('revenue_simulations', 'selling_price'), nullable=False)
    unit_cost_snapshot = mapped_column(encrypted('revenue_simulations', 'unit_cost_snapshot'), nullable=False)
    revenue_snapshot = mapped_column(encrypted('revenue_simulations', 'revenue_snapshot'), nullable=False)
    production_cost_snapshot = mapped_column(encrypted('revenue_simulations', 'production_cost_snapshot'), nullable=False)
    profit_snapshot = mapped_column(encrypted('revenue_simulations', 'profit_snapshot'), nullable=False)
    margin_snapshot = mapped_column(encrypted('revenue_simulations', 'margin_snapshot'), nullable=False)
    recipe_snapshot = mapped_column(encrypted('revenue_simulations', 'recipe_snapshot'), nullable=False)

class User(Identity, Base):
    __tablename__ = 'users'
    email: Mapped[str] = mapped_column(String(254), unique=True)
    business_name = mapped_column(encrypted('users', 'business_name'), nullable=True)
    business_type: Mapped[str] = mapped_column(String(24), default='food', server_default='food')
    pricing_goal: Mapped[str] = mapped_column(String(32), default='understand_costs', server_default='understand_costs')
    password_hash: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class UserSession(Base):
    __tablename__ = 'user_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

class BusinessDocument(Owned, Identity, Base):
    __tablename__ = 'business_documents'
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    payload = mapped_column(encrypted('business_documents', 'payload'), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class ShoppingList(Owned, Identity, Base):
    __tablename__ = 'shopping_lists'
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    payload = mapped_column(encrypted('shopping_lists', 'payload'), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
