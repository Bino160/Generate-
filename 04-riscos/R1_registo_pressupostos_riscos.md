# R1 — Registo de pressupostos e riscos

**Projeto:** Dra. Júlia Best — cliente faturável: Gerir Saúde
**Data de abertura:** 22/08/2026 · **Última revisão:** 22/08/2026
**Estatuto:** interno. Alimenta o capítulo 7 do relatório E1.

**Para que serve.** Uma linha por pressuposto assumido na ausência de informação da cliente ou de decisão da equipa. Protege-nos se os números mudarem, e protege a cliente de tomar por facto o que é hipótese de trabalho. Um pressuposto que não esteja aqui não pode aparecer no relatório.

**Regra de manutenção:** quando um pressuposto se resolve, a linha não se apaga — muda de estado para RESOLVIDO, com a data e a resolução. O histórico é a prova.

**Estados:** ABERTO · EM VERIFICAÇÃO · RESOLVIDO
**Magnitude:** ALTA (muda a recomendação) · MÉDIA (muda os números, não a direção) · BAIXA (muda uma tabela)

---

## A. Pressupostos por falta de inputs da cliente

Nenhum dos oito inputs da secção 4 do brief foi recebido. Os valores da folha `Inputs` do M1 são placeholders escolhidos para testar o motor de cálculo, não estimativas do caso.

| ID | Pressuposto assumido | Base do pressuposto | Se se revelar falso | Magn. | Resolve | Estado |
|---|---|---|---|---|---|---|
| R1-01 | Faturação anual de 70.000 / 95.000 / 130.000 € nos cenários baixo, base e alto | Ancorado na referência de ~80.000 € registada na ata como valor de mercado para ponderar a constituição de sociedade | Todos os números do capítulo 3 mudam. O ponto de viragem desloca-se | ALTA | C (input 1) | ABERTO |
| R1-02 | Renda de 12.000 / 14.400 / 18.000 € e restantes encargos do espaço | Baixo e base como 2 gabinetes, alto como 3 gabinetes (ata, ponto 3) | Muda o peso dos custos fixos, que é a variável que torna o simplificado inadequado | ALTA | C (input 3) | ABERTO |
| R1-03 | Honorários a fisioterapeutas de 18.000 / 30.000 / 45.000 € | Proporcional à faturação, sem base documental | Crítico. A ata regista que, se parte relevante da faturação corresponder a honorários, a margem pode não justificar a alteração de estrutura | ALTA | C (input 5) | ABERTO |
| R1-04 | Rendimento do cônjuge de 14.000 / 18.000 / 22.000 €, tributação conjunta, sem dependentes | Nenhuma. Valor arbitrário | Muda a taxa marginal do agregado e, com ela, todo o IRS diferencial das quatro vias | ALTA | C (inputs 6 e 7) | ABERTO |
| R1-05 | Investimento em obras, equipamento e software conforme folha `Inputs` | Nenhuma. Valores arbitrários | Muda as amortizações, o IVA perdido e a justificação de despesas do art. 31.º n.º 13 | MÉDIA | C (input 4) | ABERTO |
| R1-06 | Remuneração de gerência de 14.000 / 16.800 / 20.000 € nas vias societárias | Variável de decisão nossa, não dado da cliente. Fixada acima da base mínima de 1 x IAS | É alavanca de otimização, não pressuposto factual. Deve ser objeto de sensibilidade própria no capítulo 3 | MÉDIA | GS | ABERTO |
| R1-07 | Política de distribuição de resultados a 100% | Escolha conservadora: é o cenário em que afastar a transparência menos compensa | Se a cliente retiver lucros, a via 4 melhora e a recomendação pode inverter-se. É a variável que decide o capítulo 5 | ALTA | C (novo pedido 0.8 do P1) | ABERTO |
| R1-21 | A proposta do investidor para aquisição do espaço não está modelada | Não existe proposta escrita. A ata regista a hipótese como não analisada em detalhe | Se existir, altera a estrutura de custos, o tratamento das rendas e o momento de transmissão. A análise da modalidade está fora de âmbito, mas o efeito nos números não está | MÉDIA | C (input 8) | ABERTO |

---

## B. Pressupostos de modelação assumidos pela equipa

Decisões nossas, tomadas para o modelo poder correr. Discutíveis, e por isso escritas.

| ID | Pressuposto assumido | Porquê | Se se revelar falso | Magn. | Resolve | Estado |
|---|---|---|---|---|---|---|
| R1-08 | As aquisições de investimento do ano contam integralmente para a justificação de despesas do art. 31.º n.º 13 al. e) CIRS na via 1 | Leitura literal da alínea, que se refere a «aquisição de bens e serviços relacionadas com a atividade» | Se a elegibilidade for parcial ou o grau de afetação for inferior, surge acréscimo por insuficiência de justificação na via 1 e esta piora | MÉDIA | Fiscalidade | ABERTO |
| R1-09 | Na folha `PontoViragem`, os custos reais são simultaneamente dedutíveis na via 2 e justificáveis na via 1 | Simplificação necessária para varrer um único eixo | As duas bases não coincidem exatamente (amortizações versus aquisições do ano). O ponto de viragem apurado é conservador: a via 2 tende a virar mais cedo do que aparece | BAIXA | Financeira | ABERTO |
| R1-22 | A Segurança Social está modelada em regime de cruzeiro | Evita a circularidade entre lucro tributável e contribuições | No primeiro ano a base é a declarada no início de atividade, não o lucro do próprio ano. O ano 1 difere do modelo, em qualquer das vias | MÉDIA | Fiscalidade | ABERTO |
| R1-23 | O mínimo de existência (art. 70.º CIRS) não está modelado | Não se prevê que seja vinculativo aos níveis de rendimento em análise | Se algum cenário descer o rendimento coletável o suficiente, o IRS calculado fica sobreavaliado nesse cenário | BAIXA | Fiscalidade | ABERTO |
| — | O investimento inicial está fora da comparação anual, isolado numa linha de memória | Misturar um efeito de ano 1 com o resultado corrente distorceria a comparação a favor da via 1 | Assumido e documentado no `LEIA-ME` do M1. Não é para resolver, é para explicar no relatório | BAIXA | GS | ASSUMIDO |
| — | A comparação entre vias usa o IRS diferencial do agregado, não o IRS total | É o que torna as vias comparáveis quando o cônjuge tem rendimento próprio | Assumido e documentado. Explicar no capítulo 2 | BAIXA | GS | ASSUMIDO |

---

## C. Parâmetros normativos por confirmar

Estes não são pressupostos sobre o caso: são sobre a lei em vigor em 2026. **Enquanto estiverem abertos, nenhum número sai do M1.**

| ID | Parâmetro | Valor no modelo | Porquê está aberto | Magn. | Resolve | Estado |
|---|---|---|---|---|---|---|
| R1-10 | IAS e escalões de IRS | IAS 522,50 €; tabela de escalões de 2025 | Os escalões carregados são os de 2025. Os de 2026 têm de ser confirmados contra o Orçamento do Estado | ALTA | Fiscalidade | ABERTO |
| R1-11 | Taxas de IRC: geral e primeiro escalão PME | 20% e 16% sobre os primeiros 50.000 € | As taxas de IRC têm estado em trajetória descendente por sucessivos orçamentos. Os valores carregados podem não ser os de 2026 | ALTA | Fiscalidade | ABERTO |
| R1-12 | Segurança Social: base de incidência do TI com contabilidade organizada, e taxas do MOE | Base = lucro tributável; MOE a 23,75% + 11% | Este é o bloco ausente da ata e o de maior efeito. A regra da base do TI com contabilidade organizada é o que separa as vias 1 e 2 mais do que o IRS. As taxas do MOE variam consoante o exercício efetivo de gerência | ALTA | Fiscalidade | ABERTO |
| R1-13 | Incidência de derrama municipal sobre sociedade transparente | Interruptor a 0 (não incide) | Questão controvertida: a sociedade apura lucro tributável mas não é tributada em IRC (art. 12.º CIRC), e a derrama incide sobre lucro sujeito e não isento | MÉDIA | Fiscalidade | ABERTO |
| R1-15 | Tributações autónomas estimadas em 500 / 800 / 1.200 € | Estimativa sem base | Depende de haver viatura afeta e de despesas de representação. Aplicam-se também à sociedade transparente | BAIXA | Fiscalidade | ABERTO |
| R1-16 | Taxas de amortização: obras 10%, equipamento clínico 20%, software 33,33% | Valores de trabalho | Os códigos do DR 25/2009 aplicáveis a equipamento clínico não foram confirmados. Obras em imóvel alheio podem seguir o período do contrato | BAIXA | Fiscalidade | ABERTO |
| R1-25 | Derrama municipal de 1,5%, sem isenção para volume de negócios reduzido | Assume município do Porto e ausência de isenção | Muitos municípios isentam ou reduzem a taxa para volumes de negócios baixos. Depende do concelho do espaço escolhido, que ainda não está escolhido | BAIXA | Fiscalidade, após 0.2 | ABERTO |

---

## D. Riscos

Distintos dos pressupostos: não se resolvem com um dado, gerem-se com uma decisão.

| ID | Risco | Probabilidade | Impacto | Mitigação | Dono |
|---|---|---|---|---|---|
| **R1-14** | **A atividade do cônjuge consta da tabela do art. 151.º CIRS** — designadamente por enquadramento como desportista ou pelo código residual. Nesse caso a entrada do cônjuge **não afasta** a transparência fiscal, com qualquer percentagem de capital | **Desconhecida — nunca foi verificada** | **Invalida a via 4 inteira e o capítulo 4 do relatório.** É o maior risco isolado do projeto e o mais barato de eliminar | Pedir o código de atividade do cônjuge já, isoladamente, sem esperar pelo pacote de inputs (P1, ação 0.1) | GS → Fiscalidade |
| R1-17 | Qualificação da cedência de sala em IVA: arrendamento isento (art. 9.º n.º 29 CIVA) ou prestação de serviços com disponibilização de meios, tributada | Média | Muda o IVA, a categoria de rendimento e o teste de rendimentos da transparência (N1, secção 5) | Fixar o enquadramento antes de a cliente escolher o modelo de colaboração | Fiscalidade |
| R1-18 | O equipamento clínico pode ser elegível para taxa reduzida (verbas 2.5 e 2.6 da Lista I do CIVA) e ninguém verificou | Baixa a média | Reduz o IVA perdido, que é custo definitivo numa atividade isenta. Atenuante barata | Verificação item a item sobre o orçamento de equipamento, quando este chegar | Fiscalidade |
| R1-19 | Requalificação da relação com os fisioterapeutas como contrato de trabalho, por exclusividade, subordinação ou dependência económica | Média — sobe com o modelo de prestação de serviços e com um só colaborador a tempo inteiro | Contribuições retroativas, coimas, e destruição do pressuposto de custo que sustenta a comparação | Identificar os fatores de risco no capítulo 7. A redação de contratos e o parecer laboral estão fora de âmbito | GS identifica · ADV mitiga |
| R1-20 | O licenciamento ERS não estar iniciado a tempo e atrasar a abertura | Média | Atrasa a operação, não a nossa entrega. Mas é o item de maior prazo do plano | Arrancar em D+15 e não no fim das obras (P1, ação 3.1). Dizê-lo na reunião de apresentação | C, sinalizado por GS |
| R1-26 | O desenho societário ser lido como artificial ao abrigo do art. 38.º n.º 2 LGT, se a participação do cônjuge não tiver substância económica | Baixa, se o dossiê for construído no momento; alta se for construído quando for pedido | Desconsideração dos efeitos fiscais do desenho, com liquidação adicional | Entradas de capital realizadas e rastreáveis, funções documentadas, ausência de acordos que esvaziem a participação (P1, ação 1.B.8) | GS |
| R1-27 | Tratamento de dados de saúde sem base RGPD adequada, agravado pela partilha de espaço e de sistema clínico com terceiros | Média | Contraordenacional, e reputacional numa atividade clínica | Dossiê RGPD antes da abertura, com a questão da responsabilidade pelo tratamento resolvida (P1, ações 3.5 e 3.6) | C |
| R1-24 | A receção dos inputs arrastar para dentro do primeiro trimestre e perder-se a janela de opção por contabilidade organizada (31 de março) | Média — nenhum input recebido a 22/08/2026 | A cliente fica no simplificado mais um exercício completo, que é o cenário mais caro em cima da mesa. E a recomendação passa a ter de ser em dois tempos | Pedido de inputs formal com prazo, e o alerta da janela por escrito. Se a janela ficar em risco, a recomendação tem de o refletir | GS |
| R1-28 | O projeto encerrar por decurso dos 60 dias sem inputs, faturando-se apenas o trabalho realizado | Média | Comercial, não técnico. O trabalho interno já feito (M1, N1, P1, R1) fica na nossa esfera como ativo reutilizável | Contagem do prazo comunicada por escrito com o pedido de inputs, e ponto de situação ao dia 30 | GS |

---

## E. Estado global

| Categoria | Abertos | Dos quais de magnitude ALTA |
|---|---|---|
| A — Inputs da cliente | 8 | 5 |
| B — Modelação | 4 | 0 |
| C — Parâmetros normativos | 7 | 3 |
| D — Riscos | 9 | 1 crítico (R1-14) |

**Duas leituras deste quadro:**

1. **A entrega não está bloqueada por falta de trabalho nosso; está bloqueada por falta de dados.** O motor de cálculo, a nota técnica, o plano e este registo estão feitos. Falta o que só a cliente pode dar e o que só a Fiscalidade pode confirmar.
2. **Duas linhas resolvem-se esta semana e valem mais do que todas as outras juntas:** R1-14, com um pedido de dois minutos à cliente, e R1-10 a R1-12, com uma tarde de confirmação normativa. Sem elas, nada do que o modelo produz pode ser dito em voz alta.
