# QA de interface e experiência

---

## U-001. Uma página, não sete. Corrigido por arquitetura

Sete ferramentas em sete páginas obrigariam a carregar o SAF-T sete vezes, ou a
guardá-lo em disco. A primeira opção mata a utilização, a segunda mata a promessa
de privacidade.

O hub é uma página com encaminhamento por fragmento e estado em memória. O
ficheiro entra uma vez e alimenta tudo.

Efeito lateral que vale a pena: fechar o separador apaga o SAF-T, os pseudónimos
e a chave. O comportamento privado é o comportamento por defeito, não exige
disciplina de ninguém.

---

## A hierarquia de leitura de um resultado

Todas as ferramentas usam o mesmo renderizador. Sete renderizadores produzem sete
maneiras de mostrar um alerta e, ao terceiro relatório, o cliente já não sabe ler
nenhum.

A ordem é sempre:

1. **Aviso de exportação**, se o resultado tiver conclusões por co-assinar. Vem
   primeiro porque muda o que se pode fazer com a página.
2. **Veredito**, uma frase em português corrente. Testado: máximo 320 caracteres
   e sem jargão, e o teste rejeita as palavras KPI, dashboard, benchmark,
   insight, driver e performance.
3. **No máximo três alertas**, cada um com o impacto em euros à direita, à mesma
   altura do título. O resto vai para um recolhível.
4. **Blocos de análise**, com selo de natureza quando não são analíticos.
5. **O que não consegui calcular**, sempre, mesmo quando está vazio.
6. **Pressupostos por confirmar** usados naquele cálculo.

O ponto 5 é o que distingue isto de um dashboard. Aparece em todos os
resultados, com a mesma gravidade visual dos números, e diz como se resolve.

---

## U-002. Contraste. Corrigido

| Token | Antes | Depois | Rácio sobre o fundo |
| --- | --- | --- | --- |
| `--texto-tenue`, claro | `#8a837a` | `#6e675e` | 3,3 para 5,5 |
| `--texto-tenue`, escuro | `#7d7a74` | `#8f8b84` | 4,1 para 5,2 |

Este token é usado nas ajudas de campo e nas notas, que são texto pequeno, e
portanto o mínimo aplicável é 4,5 para 1. Estava abaixo nos dois temas.

---

## U-003. A etiqueta de fonte não pode parecer uma nota de rodapé

Regra transversal: nenhum benchmark internacional aparece sem etiqueta de origem
visível no ecrã.

Uma referência internacional imprime uma caixa com contorno sólido, fundo e cor
de aviso, e o texto "Referência internacional. Não é o mercado português e não
deve ser lida como tal." Uma referência nacional imprime contorno tracejado e
discreto. São visualmente distintas à distância de um metro.

**Isto está imposto por verificador.** `qa/lint-fontes.mjs` falha a build se o
renderizador deixar de chamar `renderFonte`, se a etiqueta deixar de marcar a
origem, ou se o estilo de destaque desaparecer da folha de estilos.

---

## U-005. O memo de julgamento. Corrigido

A especificação pede memo com espaços de julgamento, como no pipeline da clínica
de psicologia, e não existia.

O F1 passou a produzir um bloco de memo com quatro campos em branco:

- A minha leitura do mês
- O que aconteceu na clínica que os números não mostram
- Decisão que proponho para este mês
- O que vou verificar no próximo painel

**Os campos ficam em branco por construção.** Um memo pré-preenchido por máquina é
exatamente o oposto do que isto é. A análise é da ferramenta, o julgamento é de
quem apresenta. Na impressão os campos viram linhas.

---

## U-009 a U-011. O editor de perfil estava vazio por dentro. Corrigido

O editor cobria doze campos avulsos de um modelo com onze secções. Faltava tudo
o que interessa: horários, equipa, tabela de preços, convenções e correspondência
de entidades. A consequência era que quatro das sete ferramentas só corriam se
alguém escrevesse JSON à mão, e duas partes do modelo eram inalcançáveis:

| Estava inalcançável | Porquê importa |
| --- | --- |
| Ocupação | É a variável que faz a resposta do F2 inverter-se, e metade do valor do F1 |
| Alocação a faixas vazias | É a alternativa a sair de uma convenção, e quase ninguém a dá |
| Rutura de nível | Foi o que construí em resposta à objeção do P-04 e não existia no ecrã |

O que passou a existir:

**Gabinetes com horário próprio.** Dias em caixas, não em números: ninguém sabe
de cor que zero é domingo, e é essa a classe de erro que produz uma capacidade
errada sem ninguém dar por isso.

**Grelha de ocupação, sete por dois.** A capacidade de cada faixa é derivada dos
horários e aparece ao lado da caixa, em cinzento. Só as horas ocupadas se
introduzem. Uma faixa em branco fica por saber e a ferramenta di-lo, em vez de
assumir zero.

**Equipa com vínculo e tipo de remuneração.** Contrato de trabalho, prestador de
serviços ou sócio. Fixo, percentagem ou misto com mínimo garantido. Sobre
produção ou sobre recebido. Quem suporta materiais, laboratório e assistente. E
os cinco indícios do artigo 12.º em caixas, cada um com a descrição por extenso,
para o cliente poder discordar de um indício concreto.

**Tabela de preços com margem ao vivo.** Três colunas derivadas recalculadas a
cada tecla: margem, margem em percentagem e margem por hora. É deliberado. Quem
preenche a tabela vê, linha a linha, que o ato com mais margem não é o ato com
mais margem por hora. A ferramenta ensina a tese do F2 enquanto se preenche.

**Convenções ligadas ao catálogo.** A convenção só acrescenta o que é dela, o
preço e o volume. A duração e o custo variável vêm da tabela de preços, para que
a mesma consulta não acabe com três durações diferentes em três convenções. E
quando a margem por hora da convenção fica abaixo do que a mesma hora renderia em
privado, aparece marcada a vermelho na própria linha.

**Correspondência de entidades com contagem ao vivo.** Cada regra mostra quantas
linhas do SAF-T carregado é que apanha, o que transforma escrever uma expressão
regular às cegas em algo verificável.

**O que continua em JSON.** O F3 e o F5. As entradas dos dois são documentos
estruturados a sério: os dados de diligência do F3 têm cinco secções aninhadas e
os planos do F5 têm passos com estado e data. Um formulário para isso é um editor
de documentos. O caminho certo é o importador de ficheiro com mapeamento de
colunas previsto no P-02, que serve os dois e serve também a agenda.

---

## U-012 e U-013. O erro que só aparece com mãos humanas. Corrigido

A primeira versão do editor redesenhava tudo a cada alteração de campo. Passa nos
testes que preenchem campos e falha com uma pessoa à frente, por uma razão
específica: **o evento `change` de um campo de texto dispara ao sair do campo**,
ou seja no instante exato em que o cursor já vai a caminho do botão seguinte. O
redesenho arrancava o botão debaixo do rato e o clique perdia-se.

Quem escrevesse o nome de um médico e clicasse logo a seguir em acrescentar via o
botão não fazer nada. Sem erro, sem aviso, sem nada.

A correção tem duas partes:

1. Redesenho total só quando a estrutura muda, ou seja acrescentar e remover
   linhas, que são cliques deliberados. Editar um campo atualiza as colunas
   derivadas no sítio.
2. As secções que dependem de outra são refrescadas 200 ms depois da última
   alteração, e qualquer toque no rato empurra esse refresco mais 400 ms. Assim
   nunca cai entre carregar e largar o botão.

Ficou verificado por um percurso completo num browser real,
`scripts/verifica-perfil.mjs`: preenche gabinetes, ocupação, equipa, preços,
convenção e correspondência, e confirma que o F1, o F2 e o F7 passam a correr do
perfil sem uma linha de JSON.

---

## U-006 e U-007. Acessibilidade e impressão

- Cada quadrante do F2 tem título em texto, não só cor de topo. Cor sozinha não é
  sinal acessível.
- Cada alerta de rutura tem uma etiqueta em texto, não só contorno diferente.
- `focus-visible` com contorno de 2px e afastamento em todos os campos, botões e
  ligações.
- A navegação marca a página atual com `aria-current`.
- Os campos de memo têm `aria-label`.
- Tabelas largas rolam dentro do próprio bloco, o corpo da página nunca rola na
  horizontal.
- Abaixo de 800px a disposição passa a uma coluna e os alertas empilham o
  impacto por baixo do texto.
- Folha de estilos de impressão: navegação e botões desaparecem, os blocos não
  partem a meio, os campos de memo viram linhas. O relatório de uma página existe
  em papel.

**Por fazer.** Não corri leitor de ecrã nem verificação automática de
acessibilidade. Registado.

---

## U-008. O F4 sem dados não pode parecer avariado

O primeiro utilizador de cada estrato recebe uma página sem percentis. Se isso
aparecer como espaço vazio, lê-se como avaria.

A ferramenta diz o número de clínicas no estrato, o mínimo necessário, e que os
indicadores ficam calculados e entram na base assim que o estrato lá chegar. O n
aparece sempre à vista, o que também é a posição honesta na publicação: um
barómetro com n de catorze e o n visível vale mais do que um inquérito com n de
duzentos e enviesamento escondido.

---

## O estado vazio de cada ferramenta

Foi verificado no teste de fumo que todas as sete abrem e produzem alguma coisa
sem dados. Nenhuma mostra um ecrã em branco, um zero, ou uma mensagem de erro
técnica. As que precisam de SAF-T mostram uma ligação para o carregar.
