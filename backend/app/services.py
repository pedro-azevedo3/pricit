from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select
from .models import Ingredient, Recipe, RecipeIngredient
from .schemas import IngredientIn, IngredientOut, RecipeIn, RecipeOut
from .pricing import cost_per_base_unit, calculate_recipe
from .measurements import base_unit, base_quantity

def get_or_404(db, model, id):
    obj = db.get(model, id)
    if obj is None:
        raise HTTPException(404, 'Registro não encontrado.')
    return obj

def ingredient_output(obj):
    unit = base_unit(obj.measurement_unit)
    unit_cost = cost_per_base_unit(obj)
    return IngredientOut(**{key: getattr(obj, key) for key in IngredientIn.model_fields},
                         id=obj.id, created_at=obj.created_at, updated_at=obj.updated_at,
                         base_unit=unit, cost_per_base_unit=unit_cost,
                         cost_per_gram=unit_cost if unit == 'g' else None,
                         cost_per_kg=unit_cost*1000 if unit == 'g' else None)

def recipe_output(obj):
    items = []
    for item in obj.ingredients:
        ingredient = item.ingredient
        unit_cost = cost_per_base_unit(ingredient)
        items.append(dict(ingredient_id=ingredient.id, quantity_used=item.quantity_used,
                          measurement_unit=item.measurement_unit, name=ingredient.name,
                          is_active=ingredient.is_active, package_price=ingredient.package_price,
                          base_unit=base_unit(ingredient.measurement_unit), cost_per_base_unit=unit_cost,
                          cost_per_gram=unit_cost if base_unit(ingredient.measurement_unit) == 'g' else None,
                          cost=base_quantity(item.quantity_used, item.measurement_unit)*unit_cost))
    subtotal = sum((item['cost'] for item in items), Decimal(0))
    fields = {key: getattr(obj, key) for key in RecipeIn.model_fields if key != 'ingredients'}
    return RecipeOut(**fields, id=obj.id, created_at=obj.created_at, updated_at=obj.updated_at,
                     ingredients=items, pricing=calculate_recipe(obj, subtotal))

def write_recipe(db, data, obj=None):
    existing = {i.ingredient_id for i in obj.ingredients} if obj else set()
    # Lock ingredients to serialize archiving/deletion against recipe edits.
    ingredients = db.scalars(select(Ingredient).where(Ingredient.id.in_([i.ingredient_id for i in data.ingredients])).with_for_update()).all()
    lookup = {i.id: i for i in ingredients}
    for item in data.ingredients:
        ingredient = lookup.get(item.ingredient_id)
        if not ingredient:
            raise HTTPException(422, 'Ingrediente não encontrado.')
        if base_unit(item.measurement_unit) != base_unit(ingredient.measurement_unit):
            raise HTTPException(422, f'Unidade incompatível para {ingredient.name}. Use uma unidade da mesma medida do cadastro.')
        if not ingredient.is_active and item.ingredient_id not in existing:
            raise HTTPException(422, 'Ingredientes arquivados não podem ser adicionados.')
    if obj is None:
        obj = Recipe()
        db.add(obj)
    for key, value in data.model_dump(exclude={'ingredients'}).items():
        setattr(obj, key, value)
    obj.ingredients.clear()
    db.flush()
    obj.ingredients = [RecipeIngredient(**item.model_dump()) for item in data.ingredients]
    db.commit()
    db.expire(obj)
    return obj
