# QA financeiro

---

## Fin-001. A inversão do F2. A tese, e como está garantida

A pergunta nunca é "a convenção dá lucro". É "o que acontece se sair".

Seja `H` as horas-gabinete que a convenção consome, `mC` a margem por hora da
convenção, `mP` a margem por hora do privado que ocuparia essas horas, `c` a
canibalização e `D` a procura privada hoje recusada por falta de espaço.

```
valor de manter = mC x H  -  mP x min(H, H x c + D)
```

Com gabinetes vazios, `D` é zero e manter vale `mC x H`, positivo para qualquer
convenção acima do custo variável. Com capacidade esgotada, `D` é grande, o
mínimo satura em `H`, e manter só vale se `mC` exceder `mP`.

**A inversão sai da fórmula, não de uma regra colada por cima.** É essa a
diferença entre modelar e decorar o resultado.

**Garantia.** Três testes marcados `OBRIGATORIO` em `tests/f2-convencoes.test.mjs`
verificam que a mesma convenção sai como manter a 50% de ocupação e como sair ou
renegociar a 100%, e que as duas respostas são diferentes. A mensagem de falha do
terceiro é literal: *a ferramenta deu a mesma resposta com a clínica cheia e com
a clínica vazia. Está errada e não sai.*

Existe um estado intermédio e não é acessório: quando a convenção já desloca algum
privado mas ainda compensa, o quadrante é **limitar a horários vazios**. É quase
sempre a resposta correta e praticamente ninguém a dá, porque exige cruzar agenda
com margem.

### O número que vai para a mesa

O preço mínimo por ato sai de duas formas, e as duas são úteis:

| Forma | Cálculo | Uso |
| --- | --- | --- |
| Piso por ato isolado | custo variável mais `mP` vezes a duração | Renegociar um ato específico |
| Multiplicador uniforme | `(custo total + mP x horas recuperáveis) / receita efetiva` | Renegociar a tabela inteira |

O multiplicador também governa a fronteira entre renegociar e sair: acima de 20%
de aumento necessário, renegociar deixa de ser realista e o quadrante é sair.

---

## Fin-002. A projeção a treze semanas ignorava o desfasamento. Corrigido

A versão anterior calculava o atraso de cada entidade e depois não o usava. O
raciocínio era que, com receita estável, o que entra numa semana é o mesmo valor
independentemente do atraso. É verdade em regime permanente e **falso exatamente
nas primeiras semanas**, que são as únicas que já estão determinadas: o que entra
em Abril já foi faturado em Fevereiro e é conhecido, não é uma projeção.

A projeção passou a aceitar a carteira de faturas em aberto. Quando existe, as
primeiras semanas deixam de ser projeção e passam a ser calendário. Quando não
existe, a limitação está escrita em `baseDeEstimativa` e aparece no ecrã.

Isto importa porque o modo de falha típico não é a clínica não ter margem, é ter
margem e não ter dinheiro no dia 8 por causa de uma seguradora a 90 dias.

---

## Fin-003. O limiar de ocupação estava declarado e não era lido. Corrigido

O F2 declarava usar P-14 e nunca lia o valor. O modelo usa deslocação contínua,
portanto não precisa de um degrau, mas o limiar tem uso: acima dele a resposta é
instável, porque pequenas variações de agenda mudam o quadrante.

Passou a emitir aviso nessa zona, com a leitura correta: **a curva de
sensibilidade, não o quadrante de hoje.**

---

## Fin-004. Prazos de recebimento sem inventar trinta dias

`prazoMedioPorEntidade` devolve nulo para entidades com menos de cinco recibos e
lista quais são, em vez de assumir trinta dias, que é o valor que toda a gente
assume e quase nunca é verdade.

Aceite como está. Um prazo em falta declarado é melhor do que um prazo errado que
alimenta uma projeção de tesouraria.

---

## Fin-005. A canibalização, e porque o output útil é o ponto de viragem

Nenhum cliente sabe que percentagem dos pacientes da convenção viria na mesma
como privado. Perguntar produz um palpite apresentado como dado.

O que a ferramenta faz: corre com o valor introduzido, ou com zero se não houver,
e devolve o intervalo de canibalização em que o sinal da decisão muda. Quando esse
ponto de viragem está em 8%, a decisão é robusta e não vale a pena discutir o
palpite. Quando está em 55%, a decisão depende inteiramente dele e é aí que vale
a pena investigar.

O ponto de viragem fechado, quando existe, é `c* = mC/mP - D/H`.

---

## F1, o limiar de alerta. Medido, não assumido

Ver F-004. Simulei 400 séries de 36 meses com ruído gaussiano de 8% e nenhum
degrau real, e corri a regra de alerta sobre elas.

| Medida | Valor |
| --- | --- |
| Meses com pelo menos um falso alerta | 19% em média |
| Mediana entre séries | 21% |
| Intervalo p10 a p90 | 13% a 25% |

Cerca de **um falso alerta a cada cinco meses**. É bastante melhor do que os
cerca de 50% que sairiam de uma leitura ingénua de 1,5 sigma sobre oito métricas
bilaterais, e a razão é que a regra é unilateral: só dispara quando o desvio é
adverso, o que corta metade.

**Recomendação.** Manter 1,5 sigma. Um falso alerta a cada cinco meses é
aceitável num relatório com no máximo três alertas ordenados por impacto, porque
o mais provável é o falso ficar em terceiro e ser lido como ruído. O que não é
aceitável é isto não estar medido, e por isso o motor calcula a taxa na própria
série do cliente e publica-a no bloco de calibração.

Este número tem de ser confrontado com a realidade no teste de aceitação contra
os doze meses da A+. Se a taxa empírica lá for muito acima destes 19%, a série da
clínica tem mais estrutura do que ruído gaussiano e o limiar sobe.

---

## O que fica por fazer nesta frente

1. Atualização de fluxos no F6. Ver C-002.
2. Sazonalidade na projeção a treze semanas. Hoje usa a média dos últimos três
   meses, o que subavalia Agosto e sobreavalia Setembro.
3. Medição de `D`, a procura privada recusada. Hoje é derivada da ocupação. Uma
   clínica que registe pedidos não satisfeitos dá o número diretamente e o modelo
   já aceita esse input.
