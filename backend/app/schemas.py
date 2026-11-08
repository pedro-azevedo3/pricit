from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .measurements import MeasurementUnit

Money = Annotated[Decimal, Field(ge=0, max_digits=18, decimal_places=6)]
Quantity = Annotated[Decimal, Field(gt=0, max_digits=18, decimal_places=6)]
Percentage = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=6)]
PositiveInt = Annotated[int, Field(gt=0, le=1000000, strict=True)]
Count = Annotated[int, Field(ge=0, le=1000000, strict=True)]

class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')

class IngredientIn(Input):
    name: str = Field(min_length=1, max_length=200)
    measurement_unit: MeasurementUnit
    package_quantity: Quantity
    package_price: Money
    is_active: bool = True

class IngredientOut(IngredientIn):
    id: UUID
    created_at: datetime
    updated_at: datetime
    cost_per_gram: Decimal | None
    cost_per_kg: Decimal | None
    base_unit: Literal['g', 'ml', 'un']
    cost_per_base_unit: Decimal

class RecipeItemIn(Input):
    ingredient_id: UUID
    quantity_used: Quantity
    measurement_unit: MeasurementUnit

class RecipeIn(Input):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    yield_quantity: PositiveInt
    production_time_minutes: Count = 0
    packaging_unit_cost: Money = Decimal(0)
    packaging_quantity: Count
    operational_expense_percentage: Percentage = Decimal(0)
    hourly_labor_cost: Money = Decimal(0)
    desired_markup_percentage: Percentage = Decimal(0)
    selling_price: Money | None = None
    ingredients: list[RecipeItemIn] = Field(min_length=1, max_length=1000)

    @model_validator(mode='after')
    def unique_ingredients(self):
        ids = [i.ingredient_id for i in self.ingredients]
        if len(ids) != len(set(ids)):
            raise ValueError('Não repita ingredientes; altere a quantidade existente.')
        return self

class RecipeItemOut(RecipeItemIn):
    name: str
    is_active: bool
    package_price: Decimal
    cost_per_gram: Decimal | None
    base_unit: Literal['g', 'ml', 'un'] | None = None
    cost_per_base_unit: Decimal | None = None
    cost: Decimal

class Pricing(BaseModel):
    ingredients_cost: Decimal
    packaging_cost: Decimal
    operational_cost: Decimal
    labor_cost: Decimal
    total_cost: Decimal
    unit_cost: Decimal
    desired_profit: Decimal
    suggested_price: Decimal
    suggested_margin: Decimal
    effective_price: Decimal
    effective_profit: Decimal
    effective_margin: Decimal

class RecipeOut(RecipeIn):
    id: UUID
    created_at: datetime
    updated_at: datetime
    ingredients: list[RecipeItemOut]
    pricing: Pricing

class SimulationIn(Input):
    recipe_id: UUID
    quantity_sold: PositiveInt
    selling_price: Money | None = None

class SimulationResult(BaseModel):
    quantity_sold: int
    selling_price: Decimal
    revenue: Decimal
    production_cost: Decimal
    profit: Decimal
    margin: Decimal
    batches: int
    units_produced: int
    surplus: int
    batch_cost: Decimal
    batch_profit: Decimal
    batch_margin: Decimal

class SimulationOut(BaseModel):
    id: UUID
    recipe_id: UUID | None
    created_at: datetime
    recipe_snapshot: RecipeOut
    results: SimulationResult
