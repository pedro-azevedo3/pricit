from io import BytesIO
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Spacer
from .pdf import table
from .document_pdf import paragraph, exact_money

def quantity(value):
    return format(Decimal(str(value)),'f').replace('.',',')

def make_shopping_pdf(data):
    buffer=BytesIO()
    doc=SimpleDocTemplate(buffer,pagesize=(210*mm,297*mm),leftMargin=20*mm,rightMargin=20*mm,
                          topMargin=18*mm,bottomMargin=18*mm,title=data['name'],author='pricit')
    date=datetime.fromisoformat(data['updated_at']).astimezone(ZoneInfo('America/Recife')).strftime('%d/%m/%Y %H:%M')
    story=[paragraph('LISTA DE COMPRAS','Heading2'),paragraph(data['name'],'Title'),paragraph('Atualizada em '+date),
           paragraph(f"{len(data['items'])} item(ns) · {data['purchased_count']} comprado(s)"),Spacer(1,5*mm)]
    if data['notes']:
        story.extend([paragraph(data['notes']),Spacer(1,4*mm)])
    rows=[['Comprado','Item','Embalagem / referência','Qtd. emb.','Estimativa']]
    for item in data['items']:
        rows.append(['[x]' if item['purchased'] else '[ ]',item['name'],
            f"{quantity(item['package_quantity'])} {item['measurement_unit']} por {exact_money(item['package_price'])}",
            str(item['packages']),exact_money(item['estimated_cost'])])
    story.extend([table(rows,[18*mm,55*mm,47*mm,20*mm,30*mm]),Spacer(1,5*mm),
                  table([['Resumo','Valor'],['Total estimado',exact_money(data['estimated_total'])],
                         ['Pendente de compra',exact_money(data['pending_total'])]],[125*mm,45*mm]),Spacer(1,4*mm),
                  paragraph('Estimativas calculadas com os preços de referência salvos nesta lista. Confira os preços no momento da compra. A lista não altera seu estoque nem os cadastros da biblioteca.')])
    def footer(canvas,document):
        canvas.setFont('Helvetica',8)
        canvas.drawString(20*mm,10*mm,'pricit · Lista de compras · Valores em reais')
        canvas.drawRightString(190*mm,10*mm,str(document.page))
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    return buffer.getvalue()
