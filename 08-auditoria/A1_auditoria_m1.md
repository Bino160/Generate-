# A1 — Auditoria do M1

**Ficheiro:** `01-modelo/M1_modelo_comparativo.xlsx` · **Data:** 22/08/2026
**Método:** inspeção programática do ficheiro gerado, não do script. Contagens verificadas, não estimadas.

---

## Nota global: **15/20**

O número esconde uma diferença que importa mais do que ele:

| Como *motor de cálculo* | Como *ficheiro que outra pessoa vai usar e auditar* |
|---|---|
| **18/20** | **11/20** |

A modelação está boa. O ficheiro não está preparado para sair das minhas mãos.

### Decomposição

| Critério | Peso | Nota | Porquê |
|---|---|---|---|
| Correção do modelo fiscal e contributivo | 25% | 18 | 20 verificações por recálculo independente, todas conformes; regras com norma citada |
| Cobertura de validação | 20% | 11 | **68% das fórmulas sem validação independente** |
| Auditabilidade humana | 15% | 10 | 69 fórmulas acima de 500 caracteres; zero intervalos nomeados |
| Disciplina de parâmetros | 10% | 18 | Corrigido nesta auditoria; resta um `0,5` legítimo |
| Coerência entre folhas | 10% | 13 | Comparação fiscal em cruzeiro, tesouraria com rampa: 23% de diferença |
| Robustez a uso por terceiros | 5% | 8 | Sem proteção de folhas, sem validação de dados |
| Documentação e governance | 10% | 19 | LEIA-ME, Alertas, ligação ao R1, reprodutível por script |
| Adequação ao fim | 5% | 17 | Responde às perguntas certas para uma fundadora sem experiência |

---

## Dimensão

| | |
|---|---|
| Folhas | 18 |
| Células preenchidas | 3.505 |
| Fórmulas | 1.546 |
| Gráficos | 5 |
| Erros de fórmula | **0** |
| Verificações por recálculo independente | 20, todas conformes |

---

## Prós

### 1. Disciplina de parâmetros, com norma e estado

Todas as taxas, escalões e limiares vivem numa folha, cada um com a norma que o sustenta e uma coluna de estado de validação que alimenta os alertas. Depois da correção desta auditoria, **não resta um único número fiscal cravado dentro de uma fórmula**.

### 2. Validação por recálculo independente

Uma segunda implementação, escrita a partir das mesmas normas sem reutilizar nenhuma fórmula da folha, confronta 20 grandezas. Concordam ao cêntimo. É raro num modelo de consultoria e é o que distingue «as contas dão» de «as contas foram verificadas».

### 3. Semáforo bloqueante

A folha `Alertas` diz, em duas palavras, se o ficheiro pode ou não produzir números citáveis. Neste momento diz **NÃO**, com cinco alertas ativos. Impede o erro mais provável de todos: alguém citar um valor calculado sobre placeholders.

### 4. Separações conceptuais que quase nunca se fazem

- Três break-even distintos — fiscal, operacional e rendimento-alvo — que a mesma palavra designa e que aqui nunca se misturam.
- Retido na sociedade separado do líquido da sócia, e ambos separados do líquido do agregado.
- IRS em diferencial do agregado, única forma de comparar as vias havendo rendimento do cônjuge.
- Rentabilidade separada de solvência.

### 5. Comparações metodologicamente corretas

A comparação 2 vs. 3 gabinetes faz-se a **procura constante**, não a igual taxa de utilização. É a diferença entre uma comparação e um artefacto — e foi um erro que existiu e teve de ser corrigido.

### 6. Reprodutível e versionável

Gerado por script. Diferenças entre versões leem-se num diff, não abrindo duas folhas lado a lado.

---

## Contras

### 1. **68% das fórmulas não têm validação independente** — o mais grave

| Folha | Fórmulas | Validada |
|---|---|---|
| V1 a V4 | 378 | Sim |
| **BreakEven** | **293** | Não |
| **PontoViragem** | **169** | Não |
| **Tesouraria** | **162** | Não |
| **Comparativo** | **147** | Não |
| Espaco, IVA, Operacao, RiscoLaboral, Alertas, Conjuge | 283 | Não |
| **Total sem validação** | **1.054 de 1.546** | |

Não é uma questão de volume. As folhas não validadas são precisamente aquelas onde estão os números que passaram a sustentar a decisão: os **67.306 €** de dinheiro necessário antes de abrir, o break-even, o ponto de viragem do terceiro gabinete, os **77.065 €** de passivo laboral. Se algum estiver errado, **nada o apanha**.

A validação foi construída quando o modelo tinha quatro folhas de vias e não acompanhou o crescimento.

### 2. Fórmulas que nenhum humano consegue auditar

Mediana de 26 caracteres, o que está bem. Mas **69 fórmulas acima de 500 caracteres**, e as cinco maiores com **1.030 caracteres cada**.

A causa é o cálculo do IRS por escalões, replicado inline em cada sítio onde é preciso em vez de viver numa coluna auxiliar. Funciona, está validado nas folhas das vias — mas um revisor da equipa de Fiscalidade não consegue confirmar visualmente uma fórmula com mil caracteres. Na prática, tem de confiar.

### 3. Zero intervalos nomeados

Todas as referências têm a forma `Parametros!$C$12`. Combinado com o ponto anterior, significa que ler uma fórmula longa exige saltar entre folhas para descobrir o que cada referência é. Nomes como `IRC_taxa_geral` resolviam-no e não foram usados.

### 4. Incoerência entre a comparação fiscal e a tesouraria

| | |
|---|---|
| Receita na comparação fiscal (ano de cruzeiro) | 100.800 € |
| Faturação real do ano 1 (com rampa de arranque) | 78.097 € |
| Diferença | **−23%** |

As duas folhas estão certas isoladamente e respondem a perguntas diferentes. Mas **a recomendação assenta num líquido de cruzeiro que o ano 1 não vai produzir**, e nada no ficheiro avisa disso. Para uma cliente sem experiência, é precisamente o tipo de diferença que gera a frase «mas vocês disseram que eu ganhava X».

### 5. Sem proteção nem validação de dados

- **0 de 18 folhas protegidas.** Qualquer pessoa escreve por cima de uma fórmula sem dar por isso, e não há forma de saber depois.
- **0 regras de validação de dados.** Nada impede escrever `MOD_COLAB = 3`, que não existe e produz silenciosamente resultados errados; ou introduzir uma renda como texto.

Para um ficheiro que vai passar por três equipas, é a lacuna mais fácil de fechar e a mais provável de morder.

### 6. Cenários que variam tudo ao mesmo tempo

Baixo, Base e Alto movem simultaneamente faturação, custos, investimento e número de profissionais. É um cenário narrativo, não uma sensibilidade: não permite dizer que variável causou a diferença.

### 7. Nunca aberto em Excel real

Validado com um avaliador de fórmulas em Python. O LibreOffice não funciona neste ambiente — não recalcula sequer um ficheiro de três células. O recálculo na abertura está forçado, mas **o comportamento em Excel não foi observado**.

---

## O que eu corrigiria primeiro

| # | Correção | Esforço | Porquê |
|---|---|---|---|
| 1 | Estender o recálculo independente a `Tesouraria`, `BreakEven` e `Espaco` | Meio dia | São os números que sustentam a decisão e ninguém os verifica |
| 2 | Proteger folhas e validar inputs | 2 horas | Impede o erro silencioso quando o ficheiro sair das minhas mãos |
| 3 | Coluna auxiliar única para o IRS, em vez de replicar inline | Meio dia | Elimina as 69 fórmulas ilegíveis e torna a revisão possível |
| 4 | Uma linha no `Comparativo` com o líquido do ano 1, ao lado do de cruzeiro | 1 hora | Fecha a diferença de 23% antes que ela apareça numa reunião |
| 5 | Intervalos nomeados nos parâmetros | 2 horas | Auditabilidade |
| 6 | Abrir e conferir em Excel real | 30 minutos | Nunca foi feito |

Os pontos 1 e 2 deviam estar feitos **antes** de o ficheiro ser partilhado com a Fiscalidade ou a Financeira.

---

## Corrigido durante esta auditoria

- **Coima do risco laboral** estava cravada a 50% dentro de uma fórmula, valendo 17.955 €. Passou a parâmetro.
- **Limiares de utilização** (100%, 85%, 30%) estavam cravados em três sítios. Passaram a parâmetros.

Resta um único literal em fórmula: a tolerância de 0,50 € na comparação da folha `Validacao`, que é uma tolerância de arredondamento e não um parâmetro de modelo.

---

## Conclusão

O modelo está tecnicamente sólido e é honesto sobre o que não sabe — as duas coisas mais difíceis. O que lhe falta não é modelação: é o trabalho de engenharia que separa um motor que funciona de uma ferramenta que se pode entregar a outra pessoa sem medo.

**A crítica que faria a mim próprio em duas linhas:** cresceu de 10 para 18 folhas em três rondas, e a validação ficou nas quatro do princípio. Construí depressa e verifiquei devagar.
