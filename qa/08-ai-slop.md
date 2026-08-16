# QA de texto gerado sem cuidado

Esta frente existe porque grande parte deste sistema foi escrita por uma máquina,
e há uma classe de defeito que não é um erro de cálculo: é texto que soa bem,
não afirma nada, e destrói a autoridade que é o único produto de um relatório de
consultoria.

Duas partes. A automática apanha padrões. A manual apanha o resto, que é a parte
que interessa.

---

## Parte automática

`npm run qa:slop`. Dez regras, sobre HTML, markdown e as cadeias de texto do
código. Falha a build.

| Regra | O que apanha |
| --- | --- |
| `emoji` | Qualquer emoji. Um relatório financeiro não leva emoji |
| `exclamacao` | Ponto de exclamação em texto para o cliente, excluindo marcação e operadores |
| `travessao-longo` | Travessão longo, contra a voz do documento de origem |
| `marketing` | Vinte e tal termos de brochura, em português e inglês |
| `construcao-nao-e-apenas` | A construção "não é apenas X, é Y". Enche e não afirma nada |
| `hedge-duplo` | "pode potencialmente", "geralmente costuma". Ou se afirma, ou não se escreve |
| `apelo-vago-a-autoridade` | "vários estudos", "está provado que", "todos sabem que" |
| `placeholder` | Lorem ipsum, em breve, TBD |
| `marca-de-trabalho` | TODO e FIXME sem dono |
| `superlativo-sem-numero` | "o melhor", "líder de mercado" |

O verificador foi afinado depois da primeira execução: a regra da exclamação
apanhava `<!doctype`, `<!--` e `<![CDATA[`, ou seja onze falsos positivos e zero
verdadeiros. Uma regra que só grita em falso treina as pessoas a desligá-la, o
que é pior do que não a ter.

**Estado: limpo.**

---

## Parte manual. Os sete critérios

### 1. Cada afirmação tem um dono, um número ou uma fonte

Verificado à mão em todos os textos que chegam ao cliente. Onde havia afirmação
sem suporte, ou passou a ter número, ou passou a estar declarada como
pressuposto com identificador.

Exemplo: a taxa de falsos alertas do F1. A versão fácil seria escrever "o limiar
está calibrado para evitar ruído". A versão que ficou mede: 19% dos meses sob
ruído puro, mediana 21%, intervalo de 13% a 25%, e o motor recalcula na série de
cada cliente.

### 2. Nenhum número inventado. **É o critério central**

`src/dados/benchmark-financeiro.js` está vazio de propósito.

A tentação era preencher as medianas da Central de Balanços de memória. Sairiam
valores plausíveis, o ficheiro teria bom aspeto, e o F1 teria comparações
setoriais. **E era o pior defeito possível**: um benchmark plausível mas errado
atravessa a revisão precisamente por ser plausível, e chega ao cliente com a
autoridade de um dado.

O mesmo para a correspondência CAE-Rev.3 para Rev.4, para o que o iMED exporta, e
para os múltiplos portugueses. Nos quatro casos a resposta foi a mesma: não sei,
está declarado, a ferramenta diz que não sabe, e o desenho está pronto para
receber o dado quando ele existir.

### 3. Onde discordo, digo, e não escondo a discordância na implementação

Ver P-04. O princípio de que o mês anterior nunca dispara alerta foi aceite, e
está implementado. Mas há uma classe de eventos em que o mês anterior é o único
sinal e a média móvel dilui o degrau por três meses.

A resposta preguiçosa era implementar o princípio e calar. A resposta manhosa era
implementar outra coisa e não dizer. O que ficou: a regra como pedida, mais uma
classe distinta chamada rutura de nível, rotulada como tal, que não consome
lugar de alerta, com interruptor para a desligar, e a discordância escrita por
extenso na documentação.

### 4. A saída diz o que não sabe

Não é uma preferência de estilo, é infraestrutura. Todas as ferramentas devolvem
lacunas e o teste de contrato recusa qualquer ferramenta que corra com entrada
vazia e não declare nada.

### 5. Nada de entusiasmo

Nenhum texto para o cliente vende a ferramenta ao cliente. O veredito é uma
afirmação sobre a clínica, não sobre o produto. Comparação:

| Descartado | O que ficou |
| --- | --- |
| "Excelente notícia, o mês foi muito positivo" | "Mês dentro do normal da clínica. Nenhuma métrica saiu do intervalo habitual em 2026-03." |
| "Detetámos algumas oportunidades de melhoria" | "3 pontos a tratar em 2026-03, com impacto estimado de 4 200 EUR." |
| "Análise abrangente do seu funil" | "Não mostro taxa de aceitação com este registo. O primeiro trabalho é registar os orçamentos, não analisar a conversão." |

### 6. Comentários que explicam a decisão, não o que a linha faz

Um comentário que diz `// soma os valores` por cima de uma soma é ruído. Os
comentários deste código respondem a "porquê", e quase todos apontam para um erro
concreto que a decisão evita. Os cabeçalhos dos módulos explicam a tese, incluindo
o que a versão óbvia faria e porque falha.

Onde havia código morto, saiu: um ramo `if` cujas duas metades eram iguais em
`capacidade.js`, uma multiplicação por zero em `f2-convencoes.js`, um `soma` de
zeros usado como condição em `f3-prontidao-transacao.js`, e um import não usado.

### 7. Nada de simetria falsa

Um documento gerado tende a produzir listas de três, secções do mesmo tamanho e
tabelas onde uma frase chegava. Verificado ficheiro a ficheiro: o F2 tem cinco
razões porque a especificação tem cinco, o F5 tem quatro, o F4 tem uma. As
secções têm o tamanho que o assunto pede.

---

## O que esta frente não consegue verificar

Se o texto se lê bem em voz alta numa reunião com o cliente à frente. Isso
verifica-se lendo, e está na lista de revisão humana do plano de QA.
