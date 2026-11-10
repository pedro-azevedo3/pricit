from decimal import Decimal
from uuid import uuid4
import pytest
from sqlalchemy import select, text
from app.auth import hash_password
from app.database import get_db
from app.main import app
from app.models import User
from app.document_pdf import exact_money

P='/api/v1/documents'

@pytest.fixture
def quote():
    return dict(kind='quote',title='Ensaio <fotográfico> & edição',provider_name='Profissional',client_name='Cliente A',
                issue_date='2026-11-10',valid_until='2026-11-20',start_date='2026-11-25',end_date='2026-11-26',
                scope='Ensaio com 20 imagens tratadas.',payment_terms='Pagamento na entrega.',
                items=[dict(description='Edição <completa> & entrega',quantity='2.5',unit_price='5.27',category='labor')],discount='1.01')

def test_document_crud_exact_cents_pdf_and_encrypted_payload(client,quote):
    assert client.get(P).json()==[]
    response=client.post(P,json=quote)
    assert response.status_code==201,response.text
    saved=response.json();id=saved['id']
    assert saved['totals']=={'line_totals':['13.18'],'subtotal':'13.18','discount':'1.01','total':'12.17'}
    assert exact_money('5.27')=='R$ 5,27'
    assert exact_money('12.17')=='R$ 12,17'
    assert exact_money('1.005')=='R$ 1,01'
    db=app.dependency_overrides[get_db]()
    raw=db.execute(text('SELECT payload FROM business_documents WHERE id=:id'),{'id':id}).scalar()
    assert raw.startswith('enc:v1:') and 'Cliente A' not in raw
    assert client.get(P+'/'+id).json()==saved
    pdf=client.get(P+'/'+id+'/pdf')
    assert pdf.status_code==200 and pdf.content.startswith(b'%PDF-')
    assert 'attachment' in pdf.headers['content-disposition'] and 'no-store' in pdf.headers['cache-control']
    updated=client.put(P+'/'+id,json=dict(quote,kind='contract',valid_until=None,terms='As partes concordam com o escopo e os valores.')).json()
    assert updated['kind']=='contract' and updated['totals']==saved['totals']
    assert client.get(P+'/'+id+'/pdf').status_code==200
    assert client.delete(P+'/'+id).status_code==204
    assert client.get(P+'/'+id).status_code==404

@pytest.mark.parametrize('patch',[
    {'discount':'999'}, {'discount':'-1'}, {'discount':'0.001'}, {'kind':'invalid'}, {'scope':' '},
    {'provider_name':''}, {'client_name':''}, {'payment_terms':''}, {'valid_until':None},
    {'valid_until':'2026-11-01'}, {'end_date':'2026-11-01'}, {'items':[]},
    {'items':[dict(description='Item',quantity='1',unit_price='5.271')]},
    {'items':[dict(description='Item',quantity='0',unit_price='5')]},
    {'items':[dict(description='Item',quantity='1',unit_price='-1')]},
    {'kind':'contract','terms':''}, {'owner_id':str(uuid4())}, {'totals':{'total':'1'}},
])
def test_invalid_documents(client,quote,patch):
    assert client.post(P,json=quote|patch).status_code==422

@pytest.mark.auth
def test_documents_are_private_and_cross_account_ids_cannot_be_used(client,quote):
    assert client.get(P).status_code==401
    db=app.dependency_overrides[get_db]()
    password='document-test-password'
    users=[User(email=f'doc-{index}@example.test',password_hash=hash_password(password)) for index in range(2)]
    db.add_all(users);db.commit()
    assert client.post('/api/v1/auth/login',json=dict(email=users[0].email,password=password)).status_code==200
    doc=client.post(P,json=quote).json()
    assert client.post('/api/v1/auth/logout').status_code==204
    assert client.get(P+'/'+doc['id']+'/pdf').status_code==401
    assert client.post('/api/v1/auth/login',json=dict(email=users[1].email,password=password)).status_code==200
    assert client.get(P).json()==[]
    for path in (P+'/'+doc['id'],P+'/'+doc['id']+'/pdf'):
        assert client.get(path).status_code==404
    assert client.put(P+'/'+doc['id'],json=quote).status_code==404
    assert client.delete(P+'/'+doc['id']).status_code==404
    own=client.post(P,json=dict(quote,client_name='Cliente B')).json()
    assert own['id']!=doc['id']
