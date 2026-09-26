# Agente de Oportunidades Automóveis. Portugal

Versão 2, 26/09/2026. Especificação do Rui, com o perfil atualizado depois das
duas primeiras pesquisas (carro principal pela ENI).

Ficheiros relacionados:

- `2026-09-26-referencia-fiscal-importacao.md`: ISV, IVA, custos de importação.
- `relatorios/`: um relatório por pesquisa, com data no nome.

---

## 0. Como correr uma pesquisa

1. Ler este ficheiro e a referência fiscal.
2. Ler o relatório mais recente em `relatorios/` para comparar (novos anúncios,
   descidas de preço, anúncios que desapareceram).
3. Pesquisar os dois perfis (secção 2). Guardar cada anúncio com os campos da
   secção 7.
4. Montar benchmark (secção 12), calcular custo posto em Portugal (secção 8) e
   score (secção 10).
5. Escrever `relatorios/AAAA-MM-DD-relatorio-oportunidades.md` no formato da
   secção 14. Listas completas: 15 a 20 opções no carro principal e 12 a 15 no
   segundo carro, mais o TOP 5 de cada perfil com ficha.
6. Verificar prazos de campanhas (datas "válido até") e destacá-los no topo.

### Limitações conhecidas do ambiente (26/09/2026)

- A pesquisa web funciona e devolve anúncios indexados do Standvirtual,
  mobile.de, AutoScout24, AutoUncle, etc. (título com ano, km, preço, link).
- A abertura direta das páginas está bloqueada pela rede do ambiente
  (Standvirtual, mobile.de, AutoScout24, OLX, CustoJusto e a maioria dos sites
  portugueses). Consequência: garantia, histórico, proprietários e equipamento
  ficam muitas vezes "Não confirmado".
- O índice de pesquisa não é em tempo real. Marcar todos os anúncios com
  "Verificar disponibilidade" até alguém confirmar no site.
- Resumos automáticos de pesquisa podem trocar versões (ex.: 58,3 kWh vs
  81,4 kWh). O slug do URL do anúncio prevalece sobre o texto do resumo.

---

## 1. Objetivo

Encontrar carros com a melhor relação entre preço, especificação, risco e valor
de mercado, para um comprador residente em Portugal. O carro principal é
comprado pela ENI do Rui; o segundo carro é comprado como particular.

Não é uma lista de carros. É uma lista de oportunidades justificadas com dados.

No fim de cada pesquisa, responder a:

1. Que carros estão realmente abaixo do valor de mercado?
2. Quais têm o melhor equilíbrio entre preço, risco, garantia e especificação?
3. Há alguma importação claramente mais barata depois de todos os custos?

Ser cético. Um carro barato pode ser um problema, não uma oportunidade.

---

## 2. Perfis de compra

### 2.1 Carro principal (novo ou seminovo, pela ENI)

- Comprador: **ENI em regime normal de IVA**.
- Teto: **€37.000 com IVA**, com despesas incluídas.
- Ordenar e comparar pelo **custo líquido para a ENI** (depois de deduzir o
  IVA). Mostrar sempre as duas colunas: preço com IVA e custo líquido.
- Motorizações aceites: **100% elétrico** e **híbrido plug-in**. Seminovos até
  2 anos entram.
- Dedução de IVA (ver referência fiscal, secção 2.1):
  - elétrico: 100%, custo de aquisição até €62.500 sem IVA;
  - plug-in: 50%, com autonomia elétrica ≥ 50 km, CO2 ≤ 80 g/km e custo até
    €50.000 sem IVA;
  - só com fatura com IVA. Usado em **regime de margem** não dá dedução: nesse
    caso o custo líquido é o preço total. Perguntar sempre ao vendedor.
- Procurar ativamente campanhas "para empresas e ENI" (preço + IVA) nos sites
  das marcas e concessionários. Registar a data "válido até".
- Referências do Rui: **Deepal S05** e **Kia EV3**.
- SUV ou crossover, comprimento < 4,65 m, bagageira > 420 L.
- Garantia de fábrica ≥ 5 anos, ou extensível para 5/7 anos.
- Boa segurança, fiabilidade esperada, tecnologia atual, liquidez em Portugal.
- Seminovos até 2 anos entram quando ficam abaixo do preço de um novo
  equivalente com garantia de fábrica ainda longa.
- Verificar sempre dimensões e bagageira oficiais. "SUV" não é sinónimo de
  boa opção.

### 2.2 Segundo carro (usado, particular)

- Comprador: particular. Sem dedução de IVA.
- Motorizações aceites: **gasolina** e **híbrido** (não plug-in). Sem diesel
  nem elétrico.
- Preço-alvo: **≤ €16.000**.
- Acima de €16.000 só com razão objetiva, sempre com a nota
  "Acima do orçamento-alvo. Incluído devido a X." Nunca acima de €20.000 sem
  justificação explícita.
- Referência do Rui: um Hyundai de 2024 a cerca de €15.000.
- Prioridades: histórico verificável, km razoáveis para a idade, sem acidentes
  estruturais, poucos proprietários, garantia (preferência forte por 5/7 anos),
  fiabilidade, peças, liquidez de revenda.

### 2.3 Tipos de veículo

Prioridade: SUV, crossover, hatchback familiar, carrinha, sedan compacto/médio.
Outros formatos só com oportunidade claramente superior.

---

## 3. Mercados

1. Carros matriculados em Portugal.
2. Carros em Portugal para importação/matrícula.
3. Europa quando a diferença justificar: Alemanha, Espanha, França, Bélgica,
   Países Baixos, Itália, Luxemburgo. Outros mercados se houver vantagem clara.

Elétricos não pagam ISV nem IUC, por isso a arbitragem europeia é mais forte
nos elétricos do que nos térmicos.

---

## 4. Fontes

Sites oficiais de marca, concessionários, Standvirtual, AutoSapo, OLX,
CustoJusto, mobile.de, AutoScout24, AutoUncle (agregador de preços), sites de
concessionários europeus.

Para preços de mercado agregados: AutoUncle, FirstEV (elétricos DE), páginas de
estatística do AutoScout24/mobile.de. Tratar agregados como benchmark de
intervalo, nunca como anúncio concreto.

---

## 5. Garantia

Distinguir sempre, e nunca tratar como equivalentes:

| Tipo | Quem responde | Peso no score |
| --- | --- | --- |
| Garantia de fabricante | Marca, rede oficial | Máximo |
| Garantia comercial do stand | Stand, com limites e exclusões | Médio |
| Seguro de garantia mecânica | Seguradora, com plafonds | Baixo |

Notas de marca confirmadas em 26/09/2026:

- Kia: 7 anos / 150.000 km, transmissível, válida em mais de 20 países
  europeus, condicionada ao plano de manutenção.
- Hyundai Portugal: 7 anos sem limite de km para ligeiros de passageiros
  matriculados a partir de 01/09/2019 (confirmar se abrange carros importados).
- MG: 7 anos / 150.000 km.
- Changan/Deepal: 7 anos / 160.000 km; bateria 8 anos / 200.000 km.
- BYD: 6 anos / 150.000 km; bateria 8 anos / 250.000 km.
- Leapmotor: 4 anos / 100.000 km.
- Skoda Elroq: "Não confirmado" (fontes divergem entre 2 e 3 anos).

---

## 6. Preços artificialmente baixos

Assinalar e recalcular o preço real quando o anúncio tiver:

- "com financiamento", "com retoma", "+ despesas", "+ IVA", "desde";
- bónus condicionados a seguro, financiamento ou abate;
- viatura ainda não disponível.

Usar sempre o preço real para um particular a pronto, com despesas de
legalização e transporte incluídas.

---

## 7. Campos a guardar por anúncio

Marca, modelo, versão, motor, combustível, potência, caixa, tração, ano, data
da primeira matrícula, km, preço, localização, vendedor, garantia, histórico,
n.º de proprietários, equipamento relevante, comprimento, bagageira, link
original, data/hora da pesquisa.

Campo desconhecido: "Não confirmado." Nunca preencher com suposições.

---

## 8. Importação: custo posto em Portugal

```
Preço do veículo (ver regra do IVA abaixo)
+ transporte (camião) ou viagem + recolha
+ legalização: inspeção tipo B, COC, DAV/IMT, matrícula, chapas
+ ISV (zero em elétricos)
+ IVA português quando o carro é "meio de transporte novo"
+ IUC inicial (zero em elétricos)
+ intermediário/despachante, quando aplicável
+ outros custos previsíveis
```

Apresentar: preço anunciado, custo de importação, custo total em Portugal,
diferença face ao equivalente português. Se faltar uma variável, dar intervalo
e explicar.

**Regra do IVA.** Carro com ≤ 6 meses desde a primeira matrícula **ou**
≤ 6.000 km conta como "meio de transporte novo": o IVA paga-se em Portugal
(23%) e o vendedor deve faturar sem IVA alemão. Confirmar por escrito antes de
pagar, senão há risco de pagar IVA duas vezes.

**Importação pela ENI (carro principal).** A ENI compra sem IVA do país de
origem, autoliquida o IVA português e deduz o mesmo valor, por isso o IVA é
neutro. Comparar o custo líquido importado com o **preço de campanha para
empresas em Portugal (+ IVA)**, nunca com o preço a particulares. Em
26/09/2026, o EV3 alemão ficava só €600 a €1.900 abaixo da campanha
portuguesa, abaixo do limiar de €2.000.

Valores de referência na `2026-09-26-referencia-fiscal-importacao.md`.

---

## 9. Comparabilidade

Normalizar ano, km, motor, potência, bateria (elétricos), equipamento,
transmissão, garantia, origem e histórico. Não comparar versão base com versão
topo sem o dizer.

---

## 10. Opportunity Score (0 a 100)

Reflete só a qualidade da oportunidade, não preferência por marca.

| Critério | Peso | Como pontuar |
| --- | --- | --- |
| Preço vs mercado | 25 | 0% vs mediana = 12; cada -1% soma ~1 ponto; +5% ou mais = 0 |
| Especificação | 15 | Motor/bateria, caixa, versão, equipamento para o uso |
| Idade + km | 15 | Km/ano ≤ 15.000 e idade ≤ 3 anos no topo |
| Garantia | 15 | Fabricante ≥ 5 anos restantes = 13 a 15; comercial = 5 a 9; seguro = 2 a 5 |
| Histórico e risco | 15 | Começa em 8 se "Não confirmado"; sobe com provas, desce com red flags |
| Custo total de aquisição | 10 | Carro principal: custo líquido ENI. Penaliza despesas extra, importação complexa, acima do orçamento, IVA não dedutível |
| Liquidez/revenda | 5 | Procura em Portugal, marca, versão |

Regra para carros novos ao preço de tabela: preço vs mercado = 12 e idade + km
= 8. Idade zero não é vantagem face ao próprio mercado de novos. Sem esta regra,
qualquer novo com garantia longa chegaria aos 75 sem ter desconto nenhum.

Classificação:

| Score | Leitura |
| --- | --- |
| 90-100 | Oportunidade excecional |
| 80-89 | Oportunidade forte, contacto rápido |
| 70-79 | Oportunidade interessante, pontos a validar |
| 60-69 | Preço razoável, sem vantagem clara |
| < 60 | Não é oportunidade |

O score nunca substitui a análise.

---

## 11. Red flags a procurar

Preço anormalmente baixo, km suspeitos, histórico incompleto, importação recente
sem documentação, acidentes, danos estruturais, vários donos em pouco tempo,
manutenção em falta, garantia pouco clara, vendedor sem reputação,
discrepâncias anúncio/documentos, motores ou caixas com problemas conhecidos,
recalls, versões difíceis de revender, custos fiscais altos, custos de
importação que anulam a vantagem, financiamento ou retoma obrigatórios, IVA não
incluído, preço "desde", viatura não disponível.

Elétricos: pedir relatório de estado da bateria (SoH), confirmar recalls de
bateria pelo VIN, confirmar potência de carregamento AC/DC.

---

## 12. Benchmark

Por oportunidade relevante, 3 a 5 comparáveis no mínimo. Calcular média,
mediana, mínimo, máximo e posição do anúncio face à mediana. Sem benchmark
suficiente, não chamar oportunidade.

---

## 13. Alertas

Destacar com 🚨 OPORTUNIDADE quando:

1. segundo carro ≤ €16.000 com score ≥ 75;
2. carro principal ≤ €37.000 com IVA e score ≥ 75;
3. score ≥ 80;
4. preço ≥ 10% abaixo do mercado;
5. importação com vantagem líquida ≥ €2.000 ou ≥ 10%;
6. garantia de fabricante ≥ 5 anos restantes;
7. combinação rara de preço, equipamento e km baixos;
8. campanha para empresas/ENI que acaba nos próximos 7 dias;
9. seminovo elétrico com "IVA dedutível" no anúncio.

Em cada alerta: preço, preço normal, diferença %, motivo provável, riscos,
urgência.

---

## 14. Formato do relatório

1. Data da pesquisa (DD/MM/AAAA) e limitações da pesquisa.
2. Respostas curtas às três perguntas da secção 1.
3. Prazos de campanha a acabar, no topo.
4. Por perfil, tabela completa. Carro principal: Score | Carro | Estado |
   Preço com IVA | Custo líquido ENI | Comprimento · bagageira | Garantia |
   Face ao preço de tabela | Veredicto. Segundo carro: Score | Carro | Ano |
   km | Preço | Mediana | Diferença | Garantia | Veredicto.
5. Ficha por cada TOP 5 de cada perfil: score, preços, dados, porque
   apareceu aqui, o que o pode tornar má opção, riscos, perguntas ao vendedor,
   custo final, veredicto (Contactar vendedor / Investigar antes de contactar /
   Guardar para comparação / Ignorar).
6. Excluídos e porquê, numa linha.
7. Alterações face ao relatório anterior (novos, descidas, removidos).
8. Fontes.

Separar sempre: **Facto confirmado**, **Estimativa**, **Inferência**,
**Informação não disponível**. Nunca transformar estimativa em facto.
Anúncio que já não aparece: "Anúncio possivelmente expirado. Verificar."

---

## 15. Custo de oportunidade

Quando houver dados: desvalorização, consumo, seguro, IUC, manutenção, pneus,
garantia, revenda, peças, problemas conhecidos. Usar intervalos, nunca valores
inventados.

Custo anual estimado = (preço de aquisição - valor de revenda estimado) /
anos de uso + custos anuais previsíveis.

---

## 16. Variáveis em aberto do perfil

- **Decidido em 26/09/2026:** carro principal pela ENI (IVA em regime normal);
  segundo carro como particular.
- **A confirmar com o contabilista:** dedução do IVA, tratamento do uso
  particular do carro da ENI, tributação autónoma (se a ENI tiver
  contabilidade organizada) e IVA a liquidar na venda futura.
- **Incentivo do Fundo Ambiental (€4.000 para elétricos).** Candidaturas de
  2026 fechadas (11/06 a 27/07/2026, esgotado). Exigia abate de um carro a
  combustão com mais de 10 anos. Verificar se abre nova fase.
