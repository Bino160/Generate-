# -*- coding: utf-8 -*-
"""
M1 - Modelo comparativo das quatro vias (Projeto Dra. Julia Best / Gerir Saude).
Gerador do ficheiro Excel. A folha de calculo e o entregavel interno; este script
existe para tornar o modelo reprodutivel, versionavel e auditavel.

NAO ENTREGAR AO CLIENTE (ver seccao 5 do brief: entrega do ficheiro M1 esta fora de ambito).
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import LineChart, BarChart, Reference, Series

# ---------------------------------------------------------------- estilos
FONT = "Arial"
F_TITLE  = Font(name=FONT, size=14, bold=True, color="1F3864")
F_SUB    = Font(name=FONT, size=9,  italic=True, color="595959")
F_HDR    = Font(name=FONT, size=10, bold=True, color="FFFFFF")
F_SEC    = Font(name=FONT, size=10, bold=True, color="1F3864")
F_BODY   = Font(name=FONT, size=10)
F_INPUT  = Font(name=FONT, size=10, color="0000FF")          # input / lever
F_LINK   = Font(name=FONT, size=10, color="008000")          # link entre folhas
F_CALC   = Font(name=FONT, size=10)                          # formula
F_RESULT = Font(name=FONT, size=10, bold=True)
F_NOTE   = Font(name=FONT, size=8, italic=True, color="808080")

FILL_HDR   = PatternFill("solid", fgColor="1F3864")
FILL_SEC   = PatternFill("solid", fgColor="D9E2F3")
FILL_FILL  = PatternFill("solid", fgColor="FFFF00")          # a preencher
FILL_WARN  = PatternFill("solid", fgColor="FCE4D6")
FILL_RES   = PatternFill("solid", fgColor="E2EFDA")

THIN = Side(style="thin", color="BFBFBF")
BOX  = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
TOPL = Border(top=Side(style="thin", color="1F3864"))

EUR = '#,##0 "€";(#,##0 "€");"-"'
EUR2 = '#,##0.00 "€";(#,##0.00 "€");"-"'
PCT = '0.0%;(0.0%);"-"'
PCT2 = '0.00%;(0.00%);"-"'
NUM = '#,##0;(#,##0);"-"'

SCEN = [("C", "Baixo"), ("D", "Base"), ("E", "Alto")]

wb = Workbook()


def title(ws, text, sub=None, width=8):
    ws["A1"] = text
    ws["A1"].font = F_TITLE
    if sub:
        ws["A2"] = sub
        ws["A2"].font = F_SUB
    ws.sheet_view.showGridLines = False


def hdr(ws, row, labels, start=1):
    for i, lab in enumerate(labels):
        c = ws.cell(row=row, column=start + i, value=lab)
        c.font, c.fill, c.border = F_HDR, FILL_HDR, BOX
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 28


def section(ws, row, text, span=6):
    c = ws.cell(row=row, column=1, value=text)
    c.font, c.fill = F_SEC, FILL_SEC
    for i in range(2, span + 1):
        ws.cell(row=row, column=i).fill = FILL_SEC


def widths(ws, spec):
    for col, w in spec.items():
        ws.column_dimensions[col].width = w


# ================================================================ PARAMETROS
ws = wb.active
ws.title = "Parametros"
title(ws, "M1 — Parâmetros fiscais e contributivos",
      "Todos os parâmetros do modelo vivem aqui. Nenhuma folha de cálculo pode conter uma taxa escrita "
      "dentro de uma fórmula. Coluna E indica o estado de validação pela equipa de Fiscalidade.")
widths(ws, {"A": 46, "B": 16, "C": 16, "D": 62, "E": 26})

r = 4
hdr(ws, r, ["Parâmetro", "Referência", "Valor", "Fonte normativa", "Estado de validação"])
r += 1

P = {}   # chave -> referencia absoluta "Parametros!$C$n"

ROWS = [
    ("SEC", "Segurança Social"),
    ("P", "IAS", "Indexante dos Apoios Sociais (mensal)", 522.50, EUR2,
     "Portaria de atualização anual do IAS", "A ATUALIZAR PARA 2026"),
    ("P", "SS_TI_PCT", "TI — % da prestação de serviços que forma o rendimento relevante", 0.70, PCT,
     "Art. 162.º n.º 1 Cód. Contributivo", "Confirmar"),
    ("P", "SS_TI_TAXA", "TI — taxa contributiva", 0.214, PCT2,
     "Art. 168.º n.º 1 Cód. Contributivo", "Confirmar"),
    ("P", "SS_TI_TETO", "TI — teto da base de incidência mensal (múltiplo do IAS)", 12, NUM,
     "Art. 163.º n.º 2 Cód. Contributivo", "Confirmar"),
    ("P", "SS_TI_MIN", "TI — contribuição mensal mínima", 20.00, EUR2,
     "Regime dos trabalhadores independentes", "Confirmar"),
    ("P", "SS_MOE_ENT", "MOE/gerência — taxa a cargo da entidade", 0.2375, PCT2,
     "Art. 63.º e 168.º Cód. Contributivo", "CONFIRMAR (ver R1-12)"),
    ("P", "SS_MOE_BEN", "MOE/gerência — taxa a cargo do beneficiário", 0.11, PCT2,
     "Art. 63.º e 168.º Cód. Contributivo", "CONFIRMAR (ver R1-12)"),
    ("P", "SS_MOE_MIN", "MOE — base de incidência mínima (múltiplo do IAS)", 1, NUM,
     "Art. 166.º Cód. Contributivo", "Confirmar"),

    ("SEC", "IRS — categoria B e regras de determinação"),
    ("P", "COEF", "Coeficiente do regime simplificado (atividades do art. 151.º)", 0.75, PCT,
     "Art. 31.º n.º 1 al. b) CIRS — fisioterapeutas constam da tabela do art. 151.º", "Validado"),
    ("P", "LIM_JUST", "Limiar de justificação de despesas", 0.15, PCT,
     "Art. 31.º n.º 13 CIRS", "Validado"),
    ("P", "DED_ESP", "Dedução específica considerada na justificação de despesas", 4104.00, EUR2,
     "Art. 31.º n.º 13 al. a) CIRS", "Confirmar valor em vigor"),
    ("P", "LIM_CONTRIB", "Contribuições SS — dedutíveis na parte que excede esta % do rendimento bruto", 0.10, PCT,
     "Art. 31.º n.º 2 CIRS", "Confirmar"),
    ("P", "LIM_SIMPL", "Limiar de permanência no regime simplificado (rendimento bruto)", 200000.00, EUR,
     "Art. 28.º n.º 2 CIRS", "Confirmar"),
    ("P", "PERM_OPCAO", "Período mínimo de permanência na opção por contabilidade organizada (anos)", 3, NUM,
     "Art. 28.º n.º 5 CIRS", "Confirmar"),
    ("P", "DED_CATA", "Dedução específica da categoria A", 4104.00, EUR2,
     "Art. 25.º n.º 1 al. a) CIRS", "Confirmar valor em vigor"),
    ("P", "COEF_SALA", "Coeficiente do simplificado aplicável à receita de cedência de espaço", 0.35, PCT,
     "Art. 31.º n.º 1 al. c) CIRS — restantes prestações de serviços",
     "CONFIRMAR (ver R1-29). Depende de N1-04"),

    ("SEC", "IRC e tributação da distribuição"),
    ("P", "IRC_PME", "IRC — taxa aplicável ao primeiro escalão (PME)", 0.16, PCT,
     "Art. 87.º n.º 2 CIRC", "CONFIRMAR TAXA 2026 (ver R1-11)"),
    ("P", "IRC_LIM", "IRC — limite da matéria coletável do primeiro escalão", 50000.00, EUR,
     "Art. 87.º n.º 2 CIRC", "CONFIRMAR 2026"),
    ("P", "IRC_GER", "IRC — taxa geral", 0.20, PCT,
     "Art. 87.º n.º 1 CIRC", "CONFIRMAR TAXA 2026 (ver R1-11)"),
    ("P", "DERRAMA", "Derrama municipal (município do Porto)", 0.015, PCT2,
     "Art. 18.º Lei 73/2013 + deliberação municipal", "CONFIRMAR município e isenção PME"),
    ("P", "DERR_TRANSP", "Derrama incide sobre sociedade transparente? (1=sim / 0=não)", 0, NUM,
     "Questão controvertida — art. 12.º CIRC vs. art. 18.º Lei 73/2013", "EM ABERTO (ver R1-13)"),
    ("P", "DIV_LIB", "Dividendos — taxa liberatória", 0.28, PCT,
     "Art. 71.º n.º 1 CIRS", "Confirmar"),
    ("P", "DIV_ENG", "Dividendos — % considerada em caso de englobamento", 0.50, PCT,
     "Art. 40.º-A n.º 1 CIRS", "Confirmar"),

    ("SEC", "IVA"),
    ("P", "IVA_NORM", "IVA — taxa normal (continente)", 0.23, PCT,
     "Art. 18.º n.º 1 al. c) CIVA", "Validado"),
    ("P", "IVA_RED", "IVA — taxa reduzida (continente)", 0.06, PCT,
     "Art. 18.º n.º 1 al. a) CIVA + Lista I", "Validado"),

    ("SEC", "Amortizações (vias com contabilidade)"),
    ("P", "AM_OBRAS", "Taxa de amortização — obras / benfeitorias em imóvel alheio", 0.10, PCT,
     "DR 25/2009 — ou período do contrato de arrendamento, se inferior", "CONFIRMAR código aplicável"),
    ("P", "AM_EQUIP", "Taxa de amortização — equipamento clínico", 0.20, PCT,
     "DR 25/2009, tabela II", "CONFIRMAR código aplicável"),
    ("P", "AM_SOFT", "Taxa de amortização — software", 0.3333, PCT,
     "DR 25/2009", "CONFIRMAR"),

    ("SEC", "Transparência fiscal — limiares do teste (usados na N1, não no cálculo)"),
    ("P", "TF_CAP", "% mínima de capital detida por profissionais das atividades do art. 151.º", 0.75, PCT,
     "Art. 6.º n.º 4 al. b) subal. ii) CIRC", "Validado"),
    ("P", "TF_REND", "% mínima de rendimentos provenientes de atividades do art. 151.º", 0.75, PCT,
     "Art. 6.º n.º 4 al. b) subal. ii) CIRC", "Validado"),
    ("P", "TF_SOCIOS", "N.º máximo de sócios para o teste da subal. ii)", 5, NUM,
     "Art. 6.º n.º 4 al. b) subal. ii) CIRC", "Validado"),
]

for item in ROWS:
    if item[0] == "SEC":
        section(ws, r, item[1], span=5)
        r += 1
        continue
    _, key, label, val, fmt, src, status = item
    ws.cell(row=r, column=1, value=label).font = F_BODY
    ws.cell(row=r, column=2, value=key).font = F_NOTE
    c = ws.cell(row=r, column=3, value=val)
    c.font, c.number_format, c.fill, c.border = F_INPUT, fmt, FILL_FILL, BOX
    ws.cell(row=r, column=4, value=src).font = F_NOTE
    st = ws.cell(row=r, column=5, value=status)
    st.font = F_NOTE
    if status.startswith(("CONFIRMAR", "A ATUALIZAR", "EM ABERTO")):
        st.fill = FILL_WARN
    P[key] = "Parametros!$C$%d" % r
    r += 1

# ---- tabela de escaloes de IRS
r += 1
section(ws, r, "Escalões de IRS — taxas gerais", span=5); r += 1
ws.cell(row=r, column=1,
        value="Tabela em vigor: 2025 (Lei n.º 33-A/2025). ATUALIZAR para os escalões do OE2026 antes de "
              "qualquer número entrar no relatório. A coluna 'Delta' é a mecânica de cálculo "
              "(taxa do escalão menos taxa do anterior) e recalcula sozinha.").font = F_NOTE
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
ws.row_dimensions[r].height = 26
ws.cell(row=r, column=1).alignment = Alignment(wrap_text=True, vertical="top")
r += 1
hdr(ws, r, ["Escalão", "Limite inferior", "Limite superior", "Taxa", "Delta (calculado)"]); r += 1
ESC_TOP = r
ESCALOES = [
    (0.00,      8059.00,  0.1250),
    (8059.00,  12160.00,  0.1600),
    (12160.00, 17233.00,  0.2150),
    (17233.00, 22306.00,  0.2440),
    (22306.00, 28400.00,  0.3140),
    (28400.00, 41629.00,  0.3490),
    (41629.00, 44987.00,  0.4310),
    (44987.00, 83696.00,  0.4460),
    (83696.00, None,      0.4800),
]
for i, (lo, hi, tx) in enumerate(ESCALOES, start=1):
    ws.cell(row=r, column=1, value=i).font = F_BODY
    a = ws.cell(row=r, column=2, value=lo);  a.font, a.number_format, a.fill, a.border = F_INPUT, EUR, FILL_FILL, BOX
    b = ws.cell(row=r, column=3, value=hi if hi else "sem limite")
    b.font, b.border = F_INPUT, BOX
    if hi:
        b.number_format = EUR
    b.fill = FILL_FILL
    c = ws.cell(row=r, column=4, value=tx); c.font, c.number_format, c.fill, c.border = F_INPUT, PCT2, FILL_FILL, BOX
    d = ws.cell(row=r, column=5,
                value=("=D%d" % r) if i == 1 else ("=D%d-D%d" % (r, r - 1)))
    d.font, d.number_format, d.border = F_CALC, PCT2, BOX
    r += 1
ESC_BOT = r - 1
ESC_INF = "Parametros!$B$%d:$B$%d" % (ESC_TOP, ESC_BOT)
ESC_DEL = "Parametros!$E$%d:$E$%d" % (ESC_TOP, ESC_BOT)

# ---- taxa adicional de solidariedade
r += 1
section(ws, r, "Taxa adicional de solidariedade (art. 68.º-A CIRS)", span=5); r += 1
hdr(ws, r, ["Escalão", "Limite inferior", "Limite superior", "Taxa", "Delta (calculado)"]); r += 1
SOL_TOP = r
for i, (lo, hi, tx) in enumerate([(80000.0, 250000.0, 0.025), (250000.0, None, 0.05)], start=1):
    ws.cell(row=r, column=1, value=i).font = F_BODY
    a = ws.cell(row=r, column=2, value=lo);  a.font, a.number_format, a.fill, a.border = F_INPUT, EUR, FILL_FILL, BOX
    b = ws.cell(row=r, column=3, value=hi if hi else "sem limite")
    b.font, b.fill, b.border = F_INPUT, FILL_FILL, BOX
    if hi:
        b.number_format = EUR
    c = ws.cell(row=r, column=4, value=tx); c.font, c.number_format, c.fill, c.border = F_INPUT, PCT2, FILL_FILL, BOX
    d = ws.cell(row=r, column=5, value=("=D%d" % r) if i == 1 else ("=D%d-D%d" % (r, r - 1)))
    d.font, d.number_format, d.border = F_CALC, PCT2, BOX
    r += 1
SOL_BOT = r - 1
SOL_INF = "Parametros!$B$%d:$B$%d" % (SOL_TOP, SOL_BOT)
SOL_DEL = "Parametros!$E$%d:$E$%d" % (SOL_TOP, SOL_BOT)

r += 1
ws.cell(row=r, column=1,
        value="Legenda: células a azul sobre fundo amarelo são de preenchimento; tudo o resto é fórmula. "
              "Nenhuma taxa deve ser escrita dentro de uma fórmula noutra folha — se faltar um parâmetro, "
              "acrescenta-se aqui.").font = F_NOTE
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
ws.freeze_panes = "A5"


def coleta(rc):
    """Coleta de IRS pelas taxas gerais, por diferenciais de escalao."""
    return "SUMPRODUCT(({rc}>{inf})*({rc}-{inf})*{d})".format(rc=rc, inf=ESC_INF, d=ESC_DEL)


def solidariedade(rc):
    return "SUMPRODUCT(({rc}>{inf})*({rc}-{inf})*{d})".format(rc=rc, inf=SOL_INF, d=SOL_DEL)


# ================================================================ INPUTS
wsi = wb.create_sheet("Inputs")
title(wsi, "M1 — Inputs (folha única de parâmetros do caso)",
      "ATENÇÃO: à data de 22/08/2026 a cliente não forneceu nenhum dos inputs da secção 4 do brief. "
      "Todos os valores abaixo são ILUSTRATIVOS, servem apenas para testar o motor de cálculo, e estão "
      "registados como pressupostos em R1. Nenhum número desta folha pode transitar para o relatório "
      "enquanto não for substituído por dados da cliente.")
widths(wsi, {"A": 58, "B": 14, "C": 14, "D": 14, "E": 14, "F": 52})
wsi.merge_cells("A2:F2")
wsi["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wsi.row_dimensions[2].height = 46

r = 4
hdr(wsi, r, ["Input", "Referência", "Baixo", "Base", "Alto", "Nota / origem"]); r += 1

I = {}
IN_ROWS = [
    ("SEC", "Faturação e modelo de colaboração"),
    ("P", "FAT_PROP", "Faturação anual da própria Dra. Júlia (isenta, art. 9.º CIVA)", (52000, 65000, 85000), EUR,
     "Input cliente 1 — EM FALTA. Doentes próprios, independentemente do modelo de colaboração."),
    ("P", "FAT_COLAB", "Faturação anual gerada pelos fisioterapeutas a integrar", (18000, 30000, 45000), EUR,
     "Input cliente 1 e 5 — EM FALTA. No modelo 1 é faturada pela clínica; no modelo 2 é faturada "
     "diretamente pelos profissionais e nunca passa pela clínica."),
    ("P", "MOD_COLAB", "MODELO DE COLABORAÇÃO: 1 = prestação de serviços · 2 = cedência de sala", (1, 1, 1), NUM,
     "ALAVANCA. Ata, ponto 4. Alterna toda a estrutura de receita e custo. Sustenta a exposição E2.6."),
    ("P", "HONOR", "Modelo 1 — honorários anuais a pagar aos fisioterapeutas", (12600, 21000, 31500), EUR,
     "Input cliente 5 — EM FALTA. Placeholder a 70% da faturação que geram. Ignorado no modelo 2."),
    ("P", "REC_SALA", "Modelo 2 — receita anual de cedência de sala", (5400, 9000, 13500), EUR,
     "Input cliente 5 — EM FALTA. Placeholder a 30% da faturação que geram. Ignorado no modelo 1."),
    ("P", "SALA_TRIB", "Cedência de sala sujeita a IVA? (1 = sim / 0 = arrendamento isento)", (0, 0, 0), NUM,
     "Depende de N1-04: arrendamento isento (art. 9.º n.º 29 CIVA) ou prestação de serviços com "
     "disponibilização de meios, tributada. Não está resolvido."),
    ("P", "FAT_TRIB", "Faturação anual sujeita a IVA dentro da sociedade (atividade do cônjuge)", (0, 0, 0), EUR,
     "Input cliente 6 — EM FALTA. Só relevante na via 4 e no cenário de sujeito passivo misto."),

    ("SEC", "Custos operacionais anuais"),
    ("P", "RENDA", "Renda do espaço", (12000, 14400, 18000), EUR,
     "Input cliente 3 — EM FALTA. Baixo/Base = 2 gabinetes; Alto = 3 gabinetes."),
    ("P", "CONDOM", "Condomínio e encargos do espaço", (1200, 1500, 1800), EUR, "Input cliente 3 — EM FALTA."),
    ("P", "SEGUROS", "Seguros (RC profissional, multirriscos)", (900, 1100, 1400), EUR, "EM FALTA."),
    ("P", "SOFTW", "Software de gestão e faturação", (600, 900, 1200), EUR, "EM FALTA."),
    ("P", "CONSUM", "Consumíveis clínicos", (2100, 2850, 3900), EUR, "EM FALTA. Placeholder a 3% da faturação."),
    ("P", "OUTROS", "Outros custos operacionais", (1500, 2000, 2500), EUR, "EM FALTA."),
    ("P", "N_FISIO", "N.º de fisioterapeutas a integrar", (1, 1, 2), NUM, "Ata, ponto 3."),

    ("SEC", "Investimento inicial (valores sem IVA)"),
    ("P", "INV_OBRAS", "Obras e adaptação do espaço", (15000, 25000, 40000), EUR, "Input cliente 4 — EM FALTA."),
    ("P", "INV_EQUIP", "Equipamento clínico à taxa normal", (12000, 20000, 30000), EUR, "Input cliente 4 — EM FALTA."),
    ("P", "INV_EQUIP_R", "Equipamento clínico elegível para taxa reduzida", (0, 0, 0), EUR,
     "A confirmar contra as verbas 2.5 e 2.6 da Lista I do CIVA. Se houver elegibilidade, reduz a base do problema de IVA."),
    ("P", "INV_SOFT", "Software e sistemas", (1500, 2000, 3000), EUR, "EM FALTA."),

    ("SEC", "Vias societárias (3 e 4)"),
    ("P", "REM_GER", "Remuneração anual bruta de gerência", (14000, 16800, 20000), EUR,
     "Variável de decisão, não dado da cliente. Testar sensibilidade."),
    ("P", "TA_EST", "Tributações autónomas estimadas (anual)", (500, 800, 1200), EUR,
     "A quantificar pela Fiscalidade em função de viatura e despesas de representação."),
    ("P", "POL_DIST", "Política de distribuição de resultados (% do lucro após imposto)", (1.0, 1.0, 1.0), PCT,
     "ALAVANCA. Testar 0% / 50% / 100% — é aqui que se decide se afastar a transparência compensa."),
    ("P", "PCT_CONJ", "% do capital social detida pelo cônjuge", (0.26, 0.26, 0.26), PCT,
     "Só via 4. Tem de exceder 25% para afastar o teste de capital do art. 6.º n.º 4 al. b) ii) CIRC. Ver N1."),

    ("SEC", "Agregado familiar (IRS)"),
    ("P", "REND_CONJ", "Rendimento anual do cônjuge fora da estrutura (líquido de deduções específicas)",
     (14000, 18000, 22000), EUR, "Input cliente 6 e 7 — EM FALTA."),
    ("P", "CONJUNTA", "Opção por tributação conjunta (1 = sim / 0 = não)", (1, 1, 1), NUM, "Input cliente 7 — EM FALTA."),
    ("P", "N_DEP", "N.º de dependentes", (0, 0, 0), NUM, "Input cliente 7 — EM FALTA."),
    ("P", "DED_COL", "Deduções à coleta estimadas do agregado", (500, 500, 500), EUR,
     "EM FALTA. Não afeta a comparação entre vias (cancela-se no diferencial), afeta o IRS total."),
]

for item in IN_ROWS:
    if item[0] == "SEC":
        section(wsi, r, item[1], span=6); r += 1
        continue
    _, key, label, vals, fmt, note = item
    wsi.cell(row=r, column=1, value=label).font = F_BODY
    wsi.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wsi.cell(row=r, column=3 + j, value=vals[j])
        c.font, c.number_format, c.fill, c.border = F_INPUT, fmt, FILL_FILL, BOX
    n = wsi.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    if "EM FALTA" in note:
        n.fill = FILL_WARN
    I[key] = r
    r += 1


def inp(key, col):
    return "Inputs!$%s$%d" % (col, I[key])


# ---- grandezas derivadas do modelo de colaboracao
def der(key, label, fn, fmt=EUR, note="", style="calc"):
    global r
    wsi.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wsi.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wsi.cell(row=r, column=3 + j, value=fn(col))
        c.number_format, c.border = fmt, BOX
        c.font = F_RESULT if style == "result" else F_CALC
        if style == "result":
            c.fill = FILL_RES
    n = wsi.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    I[key] = r
    r += 1


section(wsi, r, "Derivadas — não preencher, calculam-se a partir do modelo de colaboração", span=6); r += 1
_M = lambda c: "Inputs!$%s$%d" % (c, I["MOD_COLAB"])
der("FAT_ISENTA", "Faturação isenta faturada pela estrutura",
    lambda c: "={p}+IF({m}=1,{k},0)".format(p=inp("FAT_PROP", c), m=_M(c), k=inp("FAT_COLAB", c)),
    note="No modelo 1 a clínica fatura ao doente a totalidade; no modelo 2 fatura apenas os doentes próprios.")
der("REC_NAOPROF", "Receita de cedência de espaço",
    lambda c: "=IF({m}=2,{r},0)".format(m=_M(c), r=inp("REC_SALA", c)),
    note="Rendimento que NÃO provém de atividade da lista do art. 151.º CIRS. Ver linha PCT_PROF.")
der("CUSTO_COLAB", "Custo com os colaboradores",
    lambda c: "=IF({m}=1,{h},0)".format(m=_M(c), h=inp("HONOR", c)))
der("MARGEM_COLAB", "MARGEM GERADA PELOS COLABORADORES",
    lambda c: "=IF({m}=1,{k}-{h},{r})".format(m=_M(c), k=inp("FAT_COLAB", c),
                                              h=inp("HONOR", c), r=inp("REC_SALA", c)),
    style="result",
    note="Exposição E2.6. É a resposta à pergunta da ata: qual dos dois modelos deixa mais margem. "
         "Alternar MOD_COLAB entre 1 e 2 e comparar esta linha.")
der("REC_TOTAL", "Receita total da estrutura (incl. cônjuge, se aplicável)",
    lambda c: "={a}+{b}+{d}".format(a=inp("FAT_ISENTA", c), b=inp("REC_NAOPROF", c), d=inp("FAT_TRIB", c)))
der("REC_TRIB", "Receita sujeita a IVA (base do pro rata)",
    lambda c: "={t}+IF({s}=1,{n},0)".format(t=inp("FAT_TRIB", c), s=inp("SALA_TRIB", c),
                                            n=inp("REC_NAOPROF", c)),
    note="Depende de N1-04: se a cedência for arrendamento isento, não entra.")
der("PCT_PROF", "% de rendimentos provenientes de atividades da lista do art. 151.º CIRS",
    lambda c: "=IF({t}<=0,0,{p}/{t})".format(t=inp("REC_TOTAL", c), p=inp("FAT_ISENTA", c)),
    fmt=PCT, style="result",
    note="Teste de rendimentos do art. 6.º n.º 4 al. b) ii) CIRC. Pressupõe que nem a cedência de espaço "
         "nem a atividade do cônjuge constam da lista — o segundo ponto é o R1-14, por verificar.")
der("REC_SALA_MIN", "Receita de cedência necessária para FALHAR o teste de rendimentos",
    lambda c: "={f}*(1-{t})/{t}".format(f=inp("FAT_ISENTA", c), t=P["TF_REND"]),
    note="Álgebra do teste: para os rendimentos profissionais descerem a 75% ou menos, a receita não "
         "profissional tem de atingir um terço da faturação profissional. Comparar com a linha REC_NAOPROF "
         "antes de propor esta via em N1, secção 5.")
der("TESTE_TF", "Teste de rendimentos do art. 6.º n.º 4 al. b) ii) CIRC",
    lambda c: '=IF({p}>{lim},"VERIFICADO — transparência não é afastada por esta via",'
              '"FALHADO — transparência afastada pelo critério de rendimentos")'.format(
                  p=inp("PCT_PROF", c), lim=P["TF_REND"]), fmt="General", style="result",
    note="N1, secção 5. Falhar este teste afasta o regime sem ceder um único euro de capital ao cônjuge.")

r += 1
wsi.cell(row=r, column=1, value="Exemplo de preenchimento correto — linha ilustrativa").font = F_SEC
r += 1
wsi.cell(row=r, column=1, value="Faturação anual da própria Dra. Júlia").font = F_NOTE
for j, v in enumerate([52000, 65000, 85000]):
    c = wsi.cell(row=r, column=3 + j, value=v); c.font, c.number_format = F_NOTE, EUR
wsi.cell(row=r, column=6,
         value="Formato esperado: valor anual, em euros, sem IVA, número puro sem texto.").font = F_NOTE
wsi.freeze_panes = "C5"


CUSTOS_OP = lambda col: "+".join(inp(k, col) for k in
                                 ["RENDA", "CONDOM", "SEGUROS", "SOFTW", "CONSUM", "OUTROS", "CUSTO_COLAB"])
CUSTOS_SEM_HON = lambda col: "+".join(inp(k, col) for k in
                                      ["RENDA", "CONDOM", "SEGUROS", "SOFTW", "CONSUM", "OUTROS"])
AMORT = lambda col: "{o}*{ao}+({e}+{er})*{ae}+{s}*{as_}".format(
    o=inp("INV_OBRAS", col), ao=P["AM_OBRAS"],
    e=inp("INV_EQUIP", col), er=inp("INV_EQUIP_R", col), ae=P["AM_EQUIP"],
    s=inp("INV_SOFT", col), as_=P["AM_SOFT"])


# ------------------------------------------------------- construtor de folhas
class Via:
    def __init__(self, name, head, sub):
        self.ws = wb.create_sheet(name)
        self.R = {}
        title(self.ws, head, sub)
        widths(self.ws, {"A": 62, "B": 13, "C": 14, "D": 14, "E": 14, "F": 50})
        self.ws.merge_cells("A2:F2")
        self.ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
        self.ws.row_dimensions[2].height = 40
        self.r = 4
        hdr(self.ws, self.r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota / norma"])
        self.r += 1
        self.ws.freeze_panes = "C5"

    def sec(self, text):
        section(self.ws, self.r, text, span=6)
        self.r += 1

    def row(self, key, label, fn, fmt=EUR, style="calc", note=""):
        r = self.r
        self.ws.cell(row=r, column=1, value=label).font = (
            F_RESULT if style == "result" else F_BODY)
        self.ws.cell(row=r, column=2, value=key).font = F_NOTE
        for j, (col, _n) in enumerate(SCEN):
            v = fn(col) if callable(fn) else fn
            c = self.ws.cell(row=r, column=3 + j, value=v)
            c.number_format, c.border = fmt, BOX
            c.font = {"link": F_LINK, "input": F_INPUT,
                      "result": F_RESULT, "calc": F_CALC}[style]
            if style == "result":
                c.fill = FILL_RES
        n = self.ws.cell(row=r, column=6, value=note)
        n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
        self.R[key] = r
        self.r += 1
        return r

    def c(self, key, col):
        return "$%s$%d" % (col, self.R[key])

    def ref(self, key, col):
        return "%s!$%s$%d" % (self.ws.title, col, self.R[key])


def irs_bloco(v, col, rc_com, rc_sem):
    """Devolve (formula_coleta_com, formula_coleta_sem) com quociente conjugal e solidariedade."""
    cj = inp("CONJUNTA", col)
    def f(rc):
        h = "(%s/2)" % rc
        return "IF({c}=1,2*({a}+{b}),{d}+{e})".format(
            c=cj, a=coleta(h), b=solidariedade(h), d=coleta(rc), e=solidariedade(rc))
    return f(rc_com), f(rc_sem)


NOTE_CAIXA = ("Caixa gerada pela atividade, igual nas quatro vias por construção. Exclui o investimento "
              "inicial, que é um efeito de ano 1 e está isolado na folha IVA e na linha própria abaixo.")

# ================================================================ VIA 1
v1 = Via("V1_ENI_Simplificado",
         "Via 1 — ENI, regime simplificado (situação atual)",
         "Enquadramento atual da cliente (ata, ponto 2). O ponto em teste é o do art. 31.º n.º 13 CIRS: "
         "com custos reais elevados, o coeficiente deixa de cobrir as despesas e ainda há acréscimo por "
         "insuficiência de justificação.")

v1.sec("Categoria B — regime simplificado")
v1.row("FAT", "Faturação isenta (fisioterapia)", lambda c: "=" + inp("FAT_ISENTA", c), style="link")
v1.row("REC_S", "Receita de cedência de espaço", lambda c: "=" + inp("REC_NAOPROF", c), style="link",
       note="Zero no modelo de prestação de serviços. Ver a alavanca MOD_COLAB na folha Inputs.")
v1.row("RB_TOT", "Rendimento bruto total da categoria B",
       lambda c: "={a}+{b}".format(a=v1.c("FAT", c), b=v1.c("REC_S", c)), style="result")
v1.row("COEF", "Coeficiente aplicável à fisioterapia", lambda c: "=" + P["COEF"], fmt=PCT, style="link",
       note="Art. 31.º n.º 1 al. b) CIRS. Fisioterapeutas constam da tabela do art. 151.º — o coeficiente "
            "0,35 não é aplicável a esta parcela.")
v1.row("COEF_S", "Coeficiente aplicável à cedência de espaço", lambda c: "=" + P["COEF_SALA"], fmt=PCT,
       style="link",
       note="Coeficiente distinto, e por confirmar (R1-29). Depende de a cedência ser qualificada como "
            "prestação de serviços ou como rendimento predial — N1-04.")
v1.row("RT_COEF", "Rendimento tributável pelos coeficientes",
       lambda c: "={f}*{k}+{s}*{ks}".format(f=v1.c("FAT", c), k=v1.c("COEF", c),
                                            s=v1.c("REC_S", c), ks=v1.c("COEF_S", c)))
v1.row("LIMIAR", "Limiar de justificação de despesas (15% do rendimento bruto)",
       lambda c: "={f}*{l}".format(f=v1.c("RB_TOT", c), l=P["LIM_JUST"]), note="Art. 31.º n.º 13 CIRS.")
v1.row("D_ESP", "Despesas justificáveis — dedução específica", lambda c: "=" + P["DED_ESP"], style="link")
v1.row("D_RENDA", "Despesas justificáveis — rendas do imóvel afeto",
       lambda c: "=" + inp("RENDA", c), style="link", note="Art. 31.º n.º 13 al. c) CIRS.")
v1.row("D_BENS", "Despesas justificáveis — aquisição de bens e serviços",
       lambda c: "=" + "+".join(inp(k, c) for k in
                                ["CONDOM", "SEGUROS", "SOFTW", "CONSUM", "OUTROS", "CUSTO_COLAB"]),
       style="link",
       note="Art. 31.º n.º 13 al. e) CIRS. Inclui os honorários, quando o modelo de colaboração for o de "
            "prestação de serviços.")
v1.row("D_INV", "Despesas justificáveis — aquisições de investimento do ano",
       lambda c: "={a}+{b}+{d}+{e}".format(a=inp("INV_OBRAS", c), b=inp("INV_EQUIP", c),
                                           d=inp("INV_EQUIP_R", c), e=inp("INV_SOFT", c)),
       style="link",
       note="A CONFIRMAR pela Fiscalidade: elegibilidade e grau de afetação das aquisições de investimento "
            "para efeitos do art. 31.º n.º 13 al. e). Efeito de ano 1 apenas. Ver R1-08.")
v1.row("D_TOT", "Total de despesas justificadas",
       lambda c: "=SUM({a}:{b})".format(a=v1.c("D_ESP", c), b=v1.c("D_INV", c)), style="result")
v1.row("ACRESC", "Acréscimo por insuficiência de justificação",
       lambda c: "=MAX(0,{l}-{t})".format(l=v1.c("LIMIAR", c), t=v1.c("D_TOT", c)),
       note="Art. 31.º n.º 13 CIRS: acresce ao rendimento tributável a diferença positiva.")
v1.row("RB_CATB", "Rendimento da categoria B antes da dedução de contribuições",
       lambda c: "={a}+{b}".format(a=v1.c("RT_COEF", c), b=v1.c("ACRESC", c)))

v1.sec("Segurança Social — trabalhador independente")
v1.row("SS_REL", "Rendimento relevante",
       lambda c: "={f}*{p}".format(f=v1.c("RB_TOT", c), p=P["SS_TI_PCT"]),
       note="Art. 162.º Cód. Contributivo: 70% do valor das prestações de serviços. A inclusão da receita "
            "de cedência de espaço depende de esta ser qualificada como prestação de serviços — N1-04.")
v1.row("SS_BASE", "Base de incidência anual, limitada ao teto",
       lambda c: "=MIN({r},{i}*{m}*12)".format(r=v1.c("SS_REL", c), i=P["IAS"], m=P["SS_TI_TETO"]),
       note="Teto mensal de 12 x IAS.")
v1.row("SS_CONTR", "Contribuição anual para a Segurança Social",
       lambda c: "=MAX({b}*{t},{m}*12)".format(b=v1.c("SS_BASE", c), t=P["SS_TI_TAXA"], m=P["SS_TI_MIN"]),
       style="result",
       note="Bloco ausente da ata. Na via 1 a base é a faturação bruta, não a margem — é aqui que está o "
            "maior diferencial entre as vias.")
v1.row("SS_DED", "Parte dedutível em IRS",
       lambda c: "=MAX(0,{s}-{f}*{l})".format(s=v1.c("SS_CONTR", c), f=v1.c("RB_TOT", c), l=P["LIM_CONTRIB"]),
       note="Art. 31.º n.º 2 CIRS: dedutível apenas na parte que excede 10% do rendimento bruto.")
v1.row("RL_CATB", "Rendimento líquido da categoria B",
       lambda c: "={a}-{b}".format(a=v1.c("RB_CATB", c), b=v1.c("SS_DED", c)), style="result")


# ------------------------------------------------- blocos partilhados (IRS + resultado)
def bloco_irs(v, rend_julia_fn, nota=""):
    v.sec("IRS do agregado")
    v.row("R_JUL", "Rendimento da sócia sujeito a englobamento", rend_julia_fn, style="result", note=nota)
    v.row("R_CONJ", "Rendimento do cônjuge fora da estrutura",
          lambda c: "=" + inp("REND_CONJ", c), style="link")
    v.row("RC_COM", "Rendimento coletável do agregado — com a atividade",
          lambda c: "={a}+{b}".format(a=v.c("R_JUL", c), b=v.c("R_CONJ", c)))
    v.row("RC_SEM", "Rendimento coletável do agregado — sem a atividade",
          lambda c: "=" + v.c("R_CONJ", c),
          note="Contrafactual. O diferencial entre as duas coletas é o IRS realmente imputável à atividade "
               "e é o que torna as quatro vias comparáveis.")
    v.row("COL_COM", "Coleta com a atividade (incl. taxa adicional de solidariedade)",
          lambda c: "=" + irs_bloco(v, c, v.c("RC_COM", c), v.c("RC_SEM", c))[0],
          note="Escalões e quociente conjugal na folha Parâmetros. Art. 68.º, 68.º-A e 69.º CIRS.")
    v.row("COL_SEM", "Coleta sem a atividade",
          lambda c: "=" + irs_bloco(v, c, v.c("RC_COM", c), v.c("RC_SEM", c))[1])
    v.row("IRS_ATIV", "IRS imputável à atividade", 
          lambda c: "={a}-{b}".format(a=v.c("COL_COM", c), b=v.c("COL_SEM", c)), style="result")
    v.row("IRS_TOT", "IRS total do agregado, após deduções à coleta (memória)",
          lambda c: "=MAX(0,{a}-{d})".format(a=v.c("COL_COM", c), d=inp("DED_COL", c)),
          note="Não entra na comparação entre vias; serve para o enquadramento do capítulo 3.")


def bloco_resultado(v, leak_extra, retido="0", conj_div="0", nota_leak=""):
    v.sec("Resultado")
    v.row("CAIXA", "Caixa gerada pela atividade, antes de impostos e contribuições",
          lambda c: "={f}+{n}+{t}-({o})".format(f=inp("FAT_ISENTA", c), n=inp("REC_NAOPROF", c),
                                              t=inp("FAT_TRIB", c), o=CUSTOS_OP(c)),
          style="result", note=NOTE_CAIXA)
    v.row("CARGA", "Total de impostos e contribuições",
          lambda c: "={i}+{e}".format(i=v.c("IRS_ATIV", c),
                                      e=leak_extra(c) if callable(leak_extra) else leak_extra),
          style="result", note=nota_leak)
    v.row("TAXA_EF", "Taxa de esforço efetiva sobre a caixa gerada",
          lambda c: "=IF({x}<=0,0,{y}/{x})".format(x=v.c("CAIXA", c), y=v.c("CARGA", c)), fmt=PCT)
    v.row("RETIDO", "Valor retido na sociedade (não disponibilizado à sócia)",
          (lambda c: "=" + retido(c)) if callable(retido) else "=0")
    v.row("LIQ_CJ", "Valor atribuído ao cônjuge por via de dividendos, líquido",
          (lambda c: "=" + conj_div(c)) if callable(conj_div) else "=0",
          note="Só via 4. É uma transferência real de rendimento dentro do agregado e tem de ser "
               "explicitada — não é indiferente à sócia.")
    v.row("LIQ_SOC", "LÍQUIDO DISPONÍVEL PARA A SÓCIA",
          lambda c: "={a}-{b}-{d}-{e}".format(a=v.c("CAIXA", c), b=v.c("CARGA", c),
                                              d=v.c("RETIDO", c), e=v.c("LIQ_CJ", c)), style="result")
    v.row("LIQ_AGR", "LÍQUIDO DISPONÍVEL PARA O AGREGADO",
          lambda c: "={a}+{b}".format(a=v.c("LIQ_SOC", c), b=v.c("LIQ_CJ", c)), style="result")
    v.row("INV_A1", "Memória — investimento e IVA não dedutível suportados no ano 1",
          lambda c: "={a}+{b}+{d}+{e}".format(a=inp("INV_OBRAS", c), b=inp("INV_EQUIP", c),
                                              d=inp("INV_EQUIP_R", c), e=inp("INV_SOFT", c)),
          note="Excluído da comparação anual acima. Quantificação do IVA na folha IVA.")


bloco_irs(v1, lambda c: "=" + v1.c("RL_CATB", c),
          nota="Só categoria B. Não há remuneração de gerência nesta via.")
bloco_resultado(v1, lambda c: v1.c("SS_CONTR", c),
                nota_leak="IRS imputável à atividade + contribuições para a Segurança Social.")


# ================================================================ VIA 2
v2 = Via("V2_ENI_ContOrg",
         "Via 2 — ENI com opção por contabilidade organizada",
         "Mantém o ENI e passa a deduzir os custos efetivos. Duas consequências que a ata não quantificou: "
         "a base de incidência da Segurança Social deixa de ser 70% da faturação e passa a ser o lucro "
         "tributável, e a opção vincula por 3 anos.")

v2.sec("Apuramento do lucro tributável")
v2.row("FAT", "Receita bruta (fisioterapia + cedência de espaço)",
       lambda c: "={a}+{b}".format(a=inp("FAT_ISENTA", c), b=inp("REC_NAOPROF", c)), style="link")
v2.row("C_OP", "Custos operacionais dedutíveis (excl. honorários)",
       lambda c: "=" + CUSTOS_SEM_HON(c), style="link")
v2.row("C_HON", "Custo com os colaboradores", lambda c: "=" + inp("CUSTO_COLAB", c), style="link",
       note="Dedutíveis como custo da atividade (ata, ponto 4). Sujeitos ao risco de requalificação "
            "tratado na fase 2 do P1.")
v2.row("AMORT", "Amortizações do exercício", lambda c: "=" + AMORT(c),
       note="Taxas na folha Parâmetros. Obras em imóvel alheio: confirmar se o período do contrato de "
            "arrendamento é inferior ao decorrente da taxa.")
v2.row("LT_ANTES", "Lucro tributável antes de contribuições",
       lambda c: "={f}-{o}-{h}-{a}".format(f=v2.c("FAT", c), o=v2.c("C_OP", c),
                                           h=v2.c("C_HON", c), a=v2.c("AMORT", c)), style="result")

v2.sec("Segurança Social — trabalhador independente com contabilidade organizada")
v2.row("SS_BASE", "Base de incidência anual, limitada ao teto",
       lambda c: "=MIN(MAX({l},0),{i}*{m}*12)".format(l=v2.c("LT_ANTES", c), i=P["IAS"], m=P["SS_TI_TETO"]),
       note="Art. 162.º n.º 3 Cód. Contributivo: com contabilidade organizada o rendimento relevante é o "
            "lucro tributável, não 70% da faturação. CONFIRMAR (R1-12). Modelado em regime de cruzeiro: "
            "no primeiro ano a base é a declarada no início de atividade.")
v2.row("SS_CONTR", "Contribuição anual para a Segurança Social",
       lambda c: "=MAX({b}*{t},{m}*12)".format(b=v2.c("SS_BASE", c), t=P["SS_TI_TAXA"], m=P["SS_TI_MIN"]),
       style="result")
v2.row("LT", "Lucro tributável após dedução das contribuições",
       lambda c: "=MAX(0,{a}-{b})".format(a=v2.c("LT_ANTES", c), b=v2.c("SS_CONTR", c)), style="result",
       note="Contribuições obrigatórias dedutíveis na totalidade nesta via, ao contrário do art. 31.º n.º 2.")

bloco_irs(v2, lambda c: "=" + v2.c("LT", c),
          nota="Lucro tributável real. Não há dedução específica de 4.104 € nesta via.")
bloco_resultado(v2, lambda c: v2.c("SS_CONTR", c),
                nota_leak="IRS imputável à atividade + contribuições para a Segurança Social.")


def bloco_irs_ext(v, rend_julia_fn, rend_conj_fn, nota=""):
    """Variante do bloco de IRS em que o rendimento do conjuge tambem pode ser afetado (englobamento)."""
    v.sec("IRS do agregado")
    v.row("R_JUL", "Rendimento da sócia sujeito a englobamento", rend_julia_fn, style="result", note=nota)
    v.row("R_CONJ", "Rendimento do cônjuge (incl. dividendos englobados, se aplicável)", rend_conj_fn)
    v.row("RC_COM", "Rendimento coletável do agregado — com a atividade",
          lambda c: "={a}+{b}".format(a=v.c("R_JUL", c), b=v.c("R_CONJ", c)))
    v.row("RC_SEM", "Rendimento coletável do agregado — sem a atividade",
          lambda c: "=" + inp("REND_CONJ", c), style="link",
          note="Contrafactual: apenas o rendimento do cônjuge fora da estrutura.")
    v.row("COL_COM", "Coleta com a atividade (incl. taxa adicional de solidariedade)",
          lambda c: "=" + irs_bloco(v, c, v.c("RC_COM", c), v.c("RC_SEM", c))[0])
    v.row("COL_SEM", "Coleta sem a atividade",
          lambda c: "=" + irs_bloco(v, c, v.c("RC_COM", c), v.c("RC_SEM", c))[1])
    v.row("IRS_ATIV", "IRS imputável à atividade",
          lambda c: "={a}-{b}".format(a=v.c("COL_COM", c), b=v.c("COL_SEM", c)), style="result")
    v.row("IRS_TOT", "IRS total do agregado, após deduções à coleta (memória)",
          lambda c: "=MAX(0,{a}-{d})".format(a=v.c("COL_COM", c), d=inp("DED_COL", c)))


# ================================================================ VIA 3
v3 = Via("V3_Soc_Transparente",
         "Via 3 — Sociedade sujeita a transparência fiscal (art. 6.º CIRC)",
         "Sociedade detida a 100% pela Dra. Júlia. O lucro é imputado à sócia e tributado em IRS "
         "independentemente de distribuição (art. 6.º n.º 3 CIRC e art. 20.º CIRS). A sociedade não é "
         "tributada em IRC sobre o lucro, mas mantém-se sujeita a tributações autónomas (art. 12.º CIRC).")

v3.sec("Apuramento ao nível da sociedade")
v3.row("FAT", "Receita bruta (fisioterapia + cedência de espaço)",
       lambda c: "={a}+{b}".format(a=inp("FAT_ISENTA", c), b=inp("REC_NAOPROF", c)), style="link")
v3.row("C_OP", "Custos operacionais (excl. honorários)", lambda c: "=" + CUSTOS_SEM_HON(c), style="link")
v3.row("C_HON", "Custo com os colaboradores", lambda c: "=" + inp("CUSTO_COLAB", c), style="link")
v3.row("AMORT", "Amortizações do exercício", lambda c: "=" + AMORT(c))
v3.row("REM", "Remuneração bruta de gerência", lambda c: "=" + inp("REM_GER", c), style="link",
       note="Variável de decisão. É a única base de incidência contributiva nesta via.")
v3.row("BASE_MOE", "Base de incidência contributiva do MOE",
       lambda c: "=MAX({r},{i}*{m}*12)".format(r=v3.c("REM", c), i=P["IAS"], m=P["SS_MOE_MIN"]),
       note="Base mínima de 1 x IAS por mês, mesmo com remuneração inferior ou nula.")
v3.row("TSU_ENT", "Contribuições a cargo da sociedade",
       lambda c: "={b}*{t}".format(b=v3.c("BASE_MOE", c), t=P["SS_MOE_ENT"]))
v3.row("LT", "Lucro tributável",
       lambda c: "={f}-{o}-{h}-{a}-{r}-{t}".format(f=v3.c("FAT", c), o=v3.c("C_OP", c), h=v3.c("C_HON", c),
                                                   a=v3.c("AMORT", c), r=v3.c("REM", c), t=v3.c("TSU_ENT", c)),
       style="result")
v3.row("TA", "Tributações autónomas", lambda c: "=" + inp("TA_EST", c), style="link",
       note="Devidas apesar da transparência fiscal — art. 12.º CIRC ressalva as tributações autónomas.")
v3.row("DERR", "Derrama municipal",
       lambda c: "=MAX({l},0)*{d}*{s}".format(l=v3.c("LT", c), d=P["DERRAMA"], s=P["DERR_TRANSP"]),
       note="Interruptor na folha Parâmetros, por defeito a 0. A incidência de derrama sobre sociedade "
            "transparente é questão controvertida — ver R1-13. Não afirmar no relatório sem decisão da Fiscalidade.")
v3.row("LUCRO_IMP", "Lucro imputável à sócia", lambda c: "=MAX({l},0)".format(l=v3.c("LT", c)),
       style="result",
       note="Imputado independentemente de distribuição. Prejuízo fiscal não é imputado — é reportado na "
            "esfera da sociedade.")

v3.sec("Esfera da sócia")
v3.row("SS_TRAB", "Contribuições a cargo da sócia (categoria A)",
       lambda c: "={b}*{t}".format(b=v3.c("BASE_MOE", c), t=P["SS_MOE_BEN"]))
v3.row("DED_A", "Dedução específica da categoria A",
       lambda c: "=MIN({r},MAX({d},{s}))".format(r=v3.c("REM", c), d=P["DED_CATA"], s=v3.c("SS_TRAB", c)),
       note="Art. 25.º n.º 1 al. a) e n.º 2 CIRS: o maior entre 4.104 € e as contribuições, com o limite "
            "do próprio rendimento.")
v3.row("RL_CATA", "Rendimento líquido da categoria A",
       lambda c: "=MAX(0,{r}-{d})".format(r=v3.c("REM", c), d=v3.c("DED_A", c)))

bloco_irs(v3, lambda c: "={a}+{b}".format(a=v3.c("RL_CATA", c), b=v3.c("LUCRO_IMP", c)),
          nota="Categoria A (remuneração de gerência) + categoria B (lucro imputado, art. 20.º CIRS).")

bloco_resultado(
    v3,
    leak_extra=lambda c: "{a}+{b}+{d}+{e}".format(a=v3.c("SS_TRAB", c), b=v3.c("TSU_ENT", c),
                                                  d=v3.c("TA", c), e=v3.c("DERR", c)),
    retido=lambda c: "MAX(0,({f}+{n}+{t}-({o}))-{r}-{s}-{ta}-{de})*(1-{p})".format(
        f=inp("FAT_ISENTA", c), n=inp("REC_NAOPROF", c),
        t=inp("FAT_TRIB", c), o=CUSTOS_OP(c), r=v3.c("REM", c),
        s=v3.c("TSU_ENT", c), ta=v3.c("TA", c), de=v3.c("DERR", c), p=inp("POL_DIST", c)),
    nota_leak="IRS imputável + contribuições da sócia + contribuições da sociedade + tributações "
              "autónomas + derrama. A distribuição do lucro já imputado não é novamente tributada.")


# ================================================================ VIA 4
v4 = Via("V4_Soc_NaoTransparente",
         "Via 4 — Sociedade fora da transparência fiscal (entrada do cônjuge)",
         "Pressupõe que a entrada do cônjuge afasta o regime do art. 6.º CIRC (ver N1 para o teste). "
         "O lucro passa a ser tributado em IRC e a distribuição é tributada de novo na esfera dos sócios. "
         "A pergunta a que esta folha responde não é 'sai da transparência?' mas 'compensa sair?'.")

v4.sec("Apuramento ao nível da sociedade")
v4.row("FAT", "Receita isenta (fisioterapia + cedência de espaço, se isenta)",
       lambda c: "={a}+IF({s}=1,0,{b})".format(a=inp("FAT_ISENTA", c), s=inp("SALA_TRIB", c),
                                               b=inp("REC_NAOPROF", c)), style="link")
v4.row("FAT_T", "Receita sujeita a IVA (cônjuge e/ou cedência tributada)",
       lambda c: "=" + inp("REC_TRIB", c), style="link")
v4.row("C_OP", "Custos operacionais (excl. honorários)", lambda c: "=" + CUSTOS_SEM_HON(c), style="link")
v4.row("C_HON", "Custo com os colaboradores", lambda c: "=" + inp("CUSTO_COLAB", c), style="link")
v4.row("AMORT", "Amortizações do exercício", lambda c: "=" + AMORT(c))
v4.row("REM", "Remuneração bruta de gerência", lambda c: "=" + inp("REM_GER", c), style="link")
v4.row("BASE_MOE", "Base de incidência contributiva do MOE",
       lambda c: "=MAX({r},{i}*{m}*12)".format(r=v4.c("REM", c), i=P["IAS"], m=P["SS_MOE_MIN"]))
v4.row("TSU_ENT", "Contribuições a cargo da sociedade",
       lambda c: "={b}*{t}".format(b=v4.c("BASE_MOE", c), t=P["SS_MOE_ENT"]))
v4.row("LT", "Lucro tributável",
       lambda c: "={f}+{ft}-{o}-{h}-{a}-{r}-{t}".format(f=v4.c("FAT", c), ft=v4.c("FAT_T", c),
                                                        o=v4.c("C_OP", c), h=v4.c("C_HON", c),
                                                        a=v4.c("AMORT", c), r=v4.c("REM", c),
                                                        t=v4.c("TSU_ENT", c)), style="result")
v4.row("IRC", "IRC",
       lambda c: "=MIN(MAX({l},0),{lim})*{p}+MAX(0,MAX({l},0)-{lim})*{g}".format(
           l=v4.c("LT", c), lim=P["IRC_LIM"], p=P["IRC_PME"], g=P["IRC_GER"]),
       note="Art. 87.º n.º 1 e 2 CIRC. Taxas de 2026 por confirmar — ver R1-11. O primeiro escalão só é "
            "aplicável se a sociedade qualificar como PME.")
v4.row("DERR", "Derrama municipal",
       lambda c: "=MAX({l},0)*{d}".format(l=v4.c("LT", c), d=P["DERRAMA"]),
       note="Confirmar a taxa e eventual isenção do município para volume de negócios reduzido.")
v4.row("TA", "Tributações autónomas", lambda c: "=" + inp("TA_EST", c), style="link")
v4.row("LUCRO_LIQ", "Lucro após imposto",
       lambda c: "={l}-{i}-{d}-{t}".format(l=v4.c("LT", c), i=v4.c("IRC", c),
                                           d=v4.c("DERR", c), t=v4.c("TA", c)), style="result")

v4.sec("Distribuição de resultados")
v4.row("CX_DIST", "Caixa distribuível",
       lambda c: "=MAX(0,({f}+{n}+{t}-({o}))-{r}-{s}-{i}-{d}-{ta})".format(
           f=inp("FAT_ISENTA", c), n=inp("REC_NAOPROF", c), t=inp("FAT_TRIB", c), o=CUSTOS_OP(c), r=v4.c("REM", c), s=v4.c("TSU_ENT", c),
           i=v4.c("IRC", c), d=v4.c("DERR", c), ta=v4.c("TA", c)),
       note="Base de caixa: as amortizações não são saída de caixa, pelo que a caixa distribuível excede "
            "o lucro contabilístico enquanto o investimento estiver a ser amortizado.")
v4.row("POL", "Política de distribuição", lambda c: "=" + inp("POL_DIST", c), fmt=PCT, style="link",
       note="ALAVANCA PRINCIPAL desta via. A 0% de distribuição a via 4 domina; a 100% pode inverter-se.")
v4.row("DIST", "Montante distribuído",
       lambda c: "={a}*{b}".format(a=v4.c("CX_DIST", c), b=v4.c("POL", c)))
v4.row("PCT_CJ", "% do capital detida pelo cônjuge", lambda c: "=" + inp("PCT_CONJ", c), fmt=PCT, style="link")
v4.row("DIV_JUL", "Dividendo atribuído à sócia",
       lambda c: "={a}*(1-{b})".format(a=v4.c("DIST", c), b=v4.c("PCT_CJ", c)))
v4.row("DIV_CJ", "Dividendo atribuído ao cônjuge",
       lambda c: "={a}*{b}".format(a=v4.c("DIST", c), b=v4.c("PCT_CJ", c)),
       note="Consequência não fiscal e frequentemente esquecida: a participação que afasta a transparência "
            "desloca essa fração do lucro para o cônjuge, em definitivo.")
v4.row("ENGLOB", "Opção por englobamento dos dividendos (1 = sim / 0 = retenção liberatória)",
       0, fmt=NUM, style="input",
       note="ALAVANCA. Testar ambas. Art. 71.º n.º 6 e art. 40.º-A CIRS.")
v4.row("IMP_DIV", "Imposto sobre dividendos, por retenção liberatória",
       lambda c: "=IF({e}=1,0,({a}+{b})*{t})".format(e=v4.c("ENGLOB", c), a=v4.c("DIV_JUL", c),
                                                     b=v4.c("DIV_CJ", c), t=P["DIV_LIB"]))

bloco_irs_ext(
    v4,
    rend_julia_fn=lambda c: "=MAX(0,{r}-MIN({r},MAX({d},{b}*{t})))+IF({e}=1,{dj}*{pe},0)".format(
        r=v4.c("REM", c), d=P["DED_CATA"], b=v4.c("BASE_MOE", c), t=P["SS_MOE_BEN"],
        e=v4.c("ENGLOB", c), dj=v4.c("DIV_JUL", c), pe=P["DIV_ENG"]),
    rend_conj_fn=lambda c: "={r}+IF({e}=1,{dc}*{pe},0)".format(
        r=inp("REND_CONJ", c), e=v4.c("ENGLOB", c), dc=v4.c("DIV_CJ", c), pe=P["DIV_ENG"]),
    nota="Categoria A líquida da dedução específica, mais 50% dos dividendos se houver englobamento "
         "(art. 40.º-A CIRS).")

v4.row("SS_TRAB", "Contribuições a cargo da sócia (memória)",
       lambda c: "={b}*{t}".format(b=v4.c("BASE_MOE", c), t=P["SS_MOE_BEN"]))

bloco_resultado(
    v4,
    leak_extra=lambda c: "{a}+{b}+{i}+{d}+{t}+{v}".format(a=v4.c("SS_TRAB", c), b=v4.c("TSU_ENT", c),
                                                          i=v4.c("IRC", c), d=v4.c("DERR", c),
                                                          t=v4.c("TA", c), v=v4.c("IMP_DIV", c)),
    retido=lambda c: "{a}-{b}".format(a=v4.c("CX_DIST", c), b=v4.c("DIST", c)),
    conj_div=lambda c: "{a}-IF({e}=1,0,{a}*{t})".format(a=v4.c("DIV_CJ", c), e=v4.c("ENGLOB", c),
                                                        t=P["DIV_LIB"]),
    nota_leak="IRS imputável + contribuições da sócia e da sociedade + IRC + derrama + tributações "
              "autónomas + imposto sobre dividendos.")


# ================================================================ IVA
wv = wb.create_sheet("IVA")
title(wv, "M1 — IVA sobre o investimento e custos correntes",
      "A fisioterapia é isenta pelo art. 9.º n.º 1 CIVA. É isenção incompleta: não confere direito à "
      "dedução. Todo o IVA suportado é custo. Esta folha quantifica o custo e testa as duas atenuantes: "
      "taxa reduzida em equipamento (Lista I) e sujeito passivo misto por entrada do cônjuge.")
widths(wv, {"A": 58, "B": 13, "C": 14, "D": 14, "E": 14, "F": 52})
wv.merge_cells("A2:F2"); wv["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wv.row_dimensions[2].height = 46
r = 4
hdr(wv, r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota / norma"]); r += 1
VR = {}


def vrow(key, label, fn, fmt=EUR, style="calc", note=""):
    global r
    wv.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wv.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        v = fn(col) if callable(fn) else fn
        c = wv.cell(row=r, column=3 + j, value=v)
        c.number_format, c.border = fmt, BOX
        c.font = {"link": F_LINK, "input": F_INPUT, "result": F_RESULT, "calc": F_CALC}[style]
        if style == "input":
            c.fill = FILL_FILL
        if style == "result":
            c.fill = FILL_RES
    n = wv.cell(row=r, column=6, value=note); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    VR[key] = r
    r += 1


def vc(key, col):
    return "$%s$%d" % (col, VR[key])


section(wv, r, "IVA suportado no investimento inicial", span=6); r += 1
vrow("I_OBRAS", "IVA nas obras", lambda c: "={a}*{t}".format(a=inp("INV_OBRAS", c), t=P["IVA_NORM"]))
vrow("I_EQN", "IVA no equipamento à taxa normal",
     lambda c: "={a}*{t}".format(a=inp("INV_EQUIP", c), t=P["IVA_NORM"]))
vrow("I_EQR", "IVA no equipamento à taxa reduzida",
     lambda c: "={a}*{t}".format(a=inp("INV_EQUIP_R", c), t=P["IVA_RED"]),
     note="Verbas 2.5 e 2.6 da Lista I do CIVA. A confirmar item a item contra o orçamento de equipamento — "
          "é a atenuante mais barata de obter e ninguém a verificou ainda.")
vrow("I_SOFT", "IVA no software", lambda c: "={a}*{t}".format(a=inp("INV_SOFT", c), t=P["IVA_NORM"]))
vrow("I_TOT", "Total de IVA suportado no investimento",
     lambda c: "=SUM({a}:{b})".format(a=vc("I_OBRAS", c), b=vc("I_SOFT", c)), style="result")

section(wv, r, "Tratamento nas vias 1, 2 e 3 — atividade exclusivamente isenta", span=6); r += 1
vrow("D_ISENTO", "IVA dedutível", "=0", note="Art. 20.º n.º 1 CIVA a contrario: isenção do art. 9.º não "
                                             "confere direito à dedução.")
vrow("P_ISENTO", "IVA perdido, convertido em custo do investimento",
     lambda c: "=" + vc("I_TOT", c), style="result",
     note="Este montante acresce ao custo de aquisição e é amortizado nas vias com contabilidade.")

section(wv, r, "Tratamento na via 4 — sujeito passivo misto", span=6); r += 1
vrow("PRO_RATA", "Pro rata de dedução",
     lambda c: "=IF({r}<=0,0,{t}/{r})".format(r=inp("REC_TOTAL", c), t=inp("REC_TRIB", c)),
     fmt=PCT, note="Art. 23.º n.º 4 CIVA: volume de negócios com direito a dedução sobre o total. "
                   "Com FAT_TRIB a zero o pro rata é zero — só há dedução se o cônjuge faturar dentro da sociedade.")
vrow("PCT_EXCL", "% do investimento afeto exclusivamente à atividade tributada", 0.0, fmt=PCT, style="input",
     note="Só relevante na afetação real. A preencher com base na planta do espaço e no orçamento de obras.")
vrow("D_PRORATA", "IVA dedutível — método do pro rata",
     lambda c: "={a}*{b}".format(a=vc("I_TOT", c), b=vc("PRO_RATA", c)))
vrow("D_REAL", "IVA dedutível — método da afetação real",
     lambda c: "={a}*{e}+{a}*(1-{e})*{p}".format(a=vc("I_TOT", c), e=vc("PCT_EXCL", c), p=vc("PRO_RATA", c)),
     note="Art. 23.º n.º 2 CIVA. Dedução integral na parte exclusivamente afeta a operações tributadas, "
          "pro rata nos custos comuns. Mais favorável, mas exige segregação documental permanente (ata, ponto 6).")
vrow("D_MELHOR", "IVA recuperável na melhor hipótese",
     lambda c: "=MAX({a},{b})".format(a=vc("D_PRORATA", c), b=vc("D_REAL", c)), style="result")
vrow("P_MISTO", "IVA perdido na via 4",
     lambda c: "={a}-{b}".format(a=vc("I_TOT", c), b=vc("D_MELHOR", c)), style="result")
vrow("GANHO", "Ganho de IVA atribuível à entrada do cônjuge",
     lambda c: "={a}-{b}".format(a=vc("P_ISENTO", c), b=vc("P_MISTO", c)), style="result",
     note="Comparar com o diferencial de IRS/IRC da folha Comparativo. A ata afirma que o efeito da "
          "transparência é 'materialmente superior' ao do IVA — esta linha é o teste dessa afirmação.")

section(wv, r, "Sensibilidade — elegibilidade para taxa reduzida", span=6); r += 1
vrow("SENS_PCT", "% do equipamento que viesse a qualificar para a taxa reduzida", 0.30, fmt=PCT, style="input",
     note="Cenário de teste. Não é uma estimativa: substituir pela verificação item a item.")
vrow("SENS_GAN", "Poupança de IVA nesse cenário",
     lambda c: "={e}*{s}*({n}-{rd})".format(e=inp("INV_EQUIP", c), s=vc("SENS_PCT", c),
                                            n=P["IVA_NORM"], rd=P["IVA_RED"]), style="result")

section(wv, r, "IVA em custos correntes (anual, memória)", span=6); r += 1
vrow("C_CORR", "Base dos custos correntes sujeitos a IVA",
     lambda c: "={a}+{b}+{d}".format(a=inp("SOFTW", c), b=inp("CONSUM", c), d=inp("OUTROS", c)),
     style="link", note="Renda paga excluída: o arrendamento é isento salvo renúncia (art. 9.º n.º 29 CIVA). "
                        "Honorários de fisioterapeutas excluídos: também isentos pelo art. 9.º n.º 1.")
vrow("C_IVA", "IVA anual suportado e não dedutível (vias 1 a 3)",
     lambda c: "={a}*{t}".format(a=vc("C_CORR", c), t=P["IVA_NORM"]), style="result")
wv.freeze_panes = "C5"


# ================================================================ COMPARATIVO
wc_ = wb.create_sheet("Comparativo")
title(wc_, "M1 — Comparativo das quatro vias",
      "Output principal do modelo. Sustenta o capítulo 3 do relatório e o anexo E2. Cada bloco é um "
      "cenário de faturação. O indicador de decisão é o líquido disponível para a sócia, não a carga fiscal "
      "absoluta — uma via pode pagar menos imposto e entregar menos dinheiro.")
widths(wc_, {"A": 54, "B": 4, "C": 17, "D": 17, "E": 17, "F": 17, "G": 46})
wc_.merge_cells("A2:G2"); wc_["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wc_.row_dimensions[2].height = 44

VIAS = [v1, v2, v3, v4]
NOMES = ["Via 1 — ENI simplificado", "Via 2 — ENI cont. organizada",
         "Via 3 — Soc. transparente", "Via 4 — Soc. não transparente"]

METRICAS = [
    ("Caixa gerada pela atividade", lambda v, c: v.ref("CAIXA", c), EUR, "calc",
     "Idêntica nas quatro vias, por construção."),
    ("IRS imputável à atividade", lambda v, c: v.ref("IRS_ATIV", c), EUR, "calc", ""),
    ("Segurança Social (todas as componentes)", None, EUR, "calc",
     "Vias 1 e 2: contribuição do trabalhador independente. Vias 3 e 4: contribuições do MOE, a cargo da "
     "sócia e da sociedade."),
    ("IRC, derrama e tributações autónomas", None, EUR, "calc", ""),
    ("Imposto sobre a distribuição", None, EUR, "calc", ""),
    ("TOTAL DE IMPOSTOS E CONTRIBUIÇÕES", lambda v, c: v.ref("CARGA", c), EUR, "result", ""),
    ("Taxa de esforço sobre a caixa gerada", lambda v, c: v.ref("TAXA_EF", c), PCT, "calc", ""),
    ("Valor retido na sociedade", lambda v, c: v.ref("RETIDO", c), EUR, "calc",
     "Não é perda, mas também não é liquidez da sócia. Tem de aparecer separado."),
    ("Valor atribuído ao cônjuge", lambda v, c: v.ref("LIQ_CJ", c), EUR, "calc", ""),
    ("LÍQUIDO DISPONÍVEL PARA A SÓCIA", lambda v, c: v.ref("LIQ_SOC", c), EUR, "result",
     "Indicador de decisão."),
    ("LÍQUIDO DISPONÍVEL PARA O AGREGADO", lambda v, c: v.ref("LIQ_AGR", c), EUR, "result", ""),
]

SS_TOT = {0: lambda c: "={a}".format(a=v1.ref("SS_CONTR", c)),
          1: lambda c: "={a}".format(a=v2.ref("SS_CONTR", c)),
          2: lambda c: "={a}+{b}".format(a=v3.ref("SS_TRAB", c), b=v3.ref("TSU_ENT", c)),
          3: lambda c: "={a}+{b}".format(a=v4.ref("SS_TRAB", c), b=v4.ref("TSU_ENT", c))}
IRC_TOT = {0: lambda c: "=0", 1: lambda c: "=0",
           2: lambda c: "={a}+{b}".format(a=v3.ref("TA", c), b=v3.ref("DERR", c)),
           3: lambda c: "={a}+{b}+{d}".format(a=v4.ref("IRC", c), b=v4.ref("DERR", c), d=v4.ref("TA", c))}
DIV_TOT = {0: lambda c: "=0", 1: lambda c: "=0", 2: lambda c: "=0",
           3: lambda c: "=" + v4.ref("IMP_DIV", c)}

r = 4
BLOCOS = []
for sc_col, sc_name in SCEN:
    section(wc_, r, "CENÁRIO %s" % sc_name.upper(), span=7); r += 1
    hdr_row = r
    hdr(wc_, r, ["Indicador"] + [""] + NOMES + ["Nota"]); r += 1
    liq_row = None
    for label, fn, fmt, style, note in METRICAS:
        wc_.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
        for k, v in enumerate(VIAS):
            if fn is not None:
                val = "=" + fn(v, sc_col)
            elif label.startswith("Segurança"):
                val = SS_TOT[k](sc_col)
            elif label.startswith("IRC"):
                val = IRC_TOT[k](sc_col)
            else:
                val = DIV_TOT[k](sc_col)
            cell = wc_.cell(row=r, column=3 + k, value=val)
            cell.number_format, cell.border = fmt, BOX
            cell.font = F_RESULT if style == "result" else F_LINK
            if style == "result":
                cell.fill = FILL_RES
        n = wc_.cell(row=r, column=7, value=note); n.font = F_NOTE
        n.alignment = Alignment(wrap_text=True, vertical="top")
        if label.startswith("LÍQUIDO DISPONÍVEL PARA A SÓCIA"):
            liq_row = r
        r += 1
    wc_.cell(row=r, column=1, value="Diferencial face à via 1 (líquido para a sócia)").font = F_BODY
    for k in range(4):
        cl = get_column_letter(3 + k)
        cell = wc_.cell(row=r, column=3 + k, value="=%s%d-$C$%d" % (cl, liq_row, liq_row))
        cell.number_format, cell.border, cell.font = EUR, BOX, F_CALC
    r += 1
    wc_.cell(row=r, column=1, value="Via com maior líquido para a sócia").font = F_RESULT
    cell = wc_.cell(row=r, column=3,
                    value="=INDEX($C$%d:$F$%d,1,MATCH(MAX($C$%d:$F$%d),$C$%d:$F$%d,0))"
                          % (hdr_row, hdr_row, liq_row, liq_row, liq_row, liq_row))
    cell.font, cell.fill, cell.border = F_RESULT, FILL_RES, BOX
    wc_.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
    BLOCOS.append((sc_name, hdr_row, liq_row))
    r += 3

_nome, _hdr, _liq = [b for b in BLOCOS if b[0] == "Base"][0]
_bar = BarChart()
_bar.type, _bar.style = "col", 10
_bar.title = "Líquido anual disponível para a sócia, por via — cenário Base"
_bar.y_axis.title = "euros"
_bar.legend = None
_bar.add_data(Reference(wc_, min_col=3, max_col=6, min_row=_liq, max_row=_liq), from_rows=True)
_bar.set_categories(Reference(wc_, min_col=3, max_col=6, min_row=_hdr, max_row=_hdr))
_bar.height, _bar.width = 8, 18
wc_.add_chart(_bar, "I4")

wc_.cell(row=r, column=1,
         value="Leitura obrigatória antes de citar qualquer número: os inputs são placeholders. "
               "Estes resultados demonstram que o motor funciona e indicam a direção do efeito; não são "
               "conclusões sobre o caso da Dra. Júlia.").font = F_SUB
wc_.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)


# ================================================================ PONTO DE VIRAGEM
wp = wb.create_sheet("PontoViragem")
title(wp, "M1 — Ponto de viragem do regime simplificado",
      "Responde à pergunta que a ata deixou em aberto: a partir de que nível de custos reais é que o "
      "regime simplificado deixa de compensar. Faturação fixada no cenário Base; varia-se o peso dos "
      "custos reais dedutíveis. Comparam-se apenas as vias 1 e 2, que é onde a questão se põe.")
widths(wp, {"A": 13, "B": 15, "C": 16, "D": 14, "E": 14, "F": 15,
            "G": 16, "H": 14, "I": 14, "J": 15, "K": 15, "L": 11})
wp.merge_cells("A2:L2"); wp["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wp.row_dimensions[2].height = 44

FATB = "(%s+%s)" % (inp("FAT_ISENTA", "D"), inp("REC_NAOPROF", "D"))
RCONJ = inp("REND_CONJ", "D")
CONJ = inp("CONJUNTA", "D")


def colfull(expr):
    h = "((%s)/2)" % expr
    f = "(%s)" % expr
    return "IF({c}=1,2*({a}+{b}),{d}+{e})".format(c=CONJ, a=coleta(h), b=solidariedade(h),
                                                  d=coleta(f), e=solidariedade(f))


r = 4
wp.cell(row=r, column=1, value="Rendimento bruto (cenário Base)").font = F_BODY
c = wp.cell(row=r, column=3, value="=" + FATB); c.number_format, c.font = EUR, F_LINK
r += 1
wp.cell(row=r, column=1, value="Rendimento do cônjuge").font = F_BODY
c = wp.cell(row=r, column=3, value="=" + RCONJ); c.number_format, c.font = EUR, F_LINK
r += 2
FAT_C, RC_C = "$C$4", "$C$5"

hdr(wp, r, ["% custos", "Custos reais", "Rend. líq. cat. B (via 1)", "SS via 1", "IRS via 1",
            "Carga via 1", "Lucro tribut. (via 2)", "SS via 2", "IRS via 2", "Carga via 2",
            "Diferencial", "Viragem"])
r += 1
TOP = r
for i in range(15):
    pct = 0.05 * (i + 1)
    a = wp.cell(row=r, column=1, value=pct); a.number_format, a.font, a.border = PCT, F_INPUT, BOX
    b = wp.cell(row=r, column=2, value="={f}*A{r}".format(f=FAT_C, r=r))
    b.number_format, b.font, b.border = EUR, F_CALC, BOX
    cc = wp.cell(row=r, column=3, value="={f}*{k}+MAX(0,{f}*{lj}-({de}+B{r}))-MAX(0,D{r}-{f}*{lc})".format(
        f=FAT_C, k=P["COEF"], lj=P["LIM_JUST"], de=P["DED_ESP"], lc=P["LIM_CONTRIB"], r=r))
    cc.number_format, cc.font, cc.border = EUR, F_CALC, BOX
    d = wp.cell(row=r, column=4, value="=MAX(MIN({f}*{p},{i}*{m}*12)*{t},{mn}*12)".format(
        f=FAT_C, p=P["SS_TI_PCT"], i=P["IAS"], m=P["SS_TI_TETO"], t=P["SS_TI_TAXA"], mn=P["SS_TI_MIN"]))
    d.number_format, d.font, d.border = EUR, F_CALC, BOX
    e = wp.cell(row=r, column=5, value="=" + colfull("C%d+%s" % (r, RC_C)) + "-" + colfull(RC_C))
    e.number_format, e.font, e.border = EUR, F_CALC, BOX
    f_ = wp.cell(row=r, column=6, value="=D%d+E%d" % (r, r))
    f_.number_format, f_.font, f_.border = EUR, F_RESULT, BOX
    g = wp.cell(row=r, column=7, value="=MAX(0,{f}-B{r}-H{r})".format(f=FAT_C, r=r))
    g.number_format, g.font, g.border = EUR, F_CALC, BOX
    h = wp.cell(row=r, column=8, value="=MAX(MIN(MAX({f}-B{r},0),{i}*{m}*12)*{t},{mn}*12)".format(
        f=FAT_C, r=r, i=P["IAS"], m=P["SS_TI_TETO"], t=P["SS_TI_TAXA"], mn=P["SS_TI_MIN"]))
    h.number_format, h.font, h.border = EUR, F_CALC, BOX
    ii = wp.cell(row=r, column=9, value="=" + colfull("G%d+%s" % (r, RC_C)) + "-" + colfull(RC_C))
    ii.number_format, ii.font, ii.border = EUR, F_CALC, BOX
    j = wp.cell(row=r, column=10, value="=H%d+I%d" % (r, r))
    j.number_format, j.font, j.border = EUR, F_RESULT, BOX
    k = wp.cell(row=r, column=11, value="=F%d-J%d" % (r, r))
    k.number_format, k.font, k.border = EUR, F_CALC, BOX
    l = wp.cell(row=r, column=12,
                value=("=0" if i == 0 else "=IF(AND(K{r}>=0,K{p}<0),A{r},0)".format(r=r, p=r - 1)))
    l.number_format, l.font, l.border = PCT, F_CALC, BOX
    r += 1
BOT = r - 1
_ln = LineChart()
_ln.title = "Ponto de viragem — carga fiscal e contributiva por nível de custos reais"
_ln.y_axis.title = "euros"
_ln.x_axis.title = "custos reais em % do rendimento bruto"
_ln.height, _ln.width = 9, 20
for _col in (6, 10):
    _ln.append(Series(Reference(wp, min_col=_col, min_row=TOP - 1, max_row=BOT), title_from_data=True))
_ln.set_categories(Reference(wp, min_col=1, min_row=TOP, max_row=BOT))
wp.add_chart(_ln, "N4")

r += 1
wp.cell(row=r, column=1, value="Ponto de viragem — peso dos custos reais").font = F_RESULT
c = wp.cell(row=r, column=3, value="=MAX(L%d:L%d)" % (TOP, BOT))
c.number_format, c.font, c.fill, c.border = PCT, F_RESULT, FILL_RES, BOX
wp.cell(row=r, column=5,
        value="Acima deste peso de custos, a contabilidade organizada passa a entregar mais líquido. "
              "Resolução de 5 pontos percentuais — refinar por interpolação se o valor cair perto de um limite.").font = F_NOTE
r += 1
wp.cell(row=r, column=1, value="Ponto de viragem — em euros de custos anuais").font = F_RESULT
c = wp.cell(row=r, column=3, value="=C%d*%s" % (r - 1, FAT_C))
c.number_format, c.font, c.fill, c.border = EUR, F_RESULT, FILL_RES, BOX
r += 2
wp.cell(row=r, column=1,
        value="Simplificação assumida nesta folha: os custos reais são simultaneamente dedutíveis na via 2 e "
              "justificáveis na via 1. No caso concreto as duas bases não coincidem exatamente (amortizações "
              "versus aquisições do ano). O ponto de viragem apurado é, por isso, conservador — a via 2 "
              "tende a virar mais cedo do que aqui aparece. Registado em R1-09.").font = F_SUB
wp.merge_cells(start_row=r, start_column=1, end_row=r, end_column=12)
wp["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wp.row_dimensions[r].height = 40
wp.freeze_panes = "A%d" % TOP


# ================================================================ VALIDACAO
# Recalculo independente, escrito a partir das mesmas normas mas sem reutilizar
# uma unica formula da folha de calculo. Se as duas implementacoes divergirem,
# uma delas esta errada e nenhum numero pode entrar no relatorio.
VALS = {it[1]: it[3] for it in IN_ROWS if it[0] == "P"}
IAS_V, TETO_ANO = 522.50, 522.50 * 12 * 12
MIN_ANO = 20.0 * 12


def py_coleta(x):
    tot, prev = 0.0, 0.0
    for lo, _hi, tx in ESCALOES:
        if x > lo:
            tot += (x - lo) * (tx - prev)
        prev = tx
    return tot


def py_sol(x):
    tot, prev = 0.0, 0.0
    for lo, _hi, tx in [(80000.0, 250000.0, 0.025), (250000.0, None, 0.05)]:
        if x > lo:
            tot += (x - lo) * (tx - prev)
        prev = tx
    return tot


def py_irs(rc, conjunta):
    if conjunta == 1:
        h = rc / 2.0
        return 2.0 * (py_coleta(h) + py_sol(h))
    return py_coleta(rc) + py_sol(rc)


def g(k, i):
    return float(VALS[k][i])


def comuns(i):
    mod = g("MOD_COLAB", i)
    fat_is = g("FAT_PROP", i) + (g("FAT_COLAB", i) if mod == 1 else 0.0)
    rec_np = g("REC_SALA", i) if mod == 2 else 0.0
    custo_col = g("HONOR", i) if mod == 1 else 0.0
    op_sem_hon = sum(g(k, i) for k in ["RENDA", "CONDOM", "SEGUROS", "SOFTW", "CONSUM", "OUTROS"])
    op = op_sem_hon + custo_col
    inv = g("INV_OBRAS", i) + g("INV_EQUIP", i) + g("INV_EQUIP_R", i) + g("INV_SOFT", i)
    amort = g("INV_OBRAS", i) * 0.10 + (g("INV_EQUIP", i) + g("INV_EQUIP_R", i)) * 0.20 \
        + g("INV_SOFT", i) * 0.3333
    return dict(fat_is=fat_is, rec_np=rec_np, rb=fat_is + rec_np, custo_col=custo_col,
                op_sem=op_sem_hon, op=op, inv=inv, amort=amort)


def sh_v1(i):
    rc_, cj = g("REND_CONJ", i), g("CONJUNTA", i)
    k = comuns(i)
    d_tot = 4104.0 + k["op_sem"] + k["custo_col"] + k["inv"]
    rt = k["fat_is"] * 0.75 + k["rec_np"] * 0.35
    rb = rt + max(0.0, k["rb"] * 0.15 - d_tot)
    ss = max(min(k["rb"] * 0.70, TETO_ANO) * 0.214, MIN_ANO)
    rl = rb - max(0.0, ss - k["rb"] * 0.10)
    irs = py_irs(rl + rc_, cj) - py_irs(rc_, cj)
    caixa = k["rb"] + g("FAT_TRIB", i) - k["op"]
    return dict(irs=irs, ss=ss, carga=irs + ss, liq=caixa - irs - ss)


def sh_v2(i):
    rc_, cj = g("REND_CONJ", i), g("CONJUNTA", i)
    k = comuns(i)
    lt0 = k["rb"] - k["op_sem"] - k["custo_col"] - k["amort"]
    ss = max(min(max(lt0, 0.0), TETO_ANO) * 0.214, MIN_ANO)
    lt = max(0.0, lt0 - ss)
    irs = py_irs(lt + rc_, cj) - py_irs(rc_, cj)
    caixa = k["rb"] + g("FAT_TRIB", i) - k["op"]
    return dict(irs=irs, ss=ss, carga=irs + ss, liq=caixa - irs - ss)


def sh_soc(i, transparente):
    rc_, cj = g("REND_CONJ", i), g("CONJUNTA", i)
    k = comuns(i)
    rem, ta, pol = g("REM_GER", i), g("TA_EST", i), g("POL_DIST", i)
    base_moe = max(rem, IAS_V * 1 * 12)
    tsu_ent, ss_trab = base_moe * 0.2375, base_moe * 0.11
    amort = k["amort"]
    lt = k["rb"] + (g("FAT_TRIB", i) if not transparente else 0.0) \
        - k["op_sem"] - k["custo_col"] - amort - rem - tsu_ent
    ded_a = min(rem, max(4104.0, ss_trab))
    rl_a = max(0.0, rem - ded_a)
    caixa = k["rb"] + g("FAT_TRIB", i) - k["op"]
    if transparente:
        irc = derr = 0.0
        r_jul = rl_a + max(lt, 0.0)
        irs = py_irs(r_jul + rc_, cj) - py_irs(rc_, cj)
        disp = caixa - rem - tsu_ent - ta - derr
        retido, liq_cj, imp_div = max(0.0, disp) * (1 - pol), 0.0, 0.0
    else:
        irc = min(max(lt, 0.0), 50000.0) * 0.16 + max(0.0, max(lt, 0.0) - 50000.0) * 0.20
        derr = max(lt, 0.0) * 0.015
        cx = max(0.0, caixa - rem - tsu_ent - irc - derr - ta)
        dist = cx * pol
        div_cj = dist * g("PCT_CONJ", i)
        imp_div = dist * 0.28
        r_jul = rl_a
        irs = py_irs(r_jul + rc_, cj) - py_irs(rc_, cj)
        retido, liq_cj = cx - dist, div_cj - div_cj * 0.28
    carga = irs + ss_trab + tsu_ent + irc + derr + ta + imp_div
    return dict(irs=irs, ss=ss_trab + tsu_ent, carga=carga,
                liq=caixa - carga - retido - liq_cj)


wval = wb.create_sheet("Validacao")
title(wval, "M1 — Validação",
      "Cada linha confronta o valor produzido pela folha de cálculo com um recálculo independente, escrito "
      "a partir das mesmas normas sem reutilizar nenhuma fórmula do modelo. Uma divergência significa que "
      "uma das duas implementações está errada. Nenhum número entra no relatório com esta folha vermelha, "
      "nem sem a assinatura das colunas H e I.")
widths(wval, {"A": 30, "B": 10, "C": 30, "D": 16, "E": 18, "F": 12, "G": 12, "H": 22, "I": 12})
wval.merge_cells("A2:I2"); wval["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wval.row_dimensions[2].height = 46
r = 4
hdr(wval, r, ["Verificação", "Cenário", "Grandeza", "Valor do modelo", "Recálculo independente",
              "Diferença", "Estado", "Validado por (assinatura)", "Data"]); r += 1

CHECKS = [
    ("V1 — ENI simplificado", v1, "D", "Base", sh_v1(1)),
    ("V2 — ENI cont. organizada", v2, "D", "Base", sh_v2(1)),
    ("V3 — Soc. transparente", v3, "D", "Base", sh_soc(1, True)),
    ("V4 — Soc. não transparente", v4, "D", "Base", sh_soc(1, False)),
    ("V1 — ENI simplificado", v1, "E", "Alto", sh_v1(2)),
]
GRAND = [("IRS imputável à atividade", "irs"), ("Segurança Social (total)", "ss"),
         ("Total impostos e contribuições", "carga"), ("Líquido para a sócia", "liq")]

for nome, via, col, cen, sh in CHECKS:
    first = r
    for label, key in GRAND:
        wval.cell(row=r, column=1, value=nome if r == first else "").font = F_BODY
        wval.cell(row=r, column=2, value=cen).font = F_BODY
        wval.cell(row=r, column=3, value=label).font = F_BODY
        if key == "ss":
            if via in (v1, v2):
                mod = "=" + via.ref("SS_CONTR", col)
            else:
                mod = "={a}+{b}".format(a=via.ref("SS_TRAB", col), b=via.ref("TSU_ENT", col))
        else:
            mod = "=" + via.ref({"irs": "IRS_ATIV", "carga": "CARGA", "liq": "LIQ_SOC"}[key], col)
        cm = wval.cell(row=r, column=4, value=mod)
        cm.number_format, cm.font, cm.border = EUR2, F_LINK, BOX
        ce = wval.cell(row=r, column=5, value=round(sh[key], 2))
        ce.number_format, ce.font, ce.border = EUR2, F_INPUT, BOX
        cd = wval.cell(row=r, column=6, value="=D%d-E%d" % (r, r))
        cd.number_format, cd.font, cd.border = EUR2, F_CALC, BOX
        cs = wval.cell(row=r, column=7, value='=IF(ABS(F%d)<0.5,"OK","DIVERGE")' % r)
        cs.font, cs.border = F_RESULT, BOX
        cs.alignment = Alignment(horizontal="center")
        for cc in (8, 9):
            x = wval.cell(row=r, column=cc); x.fill, x.border = FILL_FILL, BOX
        r += 1
    r += 1

wval.cell(row=r, column=1, value="Estado global").font = F_RESULT
cg = wval.cell(row=r, column=4,
               value='=IF(COUNTIF($G$6:$G$%d,"DIVERGE")=0,"TODAS AS VERIFICAÇÕES OK","HÁ DIVERGÊNCIAS")'
                     % (r - 2))
cg.font, cg.fill, cg.border = F_RESULT, FILL_RES, BOX
wval.merge_cells(start_row=r, start_column=4, end_row=r, end_column=7)
r += 2
wval.cell(row=r, column=1,
          value="O que esta folha NÃO valida: que os parâmetros da folha Parâmetros estejam corretos e em "
                "vigor para 2026, e que a leitura normativa esteja certa. Duas implementações da mesma "
                "leitura errada concordam perfeitamente. A validação normativa é da equipa de Fiscalidade e "
                "assina-se na coluna H.").font = F_SUB
wval.merge_cells(start_row=r, start_column=1, end_row=r, end_column=9)
wval["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wval.row_dimensions[r].height = 46
wval.freeze_panes = "A5"


# ================================================================ LEIA-ME
wl = wb.create_sheet("LEIA-ME", 0)
title(wl, "M1 — Modelo comparativo das quatro vias")
widths(wl, {"A": 4, "B": 110})
wl.sheet_view.showGridLines = False
TXT = [
    ("SEC", "Identificação"),
    ("T", "Projeto: Dra. Júlia Best (NIF 272180610) — cliente faturável: Gerir Saúde."),
    ("T", "Origem: ata de 18/08/2026 (MOD COO 007/1). Brief de entregáveis de 22/08/2026."),
    ("T", "Estatuto: ENTREGÁVEL INTERNO. Não sai para a cliente — a entrega do ficheiro está expressamente "
          "fora de âmbito (secção 5 do brief). O que sai são as tabelas do capítulo 3 e do anexo E2, "
          "sem fórmulas visíveis."),
    ("T", "Propriedade: ativo reutilizável VCLevel."),
    ("SEC", "Estado atual — ler antes de usar"),
    ("W", "A cliente não forneceu nenhum dos oito inputs da secção 4 do brief. Todos os valores da folha "
          "Inputs são placeholders para testar o motor de cálculo."),
    ("W", "Nenhum número deste ficheiro pode ser citado no relatório, no deck ou perante a cliente antes "
          "de (i) os inputs reais entrarem, (ii) a folha Parâmetros ser confirmada para 2026 pela equipa de "
          "Fiscalidade, e (iii) a folha Validação estar assinada."),
    ("SEC", "Como está organizado"),
    ("T", "Parâmetros — todas as taxas, escalões e limiares, cada um com a norma e o estado de validação. "
          "Nenhuma taxa é escrita dentro de uma fórmula noutra folha."),
    ("T", "Inputs — folha única de parâmetros do caso, em três cenários de faturação. Contém a alavanca "
          "MOD_COLAB, que alterna entre os dois modelos de colaboração da ata (1 = prestação de serviços, "
          "2 = cedência de sala) e reconfigura toda a estrutura de receita e custo."),
    ("T", "As linhas derivadas no fim da folha Inputs não se preenchem. Entre elas está o teste de "
          "rendimentos do art. 6.º n.º 4 al. b) ii) CIRC, e a receita de cedência que seria precisa para o "
          "falhar — que é a via para afastar a transparência sem ceder capital."),
    ("T", "V1 a V4 — uma folha por via, com a mesma estrutura: apuramento, Segurança Social, IRS do "
          "agregado, resultado."),
    ("T", "IVA — quantificação do IVA perdido no investimento e teste das duas atenuantes."),
    ("T", "PontoViragem — nível de custos reais a partir do qual o simplificado deixa de compensar, "
          "com o gráfico correspondente."),
    ("T", "Comparativo — output que alimenta o capítulo 3 e o anexo E2, com o gráfico do líquido por via."),
    ("T", "Validação — recálculo independente e espaço para assinatura."),
    ("SEC", "Convenções"),
    ("T", "Azul sobre amarelo = célula de preenchimento. Verde = ligação a outra folha. Preto = fórmula. "
          "Fundo laranja na folha Parâmetros = parâmetro por confirmar."),
    ("T", "Percentagens guardadas como fração. Valores anuais, em euros, sem IVA salvo indicação."),
    ("SEC", "Três decisões de modelação que são discutíveis e estão assumidas"),
    ("T", "1. A comparação entre vias usa o IRS diferencial (coleta do agregado com a atividade menos "
          "coleta sem a atividade), e não o IRS total. É o que torna as quatro vias comparáveis quando o "
          "cônjuge tem rendimento próprio."),
    ("T", "2. O investimento inicial está fora da comparação anual e isolado numa linha de memória. "
          "Misturá-lo com o resultado corrente faria a via 1 parecer melhor do que é no ano 1."),
    ("T", "3. Nas vias societárias, o valor retido na sociedade é mostrado separado do líquido da sócia. "
          "Somar os dois responderia a uma pergunta que a cliente não fez."),
    ("T", "4. O modelo de colaboração é uma escolha única para todos os colaboradores. A ata admite "
          "modelos distintos por profissional; uma combinação exige correr o modelo com a faturação "
          "repartida. Registado em R1-30."),
    ("SEC", "Reprodução"),
    ("T", "Este ficheiro é gerado por build_m1.py. Alterações estruturais fazem-se no script e regenera-se; "
          "alterações de valores fazem-se nas células amarelas."),
]
r = 4
for kind, txt in TXT:
    if kind == "SEC":
        c = wl.cell(row=r, column=2, value=txt); c.font, c.fill = F_SEC, FILL_SEC
        r += 1
        continue
    c = wl.cell(row=r, column=2, value=txt)
    c.font = F_BODY
    c.alignment = Alignment(wrap_text=True, vertical="top")
    if kind == "W":
        c.fill = F_WARNFILL if False else FILL_WARN
    wl.row_dimensions[r].height = 15 + 13 * (len(txt) // 105)
    r += 1

# Sem valores em cache: forcar recalculo total na abertura, em Excel e LibreOffice.
wb.calculation.fullCalcOnLoad = True

wb.save("/home/user/Generate-/01-modelo/M1_modelo_comparativo.xlsx")
print("M1 gerado.")
