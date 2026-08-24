# A2 — Segunda auditoria do M1

**Data:** 22/08/2026 · **Método:** inspeção programática do ficheiro gerado, à procura do que a A1 **não** examinou. Contagens verificadas, não estimadas.

---

## Nota: **16/20**

A A1 deu 15 e eu próprio anunciei 18 depois de executar o plano de correção. **Esta auditoria baixa para 16**, porque olhou para coisas que a primeira nunca tinha olhado e encontrou uma lacuna estrutural.

Uma auditoria que baixa uma nota que eu próprio dei vale mais do que uma que a confirma.

| Critério | Peso | Nota | Movimento |
|---|---|---|---|
| Correção do modelo | 20% | 18 | mantém |
| **Cobertura de cenários** | 15% | **11** | **novo — é o problema** |
| Cobertura de validação | 15% | 18 | mantém |
| Robustez a uso por terceiros | 10% | 18 | subiu com as correções de hoje |
| Auditabilidade humana | 10% | 15 | mantém |
| Coerência entre folhas | 10% | 14 | desce: novo achado |
| Disciplina de parâmetros | 8% | 18 | mantém |
| Documentação e governance | 7% | 19 | mantém |
| Adequação ao fim | 5% | 16 | desce |

---

## Forças, agora com prova

A A1 afirmou várias destas. Esta auditoria **verificou-as no ficheiro**, que é coisa diferente.

### A proteção está correta, não apenas ligada

**Zero células de fórmula ficaram desbloqueadas por engano.** As 320 células editáveis são exatamente as de preenchimento. Uma proteção mal aplicada — que trancasse inputs ou deixasse fórmulas abertas — seria pior do que nenhuma, porque dá falsa confiança.

### O semáforo de alertas cobre mesmo tudo

`SUM(Parametros!$F$6:$F$50)` e `SUM(Inputs!$J$6:$J$40)`. Verificado: os sinalizadores estão nas linhas 6–50 e 6–40. **Cobertura de 100%.**

Isto importa mais do que parece. Se o intervalo deixasse um parâmetro de fora, o mecanismo desenhado para impedir falhas silenciosas falharia em silêncio.

### Os gráficos apontam para os dados certos

Verificado célula a célula: o gráfico do Comparativo lê `C32:F32`, que é a linha «LÍQUIDO DISPONÍVEL PARA A SÓCIA», com as categorias na linha 22, cabeçalho do bloco **Base** — e não do bloco Baixo, que está logo acima e seria o erro natural.

### Sem formatos que mentem

Zero células com percentagem guardada como inteiro. É o erro mais comum em folhas de cálculo e não existe aqui.

### O ficheiro abre onde deve

Na folha `LEIA-ME`, não numa folha de cálculo a meio.

---

## Fragilidades

### 1. O modelo tem três cenários onde menos importa e um onde mais importa — a maior

Três folhas correm **apenas o cenário Base**:

| Folha | Fórmulas | O que lá está |
|---|---|---|
| `Tesouraria` | 162 | Os 67.306 € necessários antes de abrir, o payback, a curva de sobrevivência |
| `Espaco` | 103 | A decisão entre 2 e 3 gabinetes, o investimento, o custo do degrau |
| `Alertas` | 28 | O próprio semáforo que autoriza ou proíbe citar números |

A comparação fiscal — que a ata e o meu próprio trabalho concluíram ser **a parte menos decisiva** — tem três cenários. A tesouraria, que decide se a clínica sobrevive ao primeiro ano, tem um.

**E isto contradiz uma exigência que eu próprio inscrevi no E1**, secção 7.4: «o cenário de baixa, em dinheiro» é obrigatório. O modelo não o consegue produzir sem alguém reescrever à mão os inputs do Base, correr, anotar e repor. Para uma cliente sem experiência empresarial, o cenário de baixa da tesouraria é provavelmente a página mais importante do relatório inteiro — e é a que o modelo não sabe fazer.

Nota de justiça: no `PontoViragem` e nas tabelas do `BreakEven` o cenário único é deliberado e correto — são varrimentos, e varrer duas dimensões ao mesmo tempo não se lê. A crítica não se aplica aí.

### 2. Uma divisão sem guarda podia partir o ficheiro inteiro — corrigida hoje

`Capacidade diária = horas × 60 ÷ duração da consulta`, sem proteção. Uma duração a zero propagava erro de divisão por **todas** as folhas, porque tudo desce da capacidade.

E a folha `Operacao` não tinha uma única regra de validação: as suas 27 células de preenchimento aceitavam qualquer coisa.

**Corrigido:** guarda na fórmula, e regra de «estritamente maior do que zero» nos quatro divisores — duração, horas, dias e gabinetes.

### 3. Quarenta e uma células de preenchimento sem qualquer regra — corrigidas hoje

A regra genérica da A1 aplicava-se por formato de número e só apanhava moeda e percentagem. Todas as células de formato numérico ficaram de fora: gabinetes, dias, horas, duração, consultas, número de profissionais, meses de caução.

**Corrigido:** zero inputs sem regra, verificado.

### 4. Um rótulo duplicado que convida ao erro — corrigido hoje

«N.º de gabinetes» existia com o mesmo nome na `Operacao` e na `Espaco`. São deliberadamente independentes — na `Operacao` está o espaço escolhido, na `Espaco` comparam-se as duas hipóteses — mas o rótulo idêntico leva qualquer pessoa a supor que estão ligados.

**Corrigido:** renomeado para «N.º de gabinetes desta opção», com a explicação ao lado.

### 5. Quatro parâmetros que nunca são usados

`LIM_SIMPL`, `PERM_OPCAO`, `TF_CAP`, `TF_SOCIOS`. Estão lá com norma e estado de validação, mas nenhuma fórmula lhes toca — servem a N1 e ao P1, não ao cálculo.

Consequência prática: **inflacionam a contagem de «parâmetros por validar» do alerta.** A Fiscalidade gasta tempo a confirmar quatro valores que não movem um cêntimo. Devem ser separados numa secção de referência, fora da contagem.

### 6. Continua sem intervalos nomeados, e continua por abrir em Excel real

Da A1, sem alteração. O segundo é a única limitação que não é resolúvel neste ambiente e continua a ser a última coisa a fazer antes de o ficheiro circular.

---

## Resumo

| | |
|---|---|
| Folhas | 18 |
| Células | 3.754 |
| Fórmulas | 1.546 |
| Erros de fórmula | **0** |
| Verificações independentes | **32**, todas conformes |
| Fórmula mais longa | 262 caracteres |
| Folhas protegidas | 18 de 18 |
| Inputs sem regra de validação | **0** (eram 41) |
| Parâmetros cravados em fórmulas | **0** |
| Folhas limitadas ao cenário Base | **3** que importam |

---

## A correção que falta, e é uma só

Levar `Tesouraria` e `Espaco` aos três cenários. Meio dia de trabalho, e fecha a distância entre o que o modelo promete e o que entrega.

Enquanto isso não estiver feito, a frase a não dizer à cliente é «e no cenário baixo fica assim» — porque o modelo não sabe.
