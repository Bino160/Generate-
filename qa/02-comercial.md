# QA comercial

A pergunta desta frente não é se as contas estão certas. É se o produto se vende,
se entrega e se renova.

---

## Com-001. O F2 exige dados que o cliente não tem no primeiro dia

O F2 é a ferramenta que melhor demonstra competência, porque a resposta é
contraintuitiva e o contabilista não a dá. E precisa de três coisas por ato:
preço da convenção, custo variável e duração. A maioria das clínicas tem a
primeira, tem a segunda por alto e não tem a terceira em lado nenhum.

Isto é um problema comercial, não técnico: a ferramenta que abre a porta é a que
tem o arranque mais pesado.

**Recomendação.** Não pedir a tabela toda. Pedir os oito a doze atos que fazem
80% do volume da convenção, que se identificam sozinhos no SAF-T. Duração
recolhe-se numa conversa de vinte minutos com quem faz a agenda, não num
formulário. O custo variável, se não houver, estima-se por família de ato e
declara-se como estimativa.

O que isto vale: transforma o arranque do F2 de um pedido de dados numa reunião
de diagnóstico, que já é serviço faturável e é onde se ganha a confiança.

---

## Com-002. O modo de falha do retainer é logístico, não analítico

A especificação está certa e é a decisão de desenho mais importante do F1: ao
terceiro mês o cliente deixa de enviar os dados.

O que ficou construído para o evitar:

| Mecanismo | Efeito |
| --- | --- |
| Perfil de cliente preenchido uma vez | Os vinte campos não voltam a ser pedidos |
| SAF-T obrigatório, agenda opcional | Um mês sem agenda não bloqueia a entrega |
| Degradação explícita | Sem agenda o painel sai na mesma e diz o que perdeu |
| Três inputs mensais | SAF-T, agenda, saldo bancário |

**O elo fraco é a agenda.** É o único input que não sai de um botão de
exportação normal e é o que desbloqueia as métricas de ocupação, que são metade
do valor do painel.

**Recomendação.** No primeiro mês, tratar a exportação da agenda como trabalho de
implementação faturado, não como pedido ao cliente. Uma vez resolvido o formato,
repete-se.

---

## Com-003. Sem cédula, o F3 e o F7 não exportam

Esta é uma escolha deliberada, ver P-05, e tem consequência comercial direta:
vender o F3 antes de haver parceiro co-signatário identificado cria uma promessa
que o produto não cumpre no fim.

**Recomendação.** Fechar o acordo com o parceiro antes da primeira proposta de
F3, e tratar os honorários dele como custo direto do produto, não como despesa
geral. O modelo quantitativo é teu, a assinatura é dele, e o preço tem de
suportar as duas coisas.

---

## Com-004. O F5 pode não ter produto

O F5 depende inteiramente do que o software clínico exporta, ver P-02. Se o
export só distinguir aceite de não aceite, a parte que vale, que é o abandono a
meio, não é construível.

A ferramenta já classifica o ficheiro em três níveis e diz o que perde em cada
um. O que falta é a decisão comercial: **não vender o F5 como ferramenta de funil
antes de confirmar o export do cliente concreto.**

**Recomendação.** Pedir um ficheiro de exemplo na fase de proposta. São cinco
minutos e evita vender uma coortização que não existe.

---

## Com-005. O F4 não dá nada ao primeiro utilizador

A mecânica de reciprocidade é a única coisa que faz alguém carregar um SAF-T
para um barómetro. Mas o percentil só existe a partir de cinco clínicas no
estrato, e o primeiro utilizador de cada estrato recebe uma página a dizer que
ainda não há comparação.

Isto não é um defeito, é aritmética. Mas tem de ser gerido.

**Recomendação de sequência de arranque.** Não abrir o F4 ao público no primeiro
dia. Correr os primeiros doze a vinte carregamentos dentro da carteira e das
redes próximas, num só estrato de cada vez, começando pela dentária, que é onde
há mais massa. Só abrir quando o estrato principal passar os cinco. Um barómetro
que devolve "ainda não há dados" ao primeiro visitante público não tem segunda
visita.

---

## Com-006. A recolha do F4 tem de arrancar já

A especificação é explícita: se o F4 arrancar depois do F1, perde-se um ano de
dados que nunca se recupera.

O código está pronto para isso, o F4 corre em modo passivo desde o primeiro
carregamento. O que falta é operacional: **cada SAF-T que entrar por causa do F1
ou do check-up tem de passar pelo F4 com pedido de consentimento**, mesmo antes
de haver relatório para publicar.

---

## Estrutura de produto que o código já suporta

Não é uma recomendação de preço, que não me compete. É a leitura do que está
construído.

| Produto | Ferramentas | Natureza |
| --- | --- | --- |
| Check-up | F1 em modo único, F2, F4 | Venda única, gera o perfil de cliente |
| Retainer mensal | F1, F4 em modo passivo | Recorrente, depende dos três inputs mensais |
| Projeto de convenções | F2 completo com alocação horária | Pontual, alto valor, exige a recolha do Com-001 |
| Preparação para transação | F3 mais F7 | Pontual, exige co-assinatura, ver Com-003 |
| Decisão de investimento | F6 | Pontual, procura no SAF-T é pré-requisito |
| Recuperação de planos | F5 | Depende de P-02 |

A dependência que sustenta tudo é o perfil de cliente. É o que faz o segundo mês
custar uma fração do primeiro, e é a razão de o retainer ter margem.
