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
widths(ws, {"A": 46, "B": 16, "C": 16, "D": 62, "E": 26, "F": 10})

r = 4
hdr(ws, r, ["Parâmetro", "Referência", "Valor", "Fonte normativa", "Estado de validação", "Por validar"])
r += 1

P = {}   # chave -> referencia absoluta "Parametros!$C$n"
VALID_ROWS = []   # linhas com o sinalizador numerico de "por validar" (coluna F)

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
    ("P", "TSU_ENT", "Trabalhador por conta de outrem — taxa a cargo da entidade empregadora", 0.2375, PCT2,
     "Art. 53.º Cód. Contributivo", "Confirmar"),
    ("P", "TSU_TRAB", "Trabalhador por conta de outrem — taxa a cargo do trabalhador", 0.11, PCT2,
     "Art. 53.º Cód. Contributivo", "Confirmar"),
    ("P", "PRESCR", "Prazo de prescrição das contribuições (anos)", 5, NUM,
     "Art. 187.º Cód. Contributivo", "CONFIRMAR (ver R1-37)"),
    ("P", "JUROS_MORA", "Taxa anual de juros de mora aplicada às contribuições em falta", 0.05, PCT2,
     "Regime dos juros de mora de dívidas ao Estado", "CONFIRMAR taxa em vigor"),
    ("P", "COIMA_PCT", "Coima estimada, em % das contribuições devidas pela entidade", 0.50, PCT,
     "Moldura das contraordenações do Cód. Contributivo", "ESTIMATIVA GROSSEIRA — ver R1-38"),

    ("SEC", "Limiares operacionais de alerta"),
    ("P", "UTIL_MAX", "Utilização acima da qual a projeção é impossível", 1.00, PCT,
     "Definição do modelo", "Validado"),
    ("P", "UTIL_ALTA", "Utilização acima da qual a operação é muito exigente", 0.85, PCT,
     "Convenção de trabalho VCLevel", "Decisão de equipa"),
    ("P", "UTIL_BAIXA", "Utilização abaixo da qual o espaço está subaproveitado", 0.30, PCT,
     "Convenção de trabalho VCLevel", "Decisão de equipa"),

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
    porvalidar = 1 if status.startswith(("CONFIRMAR", "A ATUALIZAR", "EM ABERTO")) else 0
    if porvalidar:
        st.fill = FILL_WARN
    fl = ws.cell(row=r, column=6, value=porvalidar)
    fl.font, fl.number_format = F_NOTE, NUM
    VALID_ROWS.append(r)
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


# ================================================================ OPERACAO
wso = wb.create_sheet("Operacao")
title(wso, "M1 — Camada operacional: capacidade, utilização e faturação",
      "A faturação deixa de ser um palpite e passa a ser uma consequência. Gabinetes, dias de "
      "funcionamento, duração da consulta e preço determinam quanto é possível faturar — e a linha de "
      "utilização diz se a projeção cabe no espaço. Uma projeção que exija mais de 100% de utilização é "
      "impossível, não é otimista.")
widths(wso, {"A": 56, "B": 14, "C": 14, "D": 14, "E": 14, "F": 54})
wso.merge_cells("A2:F2"); wso["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wso.row_dimensions[2].height = 46
r = 4
hdr(wso, r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota"]); r += 1
O = {}
OVALS = {}


def orow(key, label, vals=None, fn=None, fmt=NUM, style="input", note=""):
    global r
    if vals is not None:
        OVALS[key] = vals
    wso.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wso.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wso.cell(row=r, column=3 + j, value=(vals[j] if vals is not None else fn(col)))
        c.number_format, c.border = fmt, BOX
        c.font = {"input": F_INPUT, "calc": F_CALC, "result": F_RESULT}[style]
        if style == "input":
            c.fill = FILL_FILL
        if style == "result":
            c.fill = FILL_RES
    n = wso.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    O[key] = r
    r += 1


def oc(key, col):
    return "$%s$%d" % (col, O[key])


def oref(key, col):
    return "Operacao!$%s$%d" % (col, O[key])


section(wso, r, "Espaço e horário", span=6); r += 1
orow("N_GAB", "N.º de gabinetes", (2, 2, 3),
     note="Input cliente 3 — EM FALTA. Ata, ponto 3: dois espaços em avaliação, 2 e 3 gabinetes. "
          "A comparação dedicada está na folha Espaco.")
orow("DIAS_ANO", "Dias de funcionamento por ano", (220, 220, 220),
     note="EM FALTA. 220 dias corresponde a semana de 5 dias com férias e feriados.")
orow("HORAS_DIA", "Horas úteis por gabinete por dia", (8, 8, 8), note="EM FALTA.")
orow("DUR_CONS", "Duração média da consulta (minutos)", (45, 45, 45),
     note="EM FALTA. Determina a capacidade. Sessões de 30 ou de 60 minutos mudam tudo o que vem abaixo.")

section(wso, r, "Atividade da Dra. Júlia", span=6); r += 1
orow("DIAS_JUL", "Dias por ano em que atende", (190, 200, 210), note="EM FALTA.")
orow("CONS_JUL", "Consultas por dia", (5, 6, 7), note="EM FALTA.")
orow("PRECO_JUL", "Preço médio por consulta", (45, 48, 50), fmt=EUR,
     note="Input cliente 2 — EM FALTA. Sai da tabela de preços, que a ata regista como inexistente.")

section(wso, r, "Fisioterapeutas a integrar", span=6); r += 1
orow("N_FISIO", "N.º de fisioterapeutas", (1, 1, 2), note="Ata, ponto 3.")
orow("DIAS_FIS", "Dias por ano, por profissional", (160, 180, 180), note="EM FALTA.")
orow("CONS_FIS", "Consultas por dia, por profissional", (4, 5, 4), note="EM FALTA.")
orow("PRECO_FIS", "Preço médio por consulta", (45, 48, 50), fmt=EUR, note="EM FALTA.")

section(wso, r, "Capacidade", span=6); r += 1
orow("CAP_DIA", "Capacidade diária por gabinete (consultas)", fn=lambda c:
     "={h}*60/{d}".format(h=oc("HORAS_DIA", c), d=oc("DUR_CONS", c)), fmt='#,##0.0', style="calc")
orow("CAP_ANO", "Capacidade anual instalada (consultas)", fn=lambda c:
     "={g}*{d}*{k}".format(g=oc("N_GAB", c), d=oc("DIAS_ANO", c), k=oc("CAP_DIA", c)), style="result")

section(wso, r, "Procura projetada", span=6); r += 1
orow("CONS_JUL_A", "Consultas anuais da Dra. Júlia", fn=lambda c:
     "={d}*{k}".format(d=oc("DIAS_JUL", c), k=oc("CONS_JUL", c)), style="calc")
orow("CONS_FIS_A", "Consultas anuais dos colaboradores", fn=lambda c:
     "={n}*{d}*{k}".format(n=oc("N_FISIO", c), d=oc("DIAS_FIS", c), k=oc("CONS_FIS", c)), style="calc")
orow("CONS_TOT", "Consultas anuais totais", fn=lambda c:
     "={a}+{b}".format(a=oc("CONS_JUL_A", c), b=oc("CONS_FIS_A", c)), style="result")
orow("UTILIZ", "TAXA DE UTILIZAÇÃO DOS GABINETES", fn=lambda c:
     "=IF({c}<=0,0,{t}/{c})".format(c=oc("CAP_ANO", c), t=oc("CONS_TOT", c)), fmt=PCT, style="result",
     note="Acima de 100% a projeção é impossível: não há gabinetes para as consultas previstas. "
          "Acima de 85% é operacionalmente muito exigente. Ver folha Alertas.")
orow("TESTE_CAP", "Leitura da utilização", fn=lambda c:
     '=IF({u}>{mx},"IMPOSSÍVEL — a projeção não cabe no espaço",'
     'IF({u}>{al},"MUITO EXIGENTE — pouca folga operacional",'
     'IF({u}<{bx},"FOLGA ELEVADA — capacidade subaproveitada","PLAUSÍVEL")))'.format(
         u=oc("UTILIZ", c), mx=P["UTIL_MAX"], al=P["UTIL_ALTA"], bx=P["UTIL_BAIXA"]),
     fmt="General", style="result")

section(wso, r, "Faturação derivada", span=6); r += 1
orow("FAT_JUL", "Faturação anual da Dra. Júlia", fn=lambda c:
     "={a}*{p}".format(a=oc("CONS_JUL_A", c), p=oc("PRECO_JUL", c)), fmt=EUR, style="result")
orow("FAT_FIS", "Faturação anual gerada pelos colaboradores", fn=lambda c:
     "={a}*{p}".format(a=oc("CONS_FIS_A", c), p=oc("PRECO_FIS", c)), fmt=EUR, style="result")
orow("FAT_TOT", "Faturação anual total gerada", fn=lambda c:
     "={a}+{b}".format(a=oc("FAT_JUL", c), b=oc("FAT_FIS", c)), fmt=EUR, style="result")

section(wso, r, "Unit economics", span=6); r += 1
orow("FAT_GAB", "Faturação por gabinete", fn=lambda c:
     "=IF({g}<=0,0,{f}/{g})".format(g=oc("N_GAB", c), f=oc("FAT_TOT", c)), fmt=EUR, style="calc")
orow("CONS_GAB", "Consultas por gabinete", fn=lambda c:
     "=IF({g}<=0,0,{t}/{g})".format(g=oc("N_GAB", c), t=oc("CONS_TOT", c)), style="calc")
orow("FAT_PROF", "Faturação por profissional", fn=lambda c:
     "={f}/(1+{n})".format(f=oc("FAT_TOT", c), n=oc("N_FISIO", c)), fmt=EUR, style="calc")
orow("FAT_HORA", "Faturação por hora de gabinete disponível", fn=lambda c:
     "=IF({g}*{d}*{h}<=0,0,{f}/({g}*{d}*{h}))".format(g=oc("N_GAB", c), d=oc("DIAS_ANO", c),
                                                      h=oc("HORAS_DIA", c), f=oc("FAT_TOT", c)),
     fmt=EUR2, style="calc",
     note="Indicador de eficiência do espaço, independente da estrutura fiscal.")
wso.freeze_panes = "C5"


# ================================================================ INPUTS
wsi = wb.create_sheet("Inputs")
title(wsi, "M1 — Inputs (folha única de parâmetros do caso)",
      "ATENÇÃO: à data de 22/08/2026 a cliente não forneceu nenhum dos inputs da secção 4 do brief. "
      "Todos os valores abaixo são ILUSTRATIVOS, servem apenas para testar o motor de cálculo, e estão "
      "registados como pressupostos em R1. Nenhum número desta folha pode transitar para o relatório "
      "enquanto não for substituído por dados da cliente.")
widths(wsi, {"A": 58, "B": 15, "C": 14, "D": 14, "E": 14, "F": 52,
                 "G": 20, "H": 13, "I": 11, "J": 8})
wsi.merge_cells("A2:J2")
wsi["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wsi.row_dimensions[2].height = 46

r = 4
hdr(wsi, r, ["Input", "Referência", "Baixo", "Base", "Alto", "Nota / origem"]); r += 1

def inp(key, col):
    return "Inputs!$%s$%d" % (col, I[key])


I = {}
IN_ROWS = [
    ("SEC", "Faturação — origem e modelo de colaboração"),
    ("P", "FONTE_FAT", "ORIGEM DA FATURAÇÃO: 1 = valores manuais · 2 = derivada da capacidade (folha Operacao)",
     (2, 2, 2), NUM,
     "ALAVANCA. Em 2, a faturação é uma consequência de gabinetes, dias, duração e preço, e é verificável "
     "contra a capacidade instalada. Em 1, é um número que alguém escreveu."),
    ("P", "FAT_PROP_MAN", "Faturação anual da Dra. Júlia — valor manual", (52000, 65000, 85000), EUR,
     "Só usado se FONTE_FAT = 1."),
    ("P", "FAT_COLAB_MAN", "Faturação dos colaboradores — valor manual", (18000, 30000, 45000), EUR,
     "Só usado se FONTE_FAT = 1."),
    ("F", "FAT_PROP", "Faturação anual da própria Dra. Júlia (isenta, art. 9.º CIVA)",
     lambda c: "=IF({s}=1,{m},{o})".format(s=inp("FONTE_FAT", c), m=inp("FAT_PROP_MAN", c),
                                           o=oref("FAT_JUL", c)), EUR,
     "Doentes próprios, independentemente do modelo de colaboração."),
    ("F", "FAT_COLAB", "Faturação anual gerada pelos fisioterapeutas a integrar",
     lambda c: "=IF({s}=1,{m},{o})".format(s=inp("FONTE_FAT", c), m=inp("FAT_COLAB_MAN", c),
                                           o=oref("FAT_FIS", c)), EUR,
     "No modelo 1 é faturada pela clínica; no modelo 2 é faturada diretamente pelos profissionais e nunca "
     "passa pela clínica."),
    ("P", "MOD_COLAB", "MODELO DE COLABORAÇÃO: 1 = prestação de serviços · 2 = cedência de sala", (1, 1, 1), NUM,
     "ALAVANCA. Ata, ponto 4. Alterna toda a estrutura de receita e custo. Sustenta a exposição E2.6. "
     "AVISO: a qualificação jurídica e fiscal depende da configuração contratual e operacional concreta, "
     "não do nome comercial do modelo. Ver N1-04 e R1-31."),
    ("P", "PCT_HONOR", "Modelo 1 — honorários em % da faturação que o colaborador gera", (0.70, 0.70, 0.70), PCT,
     "Input cliente 5 — EM FALTA. Variável de sensibilidade: é o que separa faturação de margem."),
    ("F", "HONOR", "Modelo 1 — honorários anuais a pagar aos fisioterapeutas",
     lambda c: "={f}*{p}".format(f=inp("FAT_COLAB", c), p=inp("PCT_HONOR", c)), EUR,
     "Ignorado no modelo 2."),
    ("P", "PCT_SALA", "Modelo 2 — renda em % da faturação que o colaborador gera", (0.30, 0.30, 0.30), PCT,
     "Input cliente 5 — EM FALTA. Se a renda for fixa e não percentual, introduzir o valor equivalente."),
    ("F", "REC_SALA", "Modelo 2 — receita anual de cedência de sala",
     lambda c: "={f}*{p}".format(f=inp("FAT_COLAB", c), p=inp("PCT_SALA", c)), EUR,
     "Ignorado no modelo 1."),
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
    ("P", "PCT_CONSUM", "Consumíveis clínicos, em % da faturação da estrutura", (0.03, 0.03, 0.03), PCT,
     "EM FALTA. Modelado como custo variável, o que é necessário para o break-even operacional."),
    ("F", "CONSUM", "Consumíveis clínicos",
     lambda c: "=({p}+IF({m}=1,{k},0))*{x}".format(p=inp("FAT_PROP", c), m=inp("MOD_COLAB", c),
                                                   k=inp("FAT_COLAB", c), x=inp("PCT_CONSUM", c)), EUR,
     "Custo variável: acompanha as consultas realizadas dentro da estrutura."),
    ("P", "OUTROS", "Outros custos operacionais", (1500, 2000, 2500), EUR, "EM FALTA."),

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

PROV = {
    "FONTE_FAT": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Alta"),
    "FAT_PROP_MAN": ("A_VALIDAR", "cliente", "Baixa"),
    "FAT_COLAB_MAN": ("A_VALIDAR", "cliente", "Baixa"),
    "MOD_COLAB": ("A_VALIDAR", "cliente", "Baixa"),
    "PCT_HONOR": ("A_VALIDAR", "cliente", "Baixa"),
    "PCT_SALA": ("A_VALIDAR", "cliente", "Baixa"),
    "SALA_TRIB": ("A_VALIDAR", "legislação", "Baixa"),
    "FAT_TRIB": ("A_VALIDAR", "cliente", "Baixa"),
    "RENDA": ("A_VALIDAR", "contrato", "Baixa"),
    "CONDOM": ("A_VALIDAR", "contrato", "Baixa"),
    "SEGUROS": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Baixa"),
    "SOFTW": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Baixa"),
    "PCT_CONSUM": ("ESTIMATIVA_VCLEVEL", "benchmark", "Média"),
    "OUTROS": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Baixa"),
    "INV_OBRAS": ("A_VALIDAR", "orçamento", "Baixa"),
    "INV_EQUIP": ("A_VALIDAR", "orçamento", "Baixa"),
    "INV_EQUIP_R": ("A_VALIDAR", "legislação", "Baixa"),
    "INV_SOFT": ("A_VALIDAR", "orçamento", "Baixa"),
    "REM_GER": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Média"),
    "TA_EST": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Baixa"),
    "POL_DIST": ("A_VALIDAR", "cliente", "Baixa"),
    "PCT_CONJ": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Média"),
    "REND_CONJ": ("A_VALIDAR", "cliente", "Baixa"),
    "CONJUNTA": ("A_VALIDAR", "cliente", "Baixa"),
    "N_DEP": ("A_VALIDAR", "cliente", "Baixa"),
    "DED_COL": ("ESTIMATIVA_VCLEVEL", "VCLevel", "Baixa"),
}
hdr(wsi, 4, ["Tipo", "Fonte", "Confiança"], start=7)
FALTA_ROWS = []

for item in IN_ROWS:
    if item[0] == "SEC":
        section(wsi, r, item[1], span=9); r += 1
        continue
    kind, key, label, vals, fmt, note = item
    wsi.cell(row=r, column=1, value=label).font = F_BODY
    wsi.cell(row=r, column=2, value=key).font = F_NOTE
    I[key] = r
    for j, (col, _n) in enumerate(SCEN):
        c = wsi.cell(row=r, column=3 + j, value=(vals(col) if kind == "F" else vals[j]))
        c.number_format, c.border = fmt, BOX
        if kind == "F":
            c.font = F_CALC
        else:
            c.font, c.fill = F_INPUT, FILL_FILL
    n = wsi.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    tipo, fonte, conf = PROV.get(key, ("DERIVADO", "modelo", "n/a")) if kind != "F" \
        else ("DERIVADO", "modelo", "n/a")
    for k2, val in enumerate((tipo, fonte, conf)):
        cc = wsi.cell(row=r, column=7 + k2, value=val)
        cc.font, cc.border = F_NOTE, BOX
        cc.alignment = Alignment(horizontal="center")
    falta = 1 if tipo == "A_VALIDAR" else 0
    if falta:
        n.fill = FILL_WARN
        wsi.cell(row=r, column=7).fill = FILL_WARN
    fl = wsi.cell(row=r, column=10, value=falta)
    fl.font, fl.number_format = F_NOTE, NUM
    FALTA_ROWS.append(r)
    r += 1


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


# ================================================================ BREAK-EVEN
wb_ = wb.create_sheet("BreakEven")
title(wb_, "M1 — Break-even operacional e rendimento-alvo",
      "Três coisas diferentes que a mesma palavra designa. O break-even FISCAL, na folha PontoViragem, "
      "diz quando uma estrutura passa a ser melhor que outra. O break-even OPERACIONAL, aqui em cima, diz "
      "quando a clínica cobre os custos. O RENDIMENTO-ALVO, aqui em baixo, diz quanto é preciso faturar "
      "para a fundadora receber o que quer receber. Nunca misturar as três numa frase.")
widths(wb_, {"A": 54, "B": 13, "C": 15, "D": 15, "E": 15, "F": 52})
wb_.merge_cells("A2:F2"); wb_["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wb_.row_dimensions[2].height = 52
r = 4
hdr(wb_, r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota"]); r += 1
B = {}


def brow(key, label, fn, fmt=EUR, style="calc", note=""):
    global r
    wb_.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wb_.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wb_.cell(row=r, column=3 + j, value=fn(col) if callable(fn) else fn)
        c.number_format, c.border = fmt, BOX
        c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
        if style == "result":
            c.fill = FILL_RES
        if style == "input":
            c.fill = FILL_FILL
    n = wb_.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    B[key] = r
    r += 1


def bc(key, col):
    return "$%s$%d" % (col, B[key])


section(wb_, r, "Break-even operacional", span=6); r += 1
brow("REC", "Receita da estrutura",
     lambda c: "={a}+{b}".format(a=inp("FAT_ISENTA", c), b=inp("REC_NAOPROF", c)), style="link")
brow("CV", "Custos variáveis",
     lambda c: "={a}+{b}".format(a=inp("CONSUM", c), b=inp("CUSTO_COLAB", c)), style="link",
     note="Consumíveis e honorários dos colaboradores. Acompanham o volume.")
brow("MC", "Margem de contribuição",
     lambda c: "={a}-{b}".format(a=bc("REC", c), b=bc("CV", c)), style="result")
brow("MCP", "Margem de contribuição (%)",
     lambda c: "=IF({a}<=0,0,{b}/{a})".format(a=bc("REC", c), b=bc("MC", c)), fmt=PCT, style="result",
     note="É o denominador do break-even. No modelo de prestação de serviços, a % de honorários "
          "esmaga esta linha — e é por isso que a ata avisa que faturação não é margem.")
brow("CF", "Custos fixos",
     lambda c: "=" + "+".join(inp(k, c) for k in ["RENDA", "CONDOM", "SEGUROS", "SOFTW", "OUTROS"]),
     style="link", note="Base de caixa: exclui amortizações, que não são saída de dinheiro.")
brow("BE", "BREAK-EVEN OPERACIONAL (faturação anual)",
     lambda c: "=IF({m}<=0,0,{f}/{m})".format(m=bc("MCP", c), f=bc("CF", c)), style="result")
brow("BE_MES", "Break-even operacional (faturação mensal)",
     lambda c: "={a}/12".format(a=bc("BE", c)), style="result",
     note="É este o número para dizer à cliente. Ninguém pensa em faturação anual.")
brow("MARG_SEG", "Margem de segurança sobre a receita projetada",
     lambda c: "=IF({a}<=0,0,({a}-{b})/{a})".format(a=bc("REC", c), b=bc("BE", c)), fmt=PCT, style="result",
     note="Negativa significa que a projeção não cobre os custos fixos.")
brow("PRECO_M", "Preço médio por consulta",
     lambda c: "=IF({t}<=0,0,{f}/{t})".format(t=oref("CONS_TOT", c), f=oref("FAT_TOT", c)),
     fmt=EUR2, style="link")
brow("CONS_BE", "Consultas anuais necessárias para o break-even",
     lambda c: "=IF({p}<=0,0,{b}/{p})".format(p=bc("PRECO_M", c), b=bc("BE", c)), fmt=NUM, style="calc")
brow("UTIL_BE", "UTILIZAÇÃO DOS GABINETES NECESSÁRIA PARA O BREAK-EVEN",
     lambda c: "=IF({k}<=0,0,{n}/{k})".format(k=oref("CAP_ANO", c), n=bc("CONS_BE", c)),
     fmt=PCT, style="result",
     note="Acima de 100% significa que o espaço escolhido não permite cobrir os seus próprios custos "
          "fixos, seja qual for a estrutura fiscal. É a verificação de plausibilidade empresarial.")

# ---- rendimento-alvo
r += 1
section(wb_, r, "Rendimento-alvo da fundadora", span=6); r += 1
TGT_ROW = r
wb_.cell(row=r, column=1, value="Rendimento anual líquido pretendido pela fundadora").font = F_RESULT
tc = wb_.cell(row=r, column=3, value=30000)
tc.number_format, tc.font, tc.fill, tc.border = EUR, F_INPUT, FILL_FILL, BOX
wb_.cell(row=r, column=6,
         value="Ação 0.8 do P1. É o input que a cliente não sabe que tem de dar, e é o que decide entre "
               "a via 3 e a via 4.").font = F_NOTE
r += 2

CFB, PCTVAR = "$D$%d" % B["CF"], "(1-$D$%d)" % B["MCP"]
RCB, AMB = inp("REND_CONJ", "D"), AMORT("D")
REMB, TAB = inp("REM_GER", "D"), inp("TA_EST", "D")
BMOE = "MAX({r},{i}*{m}*12)".format(r=REMB, i=P["IAS"], m=P["SS_MOE_MIN"])
TSUB, SSTB = "({b})*{t}".format(b=BMOE, t=P["SS_MOE_ENT"]), "({b})*{t}".format(b=BMOE, t=P["SS_MOE_BEN"])

wb_.cell(row=r, column=1,
         value="Faturação necessária para atingir o rendimento-alvo, por estrutura. Custos fixos e peso "
               "dos custos variáveis fixados no cenário Base. Resolução de 10.000 €.").font = F_SUB
wb_.merge_cells(start_row=r, start_column=1, end_row=r, end_column=18)
r += 1
hdr(wb_, r, ["Faturação", "Custos", "Caixa", "Rend. cat. B (v1)", "SS v1", "IRS v1", "LÍQUIDO v1",
             "Lucro trib. (v2)", "SS v2", "IRS v2", "LÍQUIDO v2", "Lucro trib. (v3)", "Rend. sócia (v3)",
             "IRS v3", "LÍQUIDO v3", "Alvo v1", "Alvo v2", "Alvo v3"])
r += 1
TT = r
for i in range(13):
    fat = 40000 + 10000 * i
    a = wb_.cell(row=r, column=1, value=fat); a.number_format, a.font, a.border = EUR, F_INPUT, BOX
    cells = {
        2: "=({cf})+A{r}*{pv}".format(cf=CFB, r=r, pv=PCTVAR),
        3: "=A{r}-B{r}".format(r=r),
        4: "=A{r}*{k}+MAX(0,A{r}*{lj}-B{r})-MAX(0,E{r}-A{r}*{lc})".format(
            r=r, k=P["COEF"], lj=P["LIM_JUST"], lc=P["LIM_CONTRIB"]),
        5: "=MAX(MIN(A{r}*{p},{i}*{m}*12)*{t},{mn}*12)".format(
            r=r, p=P["SS_TI_PCT"], i=P["IAS"], m=P["SS_TI_TETO"], t=P["SS_TI_TAXA"], mn=P["SS_TI_MIN"]),
        6: "=" + colfull("D%d+%s" % (r, RCB)) + "-" + colfull(RCB),
        7: "=C{r}-E{r}-F{r}".format(r=r),
        8: "=MAX(0,A{r}-B{r}-({am})-I{r})".format(r=r, am=AMB),
        9: "=MAX(MIN(MAX(A{r}-B{r}-({am}),0),{i}*{m}*12)*{t},{mn}*12)".format(
            r=r, am=AMB, i=P["IAS"], m=P["SS_TI_TETO"], t=P["SS_TI_TAXA"], mn=P["SS_TI_MIN"]),
        10: "=" + colfull("H%d+%s" % (r, RCB)) + "-" + colfull(RCB),
        11: "=C{r}-I{r}-J{r}".format(r=r),
        12: "=A{r}-B{r}-({am})-({rm})-({ts})".format(r=r, am=AMB, rm=REMB, ts=TSUB),
        13: "=MAX(0,({rm})-MIN(({rm}),MAX({d},{st})))+MAX(L{r},0)".format(
            rm=REMB, d=P["DED_CATA"], st=SSTB, r=r),
        14: "=" + colfull("M%d+%s" % (r, RCB)) + "-" + colfull(RCB),
        15: "=C{r}-({st})-({ts})-({ta})-N{r}".format(r=r, st=SSTB, ts=TSUB, ta=TAB),
    }
    for col, f in cells.items():
        c = wb_.cell(row=r, column=col, value=f)
        c.number_format, c.border = EUR, BOX
        c.font = F_RESULT if col in (7, 11, 15) else F_CALC
    for k2, (col, src) in enumerate([(16, "G"), (17, "K"), (18, "O")]):
        f = "=0" if i == 0 else "=IF(AND({s}{r}>=$C${t},{s}{p}<$C${t}),A{r},0)".format(
            s=src, r=r, p=r - 1, t=TGT_ROW)
        c = wb_.cell(row=r, column=col, value=f)
        c.number_format, c.font, c.border = EUR, F_CALC, BOX
    r += 1
TB = r - 1
r += 1
for k2, (col, nome) in enumerate([(16, "Via 1 — ENI simplificado"), (17, "Via 2 — ENI cont. organizada"),
                                  (18, "Via 3 — Sociedade transparente")]):
    wb_.cell(row=r, column=1, value="Faturação necessária para o rendimento-alvo — " + nome).font = F_RESULT
    cl = get_column_letter(col)
    c = wb_.cell(row=r, column=3,
                 value='=IF(MAX({cl}{a}:{cl}{b})=0,"Fora do intervalo analisado",MAX({cl}{a}:{cl}{b}))'
                       .format(cl=cl, a=TT, b=TB))
    c.number_format, c.font, c.fill, c.border = EUR, F_RESULT, FILL_RES, BOX
    r += 1
r += 1
r += 2
section(wb_, r, "Como o break-even se move com o peso dos colaboradores", span=6); r += 1
wb_.cell(row=r, column=1,
         value="Quando a faturação vem da própria Dra. Júlia, quase toda ela é margem. Quando vem de um "
               "colaborador pago a uma percentagem da sessão, sobra a diferença. Esta tabela mostra o que "
               "acontece ao break-even à medida que o peso dos colaboradores sobe, mantendo a receita "
               "total constante. A subida não é proporcional: o break-even é os custos fixos a dividir "
               "pela margem, e quando a margem se aproxima de zero o break-even dispara para o "
               "infinito.").font = F_SUB
wb_.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wb_["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wb_.row_dimensions[r].height = 46
r += 1
hdr(wb_, r, ["Peso dos colaboradores na receita", "Margem de contribuição (%)",
             "Break-even anual", "Break-even mensal", "Utilização necessária", "Nota"])
r += 1
MT = r
for i in range(9):
    sh = 0.10 * i
    a = wb_.cell(row=r, column=1, value=sh); a.number_format, a.font, a.border = PCT, F_INPUT, BOX
    b = wb_.cell(row=r, column=2, value="=1-{pc}-A{r}*{ph}".format(
        pc=inp("PCT_CONSUM", "D"), r=r, ph=inp("PCT_HONOR", "D")))
    b.number_format, b.font, b.border = PCT, F_CALC, BOX
    c = wb_.cell(row=r, column=3, value='=IF(B{r}<=0,"não atinge",{cf}/B{r})'.format(r=r, cf=CFB))
    c.number_format, c.font, c.border = EUR, F_RESULT, BOX
    d = wb_.cell(row=r, column=4, value='=IF(B{r}<=0,"não atinge",C{r}/12)'.format(r=r))
    d.number_format, d.font, d.border = EUR, F_RESULT, BOX
    e = wb_.cell(row=r, column=5, value='=IF(B{r}<=0,"n/a",C{r}/({p}*{cap}))'.format(
        r=r, p="BreakEven!$D$%d" % B["PRECO_M"], cap=oref("CAP_ANO", "D")))
    e.number_format, e.font, e.border = PCT, F_CALC, BOX
    r += 1
MB = r - 1
r += 1
wb_.cell(row=r, column=1,
         value="A ata regista, no ponto 6, que «se uma parte relevante da faturação corresponder a "
               "honorários de prestadores, a margem efetiva pode não justificar a alteração de "
               "estrutura». Esta tabela é essa frase em números — e mostra que o problema aparece muito "
               "antes de a margem chegar a zero.").font = F_SUB
wb_.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wb_["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wb_.row_dimensions[r].height = 32

_l3 = LineChart()
_l3.title = "Break-even anual por peso dos colaboradores na receita"
_l3.y_axis.title, _l3.x_axis.title = "euros", "peso dos colaboradores"
_l3.height, _l3.width = 8, 17
_l3.append(Series(Reference(wb_, min_col=3, min_row=MT - 1, max_row=MB), title_from_data=True))
_l3.set_categories(Reference(wb_, min_col=1, min_row=MT, max_row=MB))
wb_.add_chart(_l3, "T4")

r += 2
wb_.cell(row=r, column=1,
         value="A via 4 não consta desta tabela: o líquido depende da política de distribuição e da opção "
               "de englobamento, que são decisões e não funções da faturação. Para a via 4, fixar essas "
               "alavancas na folha Inputs e ler o resultado na folha Comparativo.").font = F_SUB
wb_.merge_cells(start_row=r, start_column=1, end_row=r, end_column=18)
wb_["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wb_.row_dimensions[r].height = 30
wb_.freeze_panes = "A5"


# ================================================================ ESPACO 2 vs 3 GABINETES
we = wb.create_sheet("Espaco")
title(we, "M1 — Espaço: 2 versus 3 gabinetes",
      "A ata deixa a escolha em aberto e trata-a como uma questão de renda. Não é: o terceiro gabinete "
      "acrescenta capacidade e acrescenta custo fixo, e só compensa a partir de um nível de utilização. "
      "O output principal desta folha é esse nível.")
widths(we, {"A": 50, "B": 12, "C": 17, "D": 17, "E": 50})
we.merge_cells("A2:E2"); we["A2"].alignment = Alignment(wrap_text=True, vertical="top")
we.row_dimensions[2].height = 44
r = 4
hdr(we, r, ["Rubrica", "Ref.", "Opção A — 2 gabinetes", "Opção B — 3 gabinetes", "Nota"]); r += 1
E = {}
ECOLS = [("C", 0), ("D", 1)]


def erow(key, label, vals=None, fn=None, fmt=EUR, style="input", note=""):
    global r
    we.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    we.cell(row=r, column=2, value=key).font = F_NOTE
    for col, j in ECOLS:
        c = we.cell(row=r, column=3 if col == "C" else 4,
                    value=(vals[j] if vals is not None else fn(col)))
        c.number_format, c.border = fmt, BOX
        c.font = {"input": F_INPUT, "calc": F_CALC, "result": F_RESULT, "link": F_LINK}[style]
        if style == "input":
            c.fill = FILL_FILL
        if style == "result":
            c.fill = FILL_RES
    n = we.cell(row=r, column=5, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    E[key] = r
    r += 1


def ec(key, col):
    return "$%s$%d" % (col, E[key])


section(we, r, "Características de cada espaço", span=5); r += 1
erow("N_GAB", "N.º de gabinetes", (2, 3), fmt=NUM)
erow("RENDA", "Renda anual", (14400, 19200), note="Input cliente 3 — EM FALTA, para os dois espaços.")
erow("CONDOM", "Condomínio e encargos anuais", (1500, 2000), note="EM FALTA.")
erow("OBRAS", "Obras de adaptação", (25000, 38000), note="Input cliente 4 — EM FALTA.")
erow("EQUIP", "Equipamento clínico", (20000, 26000), note="EM FALTA.")

section(we, r, "Pressupostos comuns", span=5); r += 1
erow("UTIL", "Taxa de utilização a testar", (0.45, 0.45), fmt=PCT, style="input",
     note="ALAVANCA. Varrida na tabela em baixo. Aqui serve para a fotografia de um único ponto.")
erow("PRECO_M", "Preço médio por consulta", fn=lambda c: "=" + "BreakEven!$D$%d" % B["PRECO_M"],
     fmt=EUR2, style="link")
erow("PCT_VAR", "Custos variáveis em % da receita",
     fn=lambda c: "=1-BreakEven!$D$%d" % B["MCP"], fmt=PCT, style="link")
erow("CF_OUTROS", "Outros custos fixos (seguros, software, outros)",
     fn=lambda c: "=" + "+".join(inp(k, "D") for k in ["SEGUROS", "SOFTW", "OUTROS"]), style="link")
erow("TX_ESF", "Taxa de esforço fiscal e contributiva aplicada",
     fn=lambda c: "=" + v2.ref("TAXA_EF", "D"), fmt=PCT, style="link",
     note="Usa a taxa de esforço da via 2 no cenário Base. É uma aproximação assumida: a comparação "
          "entre espaços é operacional, e a estrutura fiscal é a mesma nos dois. Registado em R1-33.")

section(we, r, "Capacidade e resultado ao nível de utilização testado", span=5); r += 1
erow("CAP", "Capacidade anual (consultas)",
     fn=lambda c: "={g}*{d}*{k}".format(g=ec("N_GAB", c), d=oref("DIAS_ANO", "D"), k=oref("CAP_DIA", "D")),
     fmt=NUM, style="result")
erow("CONS", "Consultas ao nível de utilização testado",
     fn=lambda c: "={a}*{u}".format(a=ec("CAP", c), u=ec("UTIL", c)), fmt=NUM, style="calc")
erow("FAT", "Faturação potencial",
     fn=lambda c: "={a}*{p}".format(a=ec("CONS", c), p=ec("PRECO_M", c)), style="result")
erow("MC", "Margem de contribuição",
     fn=lambda c: "={f}*(1-{v})".format(f=ec("FAT", c), v=ec("PCT_VAR", c)), style="calc")
erow("CF", "Custos fixos totais",
     fn=lambda c: "={a}+{b}+{o}".format(a=ec("RENDA", c), b=ec("CONDOM", c), o=ec("CF_OUTROS", c)),
     style="calc")
erow("RES", "Resultado operacional",
     fn=lambda c: "={a}-{b}".format(a=ec("MC", c), b=ec("CF", c)), style="result")
erow("RES_LIQ", "Resultado líquido de impostos e contribuições",
     fn=lambda c: "={a}*(1-{t})".format(a=ec("RES", c), t=ec("TX_ESF", c)), style="result")

section(we, r, "Investimento e recuperação", span=5); r += 1
erow("IVA_P", "IVA não dedutível sobre o investimento",
     fn=lambda c: "=({o}+{e})*{t}".format(o=ec("OBRAS", c), e=ec("EQUIP", c), t=P["IVA_NORM"]),
     style="calc", note="Custo definitivo: a fisioterapia é isenta sem direito à dedução.")
erow("INV", "INVESTIMENTO INICIAL TOTAL",
     fn=lambda c: "={o}+{e}+{i}".format(o=ec("OBRAS", c), e=ec("EQUIP", c), i=ec("IVA_P", c)),
     style="result")
erow("PAYBACK", "PAYBACK (anos)",
     fn=lambda c: '=IF({l}<=0,"Não recupera",{i}/{l})'.format(l=ec("RES_LIQ", c), i=ec("INV", c)),
     fmt='#,##0.0', style="result",
     note="Anos de resultado líquido necessários para recuperar o investimento, ao nível de utilização "
          "testado. Não desconta o valor do dinheiro no tempo — para esta dimensão, não compensa.")
erow("ROI", "Retorno anual sobre o investimento",
     fn=lambda c: "=IF({i}<=0,0,{l}/{i})".format(i=ec("INV", c), l=ec("RES_LIQ", c)), fmt=PCT, style="calc")
erow("BE_UTIL", "Utilização necessária para o break-even operacional",
     fn=lambda c: "=IF({cap}*{p}*(1-{v})<=0,0,{cf}/({cap}*{p}*(1-{v})))".format(
         cap=ec("CAP", c), p=ec("PRECO_M", c), v=ec("PCT_VAR", c), cf=ec("CF", c)),
     fmt=PCT, style="result",
     note="Acima de 100%, o espaço não cobre os próprios custos fixos a lotação máxima.")

# ---- o custo do degrau
r += 1
section(we, r, "O custo do degrau — se o terceiro gabinete não encher", span=5); r += 1
for lbl, f, fmt2, nota in [
    ("Custo fixo adicional anual da opção B", "={a}-{b}".format(a=ec("CF", "D"), b=ec("CF", "C")), EUR,
     "Renda e condomínio a mais, todos os anos, independentemente de haver doentes para os ocupar."),
    ("Custo do degrau, líquido de impostos", "=({a}-{b})*(1-{t})".format(
        a=ec("CF", "D"), b=ec("CF", "C"), t=ec("TX_ESF", "C")), EUR,
     "É este o valor que a Dra. Júlia perde por ano se escolher três gabinetes e a procura não passar "
     "do que dois comportavam."),
    ("Investimento adicional da opção B", "={a}-{b}".format(a=ec("INV", "D"), b=ec("INV", "C")), EUR,
     "Obras, equipamento e IVA irrecuperável a mais, de uma só vez."),
    ("Consultas anuais adicionais necessárias para o degrau se pagar",
     "=IF({p}*(1-{v})<=0,0,({cfd}-{cfc})/({p}*(1-{v})))".format(
         p=ec("PRECO_M", "C"), v=ec("PCT_VAR", "C"), cfd=ec("CF", "D"), cfc=ec("CF", "C")), NUM,
     "Traduzido para a única unidade que a cliente controla: doentes."),
]:
    we.cell(row=r, column=1, value=lbl).font = F_RESULT
    c = we.cell(row=r, column=3, value=f)
    c.number_format, c.font, c.fill, c.border = fmt2, F_RESULT, FILL_RES, BOX
    n = we.cell(row=r, column=5, value=nota); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    we.row_dimensions[r].height = 26
    r += 1

# ---- varrimento de procura
r += 1
section(we, r, "A partir de que procura compensa o terceiro gabinete", span=5); r += 1
we.cell(row=r, column=1,
        value="O eixo é a PROCURA, em consultas por ano — não a taxa de utilização. Comparar as duas "
              "opções à mesma percentagem de utilização daria automaticamente mais 50% de consultas à "
              "opção de três gabinetes, e a comparação não significaria nada. À mesma procura, cada "
              "opção atende o que a sua capacidade permite, e o terceiro gabinete só vale alguma coisa "
              "quando a procura ultrapassa a capacidade de dois.").font = F_SUB
we.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
we["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
we.row_dimensions[r].height = 44
r += 1
hdr(we, r, ["Procura anual (consultas)", "Resultado líquido — 2 gabinetes",
            "Resultado líquido — 3 gabinetes", "Diferencial", "Viragem"])
r += 1
UT = r
for i in range(16):
    proc = 1000 + 400 * i
    a = we.cell(row=r, column=1, value=proc); a.number_format, a.font, a.border = NUM, F_INPUT, BOX
    for col, gcol in [(2, "C"), (3, "D")]:
        f = "=(MIN(A{r},{cap})*{p}*(1-{v})-{cf})*(1-{t})".format(
            r=r, cap=ec("CAP", gcol), p=ec("PRECO_M", gcol), v=ec("PCT_VAR", gcol),
            cf=ec("CF", gcol), t=ec("TX_ESF", gcol))
        c = we.cell(row=r, column=col, value=f)
        c.number_format, c.font, c.border = EUR, F_CALC, BOX
    d = we.cell(row=r, column=4, value="=C{r}-B{r}".format(r=r))
    d.number_format, d.font, d.border = EUR, F_RESULT, BOX
    m = we.cell(row=r, column=5,
                value=("=0" if i == 0 else "=IF(AND(D{r}>=0,D{p}<0),A{r},0)".format(r=r, p=r - 1)))
    m.number_format, m.font, m.border = NUM, F_CALC, BOX
    r += 1
UB = r - 1
r += 1
we.cell(row=r, column=1, value="O TERCEIRO GABINETE COMPENSA A PARTIR DE (consultas/ano)").font = F_RESULT
c = we.cell(row=r, column=3,
            value='=IF(MAX(E{a}:E{b})=0,"Nunca compensa no intervalo analisado",MAX(E{a}:E{b}))'
                  .format(a=UT, b=UB))
c.number_format, c.font, c.fill, c.border = NUM, F_RESULT, FILL_RES, BOX
VIR_ROW = r
r += 1
we.cell(row=r, column=1, value="…o que corresponde, no espaço de 2 gabinetes, a uma utilização de").font = F_RESULT
c = we.cell(row=r, column=3,
            value='=IF(ISNUMBER($C${v}),$C${v}/{cap},"n/a")'.format(v=VIR_ROW, cap=ec("CAP", "C")))
c.number_format, c.font, c.fill, c.border = PCT, F_RESULT, FILL_RES, BOX
r += 1
we.cell(row=r, column=1, value="Consultas por dia úteis implícitas nesse ponto").font = F_BODY
c = we.cell(row=r, column=3,
            value='=IF(ISNUMBER($C${v}),$C${v}/{d},"n/a")'.format(v=VIR_ROW, d=oref("DIAS_ANO", "D")))
c.number_format, c.font, c.border = '#,##0.0', F_CALC, BOX
r += 2
we.cell(row=r, column=1,
        value="Leitura: abaixo do ponto de viragem, o terceiro gabinete é renda e obras a mais sem "
              "receita adicional — a opção de dois gabinetes ganha por diferença de custo fixo. Acima, "
              "a opção de dois perde consultas por falta de espaço e a de três recupera o custo. "
              "A pergunta a fazer à cliente não é qual espaço prefere: é quantos doentes por dia espera "
              "atender no fim do segundo ano. Resolução do varrimento: 400 consultas por ano. O ponto de "
              "viragem real situa-se algures no intervalo anterior ao indicado — refinar por interpolação "
              "se a decisão ficar perto do limite. Registado em R1-34.").font = F_SUB
we.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
we["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
we.row_dimensions[r].height = 32

_l2 = LineChart()
_l2.title = "Resultado líquido por nível de procura — 2 vs. 3 gabinetes"
_l2.y_axis.title, _l2.x_axis.title = "euros", "procura anual (consultas)"
_l2.height, _l2.width = 9, 18
for _c in (2, 3):
    _l2.append(Series(Reference(we, min_col=_c, min_row=UT - 1, max_row=UB), title_from_data=True))
_l2.set_categories(Reference(we, min_col=1, min_row=UT, max_row=UB))
we.add_chart(_l2, "G4")
we.freeze_panes = "A5"


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


def og(k, i):
    return float(OVALS[k][i])


def comuns(i):
    mod = g("MOD_COLAB", i)
    # camada operacional: a faturacao e derivada, nao introduzida
    fat_jul = og("DIAS_JUL", i) * og("CONS_JUL", i) * og("PRECO_JUL", i)
    fat_fis = og("N_FISIO", i) * og("DIAS_FIS", i) * og("CONS_FIS", i) * og("PRECO_FIS", i)
    manual = g("FONTE_FAT", i) == 1
    fat_prop = g("FAT_PROP_MAN", i) if manual else fat_jul
    fat_colab = g("FAT_COLAB_MAN", i) if manual else fat_fis
    fat_is = fat_prop + (fat_colab if mod == 1 else 0.0)
    rec_np = fat_colab * g("PCT_SALA", i) if mod == 2 else 0.0
    custo_col = fat_colab * g("PCT_HONOR", i) if mod == 1 else 0.0
    consum = (fat_prop + (fat_colab if mod == 1 else 0.0)) * g("PCT_CONSUM", i)
    op_sem_hon = sum(g(k, i) for k in ["RENDA", "CONDOM", "SEGUROS", "SOFTW", "OUTROS"]) + consum
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
VAL_GLOBAL = "Validacao!$D$%d" % r
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


# ================================================================ RISCO LABORAL
wr = wb.create_sheet("RiscoLaboral")
title(wr, "M1 — Requalificação laboral: passivo contingente",
      "A ata identificou o risco e ninguém lhe pôs um número. Este é o número. Se a relação com os "
      "fisioterapeutas for requalificada como contrato de trabalho, a clínica passa a dever contribuições "
      "retroativas sobre tudo o que lhes pagou, com juros e coima. É o único risco deste projeto capaz de "
      "destruir o plano inteiro de uma vez.")
widths(wr, {"A": 62, "B": 13, "C": 15, "D": 15, "E": 15, "F": 54})
wr.merge_cells("A2:F2"); wr["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wr.row_dimensions[2].height = 52
r = 4
hdr(wr, r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota / norma"]); r += 1
RL = {}


def rrow(key, label, fn, fmt=EUR, style="calc", note=""):
    global r
    wr.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wr.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wr.cell(row=r, column=3 + j, value=fn(col) if callable(fn) else fn)
        c.number_format, c.border = fmt, BOX
        c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
        if style == "result":
            c.fill = FILL_RES
        if style == "input":
            c.fill = FILL_FILL
    n = wr.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    RL[key] = r
    r += 1


def rc_(key, col):
    return "$%s$%d" % (col, RL[key])


section(wr, r, "Exposição", span=6); r += 1
rrow("HONOR", "Honorários anuais pagos aos colaboradores",
     lambda c: "=" + inp("CUSTO_COLAB", c), style="link",
     note="Só existe exposição no modelo de prestação de serviços. Na cedência de sala o fluxo é o "
          "inverso e o risco é outro — o de a cedência ser requalificada como prestação de serviços.")
rrow("ANOS", "Anos de exposição retroativa", lambda c: "=" + P["PRESCR"], fmt=NUM, style="link",
     note="Prazo de prescrição das contribuições. A inspeção não olha só para o ano corrente.")
rrow("BASE", "Base de incidência retroativa",
     lambda c: "={h}*{a}".format(h=rc_("HONOR", c), a=rc_("ANOS", c)), style="result",
     note="Assume honorários constantes ao longo do período. Se crescerem, a exposição cresce com eles.")

section(wr, r, "Contribuições devidas em caso de requalificação", span=6); r += 1
rrow("TSU_E", "Contribuições a cargo da entidade",
     lambda c: "={b}*{t}".format(b=rc_("BASE", c), t=P["TSU_ENT"]),
     note="Art. 53.º Cód. Contributivo. É a parcela que a clínica nunca pagou e passa a dever.")
rrow("TSU_T", "Contribuições a cargo do trabalhador, não retidas",
     lambda c: "={b}*{t}".format(b=rc_("BASE", c), t=P["TSU_TRAB"]),
     note="A entidade é responsável pela entrega. Na prática, é dívida da clínica.")
rrow("JUROS", "Juros de mora estimados",
     lambda c: "=({a}+{b})*{j}*{n}/2".format(a=rc_("TSU_E", c), b=rc_("TSU_T", c),
                                             j=P["JUROS_MORA"], n=rc_("ANOS", c)),
     note="Aproximação: metade do período médio de mora sobre o total em dívida. Ordem de grandeza, "
          "não liquidação.")
rrow("COIMA", "Coima estimada",
     lambda c: "={a}*{p}".format(a=rc_("TSU_E", c), p=P["COIMA_PCT"]),
     note="ESTIMATIVA GROSSEIRA, a 50% das contribuições da entidade. A moldura das contraordenações "
          "por falta de comunicação de admissão e de pagamento de contribuições tem de ser confirmada "
          "pela Fiscalidade ou por advogado. Ver R1-38.")
rrow("PASSIVO", "PASSIVO CONTINGENTE TOTAL",
     lambda c: "={a}+{b}+{d}+{e}".format(a=rc_("TSU_E", c), b=rc_("TSU_T", c),
                                         d=rc_("JUROS", c), e=rc_("COIMA", c)), style="result")

section(wr, r, "Dimensão do risco", span=6); r += 1
rrow("LIQ_REF", "Resultado líquido anual da via de referência (via 2)",
     lambda c: "=" + v2.ref("LIQ_SOC", c), style="link")
rrow("ANOS_RES", "ANOS DE RESULTADO LÍQUIDO QUE O PASSIVO CONSOME",
     lambda c: '=IF({l}<=0,"n/a",{p}/{l})'.format(l=rc_("LIQ_REF", c), p=rc_("PASSIVO", c)),
     fmt='#,##0.0', style="result",
     note="É esta a frase a dizer à cliente, e não a percentagem: quantos anos de trabalho pago desaparecem "
          "se isto correr mal.")
rrow("VS_INV", "Passivo em % do investimento inicial",
     lambda c: "=IF(({o}+{e}+{d}+{f})<=0,0,{p}/({o}+{e}+{d}+{f}))".format(
         o=inp("INV_OBRAS", c), e=inp("INV_EQUIP", c), d=inp("INV_EQUIP_R", c), f=inp("INV_SOFT", c),
         p=rc_("PASSIVO", c)), fmt=PCT, style="calc")

# ---- indicios do art. 12.º CT
r += 1
section(wr, r, "Indícios de laboralidade — art. 12.º n.º 1 do Código do Trabalho", span=6); r += 1
wr.cell(row=r, column=1,
        value="A presunção de contrato de trabalho opera quando se verifiquem ALGUMAS destas "
              "características. Não é preciso que se verifiquem todas. Marcar 1 onde se aplica.").font = F_SUB
wr.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wr["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
r += 1
IND_TOP = r
INDICIOS = [
    ("a) O local de trabalho pertence ao beneficiário da atividade ou é por ele determinado", 1,
     "ESTRUTURALMENTE PRESENTE numa clínica. O fisioterapeuta trabalha no espaço da Dra. Júlia. "
     "Não é evitável."),
    ("b) Os equipamentos e instrumentos de trabalho pertencem ao beneficiário da atividade", 1,
     "ESTRUTURALMENTE PRESENTE se o equipamento clínico for da clínica. Evitável apenas se o "
     "profissional usar material próprio, o que raramente acontece."),
    ("c) O prestador observa horas de início e de termo determinadas pelo beneficiário", 0,
     "EVITÁVEL, e é a decisão mais importante. Se a marcação de consultas for feita pela clínica com "
     "horário imposto, este indício verifica-se."),
    ("d) É paga, com certa periodicidade, uma quantia certa ao prestador", 0,
     "EVITÁVEL. Honorários variáveis em função das sessões efetivamente realizadas afastam-no; "
     "um valor fixo mensal verifica-o."),
    ("e) O prestador desempenha funções de direção ou chefia na estrutura da empresa", 0,
     "Improvável nesta fase."),
]
for label, val, nota in INDICIOS:
    wr.cell(row=r, column=1, value=label).font = F_BODY
    c = wr.cell(row=r, column=3, value=val)
    c.number_format, c.font, c.fill, c.border = NUM, F_INPUT, FILL_FILL, BOX
    n = wr.cell(row=r, column=6, value=nota)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    wr.row_dimensions[r].height = 26
    r += 1
IND_BOT = r - 1
r += 1
wr.cell(row=r, column=1, value="N.º de indícios verificados (de 5)").font = F_RESULT
c = wr.cell(row=r, column=3, value="=SUM($C$%d:$C$%d)" % (IND_TOP, IND_BOT))
c.number_format, c.font, c.fill, c.border = NUM, F_RESULT, FILL_RES, BOX
IND_SUM = r
r += 1
wr.cell(row=r, column=1, value="LEITURA").font = F_RESULT
c = wr.cell(row=r, column=3,
            value='=IF($C${s}>=3,"RISCO ELEVADO — presunção provável",'
                  'IF($C${s}=2,"RISCO ESTRUTURAL — os dois indícios inevitáveis já se verificam",'
                  '"RISCO CONTIDO"))'.format(s=IND_SUM))
c.font, c.fill, c.border = F_RESULT, FILL_WARN, BOX
wr.merge_cells(start_row=r, start_column=3, end_row=r, end_column=5)
r += 2
wr.cell(row=r, column=1,
        value="O que este quadro mostra, e é o essencial: numa clínica, os indícios a) e b) verificam-se "
              "desde o primeiro dia e não são evitáveis — o profissional trabalha no espaço e com o "
              "equipamento da clínica. A margem de manobra está inteiramente em c) e d), ou seja, no "
              "horário e na forma de remuneração. É aí que a blindagem contratual e, sobretudo, a prática "
              "diária têm de trabalhar. Um contrato bem redigido que seja desmentido pelo funcionamento "
              "real não protege ninguém.\n\nA presunção é ilidível, mas inverte o ónus da prova: passa a "
              "caber à clínica demonstrar que não há contrato de trabalho. A redação dos contratos e o "
              "parecer laboral estão fora do nosso âmbito; identificar e quantificar o risco, não.").font = F_SUB
wr.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wr["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wr.row_dimensions[r].height = 92
wr.freeze_panes = "C5"


# ================================================================ ALERTAS
wa = wb.create_sheet("Alertas")
title(wa, "M1 — Alertas",
      "Um modelo pode ter a fórmula certa, a fiscalidade certa e um pressuposto empresarial errado. Esta "
      "folha existe para apanhar o terceiro caso. Enquanto houver um alerta ATIVO com consequência "
      "bloqueante, nenhum número deste ficheiro pode ser citado no relatório, no deck ou perante a cliente.")
widths(wa, {"A": 52, "B": 14, "C": 12, "D": 56, "E": 22})
wa.merge_cells("A2:E2"); wa["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wa.row_dimensions[2].height = 46
r = 4

PAR_F = "Parametros!$F$%d:$F$%d" % (min(VALID_ROWS), max(VALID_ROWS))
INP_J = "Inputs!$J$%d:$J$%d" % (min(FALTA_ROWS), max(FALTA_ROWS))

section(wa, r, "Interruptores manuais — a equipa liga e desliga", span=5); r += 1
SW = {}
for key, label, val, nota in [
    ("SW_R114", "Atividade do cônjuge confirmada fora da tabela do art. 151.º CIRS? (1 = sim / 0 = não)",
     0, "R1-14 e N1-01. Enquanto for 0, a via 4 não é apresentável."),
    ("SW_N104", "Qualificação da cedência de sala fixada pela Fiscalidade? (1 = sim / 0 = não)",
     0, "N1-04. Enquanto for 0, o modelo 2 tem consequências fiscais assumidas, não determinadas."),
    ("SW_FIN", "Financiamento do investimento identificado? (1 = sim / 0 = não)",
     0, "Obras, equipamento e IVA irrecuperável têm de sair de algum lado."),
]:
    wa.cell(row=r, column=1, value=label).font = F_BODY
    c = wa.cell(row=r, column=2, value=val)
    c.number_format, c.font, c.fill, c.border = NUM, F_INPUT, FILL_FILL, BOX
    n = wa.cell(row=r, column=4, value=nota); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    SW[key] = "$B$%d" % r
    r += 1

r += 1
hdr(wa, r, ["Alerta", "Valor avaliado", "Estado", "Consequência se ativo", "Referência"]); r += 1
A_TOP = r

ALERTAS = [
    ("Parâmetros fiscais por validar para 2026", "=SUM(%s)" % PAR_F, NUM, "B{r}>0",
     "BLOQUEANTE. Os números podem estar certos na aritmética e errados na lei. Nenhum valor sai do "
     "ficheiro enquanto este alerta estiver ativo.", "R1, secção C · P0 da spec"),
    ("Inputs da cliente por confirmar", "=SUM(%s)" % INP_J, NUM, "B{r}>0",
     "BLOQUEANTE para o relatório. Os valores em uso são placeholders de teste do motor.",
     "R1, secção A · brief, secção 4"),
    ("Utilização dos gabinetes acima de 100%", "=" + oref("UTILIZ", "D"), PCT, "B{r}>" + P["UTIL_MAX"],
     "A projeção é impossível: não há gabinetes para as consultas previstas. Corrigir a projeção ou o "
     "número de gabinetes antes de qualquer outra coisa.", "Folha Operacao"),
    ("Utilização dos gabinetes acima de 85%", "=" + oref("UTILIZ", "D"), PCT,
     "AND(B{r}>" + P["UTIL_ALTA"] + ",B{r}<=" + P["UTIL_MAX"] + ")",
     "Operacionalmente muito exigente: sem folga para faltas, férias ou variação de procura.",
     "Folha Operacao"),
    ("Utilização subaproveitada, abaixo de 30%", "=" + oref("UTILIZ", "D"), PCT,
     "B{r}<" + P["UTIL_BAIXA"],
     "O espaço está sobredimensionado para a procura projetada. Rever a opção de espaço.",
     "Folhas Operacao e Espaco"),
    ("Receita projetada abaixo do break-even operacional",
     "=BreakEven!$D$%d" % B["MARG_SEG"], PCT, "B{r}<0",
     "A clínica não cobre os custos fixos com a faturação projetada. A discussão de estrutura fiscal é "
     "secundária face a isto.", "Folha BreakEven"),
    ("Margem de contribuição nula ou negativa", "=BreakEven!$D$%d" % B["MCP"], PCT, "B{r}<=0",
     "Cada consulta adicional destrói valor. Rever a % de honorários ou o preço.", "Folha BreakEven"),
    ("Utilização necessária para o break-even acima de 100%",
     "=BreakEven!$D$%d" % B["UTIL_BE"], PCT, "B{r}>1",
     "O espaço não consegue cobrir os próprios custos fixos nem a lotação máxima. O espaço está errado, "
     "não a estrutura.", "Folhas BreakEven e Espaco"),
    ("Premissa da atividade do cônjuge por verificar", "=1-%s" % SW["SW_R114"], NUM, "B{r}=1",
     "BLOQUEANTE para a via 4. Se a atividade do cônjuge constar da tabela do art. 151.º CIRS, a entrada "
     "dele não afasta a transparência com percentagem nenhuma.", "R1-14 · N1, secção 4.1"),
    ("Qualificação da cedência de sala por fixar", "=1-%s" % SW["SW_N104"], NUM, "B{r}=1",
     "O modelo 2 corre com consequências fiscais assumidas. A qualificação depende da configuração "
     "contratual e operacional concreta, não do nome do modelo.", "N1-04 · R1-31"),
    ("Investimento sem financiamento identificado", "=1-%s" % SW["SW_FIN"], NUM, "B{r}=1",
     "O plano assume que o investimento é feito. Se não houver origem de fundos, o cenário não é "
     "executável.", "Folha Espaco · P1, fase 3"),
    ("IVA dependente de pro rata ou afetação real", "=" + inp("REC_TRIB", "D"), EUR, "B{r}>0",
     "A dedução de IVA deixa de ser zero e passa a depender de um método e de segregação documental "
     "permanente. Confirmar o método antes de contar com o valor.", "Folha IVA · N1, secção 8"),
    ("Recálculo independente com divergências", '=IF(%s="TODAS AS VERIFICAÇÕES OK",0,1)' % VAL_GLOBAL,
     NUM, "B{r}=1",
     "BLOQUEANTE. As duas implementações do modelo discordam. Uma delas está errada.", "Folha Validacao"),
]

for label, valf, fmt, cond, cons, ref in ALERTAS:
    wa.cell(row=r, column=1, value=label).font = F_BODY
    b = wa.cell(row=r, column=2, value=valf)
    b.number_format, b.font, b.border = fmt, F_LINK, BOX
    st = wa.cell(row=r, column=3, value='=IF(%s,"ATIVO","—")' % cond.format(r=r))
    st.font, st.border = F_RESULT, BOX
    st.alignment = Alignment(horizontal="center")
    cc = wa.cell(row=r, column=4, value=cons)
    cc.font, cc.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    rf = wa.cell(row=r, column=5, value=ref); rf.font = F_NOTE
    rf.alignment = Alignment(wrap_text=True, vertical="top")
    wa.row_dimensions[r].height = 30
    r += 1
A_BOT = r - 1

r += 1
wa.cell(row=r, column=1, value="TOTAL DE ALERTAS ATIVOS").font = F_RESULT
c = wa.cell(row=r, column=2, value='=COUNTIF($C$%d:$C$%d,"ATIVO")' % (A_TOP, A_BOT))
c.number_format, c.font, c.fill, c.border = NUM, F_RESULT, FILL_RES, BOX
r += 1
wa.cell(row=r, column=1, value="O FICHEIRO PODE PRODUZIR NÚMEROS CITÁVEIS?").font = F_RESULT
c = wa.cell(row=r, column=2,
            value='=IF(COUNTIF($C$%d:$C$%d,"ATIVO")=0,"SIM","NÃO — resolver os alertas ativos")'
                  % (A_TOP, A_BOT))
c.font, c.fill, c.border = F_RESULT, FILL_WARN, BOX
wa.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
r += 2
wa.cell(row=r, column=1,
        value="Esta folha não substitui a Validacao. A Validacao verifica que as duas implementações do "
              "modelo concordam; esta verifica que o resultado faz sentido como negócio. São perguntas "
              "diferentes e um modelo pode passar numa e falhar na outra.").font = F_SUB
wa.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
wa["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wa.row_dimensions[r].height = 32
wa.freeze_panes = "A5"


# ================================================================ CONJUGE
wcj = wb.create_sheet("Conjuge")
title(wcj, "M1 — Entrada do cônjuge: custo de complexidade",
      "A hipótese foi levantada na reunião e ficou em análise, nem descartada nem recomendada. Esta folha "
      "põe de um lado tudo o que a entrada do cônjuge dá e do outro tudo o que custa, para que a decisão "
      "não se tome pela metade que é mais fácil de calcular.")
widths(wcj, {"A": 60, "B": 13, "C": 15, "D": 15, "E": 15, "F": 56})
wcj.merge_cells("A2:F2"); wcj["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wcj.row_dimensions[2].height = 46
r = 4
hdr(wcj, r, ["Rubrica", "Ref.", "Baixo", "Base", "Alto", "Nota"]); r += 1
CJ = {}


def cjrow(key, label, fn, fmt=EUR, style="calc", note=""):
    global r
    wcj.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wcj.cell(row=r, column=2, value=key).font = F_NOTE
    for j, (col, _n) in enumerate(SCEN):
        c = wcj.cell(row=r, column=3 + j, value=fn(col) if callable(fn) else fn)
        c.number_format, c.border = fmt, BOX
        c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
        if style == "result":
            c.fill = FILL_RES
        if style == "input":
            c.fill = FILL_FILL
    n = wcj.cell(row=r, column=6, value=note)
    n.font, n.alignment = F_NOTE, Alignment(wrap_text=True, vertical="top")
    CJ[key] = r
    r += 1


def cc_(key, col):
    return "$%s$%d" % (col, CJ[key])


section(wcj, r, "A premissa de que tudo depende", span=6); r += 1
wcj.cell(row=r, column=1,
         value="Toda esta folha assume que a atividade do cônjuge NÃO consta da tabela do art. 151.º CIRS. "
               "Se constar — por enquadramento como desportista ou pelo código residual — a entrada dele "
               "não afasta a transparência fiscal com percentagem de capital nenhuma, e tudo o que está "
               "abaixo passa a ser custo sem contrapartida. A premissa nunca foi verificada.").font = F_SUB
wcj.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wcj["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wcj.row_dimensions[r].height = 46
r += 1
cjrow("PREMISSA", "Premissa verificada? (1 = sim / 0 = não)",
      lambda c: "=Alertas!" + SW["SW_R114"].replace("$B$", "$B$"), fmt=NUM, style="link",
      note="Interruptor na folha Alertas. Ver R1-14 e N1-01.")

section(wcj, r, "O que a entrada do cônjuge dá", span=6); r += 1
cjrow("G_IVA", "IVA recuperável atribuível à entrada do cônjuge",
      lambda c: "=" + "IVA!$%s$%d" % (c, VR["GANHO"]), style="link",
      note="Zero enquanto o cônjuge não faturar DENTRO da sociedade. Deter capital não dá IVA nenhum: "
           "são duas decisões diferentes.")
cjrow("G_ESTR", "Diferencial de líquido para a sócia, via 4 face à via 3",
      lambda c: "={a}-{b}".format(a=v4.ref("LIQ_SOC", c), b=v3.ref("LIQ_SOC", c)), style="link",
      note="Negativo significa que afastar a transparência custa dinheiro à sócia nas condições "
           "atuais de distribuição. Depende inteiramente da alavanca POL_DIST.")
cjrow("G_TOT", "Total dos ganhos anuais",
      lambda c: "={a}+{b}".format(a=cc_("G_IVA", c), b=cc_("G_ESTR", c)), style="result",
      note="O ganho de IVA é de uma só vez, no ano do investimento; o diferencial de estrutura é "
           "recorrente. Somá-los na mesma linha é uma simplificação — ler as duas linhas acima.")

section(wcj, r, "O que a entrada do cônjuge custa", span=6); r += 1
cjrow("C_QUOTA", "Quota de lucros atribuída ao cônjuge, por ano",
      lambda c: "=" + v4.ref("LIQ_CJ", c), style="link",
      note="Dentro do agregado é uma transferência, não uma perda. Fora dele — divórcio, sucessão — "
           "é definitiva. O relatório tem de dizer as duas coisas.")
cjrow("C_ADM", "Custo administrativo anual de sujeito passivo misto", lambda c: 0, fmt=EUR, style="input",
      note="A PREENCHER com a estimativa do contabilista: segregação documental, pro rata ou afetação "
           "real, regularizações anuais, obrigações declarativas adicionais. Não é zero.")
cjrow("C_CONST", "Custo de constituição e de alterações societárias", lambda c: 0, fmt=EUR, style="input",
      note="A PREENCHER. Custo único.")
cjrow("C_TOT", "Total dos custos anuais",
      lambda c: "={a}+{b}+{d}".format(a=cc_("C_QUOTA", c), b=cc_("C_ADM", c), d=cc_("C_CONST", c)),
      style="result")

section(wcj, r, "Saldo", span=6); r += 1
cjrow("SALDO", "SALDO ANUAL DA OPERAÇÃO, NA ESFERA DA SÓCIA",
      lambda c: "={a}-{b}".format(a=cc_("G_TOT", c), b=cc_("C_TOT", c)), style="result")
cjrow("SALDO_AGR", "SALDO ANUAL NA ESFERA DO AGREGADO",
      lambda c: "={a}-{b}-{d}".format(a=cc_("G_TOT", c), b=cc_("C_ADM", c), d=cc_("C_CONST", c)),
      style="result",
      note="Exclui a quota de lucros do cônjuge, que dentro do agregado não sai. É a leitura mais "
           "favorável possível à operação.")
cjrow("VEREDITO", "Leitura",
      lambda c: '=IF({p}=0,"NÃO DECIDÍVEL — premissa por verificar",'
                'IF({s}>0,"Favorável na esfera da sócia",'
                'IF({sa}>0,"Favorável apenas na ótica do agregado, não na da sócia",'
                '"Desfavorável nas condições atuais")))'.format(
                    p=cc_("PREMISSA", c), s=cc_("SALDO", c), sa=cc_("SALDO_AGR", c)),
      fmt="General", style="result")

r += 1
wcj.cell(row=r, column=1,
         value="O que esta folha não quantifica, e tem de ser dito por palavras no capítulo 7: a perda de "
               "controlo qualificado, já que uma participação superior a 25% dá capacidade de bloqueio das "
               "deliberações que exijam maioria de três quartos; o efeito em caso de divórcio ou sucessão; "
               "e o risco de o desenho ser lido como artificial ao abrigo do art. 38.º n.º 2 da LGT se a "
               "participação não tiver substância económica real. Nenhuma destas três coisas tem preço, e "
               "todas podem ser mais caras do que o saldo acima.").font = F_SUB
wcj.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
wcj["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wcj.row_dimensions[r].height = 76
wcj.freeze_panes = "C5"


# ================================================================ TESOURARIA
wt = wb.create_sheet("Tesouraria")
title(wt, "M1 — Tesouraria do ano 1 e necessidade de fundo de maneio",
      "Um negócio pode ser rentável e mesmo assim ficar sem dinheiro. O investimento paga-se todo no "
      "início, a receita sobe devagar, e há pagamentos que chegam em bloco. Esta folha responde à única "
      "pergunta que importa antes de assinar seja o que for: quanto dinheiro é preciso ter na mão para "
      "chegar ao fim do primeiro ano.")
MES = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]
widths(wt, dict([("A", 46), ("B", 12)] + [(c, 11) for c in MES] + [("O", 13), ("P", 50)]))
wt.merge_cells("A2:P2"); wt["A2"].alignment = Alignment(wrap_text=True, vertical="top")
wt.row_dimensions[2].height = 46

CAPM = "({c}/12)".format(c=oref("CAP_ANO", "D"))
PRECO = "BreakEven!$D$%d" % B["PRECO_M"]
PVAR = "(1-BreakEven!$D$%d)" % B["MCP"]
CFA = "BreakEven!$D$%d" % B["CF"]
r = 4

# ---- bloco A: fundos de arranque
section(wt, r, "Fundos necessários no arranque", span=4); r += 1
T = {}


def trow1(key, label, val, fmt=EUR, style="calc", note=""):
    global r
    wt.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wt.cell(row=r, column=2, value=key).font = F_NOTE
    c = wt.cell(row=r, column=3, value=val)
    c.number_format, c.border = fmt, BOX
    c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
    if style == "result":
        c.fill = FILL_RES
    if style == "input":
        c.fill = FILL_FILL
    n = wt.cell(row=r, column=4, value=note); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    T[key] = r
    r += 1


def t1(key):
    return "$C$%d" % T[key]


trow1("INV", "Investimento em obras, equipamento e software",
      "={a}+{b}+{d}+{e}".format(a=inp("INV_OBRAS", "D"), b=inp("INV_EQUIP", "D"),
                                d=inp("INV_EQUIP_R", "D"), e=inp("INV_SOFT", "D")), style="link")
trow1("IVA_IRR", "IVA irrecuperável sobre o investimento", "=IVA!$D$%d" % VR["I_TOT"], style="link",
      note="Sai da conta e não volta: a fisioterapia é isenta sem direito à dedução.")
trow1("MESES_CAUC", "Caução do arrendamento (meses de renda)", 3, fmt=NUM, style="input",
      note="Rubrica que quase sempre se esquece no plano de investimento. Confirmar com a proposta de "
           "arrendamento.")
trow1("CAUCAO", "Caução do arrendamento",
      "={m}*{r}/12".format(m=t1("MESES_CAUC"), r=inp("RENDA", "D")))
trow1("ARRANQUE", "TOTAL A DESEMBOLSAR NO ARRANQUE",
      "={a}+{b}+{d}".format(a=t1("INV"), b=t1("IVA_IRR"), d=t1("CAUCAO")), style="result")

# ---- bloco B: ano 1 mes a mes
r += 1
section(wt, r, "Ano 1, mês a mês", span=16); r += 1
hdr(wt, r, ["Rubrica", "Ref."] + ["Mês %d" % (i + 1) for i in range(12)] + ["Ano 1", "Nota"])
r += 1
T2 = {}


def trow(key, label, fn, fmt=EUR, style="calc", total=True, note=""):
    global r
    T2[key] = r
    wt.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wt.cell(row=r, column=2, value=key).font = F_NOTE
    for i, col in enumerate(MES):
        c = wt.cell(row=r, column=3 + i, value=fn(col, i))
        c.number_format, c.border = fmt, BOX
        c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
        if style == "input":
            c.fill = FILL_FILL
        if style == "result":
            c.fill = FILL_RES
    if total:
        tc = wt.cell(row=r, column=15, value="=SUM(C%d:N%d)" % (r, r))
        tc.number_format, tc.font, tc.border = fmt, F_RESULT, BOX
    n = wt.cell(row=r, column=16, value=note); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    r += 1


def t2(key, col):
    return "%s$%d" % (col, T2[key])


RAMPA = [0.15, 0.20, 0.25, 0.30, 0.33, 0.36, 0.39, 0.41, 0.43, 0.44, 0.45, 0.45]
trow("OCUP", "Taxa de ocupação dos gabinetes", lambda c, i: RAMPA[i], fmt=PCT, style="input", total=False,
     note="RAMPA DE ARRANQUE. É a fila de inputs mais importante desta folha e a que ninguém quer "
          "preencher com honestidade. Uma clínica nova não abre à ocupação de cruzeiro.")
trow("CONS", "Consultas do mês", lambda c, i: "={cap}*{o}".format(cap=CAPM, o=t2("OCUP", c)), fmt=NUM)
trow("FAT", "Faturação do mês",
     lambda c, i: "={n}*{p}".format(n=t2("CONS", c), p=PRECO), style="result")
trow("PCT_PRONTO", "% recebida no próprio mês", lambda c, i: 0.85, fmt=PCT, style="input", total=False,
     note="Consultas particulares pagam-se na hora; subsistemas e seguros pagam a 30 dias ou mais.")
trow("REC", "Recebimentos",
     lambda c, i: "={f}*{p}".format(f=t2("FAT", c), p=t2("PCT_PRONTO", c)) if i == 0 else
     "={f}*{p}+{fa}*(1-{pa})".format(f=t2("FAT", c), p=t2("PCT_PRONTO", c),
                                     fa=t2("FAT", MES[i - 1]), pa=t2("PCT_PRONTO", MES[i - 1])),
     style="result", note="O desfasamento entre faturar e receber é dinheiro que falta em caixa.")
trow("CV", "Custos variáveis (consumíveis e colaboradores)",
     lambda c, i: "={f}*{v}".format(f=t2("FAT", c), v=PVAR))
trow("CF", "Custos fixos", lambda c, i: "={cf}/12".format(cf=CFA), style="link",
     note="Renda, condomínio, seguros, software e outros. Pagam-se haja ou não doentes.")
trow("SS", "Segurança Social", lambda c, i: "={s}/12".format(s=v2.ref("SS_CONTR", "D")), style="link",
     note="Aproximação de cruzeiro. No primeiro ano a base é a declarada, não o lucro do próprio ano. "
          "Ver R1-40.")
trow("IRS_PC", "IRS — pagamentos por conta", lambda c, i: 0, fmt=EUR, style="input",
     note="A PREENCHER, e é uma armadilha clássica: no ano 1 os pagamentos por conta são calculados "
          "sobre o rendimento do ano ANTERIOR, no regime antigo. Paga-se IRS do passado enquanto se "
          "está a investir no futuro. Vencem em julho, setembro e dezembro — meses 7, 9 e 12.")
trow("INV_M", "Investimento e caução",
     lambda c, i: ("=" + t1("ARRANQUE")) if i == 0 else 0, style="calc",
     note="Todo no mês 1. Se a empreitada for faseada, repartir.")
trow("SALDO", "SALDO DO MÊS",
     lambda c, i: "={r}-{cv}-{cf}-{ss}-{irs}-{inv}".format(
         r=t2("REC", c), cv=t2("CV", c), cf=t2("CF", c), ss=t2("SS", c),
         irs=t2("IRS_PC", c), inv=t2("INV_M", c)), style="result")
trow("ACUM", "SALDO ACUMULADO",
     lambda c, i: ("=" + t2("SALDO", c)) if i == 0 else
     "={a}+{s}".format(a=t2("ACUM", MES[i - 1]), s=t2("SALDO", c)), style="result", total=False,
     note="É esta a linha que decide se o projeto sobrevive ao primeiro ano.")
trow("MARC_MIN", "Marcador do ponto mais baixo",
     lambda c, i: "=IF({a}=MIN($C${x}:$N${x}),{n},0)".format(a=t2("ACUM", c), x=T2["ACUM"], n=i + 1),
     fmt=NUM, total=False)
trow("MARC", "Marcador de recuperação",
     lambda c, i: 0 if i == 0 else "=IF(AND({a}>=0,{p}<0),{n},0)".format(
         a=t2("ACUM", c), p=t2("ACUM", MES[i - 1]), n=i + 1), fmt=NUM, total=False)

r += 1
AC = "$C$%d:$N$%d" % (T2["ACUM"], T2["ACUM"])
for lbl, f, fmt2, nota in [
    ("NECESSIDADE MÁXIMA DE TESOURARIA", "=-MIN(%s)" % AC, EUR,
     "O ponto mais fundo do saldo acumulado. JÁ INCLUI o investimento e a caução, porque eles saem da "
     "mesma conta bancária — não somar outra vez."),
    ("   da qual, investimento e caução", "=" + t1("ARRANQUE"), EUR,
     "Desembolso de uma só vez, no arranque."),
    ("   da qual, cobertura do défice operacional", "=-MIN({a})-{b}".format(a=AC, b=t1("ARRANQUE")), EUR,
     "O que a operação consome enquanto a receita não chega para os custos. É a parte que quase ninguém "
     "orça, e é a que apanha quem abre pela primeira vez."),
    ("Mês em que o saldo acumulado atinge o ponto mais baixo",
     "=MAX($C${m}:$N${m})".format(m=T2["MARC_MIN"]), NUM, ""),
    ("Mês em que o saldo acumulado volta a ser positivo",
     '=IF(MAX($C${m}:$N${m})=0,"Não recupera dentro do ano 1",MAX($C${m}:$N${m}))'.format(m=T2["MARC"]),
     NUM, "Se não recuperar dentro do ano 1, o fundo de maneio tem de cobrir também o ano 2."),
    ("Margem de segurança (meses de custos fixos)", 3, NUM,
     "A PREENCHER. Nenhuma projeção acerta. Três meses é uma convenção prudente para quem não tem "
     "outra fonte de rendimento."),
]:
    wt.cell(row=r, column=1, value=lbl).font = F_RESULT if lbl.isupper() else F_BODY
    c = wt.cell(row=r, column=3, value=f)
    c.number_format, c.border = fmt2, BOX
    c.font, c.fill = (F_INPUT, FILL_FILL) if isinstance(f, int) else (F_RESULT, FILL_RES)
    n = wt.cell(row=r, column=5, value=nota); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    wt.merge_cells(start_row=r, start_column=5, end_row=r, end_column=14)
    wt.row_dimensions[r].height = 26
    T["L_" + lbl[:10]] = r
    r += 1
MARG_ROW = r - 1
NEC_ROW = r - 6
r += 1
wt.cell(row=r, column=1, value="Margem de segurança, em euros").font = F_BODY
c = wt.cell(row=r, column=3, value="=$C${m}*{cf}/12".format(m=MARG_ROW, cf=CFA))
c.number_format, c.font, c.border = EUR, F_CALC, BOX
FM_ROW = r
r += 1
wt.cell(row=r, column=1, value="TOTAL DE DINHEIRO NECESSÁRIO ANTES DE ABRIR").font = F_RESULT
c = wt.cell(row=r, column=3, value="=$C${a}+$C${f}".format(a=NEC_ROW, f=FM_ROW))
c.number_format, c.font, c.fill, c.border = EUR, F_RESULT, FILL_WARN, BOX
n = wt.cell(row=r, column=5,
            value="Investimento, caução e fundo de maneio. É este o número a dizer à cliente antes de "
                  "qualquer conversa sobre estrutura fiscal. Se ela não o tiver ou não o conseguir "
                  "financiar, a discussão sobre ENI ou sociedade é prematura.")
n.font = F_NOTE; n.alignment = Alignment(wrap_text=True, vertical="top")
wt.merge_cells(start_row=r, start_column=5, end_row=r, end_column=14)
wt.row_dimensions[r].height = 30
r += 2

_l4 = LineChart()
_l4.title = "Saldo de tesouraria acumulado — ano 1"
_l4.y_axis.title, _l4.x_axis.title = "euros", "mês"
_l4.height, _l4.width = 8, 18
_l4.append(Series(Reference(wt, min_col=3, max_col=14, min_row=T2["ACUM"], max_row=T2["ACUM"]),
                  title="Saldo acumulado"))
wt.add_chart(_l4, "R4")

# ---- bloco C: tres anos
section(wt, r, "Visão a três anos", span=6); r += 1
hdr(wt, r, ["Rubrica", "Ref.", "Ano 1", "Ano 2", "Ano 3", "Nota"]); r += 1
A3 = {}
ACOLS = ["C", "D", "E"]


def a3row(key, label, fn, fmt=EUR, style="calc", note=""):
    global r
    A3[key] = r
    wt.cell(row=r, column=1, value=label).font = F_RESULT if style == "result" else F_BODY
    wt.cell(row=r, column=2, value=key).font = F_NOTE
    for i, col in enumerate(ACOLS):
        c = wt.cell(row=r, column=3 + i, value=fn(col, i))
        c.number_format, c.border = fmt, BOX
        c.font = {"calc": F_CALC, "link": F_LINK, "result": F_RESULT, "input": F_INPUT}[style]
        if style == "input":
            c.fill = FILL_FILL
        if style == "result":
            c.fill = FILL_RES
    n = wt.cell(row=r, column=6, value=note); n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    r += 1


def a3(key, col):
    return "$%s$%d" % (col, A3[key])


a3row("OCUP", "Taxa de ocupação média do ano",
      lambda c, i: "=AVERAGE($C${o}:$N${o})".format(o=T2["OCUP"]) if i == 0 else [0, 0.52, 0.58][i],
      fmt=PCT, style="input",
      note="Ano 1 é a média da rampa. Anos 2 e 3 a preencher — e a justificar com o plano de captação "
           "de doentes, que não existe e é o pressuposto silencioso de tudo isto (R1-41).")
a3row("FAT", "Faturação",
      lambda c, i: "={cap}*{o}*{p}".format(cap=oref("CAP_ANO", "D"), o=a3("OCUP", c), p=PRECO),
      style="result")
a3row("CV", "Custos variáveis", lambda c, i: "={f}*{v}".format(f=a3("FAT", c), v=PVAR))
a3row("CF", "Custos fixos", lambda c, i: "=" + CFA, style="link")
a3row("RES", "Resultado operacional",
      lambda c, i: "={f}-{cv}-{cf}".format(f=a3("FAT", c), cv=a3("CV", c), cf=a3("CF", c)), style="result")
a3row("CARGA", "Impostos e contribuições estimados",
      lambda c, i: "=MAX(0,{r})*{t}".format(r=a3("RES", c), t=v2.ref("TAXA_EF", "D")), style="calc",
      note="Aplica a taxa de esforço da via 2 no cenário Base. Aproximação: a taxa real varia com o "
           "nível de rendimento. Ver R1-33.")
a3row("LIQ", "Resultado líquido",
      lambda c, i: "={r}-{c}".format(r=a3("RES", c), c=a3("CARGA", c)), style="result")
a3row("CX", "Caixa acumulada desde o arranque",
      lambda c, i: "={l}-{a}".format(l=a3("LIQ", c), a=t1("ARRANQUE")) if i == 0 else
      "={p}+{l}".format(p=a3("CX", ACOLS[i - 1]), l=a3("LIQ", c)), style="result",
      note="Inclui o desembolso inicial. O ano em que esta linha passa a positiva é o payback real.")
r += 1
wt.cell(row=r, column=1,
        value="Esta visão a três anos assume custos fixos constantes e preço constante. Não é uma "
              "projeção financeira completa — é o suficiente para responder a «quando é que recupero o "
              "que meti» e a «o ano 1 é sustentável». Uma projeção completa exigiria inflação de custos, "
              "renovação de equipamento e evolução da tabela de preços, e nenhuma dessas coisas está "
              "informada. Registado em R1-42.").font = F_SUB
wt.merge_cells(start_row=r, start_column=1, end_row=r, end_column=16)
wt["A%d" % r].alignment = Alignment(wrap_text=True, vertical="top")
wt.row_dimensions[r].height = 44
wt.freeze_panes = "C5"


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
    ("T", "Operacao — camada operacional: gabinetes, dias, duração da consulta, preço e utilização. "
          "É daqui que sai a faturação quando FONTE_FAT = 2. A linha de utilização diz se a projeção "
          "cabe fisicamente no espaço."),
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
    ("T", "BreakEven — break-even operacional e rendimento-alvo da fundadora. Não confundir com o "
          "PontoViragem, que é o break-even fiscal: são três conceitos distintos e a folha explica-os."),
    ("T", "Espaco — comparação 2 versus 3 gabinetes a procura constante, com investimento e payback."),
    ("T", "Validação — recálculo independente e espaço para assinatura."),
    ("T", "RiscoLaboral — passivo contingente da requalificação dos colaboradores, e o mapa dos indícios "
          "do art. 12.º n.º 1 do Código do Trabalho. Dois deles verificam-se por natureza numa clínica."),
    ("T", "Conjuge — custo de complexidade da entrada do cônjuge: ganhos de um lado, custos do outro, e "
          "o que não é quantificável."),
    ("T", "Tesouraria — ano 1 mês a mês, fundo de maneio e vista a três anos. Responde à pergunta que "
          "vem antes de todas as outras: quanto dinheiro é preciso ter na mão antes de abrir."),
    ("T", "Alertas — verificação de plausibilidade empresarial e semáforo global. Enquanto houver um "
          "alerta bloqueante ativo, nenhum número sai do ficheiro."),
    ("SEC", "Rentabilidade e solvência são perguntas diferentes"),
    ("T", "As folhas das quatro vias, o Comparativo e o BreakEven dizem se o negócio é rentável. A folha "
          "Tesouraria diz se sobrevive ao primeiro ano. Um negócio rentável fica sem dinheiro quando o "
          "investimento se paga à cabeça, a receita sobe devagar e há pagamentos que chegam em bloco."),
    ("T", "Para quem abre pela primeira vez, a segunda pergunta é a que morde primeiro. O número a dar "
          "à cliente antes de qualquer conversa sobre ENI ou sociedade é o total de dinheiro necessário "
          "antes de abrir, na folha Tesouraria."),
    ("SEC", "Três break-even distintos, que nunca se misturam"),
    ("T", "Break-even FISCAL (folha PontoViragem): a partir de que nível de custos reais uma estrutura "
          "fiscal passa a ser melhor do que outra."),
    ("T", "Break-even OPERACIONAL (folha BreakEven): a partir de que faturação a clínica cobre os "
          "custos."),
    ("T", "RENDIMENTO-ALVO (folha BreakEven): que faturação é precisa para a fundadora receber o que "
          "quer receber. Nunca usar a mesma palavra para os três numa frase dita à cliente."),
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
    ("SEC", "Para quem é este trabalho"),
    ("T", "A cliente final tem zero experiência empresarial e está a montar a primeira estrutura da vida "
          "dela, com arrendamento, obras e integração de pessoas. As consequências de a matemática não "
          "funcionar não são um relatório desatualizado — são dívida pessoal."),
    ("T", "Consequência prática para quem usar este modelo: toda a conclusão tem de acabar em unidades "
          "que a cliente controla — doentes por dia, euros por mês — e o cenário de baixa tem de ser "
          "apresentado em dinheiro, não só a recomendação."),
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
