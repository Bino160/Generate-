# Projeto Dra. Júlia Best — trabalho interno

**Cliente faturável:** Gerir Saúde · **Cliente final:** Dra. Júlia Best (NIF 272180610), fisioterapeuta, ENI em regime simplificado
**Origem:** ata de reunião de 18/08/2026 (MOD COO 007/1) — primeira e única interação com a cliente até à data
**Fase:** produção dos entregáveis internos que sustentam E1, E2 e E3

---

## Estado

| Peça | Ficheiro | Estado |
|---|---|---|
| M1 — modelo comparativo das 4 vias | `01-modelo/M1_modelo_comparativo.xlsx` | 15 folhas: fiscal, operacional, break-even, espaço, alertas. Validado por recálculo independente. **A correr com placeholders** |
| M1 — gerador | `01-modelo/build_m1.py` | Reproduz o ficheiro do zero |
| N1 — nota técnica de composição societária | `02-nota-tecnica/N1_composicao_societaria.md` | Completa. 6 pendentes de Fiscalidade |
| P1 — plano de implementação | `03-plano/P1_plano_implementacao.md` | Completo |
| R1 — registo de pressupostos e riscos | `04-riscos/R1_registo_pressupostos_riscos.md` | Aberto e em manutenção |
| Pedido de inputs à cliente | `00-inputs/pedido_inputs_cliente.md` | **Minuta, não enviada** |
| E1 — estrutura do relatório | `05-relatorio/E1_relatorio_estrutura.md` | Cap. 2 redigido, cap. 5 com a regra de decisão fechada, restantes em esqueleto |
| E3 — estrutura do deck e guião da sessão | `06-reuniao/E3_estrutura_deck.md` | 14 slides e guião de 90 min fechados |
| D1 — avaliação da spec de evolução VCLevel | `07-decisoes/D1_avaliacao_spec_vclevel.md` | Decisão proposta: implementar P0 e núcleo do P1, rejeitar o scoring, diferir P2/P3 |
| D2 — avaliação da análise em quatro pilares | `07-decisoes/D2_avaliacao_analise_quatro_pilares.md` | Implementado o risco laboral e o custo do cônjuge; três imprecisões registadas para não transitarem |
| D3 — avaliação da análise de gaps | `07-decisoes/D3_avaliacao_analise_gaps.md` | Implementada a tesouraria; dois gaps apontados estavam factualmente errados |

**Nada disto sai para a cliente.** Os entregáveis são o relatório E1, o anexo E2 e a reunião E3. A entrega do ficheiro do modelo está expressamente fora de âmbito.

---

## O que bloqueia a entrega

Dois bloqueios, e nenhum deles é falta de trabalho nosso.

**1. Nenhum dos oito inputs da secção 4 do brief foi recebido.** A ata é de 18/08 e foi a primeira interação com a cliente. Os valores da folha `Inputs` do M1 são placeholders para testar o motor de cálculo, não estimativas do caso. Estão todos registados em R1, secção A.

**2. Os parâmetros normativos de 2026 não estão confirmados** — escalões de IRS, taxas de IRC, regras de Segurança Social. R1, secção C. Este bloqueio não depende da cliente e pode ser levantado esta semana.

---

## Três coisas que este trabalho acrescenta à ata

**1. A premissa em que assenta toda a hipótese do cônjuge nunca foi verificada.** O afastamento da transparência fiscal depende de a atividade de Personal Trainer não constar da tabela do art. 151.º CIRS. Se constar — por enquadramento como desportista ou pelo código residual —, a entrada do cônjuge não produz o efeito pretendido, com qualquer percentagem de capital. É o maior risco isolado do projeto (R1-14) e resolve-se com um pedido de dois minutos à cliente.

**2. Há uma via alternativa para afastar a transparência que não exige ceder capital.** Fazer com que 25% ou mais dos rendimentos provenham de atividades não previstas na lista — designadamente cedência de espaço — falha o teste de rendimentos do art. 6.º n.º 4 al. b) ii) CIRC. Liga o ponto 4 da ata (modelo de colaboração) ao ponto 6 (composição societária), que até aqui foram tratados como independentes. N1, secção 5.

**3. A Segurança Social, ausente da ata, é provavelmente o maior diferencial entre as vias.** No simplificado a base de incidência é uma percentagem da faturação bruta; com contabilidade organizada é o lucro tributável; em sociedade incide apenas sobre a remuneração de gerência. O efeito excede com frequência o diferencial de IRS.

**4. A via alternativa do ponto 2 é mais exigente do que aparentava.** Depois de a modelar: falhar o teste dos 75% obriga a que a cedência de espaço renda **um terço da faturação profissional**. Com os valores de trabalho, a cedência de sala a 30% da faturação dos colaboradores dá 87,8% de rendimentos profissionais e **não** afasta a transparência. A via existe, mas só com renda substancial — está quantificada na linha `REC_SALA_MIN` do M1 e registada como R1-32.

---

## Para quem é este trabalho

A Dra. Júlia tem zero experiência empresarial e está a montar a primeira estrutura da vida dela: arrendamento plurianual, obras, equipamento e integração de outras pessoas. Se a matemática não funcionar, a consequência não é um relatório desatualizado — é dívida pessoal.

Isto não muda o motor de cálculo. Muda o dever de cuidado da entrega, e está registado como R1-39:

- toda a conclusão acaba em unidades que ela controla — **doentes por dia**, euros por mês — e nunca só em faturação anual ou percentagens;
- o **cenário de baixa** apresenta-se em dinheiro, não só a recomendação;
- os **pontos de não retorno** dizem-se antes de ela assinar seja o que for.

O risco maior deste projeto não é escolher a estrutura fiscal errada. É ela comprometer-se com uma estrutura de custos que a procura não sustenta, e só perceber isso depois das obras.

---

## O que pode correr mal, e quanto custa

| Risco | Ordem de grandeza |
|---|---|
| Requalificação dos fisioterapeutas como trabalhadores | **77.065 €** — 2,4 anos de resultado líquido |
| Terceiro gabinete que não enche | **3.524 €/ano** líquidos, mais 23.370 € de investimento adicional |
| IVA irrecuperável no investimento | **10.810 €**, custo definitivo |
| Ficar no regime simplificado com esta estrutura de custos | Taxa de esforço de ~79% sobre a caixa gerada |
| **Abrir sem fundo de maneio suficiente** | Precisa de **67.306 €** antes de abrir; a tesouraria só recupera no ano 3 |

Ordens de grandeza sobre placeholders, para calibrar prioridades — não valores do caso.

---

## Rentabilidade não é solvência

O modelo mostrava que o negócio é rentável. Nunca mostrava se ela sobrevive ao mês 4. A folha `Tesouraria` responde à pergunta que vem antes de todas as outras:

| | |
|---|---|
| **Dinheiro necessário antes de abrir** | **67.306 €** |
| — investimento e caução | 61.410 € |
| — cobertura do défice operacional | 921 € |
| — margem de segurança | 4.975 € |
| Saldo acumulado ao fim do ano 1 | ainda negativo, −38.913 € |
| Ano em que a caixa recupera o investimento | Ano 3 |

Três rubricas que não estavam em lado nenhum: a **caução do arrendamento**, o **desfasamento entre faturar e receber**, e a armadilha dos **pagamentos por conta de IRS no ano 1** — calculados sobre o rendimento do ano anterior, no regime antigo, e a vencer no pior momento da tesouraria.

Se a cliente não tiver este dinheiro ou não o conseguir financiar, a discussão sobre ENI ou sociedade é prematura.

---

## A camada operacional, e o que ela muda

O modelo deixou de receber a faturação como palpite. A folha `Operacao` deriva-a de gabinetes, dias, duração da consulta e preço — e devolve a **taxa de utilização**, que diz se a projeção cabe fisicamente no espaço. Uma projeção acima de 100% é impossível, não é otimista.

Isto muda três coisas:

1. **O que pedimos à cliente.** O pedido passou a pedir drivers operacionais em vez de uma projeção de faturação. As pessoas estimam mal receita e estimam bem quantos doentes veem por dia. Como o pedido ainda não foi enviado, não se perdeu nada.
2. **A questão dos 2 vs. 3 gabinetes deixa de ser sobre renda.** A folha `Espaco` compara as duas opções **a procura constante** — comparar à mesma taxa de utilização daria automaticamente mais 50% de consultas à opção maior, e foi um erro que teve de ser corrigido durante a construção. Com a correção, abaixo da capacidade de dois gabinetes a opção maior perde exatamente o custo fixo adicional; acima, recupera-o.
3. **Três break-even distintos, que nunca se misturam.** O fiscal (`PontoViragem`), o operacional (`BreakEven`) e o rendimento-alvo da fundadora. A mesma palavra designa os três e é uma confusão à espera de acontecer numa reunião.

A folha `Alertas` fecha o circuito: enquanto houver um alerta bloqueante ativo, o semáforo global diz que nenhum número é citável. Neste momento estão cinco ativos.

---

## Próximos passos, por ordem

1. **Pedir hoje o código de atividade do cônjuge**, isoladamente, sem esperar pelo pacote completo de inputs. Desbloqueia o capítulo mais incerto do relatório.
2. **Fiscalidade confirma a folha `Parametros`** do M1 para 2026 e fecha os pendentes N1-01 a N1-06.
3. **Rui revê e envia a minuta** de pedido de inputs, e regista a data de início da contagem dos 60 dias.
4. Chegando os inputs: substituir os placeholders, assinar a folha `Validacao`, correr os cenários de E2.6 e E2.7.
5. Redigir os capítulos 3 a 5, depois 6 e 7, e por fim o capítulo 1.

---

## Notas técnicas

O M1 é gerado por script para ser reprodutível e auditável:

```bash
pip install openpyxl
python3 01-modelo/build_m1.py
```

Alterações **estruturais** fazem-se no script e regenera-se o ficheiro. Alterações de **valores** fazem-se nas células amarelas do Excel — e nesse caso o ficheiro passa a divergir do script, o que é aceitável enquanto durar o projeto.

A folha `Validacao` confronta os resultados do Excel com um recálculo independente, escrito em Python a partir das mesmas normas sem reutilizar nenhuma fórmula do modelo. Valida a aritmética, não a leitura normativa — duas implementações da mesma leitura errada concordam perfeitamente. A validação normativa assina-se na folha.

A conversão do M1 em ferramenta reutilizável (simulador ENI vs. sociedade para clínicas) é projeto separado e não deve atrasar a entrega à Gerir Saúde. Este script é a semente natural desse trabalho.
