"""Private commercial documents. Prices are copied values, never live recipe references."""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, Response
from pydantic import Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from .auth import current_user
from .database import get_db
from .models import BusinessDocument, User
from .schemas import Input, Quantity
from .services import get_or_404

CENT = Decimal('0.01')

def document_totals(items, discount):
    lines = [(item.quantity * item.unit_price).quantize(CENT, rounding=ROUND_HALF_UP) for item in items]
    subtotal = sum(lines, Decimal(0))
    return dict(line_totals=lines, subtotal=subtotal, discount=discount, total=subtotal-discount)

class DocumentItem(Input):
    description: str = Field(min_length=1, max_length=1000)
    category: Literal['service', 'labor', 'material', 'equipment', 'other'] = 'service'
    quantity: Quantity
    unit_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)

class DocumentIn(Input):
    kind: Literal['quote', 'contract']
    title: str = Field(min_length=1, max_length=200)
    provider_name: str = Field(min_length=1, max_length=200)
    provider_document: str = Field(default='', max_length=40)
    provider_contact: str = Field(default='', max_length=300)
    provider_address: str = Field(default='', max_length=500)
    client_name: str = Field(min_length=1, max_length=200)
    client_document: str = Field(default='', max_length=40)
    client_contact: str = Field(default='', max_length=300)
    client_address: str = Field(default='', max_length=500)
    issue_date: date
    valid_until: date | None = None
    start_date: date
    end_date: date
    scope: str = Field(min_length=1, max_length=10000)
    payment_terms: str = Field(min_length=1, max_length=5000)
    terms: str = Field(default='', max_length=15000)
    items: list[DocumentItem] = Field(min_length=1, max_length=100)
    discount: Decimal = Field(default=Decimal(0), ge=0, max_digits=14, decimal_places=2)

    @model_validator(mode='after')
    def check_document(self):
        if self.kind == 'quote' and self.valid_until is None:
            raise ValueError('Informe a validade do orçamento.')
        if self.valid_until and self.valid_until < self.issue_date:
            raise ValueError('A validade não pode ser anterior à emissão.')
        if self.end_date < self.start_date:
            raise ValueError('O término não pode ser anterior ao início.')
        if self.kind == 'contract' and not self.terms:
            raise ValueError('Preencha as condições do contrato.')
        if document_totals(self.items, self.discount)['total'] < 0:
            raise ValueError('O desconto não pode superar o subtotal.')
        return self

class DocumentTotals(Input):
    line_totals: list[Decimal]
    subtotal: Decimal
    discount: Decimal
    total: Decimal

class DocumentOut(DocumentIn):
    id: UUID
    created_at: datetime
    updated_at: datetime
    totals: DocumentTotals

def output(obj):
    data = DocumentIn.model_validate(obj.payload)
    return DocumentOut(**data.model_dump(), id=obj.id, created_at=obj.created_at,
                       updated_at=obj.updated_at, totals=document_totals(data.items, data.discount))

router = APIRouter(prefix='/api/v1/documents')

@router.get('', response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), user: User = Depends(current_user)):
    items = db.scalars(select(BusinessDocument).where(BusinessDocument.owner_id==user.id).order_by(BusinessDocument.updated_at.desc())).all()
    return [output(item) for item in items]

@router.get('/{id}', response_model=DocumentOut)
def read_document(id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return output(get_or_404(db, BusinessDocument, id, user.id))

@router.post('', response_model=DocumentOut, status_code=201)
def create_document(data: DocumentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    obj = BusinessDocument(owner_id=user.id, payload=data.model_dump(mode='json'))
    db.add(obj)
    db.commit()
    return output(obj)

@router.put('/{id}', response_model=DocumentOut)
def update_document(id: UUID, data: DocumentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    obj = get_or_404(db, BusinessDocument, id, user.id)
    obj.payload = data.model_dump(mode='json')
    db.commit()
    return output(obj)

@router.delete('/{id}', status_code=204)
def delete_document(id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    obj = get_or_404(db, BusinessDocument, id, user.id)
    db.delete(obj)
    db.commit()
    return Response(status_code=204)

@router.get('/{id}/pdf')
def document_pdf(id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    from .document_pdf import make_document_pdf
    obj = output(get_or_404(db, BusinessDocument, id, user.id))
    kind = 'contrato' if obj.kind == 'contract' else 'orcamento'
    return Response(make_document_pdf(obj.model_dump(mode='json')), media_type='application/pdf',
                    headers={'Content-Disposition':f'attachment; filename="{kind}-{str(obj.id)[:8]}.pdf"'})
