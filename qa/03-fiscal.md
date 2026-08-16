# QA fiscal

Nenhuma conclusão desta frente está assinada. Enquanto P-05 for `false`, tudo o
que aqui está classificado como fiscal sai marcado e a exportação exige
identificação do parceiro co-signatário. Isto está imposto no código, não na
documentação: `contrato.js` fecha a exportação quando um bloco tem natureza
fiscal ou jurídica.

O que se segue é o que o modelo calcula, com que pressupostos, e onde é que a
escolha não é do modelo.

---

## Fis-001. A base do IVA em falta. O achado material desta revisão

Quando um ato não terapêutico foi faturado como isento ao abrigo do artigo 9.º
do CIVA, a contingência pode ser lida de duas maneiras, e a diferença não é de
detalhe.

| Leitura | Cálculo sobre 100 de base | Imposto |
| --- | --- | --- |
| O imposto acresce ao preço cobrado | 100 x 23% | 23,00 |
| O imposto considera-se já incluído no preço | 100 x 23/123 | 18,70 |

São 4,30 por cada 100 de base, por ano. Numa clínica com 30 mil euros anuais de
estética não terapêutica ao longo de cinco anos de prescrição, a diferença entre
as duas leituras passa dos 6 mil euros antes de juros.

**O que fiz.** O F3 calcula as duas, apresenta a conservadora como número
principal, e mostra sempre a alternativa e a diferença. Novo pressuposto P-21.

**O que não fiz, e não me compete.** Escolher. A escolha depende do que estiver
contratado com o paciente e da posição que se decide defender. É de quem assina.

---

## Fis-002 a Fis-004. Pressupostos fiscais que precisam de confirmação

| Pressuposto | Valor assumido | Onde pesa | Risco se estiver errado |
| --- | --- | --- | --- |
| P-06, entidade contratante | 7% entre 50% e 80% de dependência, 10% acima | F3 e F7 | Contingência mal dimensionada nos dois sentidos |
| P-07, prescrição de contribuições | 5 anos | F3 e F7 | Contingência sub ou sobreavaliada por múltiplos |
| P-08, juros compensatórios | 4% ao ano, sem juros de mora | F3 | Subavalia se houver acumulação |
| P-13, coeficiente do simplificado | 0,75 | F7 | Líquido do profissional errado, e é o número que ele vê |
| P-21, base do IVA em falta | Imposto por fora | F3 | Ver acima |

O F7 imprime a aproximação que fez no próprio resultado, com a frase
"Nao substitui simulacao de IRS", e enumera o que não trata: agregado, deduções,
mínimo de existência e contabilidade organizada. Isto não é uma nota de rodapé,
está no objeto devolvido e o renderizador imprime-o.

---

## O que o modelo fiscal faz bem, e porquê

**IVA do investimento, no F6.** É a alavanca de valor da ferramenta e nenhuma
calculadora genérica a modela.

| Cenário | Tratamento | Efeito no capex |
| --- | --- | --- |
| Isento pelo artigo 9.º | Imposto não dedutível, entra no custo | Mais 23% de capex real |
| Misto por pro rata, artigo 23.º | Dedução na proporção do pro rata geral | Proporcional |
| Misto por afetação real, artigo 23.º | Dedução na proporção do uso do próprio bem | Para equipamento identificável, costuma ser mais favorável |
| Tributado | Dedução integral | Sem sobrecusto |

O F6 compara pro rata geral com afetação real e quantifica a diferença. E imprime
o aviso de que **a escolha do método não é livre caso a caso e tem condições de
aplicação**: a ferramenta quantifica o efeito, não decide o enquadramento.

**Regularização de bens de investimento, artigos 24.º e 25.º.** Modelada a cinco
anos para bens móveis, com um quinto por cada ponto de variação da proporção de
uso. É o passivo que ninguém projeta: quem compra a contar com 60% de uso
tributado e acaba com 20% tem uma conta a pagar que não estava em lado nenhum.

**Transparência fiscal, artigo 6.º do CIRC, no F7.** A imputação aos sócios
altera a conclusão sobre reter resultado na sociedade, que deixa de ser
diferimento de imposto. A lógica está num só sítio e é reutilizada, para que o
F3 e o F7 não possam divergir.

**Contribuição de entidade contratante.** Entra no custo por hora desde o início,
não como nota. E o resultado diz o que interessa: é apurada oficiosamente a
partir do anexo SS, no ano seguinte, não depende de a clínica a declarar e não é
negociável com o profissional.

---

## Fis-005. Aberto

A taxa de IVA aplicável vem da região declarada no perfil. Não há validação de
que a região declarada corresponde à sede efetiva nem tratamento de clínicas com
estabelecimentos em regiões diferentes.

Impacto: baixo para a carteira atual. Registado.

---

## O que esta frente exige antes de qualquer entrega

1. Confirmação dos cinco pressupostos da tabela acima, por quem tem cédula.
2. Decisão sobre P-21, documentada, porque é a que mais move o número.
3. Revisão do enquadramento de IVA de cada cliente concreto antes de correr o F6.
   O perfil tem um aviso automático quando diz que há atividade tributada e o
   regime está como isento, porque uma das duas coisas está errada.
