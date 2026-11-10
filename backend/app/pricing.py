"""Pure Decimal calculations. Never round intermediate values."""
from decimal import Decimal, DefaultContext, getcontext
from .measurements import base_unit, base_quantity
DefaultContext.prec = 50
getcontext().prec = 50
ZERO = Decimal(0)
HUNDRED = Decimal(100)

def grams(quantity, unit):
    if base_unit(unit) != 'g':
        raise ValueError('A unidade não é uma medida de massa.')
    return base_quantity(quantity, unit)

def cost_per_base_unit(ingredient):
    return ingredient.package_price / base_quantity(ingredient.package_quantity, ingredient.measurement_unit)

def cost_per_gram(ingredient):
    if base_unit(ingredient.measurement_unit) != 'g':
        raise ValueError('O ingrediente não é medido em gramas.')
    return cost_per_base_unit(ingredient)

def margin(profit, revenue):
    return profit / revenue * HUNDRED if revenue else ZERO

def calculate_recipe(recipe, ingredients_cost):
    packaging = recipe.packaging_unit_cost * recipe.packaging_quantity
    operational = (ingredients_cost + packaging) * recipe.operational_expense_percentage / HUNDRED
    labor = recipe.hourly_labor_cost * Decimal(recipe.production_time_minutes) / Decimal(60)
    additional = sum((Decimal(str(item['unit_cost'])) * Decimal(str(item['quantity'])) for item in (getattr(recipe, 'additional_costs', None) or [])), ZERO)
    total = ingredients_cost + packaging + operational + labor + additional
    unit = total / recipe.yield_quantity
    desired_profit = unit * recipe.desired_markup_percentage / HUNDRED
    suggested = unit + desired_profit
    effective = recipe.selling_price if recipe.selling_price is not None else suggested
    return dict(additional_cost=additional, ingredients_cost=ingredients_cost, packaging_cost=packaging, operational_cost=operational,
                labor_cost=labor, total_cost=total, unit_cost=unit, desired_profit=desired_profit,
                suggested_price=suggested, suggested_margin=margin(desired_profit, suggested),
                effective_price=effective, effective_profit=effective-unit, effective_margin=margin(effective-unit, effective))

def calculate_simulation(recipe_snapshot, quantity, selling_price=None):
    pricing = recipe_snapshot['pricing']
    price = Decimal(selling_price) if selling_price is not None else Decimal(pricing['effective_price'])
    revenue = quantity * price
    cost = quantity * Decimal(pricing['unit_cost'])
    yield_quantity = recipe_snapshot['yield_quantity']
    batches = (quantity + yield_quantity - 1) // yield_quantity
    batch_cost = batches * Decimal(pricing['total_cost'])
    return dict(quantity_sold=quantity, selling_price=price, revenue=revenue, production_cost=cost,
                profit=revenue-cost, margin=margin(revenue-cost, revenue), batches=batches,
                units_produced=batches*yield_quantity, surplus=batches*yield_quantity-quantity,
                batch_cost=batch_cost, batch_profit=revenue-batch_cost, batch_margin=margin(revenue-batch_cost, revenue))
