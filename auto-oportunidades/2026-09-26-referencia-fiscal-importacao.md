# Referência fiscal e de importação

Versão de 26/09/2026. Validar sempre no simulador de ISV do Portal das Finanças
antes de usar um valor numa decisão.

Legenda da coluna "Estado":

- **Confirmado**: valor visto numa fonte durante a pesquisa de 26/09/2026.
- **Não confirmado**: valor das tabelas do Código do ISV conhecido de antes,
  não revisto nesta pesquisa. Usar só como estimativa.

---

## 1. ISV 2026

O Orçamento do Estado para 2026 não alterou as taxas. As tabelas são as de
2025 (Confirmado).

ISV = componente cilindrada + componente ambiental (CO2), com a redução por
idade aplicada ao total nos usados importados da UE.

### 1.1 Componente cilindrada (ligeiros de passageiros)

| Cilindrada (cm³) | Taxa €/cm³ | Parcela a abater | Estado |
| --- | --- | --- | --- |
| até 1.000 | 1,09 | 849,03 | Confirmado |
| 1.001 a 1.250 | 1,18 | 850,69 | Não confirmado |
| mais de 1.250 | 5,61 | 6.194,88 | Não confirmado |

### 1.2 Componente ambiental, gasolina, WLTP

| CO2 (g/km) | Taxa €/g | Parcela a abater | Estado |
| --- | --- | --- | --- |
| até 110 | 0,44 | 43,02 | Não confirmado |
| 111 a 115 | 1,10 | 115,80 | Não confirmado |
| 116 a 120 | 1,38 | 147,79 | Não confirmado |
| 121 a 130 | 5,24 | 619,17 | Não confirmado |
| 131 a 145 | 6,38 | 762,73 | Confirmado |
| 146 a 175 | 41,54 | 5.819,56 | Não confirmado |
| 176 a 195 | 51,65 | 7.247,39 | Não confirmado |
| mais de 195 | 193,01 | 34.190,52 | Não confirmado |

### 1.3 Componente ambiental, gasóleo, WLTP

| CO2 (g/km) | Taxa €/g | Parcela a abater | Estado |
| --- | --- | --- | --- |
| até 110 | 1,72 | 11,50 | Não confirmado |
| 111 a 120 | 18,96 | 1.906,19 | Não confirmado |
| 121 a 140 | 65,04 | 7.360,85 | Não confirmado |
| 141 a 150 | 127,40 | 16.080,57 | Não confirmado |
| 151 a 160 | 160,81 | 21.176,06 | Não confirmado |
| 161 a 170 | 221,69 | 30.618,29 | Não confirmado |
| 171 a 190 | 274,08 | 39.530,02 | Não confirmado |
| mais de 190 | 282,35 | 40.657,42 | Não confirmado |

Agravamento gasóleo: +€500 quando partículas ≥ 0,001 g/km (Confirmado).

### 1.4 Redução por idade, usados importados da UE

Desde 01/01/2025 (Lei 45-A/2024) aplica-se ao ISV total, nas duas componentes
(Confirmado).

| Idade | Redução | Estado |
| --- | --- | --- |
| até 1 ano | 10% | Confirmado |
| mais de 1 a 2 | 20% | Confirmado |
| mais de 2 a 3 | 28% | Confirmado |
| mais de 3 a 4 | 35% | Confirmado |
| mais de 4 a 5 | 43% | Confirmado |
| mais de 5 a 6 | 52% | Confirmado |
| mais de 6 a 7 | 60% | Confirmado |
| mais de 7 a 8 | 65% | Não confirmado |
| mais de 8 a 9 | 70% | Não confirmado |
| mais de 9 a 10 | 75% | Não confirmado |
| mais de 10 | 80% | Confirmado |

### 1.5 Casos especiais

| Tipo | Tratamento | Estado |
| --- | --- | --- |
| Elétrico (BEV) | Isento de ISV e de IUC | Confirmado |
| Híbrido plug-in | Paga 25% do ISV (redução de 75%) com autonomia elétrica ≥ 50 km e CO2 ≤ 80 g/km em Euro 6e-bis (antes 50 g/km) | Confirmado |
| Híbrido convencional | Regras gerais | Confirmado |

Exemplo confirmado: gasolina 1.598 cm³, 139 g/km WLTP, componente ambiental
= 6,38 × 139 - 762,73 = €124,09.

---

## 2. IVA na compra na UE

- "Meio de transporte novo": ≤ 6 meses desde a primeira matrícula **ou**
  ≤ 6.000 km. O IVA paga-se em Portugal (23%) e o vendedor deve faturar sem
  IVA do país de origem (Confirmado).
- Carro usado (> 6 meses **e** > 6.000 km) comprado a stand ou particular: sem
  IVA adicional em Portugal (Confirmado).
- Conta rápida de uma Tageszulassung alemã: preço bruto / 1,19 × 1,23.

### 2.1 Compra pela ENI (IVA em regime normal)

| Situação | Dedução do IVA | Estado |
| --- | --- | --- |
| Elétrico, custo de aquisição ≤ €62.500 sem IVA | 100% | Confirmado (fontes de mercado) |
| Plug-in com autonomia elétrica ≥ 50 km, CO2 ≤ 80 g/km, custo ≤ €50.000 sem IVA | 50% | Confirmado (OCC, art. 21.º CIVA) |
| Usado comprado em regime de margem | 0% (não há IVA na fatura) | Confirmado |
| Importação UE de carro "novo" (≤ 6 meses ou ≤ 6.000 km) | Autoliquidação e dedução: IVA neutro | Não confirmado nesta pesquisa |

Contas:

- Custo líquido de um elétrico = preço com IVA / 1,23.
- Custo líquido de um plug-in = preço sem IVA + 50% do IVA.
- Na venda futura pela ENI, liquida-se IVA sobre o preço de venda.
- Uso particular, tributação autónoma e regularizações: confirmar com o
  contabilista.

---

## 3. Custos de importação (intervalos de mercado, 2026)

| Item | Intervalo | Estado |
| --- | --- | --- |
| Transporte em camião DE → PT | €500 a €1.200 | Confirmado (fontes divergem) |
| Conduzir até PT | ±€300 combustível/portagens + voo €50 a €150 | Confirmado |
| DUA / matrícula | €55 online, €65 presencial | Confirmado |
| Inspeção tipo B | ~€128 | Confirmado |
| Certificado de conformidade (COC) | €100 a €250 (às vezes incluído) | Confirmado |
| Chapas de matrícula | €25 a €40 | Confirmado |
| Legalização total (sem ISV) | €300 a €500 | Confirmado |
| Despachante/intermediário | €0 a €400 | Estimativa |

Para um elétrico usado, o custo de importação típico fica entre **€1.000 e
€2.100** (transporte + legalização + despachante opcional).

---

## 4. Incentivos e empresa

- Fundo Ambiental 2026: €4.000 para particulares na compra de elétrico novo até
  €38.500, com abate obrigatório de carro a combustão com mais de 10 anos.
  Candidaturas de 11/06 a 27/07/2026, esgotadas (Confirmado).
- ENI/empresa: ver secção 2.1.
- Campanhas "para empresas e ENI" (preço + IVA) são frequentes e acabam no fim
  de cada trimestre ou mês. Registar sempre a data "válido até".

---

## Fontes

- [Caetano: simulador e tabelas ISV 2026](https://caetano.pt/blog/calcular-isv/)
- [AUTO.MOTO.pt: ISV usados importados 2026](https://auto.moto.pt/news/isv-em-carros-usados-importados-2026-como-a-idade-e-o-co2-influenciam-o-imposto)
- [Carglass: ISV 2026](https://www.carglass.pt/blog/informacoes-auto/isv-imposto-sobre-veiculos)
- [APDCA: ISV 2026 híbridos plug-in](https://apdca.pt/comunicacao/noticias/isv-em-2026-governo-ajusta-regras-para-hibridos-plug-in-e-evita-agravamento-fiscal/)
- [Auto.PT: importar da Alemanha em 2026](https://www.auto.pt/noticias/importar-carro-usado-alemanha-2026)
- [Carlink24: taxas de importação DE → PT](https://www.carlink24.com/pt/guia/taxas-importacao-carro-alemanha-portugal-pt)
- [Your Europe: IVA na compra de automóveis](https://europa.eu/youreurope/citizens/vehicles/cars/vat-buying-selling-cars/faq/index_pt.htm)
- [Fundo Ambiental: incentivo 2025/2026](https://www.fundoambiental.pt/apoios-2026/mitigacao-as-alteracoes-climaticas/incentivo-pela-aquisicao-de-veiculos-de-emissoes-nulas-ano-20252026-mobilidade-verde-passageiros-2-fase.aspx)
- [Caetano: IVA dedutível 2026](https://caetano.pt/blog/iva-dedutivel-carros/)
- [OCC: dedução do IVA em viatura híbrida](https://www.occ.pt/pt-pt/noticias/iva-direito-deducao-em-viatura-hibrida)
- [CGD: incentivos 2026](https://www.cgd.pt/Site/Saldo-Positivo/mobilidade/Pages/incentivo-compra-veiculos.aspx)
