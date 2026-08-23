# 10 — Simulador da clínica

**Publicado:** https://claude.ai/code/artifact/3535b629-ad63-4784-adf2-dc9ea756a7ec
**Estado:** instrumento de trabalho interno. Não é entregável ao cliente enquanto os parâmetros de 2026 não estiverem confirmados.

## O que é, e o que não é

Uma página que corre **o mesmo motor de cálculo do M1**, com controlos em linguagem de fundadora, e que reescreve a leitura em português a cada alteração.

Serve para usar **na sala**, com a cliente à frente: mexe-se num valor e vê-se o efeito. Substitui a conversa hipotética por demonstração.

**Não é** o relatório, e não substitui o M1: não tem a via 4, nem a análise de transparência fiscal, nem o IVA em detalhe, nem o registo de pressupostos.

## Por que não está ligado ao Excel

Foi a primeira hipótese e não funciona, por uma razão concreta: **o M1 não guarda valores em cache**, só fórmulas. Qualquer leitor de `.xlsx` no browser leria `=SUMPRODUCT(...)` em vez de `29 701,49`. Acrescente-se que a política de segurança dos artefactos bloqueia bibliotecas externas e o acesso a ficheiros locais.

A alternativa implementada é melhor: o motor foi reescrito em JavaScript e **provado equivalente**.

## A disciplina que torna isto seguro

O motor JS é a **terceira** implementação das mesmas regras. As outras duas são as fórmulas do Excel e o recálculo independente em Python que valida a folha `Validacao`.

```
node 10-simulador/testa_motor.mjs
```

Confronta 22 grandezas com os valores do Excel — capacidade, utilização, break-even, IRS e Segurança Social das três vias, IVA irrecuperável, tesouraria e passivo laboral — mais a identidade `caixa = líquido + carga`. **Todas coincidem ao cêntimo.**

Regra: se o teste falhar, o simulador não se publica. Se o M1 mudar, corre-se o teste antes de republicar.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `motor.js` | Motor de cálculo. Nenhuma taxa fora de `PARAM`, pela mesma razão que na folha Parâmetros |
| `testa_motor.mjs` | Confronto com o Excel. Sai com código 1 se divergir |
| `simulador_clinica.html` | Página completa, com o motor embebido |

## Verificações feitas

- 22 grandezas confrontadas com o Excel — zero divergências
- Renderizado em Chromium, tema claro e escuro: zero erros de página
- Zero overflow horizontal a 1440 px e a 390 px
- Interação testada: 14 consultas/dia → 79% de ocupação; repor → 45%
- Paleta dos gráficos validada nos seis testes do método, em ambos os temas

## Nota sobre a paleta

`#1F6FB2` / `#C0442F` / `#B8791A` no tema claro, `#4A93CC` / `#D06550` / `#BE8A2E` no escuro. Cada par contra o azul passa todos os testes.

O par vermelho–ouro **falha** o piso de visão normal (ΔE 12,4, abaixo de 15) e por isso **nunca aparece adjacente**: o vermelho marca a distância ao zero na tesouraria, o ouro marca o limiar no terceiro gabinete, e não coocorrem no mesmo gráfico. Quem alterar os gráficos tem de manter essa separação.

## Limites conhecidos

| Limite | Consequência |
|---|---|
| Escalões de IRS de 2025 | Resultados são ordens de grandeza. Banner permanente na página |
| Só as vias 1, 2 e 3 | A via 4 depende da política de distribuição e do código de atividade do cônjuge, que não está confirmado |
| Dias dos colaboradores derivados a 90% dos da Dra. Júlia | Simplificação para reduzir controlos. Está escrita na própria página |
| Rampa de ocupação fixa | Não é editável na página. Para a alterar, usar o M1 |
