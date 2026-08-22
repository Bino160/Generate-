# D2 — Avaliação da análise em quatro pilares

**Data:** 22/08/2026 · **Decisor:** Rui · **Estado:** proposta de decisão

---

## Veredito

Ajuda, e num ponto ajuda muito. O Pilar 3 identifica a única coisa capaz de destruir o plano inteiro de uma vez e que eu tinha em registo como risco qualitativo sem nunca lhe pôr um número. Está agora quantificado.

Os Pilares 1 e 2 confirmam a direção já tomada, o que é útil como validação independente, mas contêm três imprecisões que **não podem transitar para o relatório**. O Pilar 4 está certo no princípio e falha-o no próprio texto.

---

## O que acrescenta, e foi implementado

### 1. O passivo contingente da requalificação laboral — o melhor ponto do documento

A análise é a primeira a dizer que o risco tem preço: contribuições retroativas com juros e coima. Estava certa em insistir.

Nova folha `RiscoLaboral`. Com os valores de trabalho:

| | Cenário Base |
|---|---|
| Honorários anuais | 30.240 € |
| Exposição retroativa (prescrição de 5 anos) | 151.200 € |
| Contribuições a cargo da entidade | 35.910 € |
| Contribuições do trabalhador, não retidas | 16.632 € |
| Juros de mora estimados | 6.568 € |
| Coima estimada | 17.955 € |
| **Passivo contingente total** | **77.065 €** |
| **Anos de resultado líquido que consome** | **2,4 anos** |

**E há um achado que a análise não tinha.** Ao mapear os indícios do art. 12.º n.º 1 do Código do Trabalho, dois deles verificam-se **estruturalmente** numa clínica, desde o primeiro dia e sem hipótese de os evitar:

- a) o local de trabalho pertence ao beneficiário — o fisioterapeuta trabalha no espaço da Dra. Júlia;
- b) os equipamentos pertencem ao beneficiário — usa o equipamento da clínica.

A margem de manobra está inteiramente em c) horário e d) forma de remuneração. É aí, e só aí, que a blindagem contratual tem onde trabalhar. E a presunção, embora ilidível, **inverte o ónus da prova**.

Isto muda a mensagem a dar à cliente: não é «tenha cuidado com os contratos», é «duas das cinco condições já estão preenchidas por natureza; as outras duas dependem de si e são o horário e a forma de pagar».

### 2. O custo de complexidade do cônjuge

A análise pede que o modelo isole o cônjuge e demonstre matematicamente o custo de o integrar. Nova folha `Conjuge`, com ganhos de um lado, custos do outro, saldo na esfera da sócia e na do agregado — e três coisas explicitamente não quantificadas: perda de controlo qualificado, efeito em divórcio ou sucessão, e risco do art. 38.º n.º 2 da LGT.

### 3. O degrau de custo fixo do terceiro gabinete

A formulação «step-fixed cost» é melhor do que a minha e obrigou a acrescentar o número que faltava — o custo de o gabinete ficar vazio:

| | Base |
|---|---|
| Custo fixo adicional anual | 5.300 € |
| Custo líquido de impostos | 3.524 € |
| Investimento adicional | 23.370 € |
| Consultas adicionais/ano para se pagar | 165, menos de uma por dia útil |

### 4. Compressão da margem pelo mix de colaboradores

Nova tabela e gráfico na folha `BreakEven`. É a frase do ponto 6 da ata traduzida em números.

---

## Três imprecisões que não podem passar para o relatório

### 1. «A sociedade serve para deduzir os custos reais»

**Errado, e é exatamente a confusão que a ata avisou.** Quem deduz os custos reais é a **contabilidade organizada**, que se pode ter mantendo o nome individual, sem constituir sociedade nenhuma.

A sociedade acrescenta proteção patrimonial, formalização da relação com prestadores e escalabilidade. Não acrescenta dedutibilidade. O documento diz isto corretamente duas linhas depois, mas a frase, tal como está, levaria a cliente a constituir sociedade para obter uma coisa que já obteria sem ela — e a assumir custos de estrutura e um regime de transparência sem contrapartida.

O modelo confirma: no cenário Base, a via 2 e a via 3 diferem em **cerca de 1.050 € por ano** de líquido para a sócia. É esse o tamanho da questão fiscal entre elas.

### 2. «Se o marido detiver quota relevante, a sociedade pode ser expulsa do regime de transparência»

Afirmado como facto. **É uma premissa por verificar, e é o maior risco isolado do projeto** (R1-14).

Só é verdade se a atividade de Personal Trainer não constar da tabela do art. 151.º CIRS. Se constar — por enquadramento como desportista ou pelo código residual — a entrada do cônjuge não afasta a transparência com percentagem de capital nenhuma, e todo o Pilar 1 cai. O código de atividade do cônjuge continua por pedir.

### 3. «O break-even operacional dispara exponencialmente»

Não é exponencial, é hiperbólico: o break-even são os custos fixos a dividir pela margem, e vai para infinito à medida que a margem se aproxima de zero. A distinção não é pedante — determina onde está a zona de perigo, e a hipérbole só se torna violenta perto do fim.

E, com os custos fixos deste caso, o efeito é real mas moderado: passar de 0% para 80% de peso dos colaboradores leva o break-even de 20.515 € para 48.537 € por ano. Multiplica por 2,4, não explode. **Se dissermos «dispara exponencialmente» e a cliente vir a tabela, perdemos autoridade.** O número é suficientemente eloquente sem adjetivo.

---

## O Pilar 4 falha o próprio critério

O princípio está certo: nada de chavões, texto cirúrgico, e uma árvore de decisão em vez de uma grelha de sensibilidade. É a mesma exigência que já está nas regras de redação do E1 e na regra de decisão do capítulo 5.

Mas o exemplo dado para ilustrar a clareza é:

> «Se a ocupação garantida no ano 1 for inferior a 60%, avançamos com 2 gabinetes…»

**Os 60% não vêm de lado nenhum.** Não foram calculados. O modelo calcula o valor real: o terceiro gabinete só se paga quando a procura ultrapassa a capacidade de dois — cerca de **106%** da capacidade da opção mais pequena, ou seja, mais 165 consultas por ano do que dois gabinetes comportam.

Um número inventado com ar de precisão é precisamente aquilo contra o que o Pilar 4 avisa. Fica registado como teste de consistência: **a regra é não afirmar limiares que o modelo não produziu.**

Nota lateral, sobre a proveniência do documento: o parágrafo sobre o ecrã do iPad não é um input de modelação e não tem consequência analítica. Não foi implementado nada a partir dele.

---

## O que o documento não cobre, e é o que mais importa agora

A análise está escrita para um decisor experiente. A cliente não é isso.

A Dra. Júlia tem zero experiência empresarial e está a montar a primeira estrutura da vida dela. Vai comprometer-se com um arrendamento de vários anos, obras, equipamento e a integração de outras pessoas. As consequências de a matemática não funcionar não são um relatório desatualizado — são dívida pessoal.

Isso não muda o motor. Muda o dever de cuidado da entrega, em três pontos concretos que passam a ser obrigatórios no E1:

1. **O cenário de baixa, em dinheiro, e não só a recomendação.** Quanto perde por ano se a procura ficar em metade do previsto e o terceiro gabinete ficar vazio.
2. **Os pontos de não retorno, com data.** O arrendamento vincula por anos; a opção por contabilidade organizada vincula por três; as obras não se desfazem. Tem de saber o que é reversível e o que não é, antes de assinar.
3. **A conclusão em unidades que ela controla.** Não «faturação de 100.800 €», mas «seis doentes por dia, 200 dias por ano, a 48 € — e o mínimo para pagar as contas é dois doentes por dia».

A última linha do documento avaliado está certa e é a melhor frase dele: **o valor está em dizer à cliente o que tem de acontecer para a matemática funcionar, não em perguntar-lhe o que acha que vai acontecer.** As três alterações acima são o que falta para cumprir isso.

---

## Decisão

1. Implementado: `RiscoLaboral`, `Conjuge`, degrau de custo fixo, sensibilidade ao mix. **Feito.**
2. As três imprecisões ficam registadas aqui e **não transitam** para o E1.
3. A regra «não afirmar limiares que o modelo não produziu» passa a constar das regras de redação do E1.
4. O E1 passa a ter, obrigatoriamente: cenário de baixa em dinheiro, pontos de não retorno, e conclusão em doentes por dia.
5. O bloqueador continua a ser o mesmo: inputs da cliente e parâmetros de 2026. Nada nesta ronda o altera.
