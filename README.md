# VCLevel. Sete ferramentas de gestão financeira para clínicas privadas

Implementação da especificação de 2026-08-16. Processamento inteiramente no
browser, sem dependências externas em produção e sem passo de compilação.

```
npm install          # só para os testes e o browser de fumo
npm run servir       # abre em http://localhost:8080
npm test             # 144 testes
npm run qa           # painel de QA completo
```

---

## O que está construído

**Quatro camadas partilhadas.** Nenhuma das sete ferramentas é autónoma, porque
sete ferramentas soltas produzem sete definições diferentes de hora clínica.

| Camada | Ficheiro | Responsabilidade |
| --- | --- | --- |
| Leitor de SAF-T | `src/core/saft.js` | Leitura de passagem única, pseudonimização antes de tudo |
| Motor de capacidade | `src/core/capacidade.js` | Uma só definição de dia útil clínico e hora-gabinete |
| Motor de benchmark | `src/core/benchmark.js` | Dois níveis, etiqueta de origem obrigatória |
| Perfil de cliente | `src/core/perfil.js` | Preenchido uma vez, consumido por todas |

**As sete ferramentas**, em `src/ferramentas/`:

| | Ferramenta | A tese |
| --- | --- | --- |
| F1 | Painel mensal do CFO Clínico | Nada é valor absoluto. Controlo estatístico, não semáforo. Três alertas, ordenados por euros |
| F2 | Simulador de convenções | A unidade é a hora-gabinete, e a resposta inverte-se com a ocupação |
| F3 | Prontidão para transação | Não é uma avaliação. Cinco testes de diligência antes de se falar de preço |
| F4 | Barómetro de clínicas privadas | Fonte primária é o SAF-T, não a resposta do gestor |
| F5 | Funil de planos de tratamento | Primeiro a auditoria de completude. O dinheiro está no abandono a meio |
| F6 | Investimento em equipamento | O que domina o payback é a utilização, não o juro. O IVA é a alavanca |
| F7 | Remuneração de sócios e prestadores | Sobre produção ou sobre recebido. Percentagens nominais não comparam nada |

---

## As cinco decisões que ficaram por confirmar

Está tudo em `docs/PRESSUPOSTOS.md`, com o que assumi, porquê, e o que muda se
estiver errado. Resumo:

| | Assunto | O que assumi |
| --- | --- | --- |
| P-01 | Códigos CAE | CAE-Rev.3, seis códigos. A revisão aplicável precisa de confirmação |
| P-02 | Exports de orçamentos | Nada. O F5 deteta a capacidade do ficheiro em vez de assumir formato |
| P-03 | Múltiplos de transação | Só referências internacionais, etiquetadas. Sem múltiplo por defeito |
| P-04 | Mês anterior não dispara | Aceite, mais uma classe separada de rutura de nível. Ver a discordância documentada |
| P-05 | Cédula OCC | Assumido que não há. Conclusões fiscais e jurídicas não exportam sem co-assinatura |

Mais dezasseis pressupostos técnicos e de domínio, do mesmo modo. Todos têm
identificador que aparece no código, nos testes e no ecrã, e um teste falha se
algum ficar sem documentação.

---

## O que não inventei

`src/dados/benchmark-financeiro.js` está vazio de propósito. Não preenchi
medianas da Central de Balanços de memória, porque um benchmark plausível mas
errado atravessa a revisão precisamente por ser plausível.

O mesmo para a correspondência de CAE para a Rev.4, para o que o iMED exporta, e
para múltiplos portugueses. Nos quatro casos a ferramenta declara a lacuna e
entrega o resto da análise.

---

## QA

Oito frentes, em `qa/`. Três correm por máquina e falham a build.

```
npm test                  144 testes unitarios e de contrato
npm run qa:slop           verificador de texto, dez regras
npm run qa:fontes         verificador de etiquetas de fonte
node scripts/fumo.mjs     percurso completo num browser real
npm run qa                tudo, mais o inventario de pressupostos
```

O registo de achados, com severidade e estado, está em
`qa/09-registo-de-achados.md`. Cinquenta e quatro achados, dos quais cinco críticos,
todos corrigidos. Os que geraram correção têm teste de regressão nomeado com o
código do achado.

**Portão por cumprir.** O teste de aceitação do F1 contra doze meses reais da A+
falha por falta de dados, que é o comportamento correto. Enquanto não correr,
nenhuma ferramenta vai a cliente. Ver `tests/aceitacao/f1-a-mais.test.mjs` para o
formato dos ficheiros.

---

## Privacidade

O ficheiro SAF-T nunca sai do browser. Os identificadores de paciente são
substituídos por HMAC-SHA-256 com chave aleatória de 256 bits, não extraível,
gerada por sessão e nunca serializada.

Um SHA-256 simples de um NIF não serviria: o espaço tem menos de mil milhões de
valores e a tabela completa calcula-se num portátil em minutos. Ver
`qa/06-legal-rgpd.md`, achado L-001, e a página de arquitetura dentro do hub.

O teste de fumo verifica que o percurso completo não gera um único pedido para
fora da origem.

---

## Estrutura

```
index.html               hub, uma pagina
web/                     interface: tokens, estilos, renderizador unico
src/config/              pressupostos, ponto unico de verdade
src/core/                as quatro camadas partilhadas, mais dinheiro e estatistica
src/dados/               dados de referencia, com estado declarado
src/ferramentas/         F1 a F7
tests/                   144 testes, mais o portao de aceitacao
qa/                      oito frentes de QA e o registo de achados
scripts/                 servidor de desenvolvimento e teste de fumo
docs/PRESSUPOSTOS.md     as cinco decisoes e os dezasseis pressupostos tecnicos
```

---

## Ver sem instalar nada

O hub e os documentos existem também como ficheiro único, gerado a partir da
fonte, que abre em qualquer browser sem servidor e sem rede.

```
npm run empacota          # gera dist/hub.html e dist/documentos.html
npm run verifica:pacote   # confirma que os dois abrem e funcionam num browser
```

O empacotador não usa nenhuma ferramenta de mercado. São cem linhas em
`scripts/empacota.mjs` que resolvem os módulos e validam a sintaxe do resultado
antes de escrever, porque um pacote inválido não deve chegar ao disco.
