# Plano de QA

Oito frentes. As três primeiras correm por máquina e falham a build. As restantes
cinco são revisão humana com critérios escritos, porque não há forma de uma
máquina decidir se um ajustamento de EBITDA é defensável numa diligência.

| Frente | Como corre | Comando | Estado |
| --- | --- | --- | --- |
| Código | Automática | `npm test` | 144 testes, verde |
| Texto | Automática | `npm run qa:slop` | verde |
| Etiquetas de fonte | Automática | `npm run qa:fontes` | verde |
| Interface | Semiautomática | `node scripts/fumo.mjs` | verde |
| Comercial | Revisão | `qa/02-comercial.md` | 6 achados |
| Fiscal | Revisão | `qa/03-fiscal.md` | 5 achados, 1 material |
| Contabilística | Revisão | `qa/04-contabilistico.md` | 4 achados |
| Financeira | Revisão | `qa/05-financeiro.md` | 5 achados |
| Legal e RGPD | Revisão | `qa/06-legal-rgpd.md` | 10 achados, 1 crítico |
| Interface e experiência | Revisão | `qa/07-ui-ux.md` | 8 achados |
| Texto gerado sem cuidado | Revisão e automática | `qa/08-ai-slop.md` | 7 critérios |

Tudo junto: `npm run qa`.

O registo único de achados, com severidade e estado, está em
`qa/09-registo-de-achados.md`. Os achados que geraram correção têm teste de
regressão nomeado com o código do achado, para que a correção não se perca numa
reescrita futura.

---

## Portões de entrega

Três portões, por ordem. Nenhum salta o anterior.

**Portão 1, código.** `npm run qa` verde. Automático.

**Portão 2, aceitação contra dados reais.** O F1 corrido contra doze meses reais
da A+, a reproduzir os alertas que terias emitido à mão. **Por cumprir.** Os
dados não estão no repositório e o teste falha em falta, que é o comportamento
correto: um teste obrigatório que passa por ausência de dados é um teste que
mente. Enquanto este portão não fechar, nenhuma ferramenta vai a cliente.

**Portão 3, co-assinatura.** Enquanto não houver cédula, toda a conclusão fiscal
ou jurídica do F3 e do F7 exige identificação do parceiro co-signatário. Isto
não é um aviso no rodapé, é uma porta fechada no código: sem o campo preenchido,
a exportação não produz ficheiro. Ver P-05 e o teste
`contrato: sem cedula, qualquer bloco fiscal ou juridico fecha a exportacao`.

---

## O que a automatização não apanha, e por isso está em revisão humana

- Se um ajustamento de EBITDA sobrevive a uma diligência.
- Se um código CAE está certo para uma clínica concreta.
- Se um indício do artigo 12.º está de facto verificado, e não apenas assinalado
  numa caixa por quem preencheu.
- Se o veredito de uma página se lê bem em voz alta numa reunião.
- Se um número está certo mas é a resposta à pergunta errada.

---

## Regra de severidade

| Severidade | Critério | Consequência |
| --- | --- | --- |
| Crítico | Produz um número errado que o cliente pode usar, ou expõe dados pessoais | Não sai. Corrigir antes de qualquer outra coisa |
| Alto | Produz um número certo mas incompleto, sem o declarar | Corrigir ou declarar como lacuna antes de entregar |
| Médio | Limita o alcance da ferramenta sem enganar ninguém | Documentar e agendar |
| Baixo | Atrito, arrumação, dívida técnica | Registar |
