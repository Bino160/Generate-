# QA de código

`npm test` corre 144 testes. `npm run qa` acrescenta os verificadores de texto e
de etiquetas de fonte, e o teste de fumo num browser real.

Os achados estão em `qa/09-registo-de-achados.md`. Este documento explica as
decisões estruturais que sustentam a qualidade, porque são elas que impedem a
próxima classe de erros, não os testes individuais.

---

## As quatro decisões que evitam classes inteiras de erro

### 1. Dinheiro em cêntimos inteiros

`0.1 + 0.2 !== 0.3`. Numa ponte de EBITDA com quarenta ajustamentos o erro torna-se
visível no relatório, e num documento cujo único produto é a confiança isso custa
o cliente.

Convenção em toda a base: quantidades monetárias são inteiros com sufixo `Cent`,
taxas são frações de 0 a 1 e nunca percentagens, e a conversão só acontece na
fronteira. `soma` rejeita não inteiros, o que apanha euros disfarçados de
cêntimos no ponto onde entram em vez de três camadas acima.

### 2. Contrato de saída único

As sete ferramentas devolvem um `Resultado`. O teste `tests/contrato.test.mjs`
corre todas com a entrada mais pobre possível, que é o caso do primeiro mês de um
cliente novo e o que nunca se testa, e verifica de uma só vez que:

- toda a ferramenta declara o que não conseguiu calcular
- todo o veredito cabe numa frase e não usa jargão
- toda a lacuna tem mensagem acionável
- nenhuma saída contém identificadores em claro
- qualquer bloco fiscal ou jurídico fecha a exportação

Uma ferramenta nova que se esqueça de qualquer uma destas coisas falha aqui, não
em produção.

### 3. Nenhum número mágico de domínio

Há um teste que varre `src/ferramentas/` à procura de taxas escritas à mão e
falha se encontrar alguma. Todos os valores de domínio vêm de
`src/config/pressupostos.js` com um identificador `P-nn`, e outro teste garante
que cada um está documentado em `docs/PRESSUPOSTOS.md`. Isto já apanhou o P-21
quando foi criado.

### 4. Leitor de SAF-T de passagem única, sem dependências

Não uso `DOMParser` porque os motores têm de correr em Node nos testes e no
browser em produção com o mesmo código, e porque um SAF-T de dois anos passa dos
200 MB, tamanho a que construir uma árvore completa é imprudente.

O leitor recusa ficheiros com declaração de entidades, que é o vetor de expansão,
e lança erro em ficheiros truncados em vez de devolver dados parciais em silêncio,
o que num SAF-T significaria apresentar uma receita mais baixa como facto.

---

## Cobertura por área

| Área | Testes | O que é verificado |
| --- | --- | --- |
| Dinheiro | 6 | Conversão exata, arredondamento simétrico, rejeição de tipos errados |
| Estatística | 6 | Desvio amostral, quantis, z-score sem o próprio ponto, proteção de denominadores |
| XML | 6 | Texto, CDATA, entidades, prefixos, truncagem, fecho trocado, recusa de entidades |
| Capacidade | 6 | Páscoa em três anos conhecidos, feriados móveis, dias úteis, gabinetes com horários próprios |
| Anonimização | 6 | Estabilidade na sessão, não reprodutibilidade entre sessões, separação de domínios, auditor |
| SAF-T | 13 | Notas de crédito, anulados, consumidor final, divergências, correspondência de entidades |
| F1 | 12 | Calibração, mês anterior, três alertas, ordenação, rutura de nível, taxa de falsos alertas |
| F2 | 17 | Teste dos extremos obrigatório, inversão do ranking, canibalização, preço mínimo, alocação |
| F3 a F7 | 40 | Ver `tests/ferramentas.test.mjs` |
| Contrato | 13 | Regras transversais contra todas as ferramentas |
| Fumo no browser | 30 verificações | Percurso completo, zero pedidos externos, zero erros de consola |

---

## Limites conhecidos

**F-013, memória.** O leitor carrega o ficheiro inteiro como string. Um SAF-T de
200 MB ocupa cerca de 400 MB antes de qualquer processamento. Aceite para a
dimensão de clínica alvo. Se aparecer um ficheiro que não passe, a correção é
ler por pedaços com `File.stream()`, e o leitor já é de eventos, portanto a
mudança é local.

**Sem verificador de tipos.** Não há TypeScript nem JSDoc verificado. A base é
pequena e tem contrato testado, mas a partir de uma certa dimensão isto passa a
custar. Registado como dívida.

**Sem verificador de estilo automático.** O código segue uma convenção
consistente por disciplina, não por ferramenta.

---

## O que corre em cada portão

```
npm test                       144 testes unitarios e de contrato
npm run qa:slop                verificador de texto
npm run qa:fontes              verificador de etiquetas de fonte
node scripts/fumo.mjs          percurso completo num browser real
npm run qa                     tudo o acima, mais o inventario de pressupostos
npm run test:aceitacao         portao contra dados reais da A+, por cumprir
```
