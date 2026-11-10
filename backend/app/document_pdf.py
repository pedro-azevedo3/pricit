from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP
from xml.sax.saxutils import escape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from .pdf import styles, table

def exact_money(value):
    # Commercial documents use ordinary cent rounding; never the app's display-only rounding rule.
    value = Decimal(str(value)).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
    return 'R$ ' + f'{value:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')

def paragraph(value, style='BodyText'):
    return Paragraph('<br/>'.join(escape(line) for line in str(value).splitlines()) or '—', styles[style])

def date_text(value):
    return '/'.join(reversed(value.split('-')))

def make_document_pdf(data):
    buffer = BytesIO()
    kind = 'CONTRATO DE PRESTAÇÃO / FORNECIMENTO' if data['kind']=='contract' else 'ORÇAMENTO'
    number = str(data['id'])[:8].upper()
    doc = SimpleDocTemplate(buffer, pagesize=(210*mm,297*mm), rightMargin=20*mm,leftMargin=20*mm,
                            topMargin=18*mm,bottomMargin=18*mm,title=data['title'],author=data['provider_name'])
    story = [paragraph(f'{kind} · {number}', 'Heading2'), paragraph(data['title'], 'Title'),
             paragraph('Emissão: '+date_text(data['issue_date']))]
    if data['valid_until']:
        story.append(paragraph('Validade da proposta: '+date_text(data['valid_until'])))
    for role,prefix in [('Prestador / fornecedor','provider'),('Cliente / contratante','client')]:
        story.extend([Spacer(1,4*mm),paragraph(role,'Heading2'),paragraph(data[prefix+'_name'])])
        for field,label in [('document','CPF/CNPJ'),('contact','Contato'),('address','Endereço')]:
            if data[prefix+'_'+field]:
                story.append(paragraph(label+': '+data[prefix+'_'+field]))
    story.extend([Spacer(1,5*mm),paragraph('Objeto e escopo','Heading2'),paragraph(data['scope']),
                  paragraph('Início previsto: '+date_text(data['start_date'])+' · Término previsto: '+date_text(data['end_date'])),
                  Spacer(1,4*mm),paragraph('Itens e valores','Heading2')])
    labels={'service':'Serviço / entrega','labor':'Mão de obra','material':'Material','equipment':'Equipamento','other':'Outro'}
    rows=[['Descrição / categoria','Quantidade','Valor unitário','Total']]
    for index,item in enumerate(data['items']):
        quantity=format(Decimal(item['quantity']),'f').replace('.',',')
        rows.append([item['description']+' · '+labels[item['category']],quantity,exact_money(item['unit_price']),exact_money(data['totals']['line_totals'][index])])
    story.append(table(rows,[75*mm,25*mm,35*mm,35*mm]))
    story.extend([Spacer(1,4*mm),table([['Resumo','Valor'],['Subtotal',exact_money(data['totals']['subtotal'])],
                  ['Desconto',exact_money(data['discount'])],['Total',exact_money(data['totals']['total'])]],[125*mm,45*mm]),
                  Spacer(1,4*mm),paragraph('Condições de pagamento','Heading2'),paragraph(data['payment_terms'])])
    if data['terms']:
        story.extend([Spacer(1,4*mm),paragraph('Condições e responsabilidades','Heading2'),paragraph(data['terms'])])
    story.extend([Spacer(1,6*mm),paragraph('Aceite e assinaturas','Heading2'),paragraph('As partes deverão registrar o aceite das condições e dos valores apresentados.'),
                  Spacer(1,8*mm),paragraph('________________________________________'),paragraph(data['provider_name']),
                  Spacer(1,8*mm),paragraph('________________________________________'),paragraph(data['client_name']),
                  Spacer(1,4*mm),paragraph('Data do aceite: ____ / ____ / ________')])
    def footer(canvas, document):
        canvas.setFont('Helvetica',8)
        canvas.drawString(20*mm,10*mm,f'pricit · {number} · Valores em reais')
        canvas.drawRightString(190*mm,10*mm,str(document.page))
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    return buffer.getvalue()
