# QA contabilístico

---

## C-003. O lado do custo não vem da contabilidade. Corrigido por declaração

O SAF-T de faturação não tem gastos. Nem um. Tudo o que está do lado do custo nas
sete ferramentas vem do perfil de cliente, introduzido à mão.

Isto tem uma consequência que passava despercebida: se os custos fixos forem o
mesmo valor em todos os meses, então o **peso dos custos fixos na receita** e os
**dias de tesouraria** variam exclusivamente porque a receita varia. Não são
métricas novas, são a receita outra vez, com outro nome. E ambas podem disparar
alerta.

O F1 passou a declarar isto quando deteta uma série de custos constante. A
resolução verdadeira é carregar o balancete mensal, e fica indicada na lacuna.

**Recomendação de sequência.** Enquanto não houver balancete, tratar estas duas
métricas como contexto e não como gatilho. O painel continua a disparar sobre
elas se ultrapassarem o limiar absoluto, o que é correto para os dias de
tesouraria, e é por isso que essa métrica é a única com limiar absoluto.

---

## C-001. A ponte de EBITDA. Corrigido

A normalização é a análise inteira, não um ajustamento, e **desce frequentemente
o EBITDA**. Se o dono produz 300 mil euros de atos clínicos e se remunera com 60
mil, substituí-lo por remuneração de mercado retira 240 mil de lucro.

Uma ferramenta que só some ajustamentos favoráveis produz um número que o
comprador rasga na primeira reunião. O F3 declara a lacuna quando não existe um
único ajustamento negativo, com a mensagem a dizer porquê.

Cada ajustamento é classificado quanto à defensabilidade em diligência:

| Classe | Entra no número que se apresenta | Onde aparece |
| --- | --- | --- |
| Sólido | Sim | EBITDA ajustado |
| Discutível | Não | Linha separada, para preparar a negociação |
| Indefensável | Não | Registado, para que ninguém o proponha na diligência |

Um ajustamento sem classificação não entra e gera lacuna. Isto é deliberado:
esquecer de classificar não pode ser o caminho fácil para o número subir.

---

## C-002. Leasing contra compra é uma comparação nominal

O F6 compara o custo total do leasing com o capex e mostra o sobrecusto. Não
atualiza fluxos.

Para prazos de 48 a 60 meses e taxas correntes, a diferença entre a comparação
nominal e a atualizada não é desprezável. O que salva a decisão é que **o
critério de escolha entre leasing e compra raramente é o custo total**: é o
efeito em IRC, o efeito na autonomia financeira que o banco vê, e a preferência
por não imobilizar tesouraria. O F6 apresenta esses três e é isso que o cliente
usa.

**Estado.** Declarado. Se se quiser corrigir, é acrescentar uma taxa de
atualização ao modelo, meia dúzia de linhas. Não o fiz porque introduzir uma taxa
de desconto sem a discutir com o cliente é introduzir um pressuposto escondido
num sítio onde o número parece objetivo.

---

## Depreciações, DR 25/2009

Para vida útil de quatro anos, quota máxima de 25% e mínima de 12,5%. O F6
apresenta as duas e diz o que isso significa: margem de planeamento para
acomodar o resultado do exercício.

**C-004, aberto.** Só está fixada a vida útil de quatro anos. Outros ativos
precisam da tabela completa do diploma. Registado em P-11.

---

## Tratamento de documentos, e onde a contabilidade e a faturação divergem

Três pontos que o modelo trata e que costumam produzir divergência entre o que a
ferramenta diz e o que o contabilista diz:

**Notas de crédito.** Em SAF-T uma nota de crédito traz totais positivos e só o
tipo de documento indica que abate. A receita é calculada das linhas,
`CreditAmount` menos `DebitAmount`, o que se auto-assina. Somar `GrossTotal` de
tudo inflaciona a receita pelo dobro das notas de crédito.

**Documentos anulados.** `InvoiceStatus` igual a `A` não entra em nada.

**Divergência entre linhas e totais declarados.** Quando a soma das linhas não
bate com `DocumentTotals`, mandam as linhas e a divergência vira lacuna declarada
com contagem. Divergência sistemática indica bug no exportador do software e é
isso que a mensagem diz.

**Regime de caixa.** As métricas são de faturação. O F7 é a única ferramenta que
distingue produção de recebido, e fá-lo porque é a origem de boa parte dos
conflitos entre sócios. Nas restantes, receita significa faturação.

---

## O que esta frente exige antes de qualquer entrega

1. Confrontar a receita calculada pelo SAF-T com o balancete do mesmo período, no
   primeiro mês de cada cliente. Se não bater, é o SAF-T que está incompleto ou é
   a correspondência de entidades que está mal, e vale a pena saber qual antes do
   terceiro mês.
2. Obter o balancete mensal, ou pelo menos um compromisso de atualizar os custos
   fixos quando mudarem. Ver C-003.
3. Revisão da ponte de EBITDA de cada F3 por quem tem cédula, ajustamento a
   ajustamento, antes de o documento sair.
