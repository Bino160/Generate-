# Metodologia de cálculo

Documento de referência do motor (`assets/js/motor.js`). Descreve o que é calculado, como e com que base legal. Todos os parâmetros citados são editáveis no ecrã 3 da aplicação.

**Pressuposto fundamental:** a elegibilidade para o regime de transparência fiscal do artigo 6.º do CIRC é dada como previamente determinada. O motor não a avalia.

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
Deduções     = dependentes × dedução por dependente                     [600 € por omissão]
```

### 2.4 Sociedade no cenário corrigido

Artigo 12.º do CIRC: a sociedade transparente não é tributada em IRC, **salvo quanto às tributações autónomas**, que se mantêm devidas e por isso permanecem no cenário corrigido.

---

## 3. IRS adicional

```
IRS adicional bruto = máx(0, Σ IRS corrigido − Σ IRS atual)
IRS adicional       = máx(0, IRS adicional bruto − IRS já pago sobre lucros distribuídos)
```

O crédito da segunda linha evita duplicar o imposto já suportado pelos sócios sobre dividendos (retenção de 28%) relativos ao mesmo lucro.

---

## 4. Juros compensatórios

Artigo 35.º da LGT: devidos quando, por facto imputável ao sujeito passivo, for retardada a liquidação de parte do imposto.

```
Juros = IRS adicional × taxa anual × (dias / base de dias)
```

- **Taxa anual:** 4% (taxa dos juros legais, Portaria n.º 291/2003). Parametrizável.
- **Início:** termo do prazo de entrega da Modelo 3 do ano seguinte ao exercício (30 de junho por omissão). Pode ser substituído por uma data explícita.
- **Fim:** data de referência da simulação.
- **Teto:** campo opcional; preencher com 180 dias para o limite do artigo 35.º, n.º 7 da LGT.

---

## 5. Coimas

Artigo 114.º, n.º 2 do RGIT — falta de entrega da prestação tributária a título de negligência: coima de 15% a 50% do imposto em falta. Artigo 26.º do RGIT — tetos. Artigo 119.º do RGIT — declarações inexatas ou omitidas.

```
Mínimo legal = máx(IRS adicional × 15%, piso)                  [piso: 375 €]
Máximo legal = mín(máx(IRS adicional × 50%, piso), teto)       [teto negligência: 22 500 €]
```

| Cenário | Fórmula | Fundamento |
|---|---|---|
| **Mínimo** | mínimo legal × 12,5% | Artigo 29.º, n.º 1, alínea a) do RGIT — regularização voluntária antes de qualquer procedimento inspetivo. |
| **Provável** | mínimo legal × fator provável (1,0) | Artigo 114.º, n.º 2 do RGIT — correção oficiosa sem dolo, ancorada no limite mínimo. |
| **Máximo** | máximo legal + coimas declarativas | Artigos 114.º, n.º 2 e 119.º do RGIT — uma coima declarativa por sócio, no limite máximo. |

Estes valores são **balizas de exposição**, não previsões: a graduação concreta da coima depende de valoração casuística da culpa, do benefício obtido e da situação económica do agente.

---

## 6. Recuperação do IRC

```
Base recuperável = IRC liquidado + derramas          [tributações autónomas excluídas]
Integral     = base × 100%
Parcial      = base × percentagem configurável       [50% por omissão]
Inexistente  = 0
```

A recuperabilidade depende do artigo 78.º da LGT (revisão do ato tributário a favor do contribuinte, quatro anos) ou da reclamação graciosa do artigo 70.º do CPPT (120 dias). Se a data de referência ultrapassar o prazo de revisão, a aplicação emite erro: o IRC pago dificilmente será recuperável e deve ser tratado como custo irreversível.

---

## 7. Exposição fiscal líquida

```
Exposição bruta   = IRS adicional + juros + coima
Exposição líquida = exposição bruta − IRC recuperado
```

A **matriz de sensibilidade** cruza os três cenários de coima com os três cenários de recuperação do IRC, produzindo nove valores de exposição líquida — do melhor caso (coima mínima com reembolso integral) ao pior (coima máxima sem reembolso).

---

## 8. Prazos e cronologia

| Marco | Base legal | Cálculo |
|---|---|---|
| Prazo da Modelo 22 | Artigo 120.º do CIRC | 31 de maio do ano seguinte |
| Prazo da Modelo 3 | Artigo 60.º do CIRS | 30 de junho do ano seguinte |
| Revisão a favor do contribuinte | Artigo 78.º, n.º 1 da LGT | 4 anos |
| Caducidade do direito à liquidação | Artigo 45.º da LGT | 4 anos |

Os prazos de quatro anos são apresentados a partir do fim do ano seguinte ao exercício — aproximação conservadora, suficiente para sinalizar a janela de atuação. Para casos em cima do prazo, confirme a data exata da liquidação em causa.

---

## 9. Validações automáticas

- Soma das participações diferente de 100% → **erro** (imputação sub ou sobreavaliada).
- `resultado contabilístico + correções ≠ matéria coletável` → **aviso** com a diferença quantificada (justificável por prejuízos fiscais reportados ou benefícios).
- Matéria coletável nula ou negativa → **aviso**: não há imputação a tributar.
- Tabela de IRS provisória ou substituída por outro ano → **aviso** com identificação da tabela aplicada.
- Data de referência para lá do prazo do artigo 78.º da LGT → **erro** sobre a recuperabilidade do IRC.
- Data de referência para lá da caducidade do artigo 45.º da LGT → **informação** sobre a exigibilidade do IRS adicional.

---

## 10. Testes

`tests/motor.test.js` cobre a coleta progressiva contra valores calculados à mão, a taxa de solidariedade por faixas, o quociente conjugal, o piso zero do imposto, a imputação integral da matéria coletável, os juros e o respetivo teto, a ordenação dos três cenários de coima, a base de recuperação do IRC, a matriz de sensibilidade, o crédito por lucros distribuídos, a sobreposição de parâmetros do utilizador, a substituição de tabelas em falta e as validações.

```bash
npm test
```
