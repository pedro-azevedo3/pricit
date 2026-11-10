from io import BytesIO
from datetime import datetime
from decimal import Decimal
from .formatting import money, percentage, decimal_text
from .measurements import base_unit
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

styles = getSampleStyleSheet()
styles['Title'].textColor = colors.HexColor('#1b2123')
styles['Heading2'].textColor = colors.HexColor('#1b2123')

def p(value, style='BodyText'):
    return Paragraph(escape(str(value)), styles[style])

def table(rows, widths=None):
    result = Table([[p(c) for c in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor('#c1ff72')), ('VALIGN',(0,0),(-1,-1),'TOP'), ('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#1b2123')), ('TOPPADDING',(0,0),(-1,-1),8), ('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    return result

def recipe_story(recipe):
    pricing = recipe['pricing']
    service = recipe.get('kind') == 'service'
    story = [p(recipe['name'], 'Title'), p(f"Rendimento: {recipe['yield_quantity']} {'atendimentos' if service else 'unidades'} • {'Atendimento' if service else 'Produção'}: {recipe['production_time_minutes']} minutos"), Spacer(1, 5*mm)]
    if recipe.get('description'):
        story += [p(recipe['description']), Spacer(1, 4*mm)]
    story += [p('Produtos utilizados' if service else 'Composição da receita', 'Heading2'), table([['Produto' if service else 'Ingrediente', 'Quantidade', 'Custo por medida', 'Custo']] + [[i['name'], f"{decimal_text(i['quantity_used'])} {i['measurement_unit']}", f"{money(i.get('cost_per_base_unit') if i.get('cost_per_base_unit') is not None else i['cost_per_gram'])} / {i.get('base_unit') or base_unit(i['measurement_unit'])}", money(i['cost'])] for i in recipe['ingredients']], [65*mm,32*mm,40*mm,33*mm])]
    rows = [['Precificação', 'Valor'], ['Produtos consumidos' if service else 'Ingredientes', money(pricing['ingredients_cost'])],
            [f"{'Descartáveis' if service else 'Embalagens'}: {recipe['packaging_quantity']} × {money(recipe['packaging_unit_cost'])}", money(pricing['packaging_cost'])],
            [f"Despesas: {percentage(recipe['operational_expense_percentage'])} sobre {'produtos + descartáveis' if service else 'ingredientes + embalagens'}", money(pricing['operational_cost'])],
            [f"Mão de obra: {money(recipe['hourly_labor_cost'])}/hora", money(pricing['labor_cost'])],
            ['Custo total do serviço' if service else 'Custo total da receita', money(pricing['total_cost'])], ['Custo por atendimento' if service else 'Custo por unidade', money(pricing['unit_cost'])],
            ['Markup sobre custo', percentage(recipe['desired_markup_percentage'])], ['Lucro desejado por unidade', money(pricing['desired_profit'])],
            ['Preço sugerido', money(pricing['suggested_price'])], ['Margem sugerida sobre faturamento', percentage(pricing['suggested_margin'])],
            ['Preço praticado', money(recipe['selling_price']) if recipe['selling_price'] is not None else 'Não informado; utiliza-se o sugerido'],
            ['Lucro efetivo por unidade', money(pricing['effective_profit'])], ['Margem efetiva', percentage(pricing['effective_margin'])]]
    extras = recipe.get('additional_costs') or []
    if extras:
        rows.insert(5, ['Energia, equipamentos e outros custos', money(pricing.get('additional_cost', 0))])
        labels = {'kwh': 'kWh', 'hour': 'hora(s)', 'unit': 'unidade(s)'}
        detail = [['Recurso', 'Quantidade', 'Valor por medida', 'Total']]
        for item in extras:
            detail.append([item['name'], f"{decimal_text(item['quantity'])} {labels[item['unit']]}", money(item['unit_cost']), money(Decimal(str(item['quantity'])) * Decimal(str(item['unit_cost'])))])
        story += [Spacer(1,5*mm), p('Custos de estrutura por lote / atendimento', 'Heading2'), table(detail, [65*mm,32*mm,40*mm,33*mm])]
    story += [Spacer(1,5*mm), table(rows,[125*mm,45*mm])]
    return story

def make_pdf(recipe, simulation=None, created_at=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(210*mm,297*mm), rightMargin=20*mm, leftMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm, title=recipe['name'], author='pricit')
    story = [p('pricit • CUSTOS E PRECIFICAÇÃO', 'Heading2'), p('Gerado em ' + datetime.now(ZoneInfo('America/Recife')).strftime('%d/%m/%Y %H:%M')), Spacer(1,5*mm)]
    service = recipe.get('kind') == 'service'
    if simulation:
        story += [p('Precificação', 'Heading1'), p('Precificação salva em ' + created_at.astimezone(ZoneInfo('America/Recife')).strftime('%d/%m/%Y %H:%M')), p('Valores históricos preservados no momento do salvamento.'), Spacer(1,4*mm)]
        s = simulation
        rows = [['Indicador', 'Resultado'],['Quantidade vendida',s['quantity_sold']],['Preço de venda',money(s['selling_price'])],['Faturamento bruto',money(s['revenue'])],['Custo proporcional estimado',money(s['production_cost'])],['Lucro proporcional',money(s['profit'])],['Margem proporcional',percentage(s['margin'])],['Fichas de atendimento necessárias' if service else 'Lotes inteiros necessários',s['batches']],['Atendimentos previstos' if service else 'Unidades produzidas',s['units_produced']],['Vagas sem faturamento' if service else 'Sobra sem faturamento',s['surplus']],['Custo da capacidade' if service else 'Custo por lotes inteiros',money(s['batch_cost'])],['Lucro após capacidade' if service else 'Lucro por lotes inteiros',money(s['batch_profit'])],['Margem após capacidade' if service else 'Margem por lotes inteiros',percentage(s['batch_margin'])]]
        story += [table(rows,[110*mm,60*mm]), p('O cenário proporcional é uma estimativa. Na capacidade completa, vagas não vendidas não geram receita.' if service else 'O cenário proporcional é uma estimativa. No cenário de lotes, a sobra não gera receita.'), Spacer(1,7*mm)]
    story += recipe_story(recipe)
    def footer(canvas, document):
        canvas.setFont('Helvetica',8)
        canvas.drawString(20*mm,10*mm,'pricit | Valores em reais • Arredondamento apenas na apresentação')
        canvas.drawRightString(190*mm,10*mm,str(document.page))
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    return buffer.getvalue()
