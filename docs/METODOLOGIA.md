# Metodologia de cálculo

Documento de referência do motor (`assets/js/motor.js`). Descreve o que é calculado, como e com que base legal. Todos os parâmetros citados são editáveis no ecrã 3 da aplicação.

**Pressuposto fundamental:** a elegibilidade para o regime de transparência fiscal do artigo 6.º do CIRC é dada como previamente determinada. O motor não a avalia.

**O que este motor é:** uma estimativa de **impacto marginal** — a diferença de imposto entre dois cenários, antes das restantes deduções à coleta. Não é um simulador de Modelo 3 nem uma liquidação. Cada simulação declara o seu **grau de confiança** e a **versão das regras fiscais** aplicadas.

---

## 1. Cenário atual

Situação declarada: a sociedade foi tributada em IRC.

```
Imposto da sociedade = IRC liquidado + derrama municipal + derrama estadual + tributações autónomas
Saldo apurado        = Imposto da sociedade − pagamentos por conta − retenções
```

Em paralelo, liquida-se o IRS de cada sócio **sem** qualquer imputação, a partir dos rendimentos declarados. Este é o termo de comparação.

---

## 2. Cenário corrigido

### 2.1 Imputação

```
Imputação(sócio) = matéria coletável × participação(sócio)
```

Artigo 6.º do CIRC: a matéria coletável é imputada aos sócios ainda que não haja distribuição de lucros. Artigo 20.º do CIRS: integra-se como **rendimento líquido da categoria B**, sem aplicação de coeficiente — já é matéria coletável.

### 2.2 Rendimento coletável do sócio

```
Categoria A líquida = máx(0, rendimentos A − dedução específica)        [4 104 € por omissão]
Categoria B líquida = rendimentos B × coeficiente                       [0,75 por omissão, art. 31.º do CIRS]
Rendimento coletável = cat. A líquida + cat. B líquida + outros rendimentos
                     + rendimento do cônjuge (se conjunta) + imputação
```

### 2.3 Liquidação do IRS

Coleta calculada por **fatias marginais** sobre a tabela do artigo 68.º do CIRS do exercício — resultado idêntico ao método oficial de taxa média e taxa normal.

Na tributação conjunta aplica-se o quociente conjugal (artigo 69.º do CIRS): o rendimento coletável é dividido por 2, a coleta é apurada sobre esse valor e multiplicada por 2. O mesmo tratamento é dado à taxa adicional de solidariedade do artigo 68.º-A do CIRS (2,5% entre 80 000 € e 250 000 €; 5% acima).

```
Coleta total = coleta das taxas gerais + taxa adicional de solidariedade
IRS          = máx(0, coleta total − deduções à coleta)
Deduções     = dependentes × dedução por dependente + outras deduções introduzidas
```

O artigo 69.º do CIRS tem por epígrafe «quociente familiar», mas o divisor é 2 e não integra dependentes nem ascendentes: o mecanismo em vigor é o quociente conjugal. O quociente familiar propriamente dito, que dividia também pelos dependentes, foi eliminado em 2018.

**Deduções à coleta.** O motor modela a dedução por dependente e aceita, por sócio, o valor real das restantes deduções (saúde, educação, habitação, despesas gerais familiares) retirado da Modelo 3. Não as calcula nem lhes aplica limites por escalão. Se esse campo ficar a zero, o IRS de **ambos** os cenários fica sobreavaliado e a aplicação assinala-o: o resultado é impacto marginal, não IRS.

### 2.4 Sociedade no cenário corrigido

Artigo 12.º do CIRC: a sociedade transparente não é tributada em IRC, **salvo quanto às tributações autónomas**, que se mantêm devidas e por isso permanecem no cenário corrigido.

---

## 3. IRS adicional estimado

```
IRS adicional estimado = máx(0, Σ IRS corrigido − Σ IRS atual)
```

**Lucros distribuídos.** O IRS suportado sobre dividendos **não** é abatido. A transparência fiscal implica imputação independentemente da distribuição (artigo 6.º do CIRC, artigo 20.º do CIRS), e o tratamento dos montantes já distribuídos depende da sua natureza e qualificação jurídica. O valor introduzido é assinalado no relatório como matéria a tratar autonomamente, fora do cálculo.

---

## 4. Juros compensatórios

Artigo 35.º da LGT: devidos quando, por facto imputável ao sujeito passivo, for retardada a liquidação de parte do imposto.

```
Juros = IRS adicional × taxa anual × (dias / base de dias)
```

- **Taxa anual:** 4% (taxa dos juros legais, Portaria n.º 291/2003). Parametrizável.
- **Início:** termo do prazo de entrega da Modelo 3 do ano seguinte ao exercício (30 de junho por omissão). Pode ser substituído por uma data explícita.

**O período não é uma fórmula única.** O artigo 35.º, n.º 7 da LGT manda contar os juros dia a dia até ao suprimento, correção ou deteção da falta, mas são devidos apenas por **180 dias** no caso de erro do sujeito passivo evidenciado na declaração e, em caso de falta apurada em ação de fiscalização, até **90 dias** após a sua conclusão. O motor implementa isto como regra selecionável, não como parâmetro escondido:

| Origem da correção | Período aplicado |
|---|---|
| Omissão não evidenciada na declaração *(omissão por omissão)* | Dia a dia até à data de referência. É o caso típico da transparência fiscal não declarada: a matéria coletável está na sociedade, não na Modelo 3 do sócio. |
| Regularização voluntária pelo sujeito passivo | Dia a dia até à data da substituição. |
| Erro evidenciado na própria declaração | Máximo de 180 dias. |
| Falta apurada em ação de fiscalização | Até 90 dias após a conclusão da ação. Exige a data de conclusão; sem ela a aplicação avisa que o valor está sobreavaliado. |

O campo «limite de dias» dos parâmetros continua a existir e sobrepõe-se ao regime, para casos que o utilizador queira forçar.

---

## 4-B. Juros de mora

Coisa distinta dos compensatórios: estes correm **até** à liquidação, os de mora correm **a partir** dela, quando o imposto liquidado não é pago no prazo de pagamento voluntário (artigo 44.º da LGT).

```
Mora = IRS adicional × taxa anual × (meses contados / 12)
```

- **Taxa:** 7,221% para 2026 (Aviso n.º 18/2026/2, de 2 de janeiro). É revista anualmente — confirme a do ano em causa.
- **Limite:** três anos de contagem (artigo 44.º, n.º 2 da LGT), ou oito quando a dívida é paga em prestações. O limite é aplicado e assinalado.
- **Por omissão não há mora:** assume-se pagamento dentro do prazo. Só entra quando o utilizador declara um atraso — presumir que o cliente paga tarde seria inventar um cenário.

## 5. Coimas

Artigo 114.º, n.º 2 do RGIT — falta de entrega da prestação tributária a título de negligência: coima de 15% a 50% do imposto em falta. Artigo 26.º do RGIT — tetos. Artigo 119.º do RGIT — declarações inexatas ou omitidas.

```
Mínimo legal = máx(IRS adicional × 15%, piso)                  [piso: 375 €]
Máximo legal = mín(máx(IRS adicional × 50%, piso), teto)       [teto negligência: 22 500 €]
```

| Cenário | Fórmula | Fundamento |
|---|---|---|
| **Baixo** | mínimo legal × 12,5% | Artigo 29.º, n.º 1, alínea a) do RGIT — regularização voluntária antes de qualquer procedimento inspetivo. |
| **Referência** | mínimo legal × fator de referência (1,0) | Artigo 114.º, n.º 2 do RGIT — ancoragem no limite mínimo legal. |
| **Alto** | máximo legal + coimas declarativas | Artigos 114.º, n.º 2 e 119.º do RGIT, com o teto do artigo 26.º. |

**Nenhum destes cenários é uma previsão.** A graduação concreta da coima depende de valoração casuística da culpa, do benefício obtido e da situação económica do agente (artigo 27.º do RGIT). Por isso a aplicação não usa a palavra «provável» em nenhum ponto: são cenários de simulação, e o motor tem um teste automático que o garante.

**Coima declarativa por sócio.** Não é assumida automaticamente. Uma coima por declaração inexata pressupõe que a infração é imputável a cada sujeito passivo, o que tem de ser determinado caso a caso; por omissão conta uma declaração, e multiplicar por sócio é uma escolha explícita do utilizador.

---

## 6. Recuperação do IRC

```
Base recuperável = IRC liquidado + derramas + retenções na fonte   [tributações autónomas excluídas]
Integral     = base × 100%
Parcial      = base × percentagem configurável       [50% por omissão]
Inexistente  = 0
```

**Retenções na fonte suportadas pela sociedade.** Numa sociedade transparente não há coleta de IRC contra a qual as deduzir: ou são imputadas aos sócios, ou são restituídas à sociedade. Em qualquer das vias o montante não se perde, pelo que integra a base recuperável por omissão — com a via concreta a determinar caso a caso. Pode ser desligado nos parâmetros.

Os cenários são apresentados como percentagens — «Recuperação 100% / 50% / 0%» — e não como «reembolso integral / parcial / inexistente»: a percentagem intermédia é uma hipótese de trabalho do utilizador e não tem significado jurídico.

O artigo 78.º da LGT **não é um prazo único de quatro anos**. Prevê vias e fundamentos distintos — iniciativa do sujeito passivo, erro imputável aos serviços, injustiça grave ou notória, duplicação de coleta — com condições próprias, a que acresce a reclamação graciosa do artigo 70.º do CPPT (120 dias). O montante é por isso **potencialmente recuperável, sujeito à validação da via processual aplicável e dos respetivos prazos**.

---

## 7. Exposição fiscal líquida

```
Exposição bruta   = IRS adicional + juros compensatórios + juros de mora + coima
Exposição líquida = exposição bruta − IRC recuperado
```

A **matriz de sensibilidade** cruza os três cenários de coima com os três cenários de recuperação do IRC, produzindo nove valores de exposição líquida — do melhor caso (coima mínima com reembolso integral) ao pior (coima máxima sem reembolso).

---

## 8. Prazos e cronologia

Cada evento da cronologia declara a **regra aplicável**, e os que resultam de estimativa são marcados como aproximados.

| Marco | Base legal | Cálculo |
|---|---|---|
| Prazo da Modelo 22 | Artigo 120.º do CIRC | 31 de maio do ano seguinte |
| Prazo da Modelo 3 | Artigo 60.º do CIRS | 30 de junho do ano seguinte |
| Liquidação e pagamento do IRC | Factos | Datas introduzidas pelo utilizador (opcionais) |
| Conclusão da ação de fiscalização | Artigo 35.º, n.º 7 da LGT | Data introduzida; fixa o fim da contagem de juros |
| Fim da contagem de juros | Artigo 35.º, n.º 7 da LGT | Depende do regime escolhido |
| Prazo **potencial** de revisão | Artigo 78.º da LGT | 4 anos a contar da liquidação quando esta é conhecida; caso contrário, estimativa a partir do fim do ano seguinte ao exercício |
| Prazo **potencial** de caducidade | Artigo 45.º, n.os 1 e 4 da LGT | 4 anos contados do **termo do ano do facto tributário** — para o exercício de 2022 corre de 01/01/2023 a 31/12/2026. Sem modelação das causas de suspensão e interrupção do artigo 46.º |

---

## 9. Consolidação de vários exercícios

`Motor.consolidar(dados)` corre a simulação para cada exercício e agrega:

```
Total consolidado = Σ exposição líquida dos exercícios DENTRO do prazo de caducidade
```

- Exercícios já caducados à data de referência são assinalados e **excluídos do total** (o valor com todos fica disponível em `totais.exposicaoTodos`).
- A **ordem de tratamento** é dada pelo prazo, não pelo montante: um exercício que caduca perde-se independentemente do valor que representa.
- Um prazo a terminar dentro de **183 dias** gera erro.
- Quando há anos favoráveis e desfavoráveis, a aplicação avisa que **regularizar só os favoráveis não é uma opção autónoma**: expor o enquadramento traz consigo os exercícios desfavoráveis ainda abertos.
- A confiança consolidada é a **mínima** dos exercícios, não a média: a simulação vale o que vale o seu ano mais fraco.

Os exercícios são independentes entre si. Não é modelada a transmissão de prejuízos nem qualquer interação entre anos.

## 10. Custo de esperar

`Motor.projetarEspera(dados)` recalcula a consolidação com a data de referência deslocada 1, 2 e 3 anos. Não é uma extrapolação: é a mesma simulação noutra data, pelo que apanha os dois efeitos de sinal contrário que o adiamento produz.

```
variação = juros acrescidos nos exercícios que continuam abertos
         − exposição dos exercícios que saíram do prazo de caducidade
```

A decomposição é apresentada sempre. Mostrar apenas o saldo diria que esperar compensa, quando o que se passa é que há exercícios a sair do alcance da Autoridade Tributária — com três ressalvas que a aplicação declara:

- O prazo **suspende-se com a ação de inspeção** (artigo 46.º da LGT). Se a AT atuar antes do termo, a exposição mantém-se e os juros continuam a correr.
- O **IRC desses exercícios deixa de ser recuperável**, e a perda é definitiva. O montante é apresentado.
- Quando nenhum exercício caduca no horizonte, a projeção é puramente de juros e mostra o custo médio mensal do adiamento.

## 11. Confiança da simulação

Cada simulação produz um índice de confiança a partir do estado dos inputs, apresentado no ecrã de resultado e no relatório. Sete verificações, ponderadas (`ok` = 1, `aviso` = 0,5, `em falta` = 0):

1. Participações somam 100%.
2. Matéria coletável reconcilia com o resultado e as correções.
3. Tabela de IRS confirmada para o exercício.
4. Deduções à coleta reais introduzidas.
5. Regime de juros escolhido explicitamente (e com data de conclusão, no regime de fiscalização).
6. Cenário de recuperação do IRC — assinalado sempre como hipótese.
7. Data de liquidação do IRC introduzida, para ancorar os prazos.

O índice nunca chega a 100%: o cenário de recuperação é, por natureza, uma hipótese. É deliberado — a ferramenta não deve poder apresentar-se como certa.

## 12. Versão das regras fiscais

O conjunto de parâmetros tem versão e data (`Parametros.VERSAO`), apresentadas no rodapé da aplicação e no relatório. Um relatório emitido hoje tem de poder ser lido daqui a dois anos com a indicação de que regras usou.

## 13. Validações automáticas

- Soma das participações diferente de 100% → **erro** (imputação sub ou sobreavaliada).
- `resultado contabilístico + correções ≠ matéria coletável` → **aviso** com a diferença quantificada (justificável por prejuízos fiscais reportados ou benefícios).
- Matéria coletável nula ou negativa → **aviso**: não há imputação a tributar.
- Tabela de IRS provisória ou substituída por outro ano → **aviso** com identificação da tabela aplicada.
- Data de referência para lá do prazo do artigo 78.º da LGT → **erro** sobre a recuperabilidade do IRC.
- Data de referência para lá da caducidade do artigo 45.º da LGT → **informação** sobre a exigibilidade do IRS adicional.

---

## 14. Testes

`tests/motor.test.js` (54 testes) cobre a coleta progressiva contra valores calculados à mão, a taxa de solidariedade por faixas, o quociente conjugal, o piso zero do imposto, a imputação integral da matéria coletável, **os quatro regimes de juros e os respetivos limites**, a ordenação dos cenários de coima e a **ausência da palavra «provável»**, a não multiplicação automática da coima declarativa, a base de recuperação do IRC e os seus rótulos, a matriz de sensibilidade, a **não compensação** dos lucros distribuídos, o efeito das deduções à coleta reais, o **índice de confiança**, a **regra aplicável em cada evento da cronologia**, a ancoragem dos prazos na data de liquidação, a versão das regras, a sobreposição de parâmetros do utilizador, a substituição de tabelas em falta e as validações.

```bash
npm test
```
