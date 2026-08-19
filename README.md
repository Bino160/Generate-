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

Os dados são guardados apenas no `localStorage` do navegador. **Nada é enviado para servidores.** Os botões `Guardar JSON` e `Abrir JSON` permitem arquivar e retomar simulações; `Carregar exemplo` preenche um caso realista para explorar a ferramenta.

---

## Arquitetura funcional

### Módulo 1 · Dados da sociedade

Exercício fiscal, resultado contabilístico, correções fiscais, matéria coletável, IRC liquidado, derrama municipal, derrama estadual, tributações autónomas, pagamentos por conta e retenções.

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
| **Juros compensatórios** | Cálculo dia a dia sobre o IRS adicional, com taxa, base de dias e data de início parametrizáveis. |
| **Coimas** | Três cenários — mínimo, provável e máximo — cada um com o respetivo fundamento legal explícito. |

### Módulo 4 · Recuperação do IRC

Três cenários: reembolso integral, parcial (percentagem configurável) e inexistente. A base recuperável é a coleta de IRC e as derramas efetivamente pagas; as tributações autónomas mantêm-se devidas pela sociedade transparente (artigo 12.º do CIRC) e por isso não integram a base, salvo se o utilizador o determinar.

### Módulo 5 · Dashboard

Cinco indicadores em cartões financeiros — IRS adicional, juros compensatórios, coimas, IRC potencialmente recuperável e exposição fiscal líquida — acompanhados de:

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

## Limitações conhecidas

- Regime simplificado da categoria B modelado por coeficiente único, sem a majoração do artigo 31.º, n.º 13 do CIRS nem despesas do regime de contabilidade organizada.
- Deduções à coleta modeladas por dependente, sem despesas gerais familiares, saúde, educação ou habitação, nem limites por escalão.
- Tributação conjunta modelada por quociente conjugal com o rendimento coletável do cônjuge introduzido diretamente.
- Um exercício por simulação. Vários exercícios exigem uma simulação por ano (os ficheiros JSON permitem arquivá-las separadamente).
- As coimas dependem de valoração casuística da culpa pela Autoridade Tributária: os três cenários são balizas, não previsões.

---

## Roadmap

| Versão | Âmbito |
|---|---|
| **MVP** ✅ | Introdução manual dos dados, simulação e relatório. |
| **v2** | Importação do ficheiro SAF-T. |
| **v3** | Integração com software de contabilidade. |
| **v4** | Benchmark setorial. |

---

## Aviso

Ferramenta de apoio à decisão. Os valores apresentados são estimativas construídas sobre parâmetros configuráveis e sobre os dados introduzidos pelo utilizador. Não constituem liquidação de imposto nem substituem parecer jurídico-fiscal. Confirme sempre as taxas em vigor no exercício em análise antes de emitir um relatório.
