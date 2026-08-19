/**
 * build.js — gera versões de ficheiro único do simulador.
 *
 *   node build.js
 *
 * Produz:
 *   dist/simulador.html   página autónoma (abre com duplo clique, funciona offline)
 *   dist/pagina.html      apenas o conteúdo da página, para publicação como Artifact
 */
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

let saida = html
  .replace(/<link rel="stylesheet" href="([^"]+)">/g,
    (_, href) => '<style>\n' + ler(href) + '\n</style>')
  .replace(/<script src="([^"]+)"><\/script>/g,
    (_, src) => '<script>\n' + ler(src) + '\n</script>');

if (/<(link|script)[^>]+(href|src)="assets/.test(saida)) {
  throw new Error('Sobraram referências externas por inlinar.');
}

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist/simulador.html'), saida);

// Versão para Artifact: sem doctype, html, head e body — o anfitrião envolve o conteúdo.
const pagina = saida
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '')
  .replace(/<link rel="icon"[^>]*>\s*/, '')
  .replace(/<meta[^>]*>\s*/g, '');

fs.writeFileSync(path.join(raiz, 'dist/pagina.html'), pagina);

const kb = (f) => (fs.statSync(path.join(raiz, f)).size / 1024).toFixed(1) + ' kB';
console.log('dist/simulador.html', kb('dist/simulador.html'));
console.log('dist/pagina.html   ', kb('dist/pagina.html'));
