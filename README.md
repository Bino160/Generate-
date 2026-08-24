# Projeto Dra. Júlia Best — trabalho interno

**Cliente faturável:** Gerir Saúde · **Cliente final:** Dra. Júlia Best (NIF 272180610), fisioterapeuta, ENI em regime simplificado
**Origem:** ata de reunião de 18/08/2026 (MOD COO 007/1), primeira e única interação com a cliente até à data
**Fase:** produção dos entregáveis internos que sustentam E1, E2 e E3

---

## Estado

| Peça | Ficheiro | Estado |
|---|---|---|
| M1, modelo comparativo das 4 vias | `01-modelo/M1_modelo_comparativo.xlsx` | 18 folhas. Três cenários mais teste de esforço. 32 verificações independentes. A correr com placeholders |
| M1, gerador | `01-modelo/build_m1.py` | Reproduz o ficheiro do zero |
| N1, nota técnica de composição societária | `02-nota-tecnica/N1_composicao_societaria.md` | Completa. 6 pendentes de Fiscalidade |
| P1, plano de implementação | `03-plano/P1_plano_implementacao.md` | Completo |
| R1, registo de pressupostos e riscos | `04-riscos/R1_registo_pressupostos_riscos.md` | Aberto e em manutenção |
| Pedido de inputs à cliente | `00-inputs/pedido_inputs_cliente.md` | Minuta, não enviada |
| E1, estrutura do relatório | `05-relatorio/E1_relatorio_estrutura.md` | Cap. 2 redigido, cap. 5 com a regra de decisão fechada, restantes em esqueleto |
| E3, estrutura do deck e guião | `06-reuniao/E3_estrutura_deck.md` | 14 slides e guião de 90 min |
| Documento de enquadramento para a cliente | `09-cliente/antes_de_assinar.html` | Minuta, não enviada |
| Simulador interativo | `10-simulador/` | Motor JS validado contra o Excel em 22 grandezas |
| D1 a D3, decisões | `07-decisoes/` | Avaliação das três análises recebidas |
| A1 e A2, auditorias | `08-auditoria/` | Nota atual do M1: 16 em 20 |

Nada disto sai para a cliente. Os entregáveis são o relatório E1, o anexo E2 e a reunião E3. A entrega do ficheiro do modelo está expressamente fora de âmbito.

---

## O que bloqueia a entrega

Dois bloqueios, e nenhum deles é falta de trabalho nosso.

**Nenhum dos oito inputs da secção 4 do brief foi recebido.** A ata é de 18/08 e foi a primeira interação com a cliente. Os valores da folha `Inputs` são placeholders para testar o motor de cálculo, não estimativas do caso. Estão registados em R1, secção A.

**Os parâmetros normativos de 2026 não estão confirmados:** escalões de IRS, taxas de IRC, regras de Segurança Social. R1, secção C. Este bloqueio não depende da cliente e pode ser levantado esta semana.

---

## Quatro coisas que este trabalho acrescenta à ata

**A premissa em que assenta toda a hipótese do cônjuge nunca foi verificada.** O afastamento da transparência fiscal depende de a atividade de Personal Trainer não constar da tabela do art. 151.º CIRS. Se constar, por enquadramento como desportista ou pelo código residual, a entrada do cônjuge não produz o efeito pretendido, com qualquer percentagem de capital. É o maior risco isolado do projeto (R1-14) e resolve-se com um pedido de dois minutos à cliente.

**Há uma via alternativa para afastar a transparência que não exige ceder capital.** Fazer com que 25% ou mais dos rendimentos provenham de atividades não previstas na lista, designadamente cedência de espaço, falha o teste de rendimentos do art. 6.º n.º 4 al. b) ii) CIRC. Liga o ponto 4 da ata, o modelo de colaboração, ao ponto 6, a composição societária, que até aqui foram tratados como independentes. N1, secção 5.

**Essa via é mais exigente do que aparentava.** Depois de a modelar: falhar o teste dos 75% obriga a que a cedência renda um terço da faturação profissional. Com os valores de trabalho, cedência de sala a 30% da faturação dos colaboradores dá 87,8% de rendimentos profissionais e não afasta a transparência. Quantificada na linha `REC_SALA_MIN`, registada em R1-32.

**A Segurança Social, ausente da ata, é provavelmente o maior diferencial entre as vias.** No simplificado a base de incidência é uma percentagem da faturação bruta; com contabilidade organizada é o lucro tributável; em sociedade incide apenas sobre a remuneração de gerência. O efeito excede com frequência o diferencial de IRS.

---

## Para quem é este trabalho

A Dra. Júlia tem zero experiência empresarial e está a montar a primeira estrutura da vida dela: arrendamento plurianual, obras, equipamento e integração de outras pessoas. Se a matemática não funcionar, a consequência não é um relatório desatualizado. É dívida pessoal.

Isto não muda o motor de cálculo. Muda o dever de cuidado da entrega, e está registado como R1-39:

- toda a conclusão acaba em unidades que ela controla, doentes por dia e euros por mês, nunca só em faturação anual ou percentagens;
- o cenário de baixa apresenta-se em dinheiro, não só a recomendação;
- os pontos de não retorno dizem-se antes de ela assinar seja o que for.

O risco maior deste projeto não é escolher a estrutura fiscal errada. É ela comprometer-se com uma estrutura de custos que a procura não sustenta, e só perceber isso depois das obras.

---

## O que pode correr mal, e quanto custa

| Risco | Ordem de grandeza |
|---|---|
| Requalificação dos fisioterapeutas como trabalhadores | 77.065 €, ou 2,4 anos de resultado líquido |
| Abrir sem fundo de maneio suficiente | Precisa de **67.306 €** antes de abrir, e a tesouraria só recupera no ano 3 |
| Espaço grande com procura fraca (teste de esforço) | 102.525 €, mais do que qualquer dos três cenários |
| Terceiro gabinete que não enche | 3.524 €/ano líquidos, mais 23.370 € de investimento |
| IVA irrecuperável no investimento | 10.810 €, custo definitivo |
| Ficar no simplificado com esta estrutura de custos | Taxa de esforço de cerca de 79% sobre a caixa gerada |

Ordens de grandeza sobre placeholders, para calibrar prioridades. Não são valores do caso.

---

## Rentabilidade não é solvência

O modelo mostrava que o negócio é rentável. Nunca mostrava se ela sobrevive ao mês 4. A folha `Tesouraria` responde à pergunta que vem antes de todas as outras, e responde-a nos três cenários mais um teste de esforço:

| Cenário | Dinheiro necessário antes de abrir |
|---|---|
| Baixo | 43.073 € |
| Base | 67.306 € |
| Alto | 101.623 € |
| Teste de esforço: espaço do Alto, procura do Baixo | **102.525 €** |

O teste de esforço existe porque os três cenários movem investimento e receita ao mesmo tempo. O Baixo é uma clínica mais pequena, não uma clínica em dificuldade. O cenário que arruína quem abre pela primeira vez é comprometer-se com o espaço grande e a procura não aparecer, e nenhum dos três o representa.

Três rubricas que não estavam em lado nenhum: a caução do arrendamento, o desfasamento entre faturar e receber, e os pagamentos por conta de IRS do ano 1, calculados sobre o rendimento do ano anterior e a vencer no pior momento da tesouraria.

Se a cliente não tiver este dinheiro ou não o conseguir financiar, a discussão sobre ENI ou sociedade é prematura.

---

## A camada operacional

A faturação deixou de ser um palpite. A folha `Operacao` deriva-a de gabinetes, dias, duração da consulta e preço, e devolve a taxa de utilização, que diz se a projeção cabe fisicamente no espaço. Uma projeção acima de 100% é impossível, não é otimista.

Isto muda três coisas:

1. **O que pedimos à cliente.** O pedido passou a pedir drivers operacionais em vez de uma projeção de faturação. As pessoas estimam mal receita e estimam bem quantos doentes veem por dia. Como o pedido ainda não foi enviado, não se perdeu nada.
2. **A questão dos 2 vs. 3 gabinetes deixa de ser sobre renda.** A folha `Espaco` compara as duas opções a procura constante. Comparar à mesma taxa de utilização daria automaticamente mais 50% de consultas à opção maior, e foi um erro corrigido durante a construção. O terceiro gabinete só compensa acima de 104% da capacidade de dois, valor estável nos três cenários.
3. **Três break-even distintos, que nunca se misturam.** O fiscal (`PontoViragem`), o operacional (`BreakEven`) e o rendimento-alvo da fundadora. A mesma palavra designa os três e é uma confusão à espera de acontecer numa reunião.

A folha `Alertas` fecha o circuito: enquanto houver um alerta bloqueante ativo, o semáforo global diz que nenhum número é citável. Neste momento estão cinco ativos.

---

## Próximos passos, por ordem

1. **Pedir hoje o código de atividade do cônjuge**, isoladamente, sem esperar pelo pacote completo de inputs. Desbloqueia o capítulo mais incerto do relatório.
2. Fiscalidade confirma a folha `Parametros` para 2026 e fecha os pendentes N1-01 a N1-06.
3. Rui revê e envia a minuta de pedido de inputs, e regista a data de início da contagem dos 60 dias.
4. Chegando os inputs: substituir os placeholders, assinar a folha `Validacao`, correr os cenários de E2.6 e E2.7.
5. Redigir os capítulos 3 a 5, depois 6 e 7, e por fim o capítulo 1.
6. Abrir o M1 em Excel real e conferir. Nunca foi feito, e não é possível no ambiente onde foi construído.

---

## Notas técnicas

O M1 é gerado por script, para ser reprodutível e auditável:

```bash
pip install openpyxl
python3 01-modelo/build_m1.py
```

Alterações estruturais fazem-se no script e regenera-se o ficheiro. Alterações de valores fazem-se nas células amarelas do Excel, e nesse caso o ficheiro passa a divergir do script, o que é aceitável enquanto durar o projeto.

A folha `Validacao` confronta os resultados do Excel com um recálculo independente, escrito em Python a partir das mesmas normas sem reutilizar nenhuma fórmula do modelo. Valida a aritmética, não a leitura normativa: duas implementações da mesma leitura errada concordam perfeitamente. A validação normativa assina-se na folha.

O simulador em `10-simulador/` é uma terceira implementação, em JavaScript, com o seu próprio teste contra o Excel. Corre-se com `node 10-simulador/testa_motor.mjs` e não se publica se falhar.

A conversão do M1 em ferramenta reutilizável para clínicas é projeto separado e não deve atrasar a entrega à Gerir Saúde. Estes scripts são a semente desse trabalho.
