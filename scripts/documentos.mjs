/**
 * Gera um dossie de leitura a partir dos ficheiros markdown do projeto.
 *
 * Existe porque a documentacao so serve se for lida, e ler onze ficheiros
 * markdown num repositorio exige ser programador. Isto produz uma pagina unica,
 * sem dependencias, que abre em qualquer browser.
 *
 * O conversor de markdown e propositadamente pequeno: cobre exatamente o que
 * estes documentos usam, que sao titulos, paragrafos, tabelas, listas, codigo
 * em linha e blocos de codigo. Nao pretende ser um conversor geral.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));

const DOCUMENTOS = [
  {
    grupo: 'Decisões',
    itens: [
      { id: 'pressupostos', ficheiro: 'docs/PRESSUPOSTOS.md', titulo: 'Pressupostos por confirmar', nota: 'As tuas cinco perguntas, mais dezasseis' },
    ],
  },
  {
    grupo: 'Qualidade',
    itens: [
      { id: 'qa-plano', ficheiro: 'qa/00-plano-de-qa.md', titulo: 'Plano de QA', nota: 'As oito frentes e os três portões' },
      { id: 'qa-achados', ficheiro: 'qa/09-registo-de-achados.md', titulo: 'Registo de achados', nota: '54 achados, 5 críticos' },
    ],
  },
  {
    grupo: 'As oito frentes',
    itens: [
      { id: 'qa-codigo', ficheiro: 'qa/01-codigo.md', titulo: 'Código' },
      { id: 'qa-comercial', ficheiro: 'qa/02-comercial.md', titulo: 'Comercial' },
      { id: 'qa-fiscal', ficheiro: 'qa/03-fiscal.md', titulo: 'Fiscal' },
      { id: 'qa-contabilistico', ficheiro: 'qa/04-contabilistico.md', titulo: 'Contabilística' },
      { id: 'qa-financeiro', ficheiro: 'qa/05-financeiro.md', titulo: 'Financeira' },
      { id: 'qa-legal', ficheiro: 'qa/06-legal-rgpd.md', titulo: 'Legal e RGPD' },
      { id: 'qa-uiux', ficheiro: 'qa/07-ui-ux.md', titulo: 'Interface' },
      { id: 'qa-slop', ficheiro: 'qa/08-ai-slop.md', titulo: 'Texto' },
    ],
  },
  {
    grupo: 'Panorâmica',
    itens: [
      { id: 'leiame', ficheiro: 'README.md', titulo: 'O que está construído' },
    ],
  },
];

// --- conversor de markdown --------------------------------------------------

const escapa = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function emLinha(texto) {
  return escapa(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Marca severidades e identificadores de achado, que sao a informacao de estado destes documentos. */
function realca(html) {
  return html
    .replace(/\b(Crítico|Alto|Médio|Baixo)\b/g, '<span class="grau" data-g="$1">$1</span>')
    .replace(/\b(CORRIGIDO|DECLARADO|ACEITE|ABERTO|POR_CONFIRMAR|CONFIRMADO|DADOS_POR_CARREGAR)\b/g,
      (m) => `<span class="estado" data-e="${m}">${m.toLowerCase().replace(/_/g, ' ')}</span>`);
}

function converte(markdown) {
  const linhas = markdown.split('\n');
  const saida = [];
  let i = 0;
  let paragrafo = [];

  const fechaParagrafo = () => {
    if (paragrafo.length) {
      saida.push(`<p>${emLinha(paragrafo.join(' '))}</p>`);
      paragrafo = [];
    }
  };

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.startsWith('```')) {
      fechaParagrafo();
      const corpo = [];
      i += 1;
      while (i < linhas.length && !linhas[i].startsWith('```')) { corpo.push(linhas[i]); i += 1; }
      i += 1;
      saida.push(`<pre><code>${escapa(corpo.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^\s*$/.test(linha)) { fechaParagrafo(); i += 1; continue; }

    if (/^---+\s*$/.test(linha)) { fechaParagrafo(); saida.push('<hr>'); i += 1; continue; }

    const titulo = /^(#{1,4})\s+(.*)$/.exec(linha);
    if (titulo) {
      fechaParagrafo();
      const nivel = titulo[1].length;
      saida.push(`<h${nivel}>${emLinha(titulo[2])}</h${nivel}>`);
      i += 1;
      continue;
    }

    // Tabela: linha de cabecalho seguida de linha de separadores.
    if (linha.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1] ?? '')) {
      fechaParagrafo();
      const celulas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const cabecalho = celulas(linha);
      i += 2;
      const corpo = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) { corpo.push(celulas(linhas[i])); i += 1; }
      saida.push(
        '<div class="rolavel"><table><thead><tr>'
        + cabecalho.map((c) => `<th>${emLinha(c)}</th>`).join('')
        + '</tr></thead><tbody>'
        + corpo.map((r) => `<tr>${r.map((c) => `<td>${emLinha(c)}</td>`).join('')}</tr>`).join('')
        + '</tbody></table></div>',
      );
      continue;
    }

    const lista = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(linha);
    if (lista) {
      fechaParagrafo();
      const ordenada = /\d/.test(lista[2]);
      const itens = [];
      while (i < linhas.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(linhas[i]);
        if (m) { itens.push(m[3]); i += 1; continue; }
        // Continuacao indentada do item anterior.
        if (/^\s{2,}\S/.test(linhas[i]) && itens.length) { itens[itens.length - 1] += ` ${linhas[i].trim()}`; i += 1; continue; }
        break;
      }
      const etiqueta = ordenada ? 'ol' : 'ul';
      saida.push(`<${etiqueta}>${itens.map((t) => `<li>${emLinha(t)}</li>`).join('')}</${etiqueta}>`);
      continue;
    }

    paragrafo.push(linha.trim());
    i += 1;
  }
  fechaParagrafo();
  return realca(saida.join('\n'));
}

// --- pagina -----------------------------------------------------------------

const secoes = [];
const indice = [];

for (const grupo of DOCUMENTOS) {
  indice.push(`<div class="grupo"><span class="grupo-nome">${grupo.grupo}</span><ul>`);
  for (const item of grupo.itens) {
    const bruto = readFileSync(join(raiz, item.ficheiro), 'utf8');
    // O primeiro titulo do ficheiro e substituido pelo cabecalho da seccao.
    const semTitulo = bruto.replace(/^#\s+.*\n/, '');
    secoes.push(`
<article class="documento" id="${item.id}">
  <header class="doc-cabecalho">
    <p class="doc-origem">${item.ficheiro}</p>
    <h1>${item.titulo}</h1>
    ${item.nota ? `<p class="doc-nota">${item.nota}</p>` : ''}
  </header>
  ${converte(semTitulo)}
</article>`);
    indice.push(`<li><a href="#${item.id}">${item.titulo}</a></li>`);
  }
  indice.push('</ul></div>');
}

const html = `<title>Dossiê VCLevel</title>
<style>
:root {
  color-scheme: light dark;
  --papel: #fbfaf8;
  --papel-fundo: #f2efe9;
  --tinta: #1a1815;
  --tinta-media: #56504a;
  --tinta-fraca: #6e675e;
  --risco: #e0dad0;
  --risco-forte: #c9c1b4;
  --petroleo: #1f4b6e;
  --petroleo-tenue: #e8f0f6;
  --oxido: #9a3324;
  --oxido-tenue: #f8e9e6;
  --ocre: #8a5a12;
  --ocre-tenue: #faf0dc;
  --floresta: #2e6b45;
  --floresta-tenue: #e8f2ec;
  --serifa: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --papel: #17171b;
    --papel-fundo: #202027;
    --tinta: #ecebe8;
    --tinta-media: #b0aca5;
    --tinta-fraca: #8f8b84;
    --risco: #32323a;
    --risco-forte: #4a4a53;
    --petroleo: #86b8dd;
    --petroleo-tenue: #1b2a35;
    --oxido: #e89184;
    --oxido-tenue: #2e1c19;
    --ocre: #e0b45f;
    --ocre-tenue: #2c2415;
    --floresta: #7cc79b;
    --floresta-tenue: #17281e;
  }
}
:root[data-theme="dark"] {
  --papel: #17171b;
  --papel-fundo: #202027;
  --tinta: #ecebe8;
  --tinta-media: #b0aca5;
  --tinta-fraca: #8f8b84;
  --risco: #32323a;
  --risco-forte: #4a4a53;
  --petroleo: #86b8dd;
  --petroleo-tenue: #1b2a35;
  --oxido: #e89184;
  --oxido-tenue: #2e1c19;
  --ocre: #e0b45f;
  --ocre-tenue: #2c2415;
  --floresta: #7cc79b;
  --floresta-tenue: #17281e;
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--serifa);
  font-size: 17px;
  line-height: 1.62;
}

.folha { display: grid; grid-template-columns: 264px minmax(0, 1fr); }

/* Indice */
.indice {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  background: var(--papel-fundo);
  border-right: 1px solid var(--risco);
  padding: 28px 20px 40px;
  font-family: var(--sans);
  display: flex; flex-direction: column; gap: 22px;
}
.chapa { line-height: 1.3; }
.chapa b { display: block; font-size: 17px; letter-spacing: -0.01em; }
.chapa span { display: block; font-size: 12px; color: var(--tinta-fraca); margin-top: 2px; }
.grupo-nome {
  display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--tinta-fraca); margin-bottom: 7px;
}
.indice ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.indice a {
  display: block; padding: 5px 9px; border-radius: 4px; text-decoration: none;
  color: var(--tinta-media); font-size: 13.5px;
}
.indice a:hover { background: var(--papel); color: var(--tinta); }
.indice a:focus-visible { outline: 2px solid var(--petroleo); outline-offset: 1px; }
.rodape-indice { margin-top: auto; font-size: 11.5px; color: var(--tinta-fraca); line-height: 1.5; }

/* Leitura */
.leitura { padding: 0 40px 96px; }
.documento { max-width: 68ch; margin: 0 auto; padding-top: 64px; }
.documento + .documento { border-top: 1px solid var(--risco); }

.doc-cabecalho { margin-bottom: 34px; }
.doc-origem {
  font-family: var(--mono); font-size: 11.5px; color: var(--tinta-fraca);
  margin: 0 0 8px; letter-spacing: 0.01em;
}
.doc-cabecalho h1 {
  font-size: 34px; line-height: 1.14; letter-spacing: -0.021em; margin: 0;
  font-weight: 600; text-wrap: balance;
}
.doc-nota { font-family: var(--sans); font-size: 13.5px; color: var(--tinta-media); margin: 9px 0 0; }

h2 {
  font-size: 22px; line-height: 1.25; letter-spacing: -0.014em; margin: 46px 0 14px;
  font-weight: 600; text-wrap: balance;
}
h3 { font-size: 17.5px; margin: 32px 0 10px; font-weight: 600; text-wrap: balance; }
h4 { font-size: 15.5px; margin: 24px 0 8px; font-weight: 600; }
p { margin: 0 0 15px; }
ul, ol { margin: 0 0 16px; padding-left: 22px; }
li { margin-bottom: 6px; }
li::marker { color: var(--tinta-fraca); }
hr { border: 0; border-top: 1px solid var(--risco); margin: 38px 0; }
a { color: var(--petroleo); }
strong { font-weight: 650; }

code {
  font-family: var(--mono); font-size: 0.855em;
  background: var(--papel-fundo); border: 1px solid var(--risco);
  padding: 0.08em 0.34em; border-radius: 3px;
}
pre {
  font-family: var(--mono); font-size: 12.5px; line-height: 1.62;
  background: var(--papel-fundo); border: 1px solid var(--risco);
  border-radius: 5px; padding: 14px 16px; overflow-x: auto; margin: 0 0 18px;
}
pre code { background: none; border: 0; padding: 0; font-size: inherit; }

/* As tabelas de achados sao densas e nao cabem na medida de leitura. Saem para
   fora da coluna de texto em vez de comprimir cada celula a duas palavras. */
.rolavel { overflow-x: auto; margin: 0 0 20px; }
@media (min-width: 1180px) {
  .rolavel { width: calc(100% + 200px); margin-left: -100px; }
}
td:first-child { white-space: nowrap; }
td:first-child:has(+ td + td + td) { padding-right: 4px; }
table {
  border-collapse: collapse; width: 100%;
  font-family: var(--sans); font-size: 13px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--risco); vertical-align: top; }
th {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--tinta-fraca); font-weight: 600; border-bottom-color: var(--risco-forte);
  white-space: nowrap;
}
tbody tr:last-child td { border-bottom: 0; }
td code { font-size: 11.5px; }

/* Estado, que e a informacao destes documentos */
.grau, .estado {
  display: inline-block; font-family: var(--sans); font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 1px 7px; border-radius: 3px; white-space: nowrap;
}
.grau[data-g="Crítico"] { background: var(--oxido); color: var(--papel); }
.grau[data-g="Alto"] { background: var(--oxido-tenue); color: var(--oxido); }
.grau[data-g="Médio"] { background: var(--ocre-tenue); color: var(--ocre); }
.grau[data-g="Baixo"] { background: var(--papel-fundo); color: var(--tinta-fraca); }
.estado[data-e="CORRIGIDO"], .estado[data-e="CONFIRMADO"] { background: var(--floresta-tenue); color: var(--floresta); }
.estado[data-e="DECLARADO"], .estado[data-e="ACEITE"] { background: var(--petroleo-tenue); color: var(--petroleo); }
.estado[data-e="ABERTO"], .estado[data-e="POR_CONFIRMAR"] { background: var(--ocre-tenue); color: var(--ocre); }
.estado[data-e="DADOS_POR_CARREGAR"] { background: var(--papel-fundo); color: var(--tinta-fraca); }

@media (max-width: 860px) {
  .folha { grid-template-columns: 1fr; }
  .indice { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--risco); }
  .leitura { padding: 0 20px 64px; }
  .documento { padding-top: 40px; }
  .doc-cabecalho h1 { font-size: 27px; }
}

@media print {
  .indice { display: none; }
  .folha { grid-template-columns: 1fr; }
  .documento { page-break-before: always; max-width: none; }
  .documento:first-child { page-break-before: avoid; }
  h2, h3, table { break-inside: avoid; }
}
</style>

<div class="folha">
  <nav class="indice">
    <div class="chapa">
      <b>Dossiê VCLevel</b>
      <span>Sete ferramentas para clínicas privadas</span>
    </div>
    ${indice.join('\n')}
    <div class="rodape-indice">
      Gerado a partir dos ficheiros markdown do repositório.
      Nenhum destes documentos contém dados de clientes.
    </div>
  </nav>
  <main class="leitura">
${secoes.join('\n')}
  </main>
</div>
`;

const destino = process.argv[2] ?? join(raiz, 'dist/documentos.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, html, 'utf8');
process.stdout.write(`${secoes.length} documentos reunidos em ${destino}, ${Math.round(Buffer.byteLength(html) / 1024)} kB\n`);
