import os
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, FastAPI, Depends, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from .database import get_db
from .measurements import base_unit
from .models import Ingredient, Recipe, RecipeIngredient, RevenueSimulation
from .schemas import IngredientIn, IngredientOut, RecipeIn, RecipeOut, SimulationIn, SimulationOut, SimulationResult
from .services import get_or_404, ingredient_output, recipe_output, write_recipe
from .pricing import calculate_simulation
from .pdf import make_pdf

from .auth import current_user, router as auth_router

from .login_limit import LoginLimiter, LoginRateLimitMiddleware

app = FastAPI(title='pricit', version='1.0.0')
app.state.login_limiter = LoginLimiter()
app.add_middleware(LoginRateLimitMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS','http://localhost:3000,http://127.0.0.1:3000').split(','), allow_methods=['GET','POST','PUT','DELETE'], allow_headers=['Content-Type'])
app.include_router(auth_router)
protected = APIRouter(dependencies=[Depends(current_user)])
P = '/api/v1'
DB = Depends(get_db)

@app.get('/health')
def health(db: Session = DB):
    db.execute(text('SELECT 1'))
    return {'status': 'ok'}

@protected.get(P+'/ingredients', response_model=list[IngredientOut])
def list_ingredients(search: str = '', sort: str = Query('name', pattern='^(name|price|date)$'), include_archived: bool = False, db: Session = DB):
    # Randomized encryption deliberately prevents SQL search/order on private values.
    # Decrypt only in the application; no deterministic plaintext indexes are stored.
    items = db.scalars(select(Ingredient)).all()
    if search:
        items = [item for item in items if search.casefold() in item.name.casefold()]
    if not include_archived:
        items = [item for item in items if item.is_active]
    key = {'name': lambda i: i.name.casefold(), 'price': lambda i: i.package_price, 'date': lambda i: i.created_at}[sort]
    items.sort(key=key, reverse=sort == 'date')
    return [ingredient_output(item) for item in items]

@protected.get(P+'/ingredients/{id}', response_model=IngredientOut)
def read_ingredient(id: UUID, db: Session = DB):
    return ingredient_output(get_or_404(db, Ingredient, id))

@protected.post(P+'/ingredients', response_model=IngredientOut, status_code=201)
def create_ingredient(data: IngredientIn, db: Session = DB):
    obj = Ingredient(**data.model_dump())
    db.add(obj)
    db.commit()
    return ingredient_output(obj)

@protected.put(P+'/ingredients/{id}', response_model=IngredientOut)
def update_ingredient(id: UUID, data: IngredientIn, db: Session = DB):
    obj = db.scalar(select(Ingredient).where(Ingredient.id == id).with_for_update())
    if obj is None:
        raise HTTPException(404, 'Ingrediente não encontrado.')
    if base_unit(data.measurement_unit) != base_unit(obj.measurement_unit):
        used = db.scalar(select(RecipeIngredient.id).where(RecipeIngredient.ingredient_id == id).limit(1))
        if used:
            raise HTTPException(409, 'Este ingrediente já está em receitas. Remova os vínculos antes de trocar entre massa, volume e unidade.')
    for k,v in data.model_dump().items():
        setattr(obj,k,v)
    db.commit()
    return ingredient_output(obj)

@protected.delete(P+'/ingredients/{id}')
def delete_ingredient(id: UUID, archive: bool = False, db: Session = DB):
    obj = db.scalar(select(Ingredient).where(Ingredient.id == id).with_for_update())
    if obj is None:
        raise HTTPException(404, 'Ingrediente não encontrado.')
    used = db.scalar(select(RecipeIngredient.id).where(RecipeIngredient.ingredient_id == id).limit(1))
    if archive:
        obj.is_active = False
    elif used:
        raise HTTPException(409, 'Ingrediente utilizado em receitas. Arquive-o para preservar os vínculos.')
    else:
        db.delete(obj)
    db.commit()
    return {'action': 'archived' if archive else 'deleted'}

@protected.get(P+'/recipes', response_model=list[RecipeOut])
def list_recipes(db: Session = DB):
    return [recipe_output(r) for r in db.scalars(select(Recipe).order_by(Recipe.updated_at.desc())).all()]

@protected.get(P+'/recipes/{id}', response_model=RecipeOut)
def read_recipe(id: UUID, db: Session = DB):
    return recipe_output(get_or_404(db, Recipe, id))

@protected.post(P+'/recipes', response_model=RecipeOut, status_code=201)
def create_recipe(data: RecipeIn, db: Session = DB):
    return recipe_output(write_recipe(db,data))

@protected.put(P+'/recipes/{id}', response_model=RecipeOut)
def update_recipe(id: UUID, data: RecipeIn, db: Session = DB):
    return recipe_output(write_recipe(db,data,get_or_404(db,Recipe,id)))

@protected.delete(P+'/recipes/{id}', status_code=204)
def delete_recipe(id: UUID, db: Session = DB):
    obj = get_or_404(db,Recipe,id)
    db.delete(obj)
    db.commit()
    return Response(status_code=204)

@protected.post(P+'/recipes/{id}/duplicate', response_model=RecipeOut, status_code=201)
def duplicate_recipe(id: UUID, db: Session = DB):
    obj = get_or_404(db,Recipe,id)
    data = {key: getattr(obj,key) for key in RecipeIn.model_fields if key != 'ingredients'}
    data['name'] = obj.name[:192] + ' (cópia)'
    data['ingredients'] = [dict(ingredient_id=i.ingredient_id,quantity_used=i.quantity_used,measurement_unit=i.measurement_unit) for i in obj.ingredients]
    return recipe_output(write_recipe(db,RecipeIn(**data)))

def pdf_response(content, name):
    return Response(content,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="{name}.pdf"'})

@protected.get(P+'/recipes/{id}/pdf')
def recipe_pdf(id: UUID, db: Session = DB):
    return pdf_response(make_pdf(recipe_output(get_or_404(db,Recipe,id)).model_dump(mode='json')), 'receita')

def simulation_output(obj):
    # All results are read from the immutable JSON snapshot, never current prices.
    return SimulationOut(id=obj.id,recipe_id=obj.recipe_id,created_at=obj.created_at,
                         recipe_snapshot=obj.recipe_snapshot['recipe'],results=obj.recipe_snapshot['results'])

@protected.get(P+'/simulations', response_model=list[SimulationOut])
def list_simulations(db: Session = DB):
    return [simulation_output(s) for s in db.scalars(select(RevenueSimulation).order_by(RevenueSimulation.created_at.desc())).all()]

@protected.get(P+'/simulations/{id}', response_model=SimulationOut)
def read_simulation(id: UUID, db: Session = DB):
    return simulation_output(get_or_404(db,RevenueSimulation,id))

@protected.post(P+'/simulations', response_model=SimulationOut, status_code=201)
def create_simulation(data: SimulationIn, db: Session = DB):
    recipe = recipe_output(get_or_404(db,Recipe,data.recipe_id)).model_dump(mode='json')
    result = SimulationResult(**calculate_simulation(recipe,data.quantity_sold,data.selling_price))
    obj = RevenueSimulation(recipe_id=data.recipe_id,quantity_sold=data.quantity_sold,selling_price=result.selling_price,
        unit_cost_snapshot=Decimal(recipe['pricing']['unit_cost']),revenue_snapshot=result.revenue,
        production_cost_snapshot=result.production_cost,profit_snapshot=result.profit,margin_snapshot=result.margin,
        recipe_snapshot={'recipe': recipe, 'results': result.model_dump(mode='json')})
    db.add(obj)
    db.commit()
    return simulation_output(obj)

@protected.get(P+'/simulations/{id}/pdf')
def simulation_pdf(id: UUID, db: Session = DB):
    obj = get_or_404(db,RevenueSimulation,id)
    return pdf_response(make_pdf(obj.recipe_snapshot['recipe'],obj.recipe_snapshot['results'],obj.created_at),'simulacao')

app.include_router(protected)
