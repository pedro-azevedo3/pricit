"""Owned shopping lists; each item preserves its library reference at addition."""
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from .auth import current_user
from .database import get_db
from .measurements import MeasurementUnit
from .models import Ingredient, ShoppingList, User
from .schemas import Input, PositiveInt, Quantity, Money
from .services import get_or_404

class ShoppingItemIn(Input):
    ingredient_id: UUID
    packages: PositiveInt
    purchased: bool = Field(default=False, strict=True)

class ShoppingIn(Input):
    name: str = Field(min_length=1,max_length=200)
    notes: str = Field(default='',max_length=5000)
    items: list[ShoppingItemIn] = Field(min_length=1,max_length=1000)

    @model_validator(mode='after')
    def unique_items(self):
        ids = [item.ingredient_id for item in self.items]
        if len(set(ids)) != len(ids):
            raise ValueError('Não repita itens; altere a quantidade de embalagens.')
        return self

class ShoppingItemOut(ShoppingItemIn):
    name: str
    measurement_unit: MeasurementUnit
    package_quantity: Quantity
    package_price: Money
    estimated_cost: Decimal

class ShoppingOut(Input):
    id: UUID
    name: str
    notes: str
    created_at: datetime
    updated_at: datetime
    items: list[ShoppingItemOut]
    estimated_total: Decimal
    pending_total: Decimal
    purchased_count: int

def shopping_output(obj):
    items=[]
    for saved in obj.payload['items']:
        line = (Decimal(saved['package_price'])*saved['packages']).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
        items.append(ShoppingItemOut(**saved,estimated_cost=line))
    return ShoppingOut(id=obj.id,name=obj.payload['name'],notes=obj.payload['notes'],
        created_at=obj.created_at,updated_at=obj.updated_at,items=items,
        estimated_total=sum((item.estimated_cost for item in items),Decimal(0)),
        pending_total=sum((item.estimated_cost for item in items if not item.purchased),Decimal(0)),
        purchased_count=sum(item.purchased for item in items))

def write_list(db,data,user_id,obj=None):
    existing = {item['ingredient_id']:item for item in obj.payload['items']} if obj else {}
    new_ids = [item.ingredient_id for item in data.items if str(item.ingredient_id) not in existing]
    rows = db.scalars(select(Ingredient).where(Ingredient.owner_id==user_id,Ingredient.id.in_(new_ids)).with_for_update()).all()
    catalog = {row.id:row for row in rows}
    items=[]
    for item in data.items:
        saved = existing.get(str(item.ingredient_id))
        if saved is None:
            ingredient=catalog.get(item.ingredient_id)
            if ingredient is None or not ingredient.is_active:
                raise HTTPException(422,'Selecione um item ativo da sua biblioteca.')
            saved=dict(ingredient_id=str(ingredient.id),name=ingredient.name,measurement_unit=ingredient.measurement_unit,
                       package_quantity=str(ingredient.package_quantity),package_price=str(ingredient.package_price))
        items.append({**saved,'packages':item.packages,'purchased':item.purchased})
    if obj is None:
        obj=ShoppingList(owner_id=user_id)
        db.add(obj)
    obj.payload=dict(name=data.name,notes=data.notes,items=items)
    db.commit()
    return shopping_output(obj)

router=APIRouter(prefix='/api/v1/shopping-lists')

@router.get('',response_model=list[ShoppingOut])
def list_shopping(db:Session=Depends(get_db),user:User=Depends(current_user)):
    rows=db.scalars(select(ShoppingList).where(ShoppingList.owner_id==user.id).order_by(ShoppingList.updated_at.desc())).all()
    return [shopping_output(row) for row in rows]

@router.get('/{id}',response_model=ShoppingOut)
def read_shopping(id:UUID,db:Session=Depends(get_db),user:User=Depends(current_user)):
    return shopping_output(get_or_404(db,ShoppingList,id,user.id))

@router.post('',response_model=ShoppingOut,status_code=201)
def create_shopping(data:ShoppingIn,db:Session=Depends(get_db),user:User=Depends(current_user)):
    return write_list(db,data,user.id)

@router.put('/{id}',response_model=ShoppingOut)
def update_shopping(id:UUID,data:ShoppingIn,db:Session=Depends(get_db),user:User=Depends(current_user)):
    return write_list(db,data,user.id,get_or_404(db,ShoppingList,id,user.id))

@router.delete('/{id}',status_code=204)
def delete_shopping(id:UUID,db:Session=Depends(get_db),user:User=Depends(current_user)):
    obj=get_or_404(db,ShoppingList,id,user.id)
    db.delete(obj);db.commit()
    return Response(status_code=204)

@router.get('/{id}/pdf')
def shopping_pdf(id:UUID,db:Session=Depends(get_db),user:User=Depends(current_user)):
    from .shopping_pdf import make_shopping_pdf
    data=shopping_output(get_or_404(db,ShoppingList,id,user.id))
    return Response(make_shopping_pdf(data.model_dump(mode='json')),media_type='application/pdf',
        headers={'Content-Disposition':f'attachment; filename="lista-de-compras-{str(id)[:8]}.pdf"'})
