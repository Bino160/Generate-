# D3 — Avaliação da análise de gaps e estrutura de projeto

**Data:** 22/08/2026 · **Decisor:** Rui · **Estado:** proposta de decisão

---

## Veredito

Deu uma coisa nova, e é importante. O resto é o D2 e o próprio repositório devolvidos.

Verifiquei ponto por ponto contra os ficheiros, em vez de aceitar a lista. Dos seis gaps críticos enunciados, quatro são conclusões minhas citadas de volta, um está factualmente errado, e a secção 2 contém — enterrada numa lista de sete itens, a única lacuna real: **não havia plano de tesouraria nem fundo de maneio.**

---

## O que é novo, e foi implementado

### Tesouraria e fundo de maneio

Confirmei por pesquisa: as palavras «tesouraria», «fundo de maneio» e «caução» não apareciam uma única vez em todo o repositório. Lacuna real, e a mais perigosa que restava para esta cliente em concreto.

**Porquê a mais perigosa:** o modelo mostrava que o negócio é rentável. Nunca mostrava se ela sobrevive ao mês 4. São perguntas diferentes, e quem abre pela primeira vez confunde-as sempre. Um negócio rentável fica sem dinheiro quando o investimento se paga todo à cabeça, a receita sobe devagar e há pagamentos que chegam em bloco.

Nova folha `Tesouraria`, com o ano 1 mês a mês e uma vista a três anos. Com os valores de trabalho:

| | |
|---|---|
| **Total de dinheiro necessário antes de abrir** | **67.306 €** |
| — investimento e caução | 61.410 € |
| — cobertura do défice operacional | 921 € |
| — margem de segurança (3 meses de custos fixos) | 4.975 € |
| Mês em que a tesouraria atinge o ponto mais baixo | Mês 2 |
| Saldo acumulado ao fim do ano 1 | **ainda negativo, −38.913 €** |
| Ano em que a caixa recupera o investimento | Ano 3 |

Três coisas que a folha trouxe e não estavam em lado nenhum:

1. **A caução do arrendamento.** Dois a três meses de renda, pagos antes de abrir. É a rubrica que sistematicamente falta nos planos de investimento.
2. **O desfasamento entre faturar e receber.** Consultas particulares pagam-se na hora; subsistemas e seguros pagam a 30 dias. A diferença é dinheiro que não está em caixa.
3. A armadilha dos pagamentos por conta de IRS no ano 1. São calculados sobre o rendimento do ano **anterior**, no regime antigo. Paga-se IRS do passado enquanto se está a investir no futuro, e num ano em que a tesouraria já está no seu pior momento.

**E uma correção que tive de fazer a mim próprio:** a primeira versão da folha somava o investimento duas vezes, a necessidade máxima de tesouraria já o continha, e eu voltava a acrescentá-lo, dando 128.716 € em vez de 67.306 €. Corrigido, e a linha passou a estar decomposta para que o erro não se repita.

### Projeção a três anos com rampa de arranque

Também real, e ligado ao anterior. O modelo era de ano de cruzeiro: assumia a ocupação de regime permanente desde o primeiro dia. Uma clínica nova não abre cheia. A rampa mensal do ano 1 é agora um input explícito, e é a fila de números que ninguém quer preencher com honestidade.

---

## O que está factualmente errado

### 1. «Ausência de plano de implementação por fases»

**Existe, está completo, e tem 52 linhas de tabela:** `03-plano/P1_plano_implementacao.md`. Fases 0 a 4, cada ação com responsável, pré-requisito, prazo e prova de conclusão, mais a secção das janelas de 31 de março e 30 de junho, mais o caminho crítico.

A mesma análise que o dá como ausente propõe, na secção 2, uma estrutura de fases que é em boa parte o P1 reescrito.

### 2. «Falta cenário de baixa em euros, pontos de não-retorno com data, e conclusão em unidades controláveis»

**Foram implementados no E1 na ronda anterior**, como resultado do D2: secção 7.4 (cenário de baixa em dinheiro), 7.5 (passivo contingente laboral), 7.6 (tabela de pontos de não retorno com o momento em que cada compromisso deixa de ser reversível) e, no capítulo 5, a secção «O que tem de acontecer para os números funcionarem», toda em doentes por dia.

A análise descreve o estado anterior ao último commit.

---

## O que é eco

Estes pontos são conclusões já registadas, devolvidas como se fossem achados:

| Ponto da análise | Onde já estava |
|---|---|
| Zero inputs reais, todos placeholders | README, R1 secção A, folha `Alertas`, `LEIA-ME` do M1 |
| Cliente sem experiência; erro é dívida pessoal | D2 e R1-39 — a formulação é a minha |
| As três imprecisões não podem transitar | É o D2 |
| Pilar 4 falhou o próprio critério, limiar de 60% | É o D2 |
| As oito regras de qualidade obrigatórias | Todas do D2 |
| Congelar o M1, prioridade aos inputs e parâmetros 2026 | README, R1 secção C, `Alertas` |

Não é inútil: como validação independente, confirma que o diagnóstico se aguenta quando alguém o revisita. Mas não é matéria nova, e vale a pena não a contar como tal quando se avalia o que falta.

---

## O que fica por fazer, e porquê

Da lista da análise, três itens não foram implementados, com fundamento:

**Plano comercial.** Fora do âmbito do brief, que é assessoria fiscal. Mas o ponto por trás é legítimo e não pode ficar mudo: como é que os gabinetes se enchem é o pressuposto silencioso de tudo isto. A rampa de ocupação do ano 1 e as taxas dos anos 2 e 3 são, na prática, um plano comercial disfarçado de célula de Excel. Registado como R1-41: se ninguém souber justificar aqueles números, o modelo está a assumir a parte mais difícil do negócio.

**Margens por serviço.** Precisa da tabela de preços por serviço, que não existe, a ata regista que não há tabela formalizada. A margem por profissional e por gabinete já está na folha `Operacao`.

Estrutura operacional detalhada (quem marca, quem fatura, quem controla horário e equipamento). Está coberta onde importa e com mais força do que uma descrição narrativa teria: é exatamente o mapa dos cinco indícios do art. 12.º do Código do Trabalho, na folha `RiscoLaboral`. «Quem controla o horário» e «de quem é o equipamento» não são detalhes de organização — são dois dos cinco indícios que determinam um passivo de 77.065 €.

---

## Decisão

1. Implementado: folha `Tesouraria`, com ano 1 mensal, fundo de maneio e vista a três anos. **Feito.**
2. Corrigida a dupla contagem do investimento que introduzi na primeira versão dessa folha.
3. Registados R1-40 a R1-43.
4. Não aceitar como lacunas o P1 e os três requisitos do D2: existem e estão feitos.
5. O bloqueador não mudou, e nenhuma destas rondas o move: inputs da cliente, parâmetros de 2026, e o código de atividade do cônjuge.

---

## Uma nota sobre o método

Três análises seguidas convergiram no mesmo diagnóstico e cada uma trouxe menos matéria nova do que a anterior: a primeira trouxe a camada operacional, a segunda o risco laboral quantificado, esta a tesouraria. O rendimento decrescente é claro.

O que falta agora não é mais análise — são os oito números que só a Dra. Júlia pode dar, e uma tarde da Fiscalidade a confirmar os parâmetros de 2026. Enquanto isso não acontecer, cada ronda adicional de revisão produz mais folhas de cálculo sobre os mesmos placeholders.
