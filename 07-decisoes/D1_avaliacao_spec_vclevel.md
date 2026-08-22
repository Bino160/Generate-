# D1 — Avaliação da especificação de evolução do M1

**Documento avaliado:** `VCLevel_M1_Evolucao_Modelo_Comparativo_Equipas.md`
**Data:** 22/08/2026 · **Decisor:** Rui · **Estado:** proposta de decisão

---

## Veredito

A especificação está certa no diagnóstico e erra na fronteira.

**Certa no diagnóstico.** O M1 recebe a faturação como input e nunca pergunta se ela é atingível. Num caso em que a ata deixa expressamente em aberto o número de gabinetes, o número de fisioterapeutas e a tabela de preços, isso é uma lacuna real: o modelo consegue dizer qual estrutura tributa melhor 95.000 € e não consegue dizer se 95.000 € cabem em dois gabinetes. É a diferença entre um simulador fiscal e uma ferramenta de decisão, e a especificação identifica-a corretamente.

**Erra na fronteira.** Cerca de metade do documento — P2 e P3 — é produto VCLevel, não este projeto. O brief é explícito nos dois sentidos: «a conversão em ferramenta reutilizável é projeto separado e **não deve atrasar a entrega à Gerir Saúde**», e a entrega do próprio ficheiro está fora de âmbito. O «founder» dos capítulos 17 a 20 não existe neste projeto: a destinatária é a Dra. Júlia, através da Gerir Saúde, e o que ela recebe é um PDF, não o modelo. Construir um dashboard para quem nunca vai abrir o ficheiro é trabalho a mais no eixo errado.

**Recomendação:** implementar P0 e o núcleo operacional do P1. Rejeitar dois pontos concretos. Diferir P2 e P3 para o projeto de produto, como o brief já manda.

---

## O ponto sensível ao tempo, e é o mais importante

**Construir a camada operacional muda o que pedimos à cliente, e o pedido ainda não foi enviado.**

O pedido atual (`00-inputs/pedido_inputs_cliente.md`) pede «projeção de faturação a 24 meses». É a pergunta errada. As pessoas estimam mal receita e estimam bem quantos doentes atendem por dia. Com a camada operacional, passamos a pedir os **drivers** — dias de trabalho, consultas por dia, duração, preço por serviço, utilização esperada — e **derivamos** a faturação.

Ganha-se três coisas de uma vez:

1. Inputs de melhor qualidade, porque são sobre factos observáveis e não sobre uma previsão.
2. A projeção passa a ser verificável: se as consultas implicarem utilização acima de 100% dos gabinetes, a projeção é impossível e sabemo-lo antes de a usar.
3. Deixa de haver duas perguntas separadas sobre o espaço e sobre a faturação, que na realidade são a mesma.

**Se o pedido for enviado antes desta alteração, perde-se a oportunidade e pede-se outra vez.** É a única parte desta decisão com relógio.

---

## Implementar — aumenta a qualidade deste projeto

| # | Item da spec | Porque vale a pena aqui |
|---|---|---|
| 1 | **Camada operacional** (§4.4, §7, §8) | Gabinetes, dias, consultas, duração, preço e utilização → faturação. Fecha a lacuna central e torna a projeção verificável. |
| 2 | **2 vs. 3 gabinetes** (§25) | A ata põe a pergunta explicitamente e o modelo atual só responde trocando a renda à mão. Com o output «o terceiro gabinete compensa a partir de X% de utilização», passa a ser uma resposta. |
| 3 | **Separar os três break-even** (§26) | Já existe o fiscal (`PontoViragem`). Faltam o operacional e o de rendimento-alvo. São coisas diferentes e a mesma palavra designa as três — é uma confusão à espera de acontecer numa reunião. |
| 4 | **Target de rendimento** (§9) | «Quanto quer receber por ano → quanto tem de faturar» é a inversão do que o modelo faz e é a pergunta que a cliente faz. Liga-se diretamente à ação 0.8 do P1, que eu já tinha acrescentado. |
| 5 | **Payback do investimento** (§11) | O investimento é real e inclui IVA irrecuperável. Hoje está numa linha de memória. Para decidir sobre um arrendamento e obras, o prazo de recuperação importa. |
| 6 | **Warnings** (§22) | Barato e evita a pior falha possível: alguém citar um número calculado sobre parâmetros não validados. |
| 7 | **Proveniência dos inputs** (§6) | É o R1 dentro do modelo. Torna mecânica a pergunta «que conclusões dependem de pressupostos por confirmar». |
| 8 | **Aviso do §23** | «Não assumir consequências fiscais apenas a partir do nome comercial do modelo de colaboração.» Está bem formulado e é exatamente o risco R1-31 / N1-04. Adotar. |

---

## Rejeitar

### 1. Scoring ponderado de adequação (§15)

**Não implementar.**

Um número único que mistura eficiência fiscal com proteção patrimonial, escalabilidade e complexidade administrativa parece objetivo e não é. **Os pesos são a recomendação; a aritmética só a disfarça.** Pior, num trabalho de assessoria fiscal convida a cliente a discutir os pesos em vez de discutir a substância — e o consultor a ajustar os pesos até o resultado dar a via que já tinha em mente.

O E1, capítulo 5, já tem uma **regra de decisão sequencial**: quatro passos, cada um com uma resposta factual, cada um a remeter para a exposição que o sustenta. É superior precisamente porque não agrega grandezas incomensuráveis.

**A árvore de decisão do §16, essa sim, implementa-se** — é a mesma ideia sem a falsa precisão, e coincide em larga medida com a regra que já existe.

### 2. Colunas qualitativas na mesma tabela que os euros (§14)

**Implementar a intenção, rejeitar o formato.**

A intenção está certa: não apresentar apenas valores fiscais. Mas pôr «complexidade: média» na mesma tabela que «líquido da sócia: 28.771 €» sugere que as duas células têm o mesmo estatuto. Uma é calculada, a outra é opinião.

Fazer: bloco quantitativo (do modelo) e bloco qualitativo (juízo profissional), separados e assim rotulados. É o que o capítulo 5 do E1 já faz ao dizer explicitamente o que a análise **não** decide.

### 3. Definition of Done do §29

**Não adotar como critério deste projeto.**

Exige P&L, cash-flow, break-even, payback, ROI, cenários e unit economics validados antes de o modelo estar «pronto». Aplicado à letra, transforma um projeto bloqueado por falta de dados num projeto bloqueado por excesso de âmbito — e nenhum dos oito inputs da cliente chegou ainda.

O *definition of done* deste projeto é o do brief: E1, E2, E3 entregues. O §29 serve como *definition of done* do **produto** VCLevel, e aí está bem.

---

## Ajustar

| Item | Ajuste |
|---|---|
| **Sensibilidade sobre 9 variáveis** (§13) | Reduzir a quatro: faturação, % de honorários, renda e remuneração da fundadora. Nove sensibilidades em Excel são muita superfície para pouco ganho; as que interessam são as que **podem mudar a recomendação**. |
| **Receitas por profissional** (§7) | A ata fala de um ou dois fisioterapeutas. Dois lugares nomeados chegam; um motor para n profissionais é engenharia a mais. |
| **§5: «validar tratamento dos modelos de colaboração»** | Não é um parâmetro, é uma qualificação jurídica (N1-04). Não se resolve atualizando uma célula, resolve-se com uma posição da Fiscalidade. Sai da lista de parâmetros e fica onde já está, nos pendentes da N1. |
| **§18: linguagem para founder** | Já está resolvido por construção. A cliente recebe o E1 e o E2, nunca o modelo. A regra pertence às regras de redação do E1, que já a têm. |

---

## Diferir para o projeto de produto

Conforme o brief já determina: dashboard do founder, executive summary, export estruturado para relatório, benchmarks e base de benchmarks, simulação multi-ano, modelo mensal completo, histórico e comparação de versões, integração com CRM.

Não é rejeição — é sequência. O `build_m1.py` é a semente natural desse trabalho e foi escrito para isso.

---

## O que a especificação não vê

O documento está escrito como se os dados existissem. Não existem.

Nenhum dos oito inputs da secção 4 do brief foi recebido, e os parâmetros fiscais de 2026 não estão confirmados. **O P0 da especificação e o meu R1, secção C, são a mesma lista** — e continuam a ser o que bloqueia.

Vale a pena dizê-lo sem rodeios: se o P1 for construído antes de o P0 estar fechado, teremos um motor mais capaz a produzir números igualmente inutilizáveis. A camada operacional implementa-se agora porque **melhora a pergunta que fazemos à cliente**, não porque produza resultados citáveis. Essa distinção tem de se manter.

---

## Decisão proposta

1. Implementar os oito itens da secção «Implementar», nesta ronda.
2. **Reescrever o pedido de inputs para pedir drivers operacionais em vez de uma projeção de faturação, antes de o enviar.**
3. Rejeitar o scoring ponderado; manter a regra de decisão do E1, capítulo 5, e acrescentar a árvore do §16.
4. Manter o *definition of done* do brief.
5. Registar P2 e P3 como âmbito do projeto de produto, sem data neste projeto.
6. O P0 mantém-se como o único bloqueador real e não é desbloqueado por nada disto.
