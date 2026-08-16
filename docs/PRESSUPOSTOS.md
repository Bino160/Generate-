# Pressupostos por confirmar

Cada pressuposto tem um identificador estável (`P-nn`). O identificador aparece
no código, nos testes e no ecrã. Alterar um pressuposto significa editar um
único ficheiro de configuração, nunca caçar valores espalhados por sete
ferramentas.

Onde alterar: `src/config/pressupostos.js`.
Como verificar o que está por confirmar: `npm run qa` imprime o inventário.

Estados possíveis:

| Estado | Significado |
| --- | --- |
| `POR_CONFIRMAR` | Usei a aproximação mais próxima que consegui justificar. Precisa da tua decisão. |
| `CONFIRMADO` | Validado por ti ou contra fonte primária. |
| `DADOS_POR_CARREGAR` | O desenho está feito, faltam os dados reais. A ferramenta declara a lacuna em vez de inventar. |

---

## As cinco decisões da secção final da especificação

### P-01. Códigos CAE dos estratos do barómetro

**Pergunta original:** códigos CAE exatos a fixar como estratos do barómetro.

**Aproximação usada:** CAE-Rev.3, divisão 86, com os cinco códigos que cobrem a
carteira de clínicas em ambulatório, mais 96040 para a fronteira estética.

| Código | Designação | Porque está na lista |
| --- | --- | --- |
| 86210 | Prática médica de clínica geral, em ambulatório | Núcleo do mercado alvo |
| 86220 | Prática médica de clínica especializada, em ambulatório | Núcleo do mercado alvo |
| 86230 | Medicina dentária e odontologia | Estrato com maior massa de dados e único com múltiplos de transação publicados |
| 86903 | Atividades de enfermagem | Fronteira com domiciliários, margem estrutural diferente |
| 86905 | Outras atividades de saúde humana, n.e. | Onde caem psicologia, nutrição e terapias. Estrato heterogéneo, ver nota |
| 96040 | Atividades de bem-estar físico | Não é saúde. Está aqui porque é o CAE secundário que resolve a questão de IVA no F6 |

**Notas que precisam da tua decisão:**

1. **Revisão da CAE.** Estes são códigos da Rev.3. A CAE-Rev.4 entrou em vigor
   para alinhamento com a NACE Rev.2.1 e, se estiver a aplicar-se ao exercício
   de 2026, os estratos publicados no barómetro vão ter de declarar qual a
   revisão usada, sob pena de comparares clínicas classificadas em
   nomenclaturas diferentes. Não fixei a tabela de correspondência porque não a
   confirmei contra fonte. O código já está preparado: cada estrato tem um campo
   `revisao` e o motor recusa cruzar estratos de revisões diferentes.
   **Ação para ti:** confirmar a revisão aplicável e, se for a Rev.4, entregar a
   correspondência para os seis códigos acima.
2. **86905 é um estrato lixo.** Junta psicologia, nutrição, terapia da fala e
   podologia. Estruturas de custo incomparáveis. A minha recomendação é
   segmentar por dentro com uma etiqueta própria de subsetor recolhida no
   carregamento, e não pela CAE. Deixei o campo `subsetor` preparado e opcional.
3. **A clínica de psicologia da carteira** está classificada em quê? Se estiver
   em 86905, cai no problema do ponto 2 e é o teu primeiro caso de teste.

**Impacto se estiver errado:** o barómetro publica medianas de estratos mal
formados. É o risco mais alto do F4, porque um benchmark errado é pior do que
nenhum.

---

### P-02. Exports de orçamentos do software clínico

**Pergunta original:** o que é que o iMED entrega, e o que fazem o Doctusware,
o OrisDent e o Gestrato.

**Aproximação usada:** nenhuma. Não confirmei nenhum dos quatro contra fonte e
não vou inventar formatos de exportação de software que não testei.

**O que construí em vez disso:** um mapeador de colunas tolerante com sonda de
capacidade. O F5 lê qualquer CSV, pergunta uma vez que coluna corresponde a que
campo, guarda esse mapeamento no perfil de cliente, e depois classifica sozinho
o ficheiro num de três níveis:

| Nível | O que o ficheiro tem | O que o F5 entrega |
| --- | --- | --- |
| `COMPLETO` | Plano, passos, estado por passo, datas por passo | Tudo: coortes, curva de maturação, abandono a meio, euros parados por escalão |
| `PARCIAL` | Plano com estado global e data de aceitação, sem passos | Coortes e maturação. Declara que não consegue medir abandono a meio |
| `MINIMO` | Aceite contra não aceite | Só taxa de aceitação, e só se passar a auditoria de completude |

Esta é a resposta certa mesmo depois de saberes o que os quatro exportam,
porque o quinto software aparece sempre.

**Ação para ti:** confirmar o iMED. Se o iMED entregar `COMPLETO`, o F5 sobe na
sequência de construção. Se entregar `MINIMO`, o F5 desce, porque a parte que
vale não é construível e vender a ferramenta assim queima credibilidade.

---

### P-03. Múltiplos de transação

**Pergunta original:** existem transações portuguesas observadas, ou trabalho só
com referências americanas etiquetadas.

**Aproximação usada:** só referências internacionais, etiquetadas no ecrã, nunca
apresentadas como avaliação.

| Referência | Valor | Origem | Como aparece no ecrã |
| --- | --- | --- | --- |
| Dentária, local único | 5x a 8x EBITDA ajustado | Mercado EUA, 2026 | Etiqueta vermelha "Referência internacional. Não é o mercado português." |
| Dentária, plataforma multi-local | 8x a 11x EBITDA ajustado | Mercado EUA, 2026 | Igual |
| Portugal | Sem dados | Sem fonte | O F3 declara a lacuna e obriga a introdução manual do múltiplo |

O F3 não tem múltiplo por defeito. O utilizador introduz, e a ferramenta mostra
sensibilidade em torno do valor introduzido. Se o campo ficar vazio, o F3 corre
na mesma e entrega o scorecard, a ponte de EBITDA e as contingências, sem
qualquer número de valor.

**Ação para ti:** se tiveres transações portuguesas observadas, mesmo que sejam
três, carrega-as em `src/dados/multiplos-observados.js`. Três observações
portuguesas etiquetadas valem mais numa reunião do que um intervalo americano.

---

### P-04. F1, o mês anterior nunca dispara alerta

**Pergunta original:** aceitas o princípio.

**Aproximação usada:** aceite, com o interruptor à vista.

`pressupostos['P-04'].mesAnteriorDisparaAlerta = false`

O mês anterior aparece sempre no painel como informação, com variação em
percentagem e em euros. Simplesmente não entra na regra que gera alertas. Os
gatilhos são a média móvel de três meses, o mesmo mês do ano anterior e os
limiares absolutos de risco.

**Onde discordo, e é a razão de isto ter interruptor:** há uma classe de eventos
em que o mês anterior é o único sinal disponível e a espera de três meses é
cara. Perda de um profissional que produzia 18% da receita. Saída de uma
convenção. Avaria de equipamento. Nestes casos a série de doze meses ainda não
sabe nada e a média móvel dilui o degrau por três meses.

**O que fiz:** mantive a regra como pediste para variação contínua, e adicionei
uma classe distinta de deteção, chamada **rutura de nível**, que não é um alerta
de desvio. Dispara quando uma métrica cai mais de 25% contra a média móvel de
três meses **e** a queda é concentrada num único componente identificável
(profissional, convenção, sala). Aparece rotulada como rutura, não como desvio,
e não consome nenhum dos três lugares de alerta.

**Ação para ti:** ou aceitas a rutura de nível como classe separada, ou pões
`detetaRuturaDeNivel = false` e ficas com a regra pura.

---

### P-05. Cédula OCC

**Pergunta original:** que horizonte, porque condiciona F3 e F7.

**Aproximação usada:** assumi **sem cédula**, que é o cenário conservador.

Consequências que já estão no código, e não só na documentação:

1. `pressupostos['P-05'].cedulaOCC = false`.
2. Com `false`, qualquer saída do F3 e do F7 classificada como conclusão fiscal
   ou jurídica sai marcada e o botão de exportar exige a identificação do
   parceiro co-signatário. Sem esse campo preenchido, a exportação não produz
   ficheiro. Não é um aviso legal no rodapé, é uma porta fechada.
3. O F3 e o F7 continuam a correr por inteiro. O que muda é a forma da saída, não
   a profundidade da análise. O modelo quantitativo é teu.

Quando passares a `true`, a porta abre e o aviso passa a nota de rodapé normal.

**Ação para ti:** data prevista. Se for dentro de seis meses, não vale a pena
construir mais nada em torno da co-assinatura. Se for mais de um ano, vale a
pena tratar o parceiro co-signatário como entidade de primeira classe no perfil
de cliente, com honorários e repartição.

---

## Pressupostos técnicos e de domínio que assumi sem perguntar

Estes não estavam na tua lista. São dezasseis. Assumi-os para conseguir escrever código e estão
todos no mesmo ficheiro de configuração.

| ID | Assunto | Valor assumido | Porquê e o que confirmar |
| --- | --- | --- | --- |
| P-06 | Taxa de entidade contratante | 7% para dependência entre 50% e 80%, 10% acima de 80% | Vem da tua especificação. Confirmar que se mantém em 2026 antes da primeira entrega |
| P-07 | Prescrição de contribuições à Segurança Social | 5 anos | Usado para dimensionar a contingência do F3 e do F7. Confirmar com o parceiro |
| P-08 | Juros compensatórios em IVA | 4% ao ano | Taxa de juro legal. Confirmar o valor em vigor e se aplicas juros de mora em cima |
| P-09 | Taxa normal de IVA no continente | 23% | Madeira 22%, Açores 16%. O perfil de cliente tem campo de região e o motor usa a taxa da região |
| P-10 | Regularização de bens de investimento | 5 anos para móveis, 20 para imóveis | Artigos 24.º e 25.º do CIVA. O F6 só trata móveis. Confirmar |
| P-11 | Depreciação, vida útil de 4 anos | Quota entre 12,5% e 25% | DR 25/2009, conforme a tua especificação |
| P-12 | Contribuição de independentes à Segurança Social | 21,4% sobre 70% do rendimento de serviços | Usado no F7 para o líquido do profissional. Confirmar a base relevante |
| P-13 | Coeficiente do regime simplificado, categoria B | 0,75 para serviços profissionais | Confirmar aplicabilidade caso a caso, não é universal |
| P-14 | Limiar de capacidade a partir do qual há deslocação | 85% de ocupação | Escolhido por mim. É o parâmetro mais sensível do F2. Ver `qa/05-financeiro.md` |
| P-15 | Limiar de alerta estatístico | 1,5 desvios-padrão | Vem da tua especificação. Ver o achado F-004 em `qa/09-registo-de-achados.md`, que quantifica a taxa de falsos alertas desta escolha |
| P-16 | Dias de tesouraria, limiar absoluto | 30 dias | Vem da tua especificação |
| P-17 | Completude mínima do registo de orçamentos | 80% | Abaixo disto o F5 recusa mostrar taxa de aceitação. Escolhido por mim |
| P-18 | Dimensão mínima de estrato publicável | 5 clínicas | Vem da tua especificação |
| P-19 | Feriados municipais | Não considerados por defeito | O motor de capacidade aceita-os como entrada. Cada clínica tem o seu |
| P-20 | Carnaval | Não é feriado obrigatório | Tratado como encerramento opcional por clínica |
| P-21 | Base do IVA em falta sobre atos indevidamente isentos | Imposto a acrescer ao preço cobrado | Ver abaixo. É a decisão fiscal mais material do F3 |

### P-21, em detalhe

Saiu da revisão fiscal e não estava na especificação. Quando um ato não
terapêutico foi faturado como isento ao abrigo do artigo 9.º, o imposto em falta
pode ser lido de duas maneiras:

| Leitura | Cálculo sobre uma base de 100 | Resultado |
| --- | --- | --- |
| Imposto acresce ao preço cobrado | 100 x 23% | 23 |
| Imposto considerado incluído no preço | 100 x 23/123 | 18,70 |

São 4,30 por cada 100 de base, por ano, durante o período de prescrição. Numa
clínica com 30 mil euros anuais de estética não terapêutica ao longo de cinco
anos, a diferença entre as duas leituras passa dos 6 mil euros, antes de juros.

Assumi a leitura conservadora, imposto por fora, porque numa preparação para
transação a contingência deve ser dimensionada pelo pior caso defensável. O F3
mostra sempre os dois valores e a diferença. **A escolha entre as duas é de quem
assina, não do modelo.**

---

## Dados que estão em falta, e não inventei

| O que falta | Onde faz falta | Estado |
| --- | --- | --- |
| Medianas e quartis da Central de Balanços do Banco de Portugal por CAE e escalão | Motor de benchmark financeiro, alimenta F1 e F3 | `DADOS_POR_CARREGAR`. O ficheiro `src/dados/benchmark-financeiro.js` tem o esquema e zero linhas. Todas as ferramentas declaram a lacuna |
| Barómetro operacional próprio | F1, F2, F3 | `DADOS_POR_CARREGAR` por construção. Só existe depois de doze meses de recolha |
| Doze meses reais da A+ | Teste de aceitação obrigatório do F1 | Ausente do repositório por ser dado de cliente. O teste existe e falha em falta, ver `tests/aceitacao/` |
| Transações portuguesas observadas | F3 | Ver P-03 |

A regra é a mesma em todos: nenhuma ferramenta preenche um valor em falta com
uma estimativa silenciosa. Declara a lacuna, diz o que não conseguiu calcular, e
continua com o resto.
