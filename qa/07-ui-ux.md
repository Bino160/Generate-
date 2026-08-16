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

## U-004. As entradas em JSON. Declarado, com plano

O F1, o F2 e o F4 alimentam-se do SAF-T e do perfil. O F3, o F5, o F6 e o F7
recebem documentos estruturados por área de texto em JSON, pré-preenchida com um
exemplo real.

Isto é uma limitação, e é honesta por três razões:

1. As entradas do F3 e do F5 **são** documentos estruturados. Os dados de
   diligência do F3 têm cinco secções aninhadas e os planos do F5 têm passos com
   estado e data. Um formulário para isso é um editor de documentos.
2. O F6 e o F7 são pequenos e merecem formulário. É trabalho identificado.
3. Um exemplo pré-preenchido ensina a forma esperada melhor do que um formulário
   vazio de trinta campos.

**Plano.** Formulário para o F6 e para o F7 na próxima iteração. Para o F3 e o
F5, importador de ficheiro com mapeamento de colunas, que é o que a especificação
já prevê em P-02 e que serve os dois.

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
