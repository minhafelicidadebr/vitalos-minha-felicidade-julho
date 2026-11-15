"""Renderizador estático de fixture sintética. Não usa rede, sessão ou banco.
Uso: python scripts/render-editorial-prototype.py
Requer reportlab/pypdf/Pillow no ambiente de artefatos, não no runtime do app.
"""
import json
from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
model = json.loads((ROOT / '.institutional-admin.local/editorial-mete-model.json').read_text(encoding='utf-8'))
if model['mode'] != 'synthetic':
    raise ValueError('Somente fixture sintética é permitida neste renderizador.')
OUT = ROOT / 'docs/vitalos/artifacts/RELATORIO_METE_PROTOTIPO.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Editorial', str(FONT / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('EditorialBold', str(FONT / 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('EditorialTitle', str(FONT / 'georgia.ttf')))
pdfmetrics.registerFontFamily('Editorial', normal='Editorial', bold='EditorialBold')
GREEN = colors.HexColor('#0b3d2e')
INK = colors.HexColor('#1c2a24')
MUTED = colors.HexColor('#52615a')
PALE = colors.HexColor('#f2f4ef')
GOLD = colors.HexColor('#b38b25')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyE', fontName='Editorial', fontSize=10, leading=15, textColor=INK, spaceAfter=9))
styles.add(ParagraphStyle(name='SmallE', parent=styles['BodyE'], fontSize=8, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name='TitleE', fontName='EditorialTitle', fontSize=29, leading=35, textColor=GREEN, spaceAfter=16))
styles.add(ParagraphStyle(name='H1E', fontName='EditorialTitle', fontSize=21, leading=27, textColor=GREEN, spaceAfter=14))
styles.add(ParagraphStyle(name='H2E', fontName='EditorialBold', fontSize=12, leading=17, textColor=GREEN, spaceBefore=10, spaceAfter=7))
styles.add(ParagraphStyle(name='KickerE', fontName='EditorialBold', fontSize=9, leading=13, textColor=GREEN, spaceAfter=10))
story = []
def p(text, style='BodyE'):
    return Paragraph(escape(text).replace('\n', '<br/>'), styles[style])
def add(text, style='BodyE'):
    story.append(p(text, style))
def note(title, body):
    table = Table([[p(title, 'H2E')], [p(body)]], colWidths=[463])
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#d8dfd8')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,-1),(-1,-1),10)]))
    story.extend([table, Spacer(1,12)])
def page(title, number):
    story.append(PageBreak())
    add('VITALOS  /  PROTÓTIPO SINTÉTICO  /  '+number, 'KickerE')
    add(title, 'H1E')
def evidence_block(block):
    add(block['axis']+' - '+block['question'], 'H2E')
    evidence = block['projected']
    note(evidence['state']+' | '+evidence['label'], evidence['text'])
    for title, value in [('Fonte',evidence['source']),('Limites',evidence['limitation']),('O que permite compreender',block['interpretation']),('Próxima revisão',block['nextStep'])]:
        add(title, 'H2E'); add(value)

vitalos = Image(str(ROOT/'public/brand/vitalos/vitalos-logo-horizontal-on-light.png'), width=206, height=51.3)
from PIL import Image as RasterImage
institution_logo = ROOT/'public/brand/instituto/instituto-full-original.png'
with RasterImage.open(institution_logo) as original:
    logo_width, logo_height = original.size
instituto = Image(str(institution_logo), width=189, height=189 * logo_height / logo_width)
logos = Table([[vitalos, instituto]], colWidths=[253,234])
logos.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(0,0),(-1,-1),'LEFT'),('BOTTOMPADDING',(0,0),(-1,-1),22)]))
story.append(logos)
add('PROTÓTIPO SINTÉTICO - SEM DADOS DE CLIENTES','KickerE')
add('Desenvolvimento\norganizacional\nem evidência','TitleE')
add(model['organization'],'H2E')
add(model['period'])
add('Versão editorial '+model['version']+' | Corte da fixture: '+model['cutoff'],'SmallE')
story.append(Spacer(1,22))
note('Mensurar > Educar > Transformar > Evoluir','Um percurso para compreender evidências, reconhecer limites e decidir a continuidade. Este documento é um protótipo de apresentação, não uma emissão institucional homologada.')
add('Apresentação institucional','H2E')
add('Este relatório organiza exemplos de mensuração, oferta educativa, aplicação e revisão. Cada etapa distingue o observado, sua fonte, seus limites e a próxima decisão. Não representa resultados da organização logada no aplicativo.')
add('Propósito do Instituto','H2E')
add(model['institution']['mission'])
add('A missão expressa um propósito institucional; não é um resultado demonstrado neste período.','SmallE')

page('Uma leitura em três níveis','01 / ORIENTAÇÃO')
for title,body in [('Síntese executiva','O que está sustentado, o que falta e qual decisão merece atenção.'),('Análise por etapa','Observação, origem, interpretação permitida, limitação e próxima revisão.'),('Rastreabilidade e continuidade','Versões, referências da fixture, papéis propostos e evidência esperada.')]:
    note(title,body)
add('O exemplo não conta apenas uma história de sucesso','H2E')
add('Há uma execução sintética registrada, mas a falta de tempo autorizado permanece como barreira. A oferta educativa não possui avaliação de retenção ou transferência. O recorte protegido não apresenta contagens. A conclusão do ciclo é inconclusiva.')
add('Perspectivas e lentes','H2E')
add('EU, NÓS, LIDERANÇA e ORGANIZAÇÃO são perspectivas do IVO. Q1 COPSOQ, Q2 FIB-T, Q3 PERMA+V e Q4 VIA-T são lentes anuais; não equivalem uma a uma às etapas METE. Este protótipo não aprova mapeamentos ou índice composto.')
add('Legenda de interpretação','H2E')
add('Disponível: evidência apresentada com limites. Parcial: informação incompleta. Protegido: sem valor ou contagem. Método pendente: sem conclusão autorizada. Outros estados previstos no modelo incluem ausência, indisponibilidade, referência histórica e não aplicável.')

for i, block in enumerate(model['blocks']):
    page(block['axis']+': da evidência à decisão',f'0{i+2} / ANÁLISE')
    evidence_block(block)
    add('EXEMPLO SINTÉTICO - NÃO É RESULTADO DE CLIENTE','KickerE')

page('Continuidade, ESG e expediente','06 / RASTREABILIDADE')
note('Contribuições ESG: evidência antes da afirmação','Não há impacto ESG demonstrado neste protótipo. Participação, execução, mudança observada e causalidade são afirmações distintas. Não se atribuem notas E/S/G, conformidade ou equivalências GRI/ODS automaticamente.')
add('Compromissos propostos - não assumidos','H2E')
rows = [[p(x,'SmallE') for x in ['Próxima ação','Papel / revisão','Evidência esperada']]]
for item in model['commitments']:
    rows.append([p(item['action'],'SmallE'),p(item['role']+'\n'+item['timing'],'SmallE'),p(item['evidence'],'SmallE')])
table=Table(rows,colWidths=[154,150,183],repeatRows=1,hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#d8dfd8')),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story.extend([table,Spacer(1,14)])
add('Fontes e limites do protótipo','H2E')
add('EDU-01 e ACAO-01 identificam fixtures editoriais versão 0.1.0, não estudos científicos. Sem respostas pessoais, índice composto, benchmark, classificação de risco ou novo critério de eficácia. Estados protegidos são projetados sem valores, contagens ou fontes restritas.','SmallE')
add('Expediente institucional','H2E')
inst=model['institution']
add(inst['name']+' - '+inst['attribution'])
add(inst['address']+'\n'+inst['phone']+' | '+inst['site']+'\n'+inst['instagram'],'SmallE')
add('Contatos fornecidos pelo operador: '+inst['version']+'. Titularidade e redação definitiva dependem de validação institucional. Não há alegação de asseguração, PDF/UA ou conformidade ESG.','SmallE')

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs); self._saved=[]
    def showPage(self):
        self._saved.append(dict(self.__dict__)); self._startPage()
    def save(self):
        total=len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            self.setStrokeColor(GOLD); self.setLineWidth(.6); self.line(54,43,541,43)
            self.setFont('Editorial',8); self.setFillColor(MUTED)
            self.drawString(54,30,'VitalOS x Instituto Felicidade para Todos | SINTÉTICO')
            self.drawRightString(541,30,f'{self._pageNumber} / {total}')
            super().showPage()
        super().save()

doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=54,leftMargin=54,topMargin=46,bottomMargin=59,title='Protótipo sintético METE - VitalOS',author='VitalOS / Instituto Felicidade para Todos')
doc.build(story,canvasmaker=NumberedCanvas)
reader=PdfReader(str(OUT))
if len(reader.pages)!=7:
    raise ValueError(f'Paginação inesperada: {len(reader.pages)}; revisar antes de entregar.')
for index,pg in enumerate(reader.pages):
    txt=pg.extract_text()
    if 'SINTÉTICO' not in txt: raise ValueError(f'Falta aviso na página {index+1}')
print(f'PDF sintético gerado: {len(reader.pages)} páginas; texto e marcação verificados.')
