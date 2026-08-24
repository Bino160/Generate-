# E1 — Relatório final: estrutura e estado de redação

**Projeto:** Dra. Júlia Best — cliente faturável: Gerir Saúde
**Formato de entrega:** PDF único, template Gerir Saúde, 15 a 20 páginas, com o anexo E2 integrado
**Data:** 22/08/2026

**Regras de redação — vinculativas:**

1. Cada afirmação com efeito fiscal remete para norma — artigo e código, ou para pressuposto identificado em R1. Sem números sem fonte.
2. **Não afirmar limiares que o modelo não produziu.** Um número inventado com ar de precisão é pior do que nenhum número (D2).
3. **A destinatária tem zero experiência empresarial.** Cada conclusão termina em unidades que ela controla: doentes por dia, euros por mês. Nunca só em faturação anual ou em percentagens.
4. **Densidade de ênfase medida, não estimada.** Menos de 8 travessões e menos de 22 negritos por mil palavras. Negrito marca uma decisão, uma restrição vinculativa ou um número que não pode passar despercebido; quando marca tudo, não marca nada. Verifica-se com `python3 08-auditoria/verifica_prosa.py` antes de qualquer peça sair.

**Estado global:** 1 capítulo redigido, 1 com a lógica fechada à espera de números, 5 em esqueleto. O que falta não é redação: são os inputs da cliente e a validação normativa da Fiscalidade.

| Cap. | Conteúdo | Origem | Páginas | Estado |
|---|---|---|---|---|
| 1 | Sumário executivo, recomendação em primeiro lugar | Síntese | 1–2 | Esqueleto |
| 2 | Enquadramento consolidado e pressupostos | Ata + inputs | 2–3 | **Redigido** |
| 3 | Análise comparativa das quatro vias, quantificada | M1 | 4–5 | Esqueleto + mapa de exposições |
| 4 | Composição societária e transparência fiscal | N1 | 2–3 | Esqueleto, N1 pronta |
| 5 | Recomendação fundamentada | Síntese | 2 | **Regra de decisão fechada**, à espera de números |
| 6 | Plano de implementação por fases | P1 | 2–3 | Esqueleto, P1 pronto |
| 7 | Riscos, condicionantes e decisões da cliente | R1 | 2 | Esqueleto, R1 pronto |

---

## Capítulo 1 — Sumário executivo

**Esqueleto. Redige-se em último lugar e lê-se em primeiro.**

Estrutura fixa, uma página, quatro blocos:

1. **A recomendação, em duas frases, logo na primeira linha.** Não uma síntese do processo, não um agradecimento pela confiança: a recomendação. Quem só ler este parágrafo tem de ficar a saber o que fazer.
2. **O número que a sustenta.** O diferencial de líquido anual disponível entre a via recomendada e a atual, num cenário identificado.
3. As duas ou três condições de que a recomendação depende. Extraídas de R1, magnitude ALTA apenas.
4. **A ação imediata, com a data-limite.** Tipicamente a janela de março ou a de junho (P1, «Janelas que não se recuperam»).

**Não incluir:** metodologia, agradecimentos, descrição do trabalho realizado.

---

## Capítulo 2 — Enquadramento consolidado e pressupostos assumidos

REDIGIDO. Base: ata de 18/08/2026 e brief de 22/08/2026. Rever após a receção dos inputs.

### 2.1 Situação de partida

A Dra. Júlia Best exerce a atividade de fisioterapia como Empresária em Nome Individual, enquadrada no regime simplificado de tributação em sede de IRS. A atividade é isenta de IVA ao abrigo do art. 9.º n.º 1 do Código do IVA, na qualidade de prestação de serviços efetuada no exercício de profissão paramédica.

Trata-se de uma isenção **incompleta**: não confere direito à dedução do imposto suportado a montante (art. 20.º n.º 1 CIVA *a contrario*). Todo o IVA suportado na aquisição de bens e serviços para a atividade, designadamente em obras e equipamento — constitui custo definitivo e não é recuperável. Este ponto tem efeito direto na avaliação do investimento e é retomado no capítulo 3.

À data da reunião de 18 de agosto de 2026 não existia tabela de preços formalmente definida, apesar de já existirem faturações a clientes, nem decisão fechada quanto ao espaço ou quanto à estrutura societária.

### 2.2 O que motiva a revisão do enquadramento

Três alterações previstas na atividade tornam o enquadramento atual objeto de reavaliação:

**Aumento significativo de custos fixos.** Está em avaliação um novo espaço, com duas hipóteses — dois ou três gabinetes —, com os encargos de arrendamento, obras de adaptação e equipamento clínico correspondentes.

**Integração de outros profissionais.** Prevê-se a integração de um ou dois fisioterapeutas, segundo um de dois modelos de colaboração: prestação de serviços, com os honorários a constituírem custo da atividade, ou cedência de sala. O modelo pode ser distinto para cada profissional.

**Hipótese de aquisição do espaço por investidor.** Foi colocada a hipótese de um investidor adquirir o espaço, passando a Dra. Júlia a pagar renda numa lógica de futura aquisição do imóvel. As implicações fiscais e contratuais desta modalidade — natureza do contrato, tratamento das rendas, momento e forma da transmissão — não foram analisadas em detalhe e permanecem fora do âmbito deste relatório.

### 2.3 A inadequação do regime atual

No regime simplificado, a tributação incide sobre uma percentagem do rendimento bruto determinada por coeficiente, presumindo-se as despesas da atividade. Os custos efetivamente suportados não são deduzidos na sua totalidade.

À atividade de fisioterapia, constante da tabela a que se refere o art. 151.º do Código do IRS, aplica-se o coeficiente de **0,75** (art. 31.º n.º 1 al. b) CIRS). Tributa-se, assim, 75% do rendimento bruto, presumindo-se que os restantes 25% correspondem aos custos da atividade.

Acresce um segundo mecanismo, frequentemente esquecido: o art. 31.º n.º 13 CIRS agrava a matéria coletável quando as despesas efetivamente suportadas e devidamente justificadas ficam abaixo de 15% do rendimento bruto. O regime não se limita, pois, a presumir custos — exige a justificação de uma parte deles.

**A consequência é aritmética.** A partir do momento em que os custos reais excedam a percentagem presumida, o regime deixa de ser vantajoso, porque se tributa rendimento que não existe. Com o aumento de custos fixos e o pagamento de honorários a terceiros, é previsível que os custos reais venham a exceder os 25% presumidos. O nível exato a partir do qual essa inversão ocorre está quantificado no capítulo 3.

### 2.4 As quatro vias em análise

| Via | Descrição | O que a distingue |
|---|---|---|
| 1 | ENI, regime simplificado | Situação atual. Termo de comparação |
| 2 | ENI, contabilidade organizada | Dedução dos custos efetivos, mantendo a atividade em nome individual. Vincula por 3 anos (art. 28.º n.º 5 CIRS) |
| 3 | Sociedade sujeita a transparência fiscal | Sociedade detida integralmente pela Dra. Júlia. O lucro é imputado à sócia e tributado em IRS, independentemente de distribuição (art. 6.º CIRC) |
| 4 | Sociedade fora da transparência fiscal | Pressupõe composição societária que afaste o regime. O lucro é tributado em IRC e a distribuição volta a ser tributada |

As vias 1 e 2 mantêm a atividade em nome individual; as vias 3 e 4 implicam a constituição de sociedade, com separação entre o património pessoal e o património afeto à atividade. Essa separação tem alcance real mas limitado: é efetiva sobretudo quanto a dívidas comerciais, relações com fornecedores e contratos celebrados com prestadores de serviços.

### 2.5 Como ler este relatório

*[A REDIGIR — meia página, linguagem corrente, sem uma única sigla. Obrigatória, não opcional.]*

A Dra. Júlia está a montar a primeira estrutura empresarial da vida dela. O relatório usa cinco expressões que vai encontrar repetidas e que têm significado técnico preciso. Explicá-las aqui, uma frase cada, com um exemplo dos números dela:

- **Margem de contribuição** — do que entra por cada consulta, quanto sobra depois de pagar o que essa consulta em concreto custou.
- **Custos fixos**, o que se paga todos os meses haja ou não doentes. É isto que a renda é.
- **Break-even** — quantos doentes por mês são precisos para as contas darem zero. Abaixo disto, está a pagar para trabalhar.
- **Taxa de utilização**, que percentagem do tempo os gabinetes estão realmente ocupados.
- **Regime fiscal**, a forma como o Estado calcula o que ela paga. Não muda o dinheiro que entra; muda a fatia que sai.

**Regra de redação desta secção:** se uma frase precisar de ser lida duas vezes, está mal escrita. Testar em voz alta.

### 2.6 Pressupostos assumidos

*[Bloco a preencher a partir de R1, secções A e B, apenas as linhas de magnitude ALTA e MÉDIA. Formato: uma linha por pressuposto, com o valor assumido e a origem. As de magnitude BAIXA ficam apenas em R1.]*

**Advertência a manter no relatório final, com esta força:**

> Os valores utilizados neste relatório assentam nos elementos fornecidos pela cliente e nos pressupostos identificados nesta secção. Alterações relevantes nesses elementos podem alterar as conclusões. As taxas, escalões e limiares utilizados são os em vigor à data de emissão.

---

## Capítulo 3 — Análise comparativa das quatro vias

Esqueleto com o mapa de exposições. Não se redige antes de a folha `Validacao` do M1 estar assinada.

Sequência de argumentação, fixa:

**3.1 O que se compara e porquê.** Explicar que o indicador de decisão é o **líquido anual disponível para a sócia**, e não a carga fiscal absoluta. Uma via pode pagar menos imposto e entregar menos dinheiro — nas vias societárias porque parte do resultado fica retido, e na via 4 porque parte é atribuída ao cônjuge. Explicar também que o IRS é apresentado em diferencial face ao agregado sem a atividade, porque é o que torna as quatro vias comparáveis quando o cônjuge tem rendimento próprio.

**3.2 O peso da Segurança Social.** Este bloco não constava da ata e é, muito provavelmente, o de maior efeito. No regime simplificado a base de incidência é uma percentagem da faturação bruta; com contabilidade organizada é o lucro tributável; nas vias societárias incide apenas sobre a remuneração de gerência. O diferencial contributivo é, com frequência, superior ao diferencial de IRS, e é a razão principal pela qual as vias 1 e 2 divergem tanto.

**3.3 Comparação das quatro vias, em três cenários.**

**3.4 Ponto de viragem do regime simplificado.**

**3.5 O efeito do modelo de colaboração na margem.**

**3.6 IVA no investimento.**

**3.7 A projeção cabe no espaço?** Verificação de plausibilidade operacional, antes de qualquer conclusão fiscal. Utilização implícita dos gabinetes e break-even operacional. Se a projeção não couber, ou não cobrir os custos fixos, a discussão de estrutura fiscal é secundária e tem de o dizer.

**3.8 Dois ou três gabinetes.** A partir de que procura o terceiro compensa, e o que isso implica em doentes por dia.

### Mapa de exposições (anexo E2)

| Ex. | Conteúdo | Folha do M1 | Requisito do brief |
|---|---|---|---|
| E2.1 | Carga fiscal e contributiva total por via, em três cenários | `Comparativo` | E2, ponto 1 |
| E2.2 | Decomposição da carga: IRS, Segurança Social, IRC e derrama, distribuição | `Comparativo` | Suporte de 3.2 |
| E2.3 | Líquido disponível para a sócia e para o agregado, com o retido na sociedade destacado | `Comparativo` | Indicador de decisão |
| E2.4 | Ponto de viragem do regime simplificado, em % de custos e em euros | `PontoViragem` | E2, ponto 2 |
| E2.5 | IVA recuperável no investimento, com e sem cônjuge na sociedade | `IVA` | E2, ponto 3 |
| E2.6 | Impacto do modelo de colaboração na margem: prestação de serviços vs. cedência de sala | `Inputs`, alavanca `MOD_COLAB` + `Comparativo` | E2, ponto 4 |
| E2.7 | Sensibilidade à política de distribuição: vias 3 e 4 a 0%, 50% e 100% | `V4`, alavanca `POL_DIST` | Suporte do capítulo 5 |
| E2.8 | Break-even operacional: faturação mensal necessária para cobrir os custos, e utilização implícita | `BreakEven` | Acréscimo ao mínimo do brief. Suporta 3.1 e o capítulo 7 |
| E2.9 | 2 vs. 3 gabinetes: capacidade, investimento, payback, e a procura a partir da qual o terceiro compensa | `Espaco` | Acréscimo. Responde a um ponto que a ata deixou em aberto |
| E2.10 | Rendimento-alvo: faturação necessária para a fundadora receber o valor pretendido, por estrutura | `BreakEven` | Acréscimo. Suporta a regra de decisão do capítulo 5 |

**Regras de apresentação do anexo:** sem fórmulas visíveis, sem referências a folhas de cálculo, sem ficheiro Excel entregue (secção 5 do brief). Cada exposição com uma frase de leitura por baixo, o que a tabela mostra, não o que contém.

E2.6 e E2.7 exigem correr o M1 mais do que uma vez. Não são tabelas, são cenários, e cada um é uma passagem pelo modelo:

- **E2.6** alterna a alavanca `MOD_COLAB` da folha `Inputs` entre 1 (prestação de serviços) e 2 (cedência de sala). A linha `MARGEM_COLAB` é a resposta direta à pergunta da ata.
- **E2.7** varre a alavanca `POL_DIST` em 0%, 50% e 100%, e alterna `ENGLOB` na via 4.

Prever o tempo: são cinco passagens pelo modelo, com os resultados a copiar para o anexo.

---

## Capítulo 4 — Composição societária e transparência fiscal

Esqueleto. A nota técnica N1 está pronta e cobre todo o capítulo.

| Secção | Fonte em N1 |
|---|---|
| 4.1 O regime do art. 6.º CIRC e as duas vias de qualificação | N1, secção 2 |
| 4.2 Porque se aplica a uma sociedade detida a 100% pela Dra. Júlia | N1, secção 3 |
| 4.3 O que seria preciso para o afastar: teste de capital | N1, secção 4 |
| 4.4 A alternativa não considerada: teste de rendimentos, e o que exigiria | N1, secções 5 e 5.1 |
| 4.5 Afastar a transparência não é, por si, uma vantagem | N1, secção 6 |
| 4.6 Substância económica e risco de requalificação | N1, secção 7 |
| 4.7 Efeito em IVA: sujeito passivo misto | N1, secção 8 |

**Duas advertências de redação:**

1. O capítulo não pode ser escrito antes de N1-01 estar resolvido. Se a atividade do cônjuge constar da tabela do art. 151.º CIRS, as secções 4.3 e 4.4 mudam de sentido e a via 4 sai da análise. Ver R1-14.
2. A afirmação da ata de que o efeito da transparência é «materialmente superior» ao da recuperação parcial de IVA tem de ser demonstrada com os números do M1, não repetida. Se os números não a sustentarem no caso concreto, corrige-se, e diz-se que se corrigiu.

---

## Capítulo 5 — Recomendação fundamentada

A regra de decisão está fechada. Faltam os números que a percorrem.

Esta secção é o motivo pelo qual o capítulo 5 não fica para o fim: a lógica pode e deve ser fixada antes de os números existirem. Assim a recomendação decorre do modelo, em vez de ser escolhida e depois justificada com ele.

### Regra de decisão

**Passo 1 — O simplificado ainda serve?**
Ler `PontoViragem`. Se os custos reais projetados ficarem **abaixo** do ponto de viragem, a via 1 mantém-se e as restantes não se justificam pelo argumento fiscal. Recomendação: manter, com revisão anual.
*Improvável face ao projetado, mas é o passo que impede a análise de assumir a sua própria conclusão.*

**Passo 2 — Sociedade ou nome individual?**
Se o simplificado deixou de servir, a escolha entre a via 2 e as vias societárias **não se decide por via exclusivamente fiscal.** A ata já o regista: em sociedade detida a 100%, a transparência fiscal reduz o diferencial entre as duas vias. Pesar:

| A favor da sociedade | A favor do nome individual |
|---|---|
| Separação patrimonial, relevante com encargos fixos e contratação de terceiros | Custo de estrutura e de contabilidade menor |
| Formalização da relação com os prestadores | Menos obrigações declaratórias |
| Escalabilidade: entrada de sócios, transmissão, sucessão | Sem custos de constituição nem de dissolução |
| | A vinculação de 3 anos é o único compromisso |

**Passo 3 — Se sociedade: transparente ou não?**
Depende de **uma** variável, e é a única pergunta que a cliente tem de responder por si:

> Quanto do lucro precisa de levantar todos os anos?

- **Distribuição integral e recorrente** → a dupla tributação anula ou inverte o ganho. Recomenda-se a **via 3**, mais simples e sem cedência de capital.
- **Retenção significativa de lucros** → afastar a transparência difere a segunda tributação e pode compensar. Avaliar a **via 4**, mas apenas se N1-01 confirmar que é sequer possível, e apenas depois de comparar com a alternativa da secção 5 de N1, que não exige ceder capital.

Passo 4 — Se via 4: como afastar o regime?
Comparar a entrada do cônjuge com mais de 25% do capital contra a via dos rendimentos não profissionais. A segunda não cede capital nem controlo, mas tem risco de qualificação próprio. Ver a tabela comparativa em N1, secção 5.

### O que tem de acontecer para os números funcionarem

*[Secção obrigatória, imediatamente a seguir à recomendação. Fonte: folhas `Operacao`, `BreakEven` e `Espaco`.]*

O valor da nossa entrega está em dizer à cliente o que tem de acontecer, não em perguntar-lhe o que acha que vai acontecer. Esta secção traduz a recomendação em condições verificáveis, todas em unidades que ela controla:

- **quantos doentes por dia** são precisos para cobrir os custos fixos;
- **quantos doentes por dia** são precisos para atingir o rendimento que ela pretende;
- **quantos doentes por dia** justificam o terceiro gabinete;
- **a que taxa de ocupação dos gabinetes** cada um destes pontos corresponde.

Se algum destes números exigir uma ocupação superior a 100%, é impossível, e é preciso dizê-lo com essa palavra, antes de qualquer conclusão fiscal.

### Como redigir

- A recomendação é **uma** via, não um leque. Se as condições forem tais que a recomendação dependa de uma decisão pessoal da cliente, o relatório apresenta a decisão pessoal e o que cada resposta implica, mas não devolve a análise sob a forma de opções.
- Cada passo da regra de decisão remete para a exposição de E2 que o sustenta.
- O que a análise **não** decide diz-se explicitamente: proteção patrimonial e objetivos pessoais não são quantificáveis e são da cliente. A ata já o antecipa na conclusão.

---

## Capítulo 6 — Plano de implementação por fases

**Esqueleto. P1 está pronto e é a fonte integral.**

Adaptação necessária para a versão cliente:

- Manter as fases 0 a 4, com responsável, pré-requisito e prazo.
- Manter integralmente a secção «Janelas que não se recuperam» — é a parte do plano com consequência imediata.
- Manter a secção «O que este plano não faz», reformulada em linguagem de cliente. A fronteira de âmbito diz-se antes, não a meio.
- Retirar as siglas internas e as referências a R1.
- Incluir o diagrama do caminho crítico, redesenhado no template.

---

## Capítulo 7 — Riscos, condicionantes e pontos que carecem de decisão da cliente

**Esqueleto. R1 é a fonte. Não se copia: filtra-se.**

Três blocos, por esta ordem:

**7.1 Decisões que só a cliente pode tomar.** Extraídas da fase 0 de P1. Cada uma com o que implica e até quando. Este bloco vem primeiro porque é o único acionável.

**7.2 Condicionantes da análise.** Os pressupostos de magnitude ALTA de R1, secções A e B, em linguagem de cliente. O que foi assumido, porquê, e o que mudaria se fosse diferente.

**7.3 Riscos a gerir.** De R1, secção D, os que são da esfera da cliente: requalificação laboral (R1-19), licenciamento ERS (R1-20), RGPD (R1-27), substância económica do desenho societário (R1-26).

**7.4 O cenário de baixa, em dinheiro.** *[Secção obrigatória.]*

Não basta apresentar a recomendação no cenário base. A cliente tem de ver, em euros, o que acontece se a procura ficar em metade do previsto e o terceiro gabinete ficar vazio. Fonte: folha `Espaco`, custo do degrau, e folha `BreakEven`, margem de segurança.

A frase a construir tem esta forma: *«se atender X doentes por dia em vez dos Y previstos, o resultado anual passa de A para B, e o investimento demora C anos a recuperar em vez de D.»*

**7.5 O passivo contingente da requalificação laboral.** *[Secção obrigatória.]*

O risco identificado na ata tem preço, e é da ordem de grandeza de **dois a três anos de resultado líquido**. Fonte: folha `RiscoLaboral`.

Dizer também o que a folha mostra e não é intuitivo: dois dos cinco indícios do art. 12.º n.º 1 do Código do Trabalho — o espaço ser da clínica e o equipamento ser da clínica — verificam-se por natureza numa clínica e não são evitáveis. A margem de manobra está no horário e na forma de remuneração. E a presunção, sendo ilidível, inverte o ónus da prova.

**7.6 Pontos de não retorno.** *[Secção obrigatória.]*

O que fica irreversível, e quando:

| Compromisso | Vinculação | Quando deixa de ser reversível |
|---|---|---|
| Contrato de arrendamento | Duração contratada | À assinatura |
| Obras de adaptação | Investimento perdido se sair | Ao início da empreitada |
| Opção por contabilidade organizada | 3 anos (art. 28.º n.º 5 CIRS) | À submissão, até 31 de março |
| Constituição de sociedade | Custo de dissolução | Ao ato notarial |
| Participação do cônjuge no capital | Cedência definitiva de direitos | À transmissão da quota |
| Integração de fisioterapeutas | Exposição contributiva retroativa de 5 anos | Ao primeiro pagamento |

Esta tabela não existe em nenhuma outra peça e é, provavelmente, a página mais útil do relatório para quem nunca montou uma estrutura empresarial.

**O que fica de fora do capítulo 7:** os parâmetros normativos por confirmar (R1, secção C). Se ainda estiverem abertos, o relatório não sai. Não se transferem para a cliente sob a forma de ressalva.

**Nota sobre R1-14.** Se, à data do relatório, a questão do código de atividade do cônjuge continuar por resolver, não vai para o capítulo 7 como risco: **a via 4 sai do relatório**, com nota de que a análise fica disponível assim que o elemento for fornecido. Apresentar uma via inteira em cima de uma premissa não verificada é pior do que não a apresentar.

---

## Sequência de produção

| # | Passo | Depende de | Estado |
|---|---|---|---|
| 1 | Confirmação normativa dos parâmetros | Fiscalidade | R1 secção C aberta |
| 2 | Receção dos inputs da cliente | Cliente | Nenhum recebido |
| 3 | Substituição dos placeholders no M1 e assinatura da folha `Validacao` | 1 e 2 | Bloqueado |
| 4 | Cenários adicionais para E2.6 e E2.7 | 3 | Bloqueado |
| 5 | Capítulos 3 e 4 | 3, N1-01 a N1-06 | Bloqueado |
| 6 | Capítulo 5, percorrendo a regra de decisão | 5 | Lógica fechada |
| 7 | Capítulos 6 e 7 | P1, R1 | Pode arrancar |
| 8 | Capítulo 1 | Todos | — |
| 9 | Anexo E2 no template, sem fórmulas visíveis | 4 | Bloqueado |
| 10 | Deck E3, 14 slides, derivado do relatório | 8 | Estrutura e guião fechados em `06-reuniao/` |

O passo 1 não depende da cliente e está a bloquear tanto quanto o passo 2. Vale a pena arrancar já.
