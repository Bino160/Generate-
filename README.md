# Simulador de Impacto da Reclassificação da Transparência Fiscal

Quantifica o impacto financeiro decorrente da reclassificação de uma sociedade para o regime de transparência fiscal.

Este simulador **assume que a elegibilidade para o artigo 6.º do CIRC já foi previamente determinada**. O objetivo não é determinar se existe transparência fiscal. O objetivo é quantificar o custo financeiro associado a um enquadramento incorreto.

> **Pergunta única a que a ferramenta responde:**
> «Quanto me custará se a Autoridade Tributária concluir que a minha sociedade foi incorretamente enquadrada?»

---

## Utilizador-alvo

Médicos, dentistas, psicólogos, advogados, arquitetos, engenheiros e consultores — e os contabilistas certificados e advogados fiscalistas que os assessoram.

---

## Como usar

A aplicação é estática: HTML, CSS e JavaScript sem dependências, sem instalação e sem servidor.

```bash
# opção 1 — abrir diretamente
xdg-open index.html      # macOS: open index.html

# opção 2 — servidor local (recomendado)
npm run dev              # http://localhost:8080

# testes do motor de cálculo
npm test
```

Os dados — incluindo nomes e rendimentos dos sócios — são guardados no `localStorage` do navegador até serem apagados, para não se perder o trabalho entre sessões. **Nada é enviado para servidores.** Num computador partilhado, use **Apagar dados** no fim de cada cliente. Os botões `Guardar JSON` e `Abrir JSON` permitem arquivar e retomar simulações; `Carregar exemplo` preenche um caso realista para explorar a ferramenta.

---

## Arquitetura funcional

### Módulo 0 · Exercícios

Um enquadramento incorreto instala-se ao longo de anos, e **cada exercício tem o seu próprio prazo de caducidade, o seu próprio período de juros e pode ter sinal próprio** — há anos em que regularizar custa e anos em que compensa. A simulação abrange por isso vários exercícios: acrescentar um ano copia os sócios do anterior, e o resultado abre com o consolidado.

Uma simulação nova abre no **exercício mais antigo ainda dentro do prazo** — é o que decide e o que expira primeiro — e um botão cria de uma vez todos os anos em aberto, calculados a partir da data de referência (em agosto de 2026: 2022 a 2025).

O total soma apenas os exercícios **dentro do prazo**; os já caducados aparecem assinalados e fora da conta. A ordem de tratamento é dada pelo prazo e não pelo montante, porque um exercício que caduca perde-se independentemente do valor que representa.

### Módulo 1 · Dados da sociedade

**Caminho principal:** exercício, matéria coletável, IRC liquidado, derramas e tributações autónomas — os cinco valores que determinam a exposição.

**Dados avançados:** resultado contabilístico e correções fiscais (servem para reconciliar), pagamentos por conta e retenções (não alteram a exposição, apenas o saldo já pago), desdobramento da derrama estadual.

O ecrã valida automaticamente a coerência entre `resultado contabilístico + correções fiscais` e a matéria coletável introduzida, e apura a taxa efetiva de IRC.

### Módulo 2 · Dados dos sócios

Número de sócios, percentagem de participação, rendimentos da categoria A, rendimentos da categoria B, outros rendimentos, tributação conjunta ou separada, número de dependentes.

Campos adicionais: rendimento coletável do cônjuge (na tributação conjunta), opção para não aplicar o coeficiente à categoria B, e IRS já suportado sobre lucros distribuídos — creditado no IRS adicional para não duplicar imposto já pago.

A soma das participações é verificada em tempo real: se não totalizar 100%, a simulação assinala erro, porque a imputação ficaria sub ou sobreavaliada.

### Módulo 3 · Motor de cálculo

| Componente | O que faz |
|---|---|
| **Cenário atual** | Apura o imposto efetivamente pago: IRC, derramas, tributações autónomas, saldo após pagamentos por conta e retenções; e o IRS dos sócios sem imputação. |
| **Cenário corrigido** | Imputa a matéria coletável a cada sócio na proporção da participação, engloba-a como rendimento líquido da categoria B e reliquida o IRS. A sociedade fica apenas com as tributações autónomas. |
| **Juros de mora** | Artigo 44.º da LGT: correm a partir do fim do prazo de pagamento voluntário, à taxa das dívidas ao Estado, com o limite de três anos — oito, com pagamento em prestações. Por omissão assume-se pagamento dentro do prazo. |
| **Juros compensatórios** | Regra selecionável em função da **origem da correção**, e não uma fórmula única: omissão não evidenciada, regularização voluntária, erro evidenciado na declaração (máx. 180 dias) ou falta apurada em inspeção (até 90 dias após a conclusão). Artigo 35.º, n.º 7 da LGT. |
| **Coimas** | Três **cenários de simulação** — baixo, de referência e alto — cada um com o fundamento legal explícito. Nenhum é apresentado como previsão da coima que a AT venha a aplicar. |
| **Confiança** | Índice de confiança calculado a partir do estado dos inputs, apresentado no resultado e no relatório. |

### Módulo 4 · Recuperação do IRC

Três cenários: reembolso integral, parcial (percentagem configurável) e inexistente. A base recuperável é a coleta de IRC, as derramas e as retenções na fonte efetivamente suportadas; as tributações autónomas mantêm-se devidas pela sociedade transparente (artigo 12.º do CIRC) e por isso não integram a base, salvo se o utilizador o determinar.

### Módulo 4.5 · Custo de esperar

Projeção da exposição a +1, +2 e +3 anos, decomposta nos dois efeitos que o adiamento produz: os juros que continuam a correr e os exercícios que saem do prazo de caducidade. Quando a exposição desce com o tempo, a aplicação diz porquê — e lembra que o prazo se suspende com a ação de inspeção e que o IRC dos anos caducados se perde definitivamente.

### Módulo 4.6 · Leitura de gestão

Opcional. Com o EBITDA anual, o volume de negócios ou a tesouraria disponível, a exposição é traduzida em meses de EBITDA, fatia do volume de negócios e pressão sobre a tesouraria — graduada de contido a excede a tesouraria. São critérios de gestão, sem base fiscal, e a aplicação diz isso: dimensionam o impacto, não o qualificam.

### Módulo 5 · Dashboard

Um painel de **confiança da simulação** abre o resultado, antes de qualquer número: índice, grau e a lista do que está validado, do que é hipótese e do que falta. Depois, cinco indicadores em cartões financeiros — IRS adicional, juros compensatórios, coimas, IRC potencialmente recuperável e exposição fiscal líquida — acompanhados de:

- **Comparador** entre a situação atual e a situação corrigida, com variação por linha.
- **Impacto por sócio**, com imputação, IRS antes e depois, e deslocação da taxa marginal.
- **Cronologia fiscal**: fecho do exercício, prazos declarativos, início dos juros, data de referência, limite da revisão a favor do contribuinte e caducidade do direito à liquidação.
- **Matriz de exposição líquida**: 3 cenários de coima × 3 cenários de recuperação do IRC, com o melhor e o pior caso destacados.
- **Memória de cálculo** integral, passo a passo.

---

## Experiência do utilizador

| Ecrã | Conteúdo |
|---|---|
| 1 | Dados da sociedade |
| 2 | Dados dos sócios |
| 3 | Parâmetros da simulação |
| 4 | Resultado |

Qualquer alteração no ecrã 3 recalcula imediatamente o ecrã 4. A navegação entre ecrãs é livre.

---

## Exportação

**Relatório PDF** (via impressão do navegador, com folha de estilo A4 dedicada), com cinco secções:

1. Resumo executivo — a exposição líquida em destaque e a sua decomposição.
2. Fundamentação jurídica — artigos 6.º, 12.º do CIRC; 20.º, 31.º, 68.º e 68.º-A do CIRS; 35.º, 45.º e 78.º da LGT; 114.º, 119.º, 29.º e 30.º do RGIT.
3. Simulação financeira — comparador, impacto por sócio, juros, coimas, recuperação do IRC, matriz de sensibilidade e cronologia.
4. Recomendações — dependentes dos valores apurados e dos prazos ainda em curso.
5. Plano de regularização — seis fases com prazos indicativos e montantes concretos.

**Exportação de dados** em JSON, com os inputs e o resultado completo da simulação, para arquivo ou integração.

---

## Parametrização

Tudo o que tem base legal está no ecrã 3 e em `assets/js/parametros.js`, com a fonte identificada:

- **Escalões de IRS** por exercício (2023, 2024, 2025 e 2026), editáveis linha a linha — limite superior e taxa — com reposição da tabela oficial num clique. Um exercício sem tabela própria usa a mais próxima e avisa. A tabela de 2026 está marcada como **provisória** e deve ser confirmada antes de emitir qualquer relatório.
- **Taxa adicional de solidariedade**, juros compensatórios (taxa, base de dias, teto opcional de 180 dias, prazo da Modelo 3), coimas (percentagens mínima e máxima, redução por regularização voluntária, pisos e tetos, coima declarativa por sócio), IRS (dedução específica da categoria A, coeficiente da categoria B, dedução por dependente, quociente conjugal, limite global de deduções) e recuperação do IRC.

A metodologia detalhada, com fórmulas e base legal de cada parcela, está em [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md).

---

## Estrutura do projeto

```
index.html                 4 ecrãs e dashboard
assets/css/app.css         folha de estilo única, com modo escuro
assets/js/parametros.js    tabelas fiscais parametrizáveis e respetivas fontes
assets/js/motor.js         motor de cálculo puro (browser + Node, sem dependências)
assets/js/formato.js       formatação pt-PT de moeda, percentagens e datas
assets/js/estado.js        estado, persistência local e importação/exportação
assets/js/relatorio.js     geração do relatório imprimível
assets/js/ui.js            formulários gerados por esquema e render do dashboard
tests/motor.test.js        17 testes do motor (node --test)
docs/METODOLOGIA.md        fórmulas, pressupostos e base legal
```

O motor é independente da interface e pode ser usado isoladamente:

```js
const Motor = require('./assets/js/motor.js');
const r = Motor.simular({ sociedade: {...}, socios: [...], parametros: {...} });
console.log(r.indicadores.exposicaoLiquida);
```

---

## O que esta ferramenta é — e o que não é

**É** uma estimativa de **impacto marginal**: a diferença de imposto entre dois cenários, antes das restantes deduções à coleta. **Não é** um simulador de Modelo 3 nem uma liquidação, e o produto diz isso em todos os ecrãs onde apresenta um número.

Três decisões deliberadas contra a ilusão de precisão:

1. **Nenhum cenário é apresentado como provável.** As coimas são cenários baixo / de referência / alto; a recuperação do IRC é 100% / 50% / 0%. A percentagem intermédia é uma hipótese do utilizador, sem significado jurídico. Há um teste automático que falha se a palavra «provável» reaparecer nos cenários de coima.
2. **Nada que dependa de uma via processual é dado como adquirido.** O artigo 78.º da LGT prevê vias e prazos distintos consoante o fundamento; o IRC é «potencialmente recuperável, sujeito à validação da via aplicável». Cada evento da cronologia declara a regra que o suporta e assinala-se como aproximado quando o é.
3. **O resultado traz sempre o seu grau de confiança** e a versão das regras fiscais usadas. O índice nunca chega a 100%, porque o cenário de recuperação é sempre uma hipótese.

## Limitações conhecidas

- Regime simplificado da categoria B modelado por coeficiente único, sem a majoração do artigo 31.º, n.º 13 do CIRS nem despesas do regime de contabilidade organizada.
- Deduções à coleta: modela-se a dedução por dependente e aceita-se o valor real das restantes por sócio, mas não são calculadas nem limitadas por escalão. Sem esse valor, o IRS de ambos os cenários fica sobreavaliado e a aplicação assinala-o.
- Tributação conjunta modelada por quociente conjugal (divisor 2, artigo 69.º do CIRS), com o rendimento coletável do cônjuge introduzido diretamente.
- Juros calculados sobre o IRS adicional agregado. Num produto profissional seriam calculados por sujeito passivo, com datas próprias.
- O IRS suportado sobre lucros distribuídos é assinalado mas **não** compensado: exige tratamento jurídico próprio.
- Prazos de caducidade sem modelação das causas de suspensão e interrupção do artigo 46.º da LGT.
- Prazos de caducidade sem modelação das causas de suspensão e interrupção; os exercícios são independentes entre si, sem modelação de prejuízos que transitem de um ano para o outro.

---

## Roadmap

| Versão | Âmbito |
|---|---|
| **MVP** ✅ | Introdução manual dos dados, multi-exercício, custo de esperar, simulação e relatório. |
| **v2** | juros por sujeito passivo; importação do ficheiro SAF-T. |
| **v3** | Integração com software de contabilidade. |
| **v4** | Benchmark setorial. |

---

## Aviso

Ferramenta de apoio à decisão. Os valores apresentados são estimativas construídas sobre parâmetros configuráveis e sobre os dados introduzidos pelo utilizador. Não constituem liquidação de imposto nem substituem parecer jurídico-fiscal. Confirme sempre as taxas em vigor no exercício em análise antes de emitir um relatório.
