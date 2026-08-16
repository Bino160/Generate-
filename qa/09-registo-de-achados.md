# Registo de achados

Todos os achados das oito frentes, num sítio. Os que geraram correção têm o teste
de regressão nomeado com o código do achado.

Estados: `CORRIGIDO`, `DECLARADO` (a limitação existe e a ferramenta di-lo),
`ACEITE` (decisão consciente de não corrigir), `ABERTO`.

---

## Código

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| F-001 | Alto | O z-score incluía o próprio ponto no cálculo da média e do desvio. Com 12 pontos isso comprime o z exatamente no mês anómalo e esconde desvios reais de 1,5 sigma | CORRIGIDO. `zScoreExcluindoProprio`, teste `estatistica: z-score exclui o proprio ponto` |
| F-002 | Crítico | Aritmética monetária em vírgula flutuante. Numa ponte de EBITDA com dezenas de ajustamentos o erro torna-se visível no relatório | CORRIGIDO. Cêntimos inteiros em toda a base, `soma` rejeita não inteiros |
| F-003 | Crítico | Somar `GrossTotal` de todos os documentos inflaciona a receita pelo dobro das notas de crédito, porque em SAF-T a nota de crédito traz totais positivos | CORRIGIDO. Receita das linhas, `CreditAmount` menos `DebitAmount`. Teste `saft: a nota de credito abate em vez de somar` |
| F-004 | Médio | 1,5 sigma sobre várias métricas produz falsos alertas. Medido sob ruído puro de 8%: 19% dos meses disparariam pelo menos um alerta, mediana 21%, ou seja cerca de um falso alerta a cada cinco meses | DECLARADO. O motor mede a taxa na própria série do cliente e publica-a no bloco de calibração. Ver P-15 |
| F-005 | Crítico | O NIF 999999990 é partilhado por todos os clientes sem identificação. Pseudonimizado como qualquer outro, todos colapsavam num paciente fictício com centenas de atos, destruindo o F2 e o F5 | CORRIGIDO. Marcados e excluídos da análise ao nível do paciente, fração declarada. Teste `saft: consumidor final nao colapsa num paciente unico` |
| F-006 | Alto | Expansão de entidades XML. Vetor clássico de negação de serviço num leitor que aceita ficheiros de terceiros | CORRIGIDO. O leitor recusa ficheiros com declaração de entidades no prólogo |
| F-007 | Alto | Um ficheiro truncado devolvia os dados parciais em silêncio, o que num SAF-T significa uma receita mais baixa apresentada como facto | CORRIGIDO. Lança erro. Teste `xml: deteta ficheiro truncado` |
| F-008 | Médio | No F7, o modelo de remuneração fixa sem valor fixo definido produzia um líquido de zero euros com aspeto de resultado | CORRIGIDO. O modelo fica de fora e a falta é declarada |
| F-009 | Médio | O payback do F6 dividia o custo mensal total pelo resultado mensal, descontando o investimento duas vezes, uma no numerador e outra no denominador | CORRIGIDO. Payback sobre fluxo de caixa, sem a amortização, que não sai de caixa. Teste `F6: o payback usa caixa` |
| F-010 | Baixo | O scorecard do F3 dividia pelo peso total mesmo com dimensões por avaliar, fazendo um scorecard incompleto parecer um scorecard mau | CORRIGIDO. Renormaliza pelo peso avaliado |
| F-011 | Alto | O SAF-T não tem campo de entidade pagadora nem de convenção. Sem tabela de correspondência o F2 não corre | DECLARADO. Limitação estrutural documentada em `saft.js`, correspondência por expressão regular no perfil |
| F-012 | Alto | `prazoMedioPorEntidade` procurava o documento de origem com um `find` linear dentro do ciclo dos recibos. Quadrático: num SAF-T de dois anos o browser bloqueava | CORRIGIDO. Índice construído uma vez |
| F-013 | Médio | O leitor carrega o ficheiro inteiro como string. Um SAF-T de 200 MB ocupa cerca de 400 MB em memória antes de qualquer processamento | ACEITE para a dimensão de clínica alvo. Registado como limite conhecido |
| F-014 | Alto | O empacotador cortava o pacote a meio. O código-fonte tem `caminho = '$'` e, numa cadeia de substituição, `$'` significa o resto do texto depois da correspondência | CORRIGIDO. As substituições usam função, e o empacotador passou a compilar o resultado antes de o escrever |
| F-015 | Alto | A expressão regular global era partilhada e a função de leitura é recursiva: o módulo filho reiniciava o lastIndex e o módulo pai voltava ao princípio, duplicando os imports | CORRIGIDO. As correspondências são recolhidas antes de recorrer |
| F-017 | Alto | O parser descartava a série do documento e o `SourceID`, que são as duas únicas pistas de autoria que o SAF-T deixa. Sem elas não havia forma nenhuma de aproximar produção por profissional | CORRIGIDO. Ambos guardados, com a série derivada do número do documento |
| F-016 | Médio | O perfil dependia de localStorage existir. Numa página incorporada ou em navegação privada, o acesso lança em vez de devolver nulo | CORRIGIDO. Passa a viver em memória e a interface di-lo |

---

## Comercial

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| Com-001 | Alto | O F2 é a ferramenta de demonstração e exige duração por ato e custo variável por ato, que a maioria das clínicas não tem. A ferramenta que melhor demonstra competência é a que precisa dos dados que o cliente não tem no primeiro dia | ABERTO. Ver recomendação em `qa/02-comercial.md` |
| Com-002 | Alto | O que mata o retainer é logístico. Os inputs mensais estão reduzidos a três: SAF-T, agenda e saldo. A agenda é o elo fraco e é opcional | DECLARADO. O F1 degrada e diz o que perdeu |
| Com-003 | Médio | Sem cédula, o F3 e o F7 não exportam. Vender o F3 antes de haver parceiro co-signatário cria uma promessa que não se cumpre | ABERTO. Decisão comercial, ver P-05 |
| Com-004 | Médio | O F5 depende de P-02 e pode reduzir-se a aceite contra não aceite. Nesse caso não deve ser vendido como ferramenta de funil | DECLARADO. A sonda de capacidade classifica o ficheiro e diz o que perde |
| Com-005 | Médio | O F4 não dá nada ao primeiro utilizador, porque o estrato tem n igual a um. A reciprocidade só funciona a partir de cinco clínicas por estrato | DECLARADO. Ver `qa/02-comercial.md` para a sequência de arranque proposta |
| Com-006 | Baixo | A sequência recomendada na especificação põe o F4 a arrancar ao mesmo tempo que o F1. O código suporta-o, a operação é que tem de o fazer | ABERTO |

---

## Fiscal

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| Fis-001 | Alto | O IVA em falta sobre atos indevidamente isentos pode ser liquidado por fora do preço, base vezes 23%, ou considerado incluído no preço, base vezes 23/123. São 4,3 pontos de base por ano ao longo de cinco anos de prescrição | CORRIGIDO. O F3 calcula as duas leituras, usa a conservadora e mostra a diferença. Novo pressuposto P-21 |
| Fis-002 | Médio | Juros compensatórios assumidos a 4% ao ano, sem confirmação e sem tratar juros de mora | DECLARADO. P-08 |
| Fis-003 | Médio | Prescrição de contribuições assumida em cinco anos | DECLARADO. P-07 |
| Fis-004 | Médio | Coeficiente do regime simplificado de 0,75 não é universal e depende do enquadramento concreto | DECLARADO. P-13, e o próprio resultado do F7 imprime a aproximação que fez |
| Fis-005 | Baixo | Taxa de IVA regional tratada por perfil, mas não há validação de que a região declarada corresponde à sede efetiva | ABERTO |

---

## Contabilística

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| C-001 | Alto | Uma ponte de EBITDA só com ajustamentos favoráveis é a primeira coisa que o comprador ataca, e numa clínica de dono-operador quase nunca é verdade | CORRIGIDO. O F3 declara a lacuna quando não há um único ajustamento negativo |
| C-002 | Médio | A comparação entre leasing e compra é nominal, sem atualização de fluxos | DECLARADO. Ver `qa/04-contabilistico.md` |
| C-003 | Alto | O SAF-T de faturação não tem gastos. Todo o lado do custo vem do perfil e é constante entre meses, o que faz o peso dos custos e os dias de tesouraria variarem apenas por causa da receita | CORRIGIDO. O F1 declara a lacuna quando a série de custos é constante. Teste `achado C-003` |
| C-004 | Baixo | As quotas de depreciação do DR 25/2009 estão fixadas para vida útil de quatro anos. Outros ativos precisam da tabela completa | ABERTO. P-11 |

---

## Financeira

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| Fin-001 | Crítico | Ordenar convenções por margem do ato inverte-se ao ordenar por margem da hora, e a resposta correta depende da ocupação | CORRIGIDO por construção. É a tese do F2, com teste dos extremos obrigatório |
| Fin-002 | Alto | A projeção a treze semanas calculava o desfasamento de cada entidade e depois não o usava. É verdade em regime permanente e falso exatamente nas primeiras semanas, que são as que já estão determinadas pelo que foi faturado | CORRIGIDO. Aceita carteira de faturas em aberto e, sem ela, declara a limitação. Teste `achado Fin-002` |
| Fin-003 | Médio | O limiar de ocupação P-14 estava declarado como usado pelo F2 e nunca era lido | CORRIGIDO. Passou a emitir aviso de zona instável. Teste `achado Fin-003` |
| Fin-004 | Médio | O prazo médio de recebimento devolve nulo com menos de cinco recibos em vez de assumir trinta dias | ACEITE. É o comportamento correto e está declarado |
| Fin-005 | Médio | A canibalização não é conhecida por nenhum cliente. O output útil é o ponto de viragem, não o cenário central | CORRIGIDO por construção. `sensibilidadeCanibalizacao` devolve o intervalo em que o sinal muda |

---

## Legal e RGPD

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| L-001 | Crítico | Um SHA-256 simples de um NIF não é irreversível na prática. O espaço tem menos de mil milhões de valores e a tabela completa calcula-se num portátil em minutos. Publicar agregados construídos sobre isso não é anonimização para efeitos do RGPD | CORRIGIDO. HMAC-SHA-256 com chave aleatória de 256 bits, não extraível, por sessão, nunca serializada |
| L-002 | Alto | Um agregado sobre um estrato de uma clínica é reidentificável | CORRIGIDO. Regra de cinco no motor, e nenhum valor sai de um estrato abaixo do mínimo |
| L-003 | Alto | Consentimento tem de ser expresso e por carregamento, não uma caixa marcada por defeito | CORRIGIDO. Sem consentimento a contribuição nem chega a ser construída |
| L-004 | Alto | Uma fuga de identificador num agregado é silenciosa | CORRIGIDO. Auditor corre sobre o payload antes de existir e bloqueia o envio |
| L-005 | Alto | Conclusões fiscais e jurídicas sem cédula | CORRIGIDO. Porta fechada no código, não aviso no rodapé. P-05 |
| L-006 | Médio | A comunicação à ERS em 30 dias da modificação da entidade titular é pendência clássica e não aparece em nenhuma calculadora | CORRIGIDO. Surge no F2 e no F3 |
| L-007 | Médio | Um índice de risco laboral opaco não é discutível com o cliente | CORRIGIDO. O F7 lista os indícios efetivamente assinalados, com descrição |
| L-008 | Médio | A especificação pede lista nominativa de planos a recuperar. Uma lista nominativa exige o nome do paciente, que nunca entra na ferramenta | DECLARADO. A lista sai por pseudónimo e diz que a identificação se faz no software clínico |
| L-009 | Médio | O perfil fica no armazenamento local. Não tem dados de pacientes, mas tem a economia da clínica, o que num computador partilhado já é de mais | CORRIGIDO. Botão para apagar, e a página de arquitetura diz exatamente o que fica |
| L-010 | Alto | O auditor de fuga confundia um pseudónimo hexadecimal contendo nove dígitos seguidos com um NIF. Disparava em falso de forma intermitente, e um auditor de privacidade que grita em falso ensina a ignorar o aviso | CORRIGIDO. Teste `achado L-010` |

---

## Interface e experiência

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| U-001 | Alto | Sete páginas obrigariam a carregar o SAF-T sete vezes, ou a guardá-lo em disco. A primeira opção mata a utilização, a segunda mata a promessa de privacidade | CORRIGIDO. Uma só página, estado em memória |
| U-002 | Médio | Contraste de 3,3 para 1 no texto secundário em tema claro e 4,1 para 1 em tema escuro, abaixo do mínimo de 4,5 para 1 | CORRIGIDO. Tokens ajustados para 5,5 e 5,2 |
| U-003 | Alto | Um número de referência internacional indistinguível de uma nota de rodapé | CORRIGIDO. Etiqueta com destaque próprio, e o verificador `lint-fontes` recusa a build se o renderizador deixar de a imprimir |
| U-004 | Médio | O F3, o F5, o F6 e o F7 recebem documentos estruturados por área de texto em JSON, não por formulário | DECLARADO. Ver plano em `qa/07-ui-ux.md` |
| U-005 | Médio | A especificação pede memo com espaços de julgamento e não existia | CORRIGIDO. Bloco de memo no F1, campos em branco por construção, imprimível |
| U-006 | Baixo | Os quadrantes distinguiam-se por cor. Cor sozinha não é sinal acessível | CORRIGIDO. Cada quadrante tem título em texto |
| U-007 | Baixo | Sem folha de estilos de impressão o relatório de uma página não existia | CORRIGIDO |
| U-008 | Médio | O F4 não dá devolução ao primeiro utilizador e isso pode ler-se como avaria | DECLARADO. A ferramenta explica que o estrato ainda não tem dimensão e mostra o n |
| U-009 | Crítico | O editor de perfil cobria 12 campos de um modelo com 11 secções. Não havia onde meter horários, equipa, tabela de preços, convenções nem correspondência de entidades, o que deixava quatro das sete ferramentas dependentes de escrever JSON à mão | CORRIGIDO. Editor completo com editor de listas reutilizável e colunas derivadas |
| U-010 | Crítico | Não existia caminho nenhum para introduzir a ocupação. O motor aceitava-a, a interface nunca a fornecia, portanto a taxa de ocupação era impossível de obter e o teste de capacidade do F2 nunca corria | CORRIGIDO. Grelha de sete por dois, com a capacidade de cada faixa derivada dos horários dos gabinetes |
| U-011 | Crítico | A rutura de nível do P-04 nunca disparava, porque a interface nunca passava os componentes que a ativam. A classe que construí em resposta à tua objeção não existia no ecrã | CORRIGIDO. Decomposição da variação por entidade pagadora |
| U-012 | Alto | Escrever num campo e clicar logo a seguir perdia o clique. O evento change de um campo de texto dispara ao sair do campo, ou seja no instante em que o cursor já vai a caminho do botão, e o redesenho total arrancava esse botão | CORRIGIDO. Redesenho só em mudança de estrutura, e refresco das secções dependentes adiado para nunca cair entre carregar e largar o botão |
| U-013 | Médio | O refresco das secções dependentes reintroduziu o mesmo erro um andar acima: editar um ato reconstruía a secção das convenções, que também tem botões | CORRIGIDO. O refresco espera 200 ms após a última alteração e qualquer toque no rato empurra-o mais 400 ms |
| U-014 | Baixo | A barra lateral imprimia a palavra null, porque replaceChildren converte null em texto | CORRIGIDO |
| U-015 | Alto | Não havia forma de ver os serviços mais vendidos nem os maiores clientes, que são as duas primeiras perguntas de qualquer clínica ao ver um SAF-T carregado | CORRIGIDO. Página Raio-X, com as duas ordenações e a terceira que interessa, por margem por hora |
| U-016 | Crítico | Produção por profissional não era possível e não estava dito que não era possível. O SAF-T não tem campo de profissional em nenhuma versão do formato | CORRIGIDO. Atribuição por regra declarada sobre três pistas indiretas, com a fiabilidade de cada uma escrita, a fração coberta sempre visível, e as pistas por mapear listadas a partir do próprio ficheiro |
| U-017 | Alto | Faltas, desmarcações e realizadas não estão no SAF-T e a ausência lia-se como lacuna da ferramenta em vez de propriedade do formato | CORRIGIDO. A página responde à pergunta por escrito: uma falta é a ausência de uma fatura, e lista os seis campos que a agenda tem de trazer e o que passa a ser medível |
| U-018 | Médio | Documentos anulados e notas de crédito podiam ser confundidos com desmarcações | CORRIGIDO. Bloco próprio que mede as duas taxas e diz, na mesma página, que não são a mesma coisa |

---

## Texto

| ID | Severidade | Achado | Estado |
| --- | --- | --- | --- |
| T-001 | Médio | Nenhuma verificação impedia vocabulário de brochura entrar num relatório financeiro | CORRIGIDO. `qa/slop-lint.mjs`, dez regras, falha a build |
| T-002 | Baixo | Travessão longo na documentação, contra a voz do documento de origem | CORRIGIDO |
| T-003 | Alto | A tentação de preencher as medianas da Central de Balanços de memória. Um benchmark plausível mas errado atravessa a revisão e chega ao cliente | ACEITE e resolvido por recusa. `src/dados/benchmark-financeiro.js` está vazio de propósito e as ferramentas declaram a lacuna |
