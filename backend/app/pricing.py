"""Pure Decimal calculations. Never round intermediate values."""
from decimal import Decimal, DefaultContext, getcontext
DefaultContext.prec = 50
getcontext().prec = 50
ZERO = Decimal(0)
HUNDRED = Decimal(100)

def grams(quantity, unit):
    return quantity * (Decimal(1000) if unit == 'kg' else Decimal(1))

def cost_per_gram(ingredient):
    return ingredient.package_price / grams(ingredient.package_quantity, ingredient.measurement_unit)

def margin(profit, revenue):
    return profit / revenue * HUNDRED if revenue else ZERO

def calculate_recipe(recipe, ingredients_cost):
    packaging = recipe.packaging_unit_cost * recipe.packaging_quantity
    operational = (ingredients_cost + packaging) * recipe.operational_expense_percentage / HUNDRED
    labor = recipe.hourly_labor_cost * Decimal(recipe.production_time_minutes) / Decimal(60)
    total = ingredients_cost + packaging + operational + labor
    unit = total / recipe.yield_quantity
    desired_profit = unit * recipe.desired_markup_percentage / HUNDRED
    suggested = unit + desired_profit
    effective = recipe.selling_price if recipe.selling_price is not None else suggested
    return dict(ingredients_cost=ingredients_cost, packaging_cost=packaging, operational_cost=operational,
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
