/**
 * Empacotador. Junta o hub inteiro num unico ficheiro HTML.
 *
 * O hub em desenvolvimento sao vinte e tal modulos ES servidos por um servidor
 * local, o que e o correto para trabalhar mas obriga a instalar coisas para
 * ver. Este empacotador produz um ficheiro unico que abre em qualquer browser,
 * sem servidor, sem instalacao e sem rede.
 *
 * Nao uso empacotador de mercado porque isso traria uma arvore de dependencias
 * maior do que o projeto inteiro, para resolver um problema que sao cem linhas.
 *
 * Como funciona: le os modulos, ordena-os por dependencia, embrulha cada um numa
 * funcao que devolve as suas exportacoes, e reescreve os imports para leituras
 * desse registo. Nada de nomes globais, portanto nao ha colisoes entre modulos
 * que usem o mesmo nome para coisas diferentes.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const raiz = fileURLToPath(new URL('..', import.meta.url));

const RE_IMPORT = /^import\s+(?:([\w$]+)\s*,\s*)?(?:\{([\s\S]*?)\}|([\w$]+)|\*\s+as\s+([\w$]+))\s+from\s+['"]([^'"]+)['"];?/gm;
const RE_EXPORT_DECL = /^export\s+(?=(?:async\s+)?function|class|const|let|var)/gm;
const RE_EXPORT_LISTA = /^export\s*\{([^}]*)\}\s*;?/gm;

function chave(caminhoAbsoluto) {
  return relative(raiz, caminhoAbsoluto).split('\\').join('/');
}

/** Nomes declarados no topo do modulo, para saber o que exportar. */
function nomesExportados(fonte) {
  const nomes = new Set();
  const reDecl = /^export\s+(?:async\s+)?(?:function|class)\s+([\w$]+)/gm;
  const reVar = /^export\s+(?:const|let|var)\s+([\w$]+)/gm;
  let m;
  while ((m = reDecl.exec(fonte)) !== null) nomes.add(m[1]);
  while ((m = reVar.exec(fonte)) !== null) nomes.add(m[1]);
  let l;
  while ((l = RE_EXPORT_LISTA.exec(fonte)) !== null) {
    for (const parte of l[1].split(',')) {
      const nome = parte.trim().split(/\s+as\s+/)[0].trim();
      if (nome) nomes.add(nome);
    }
  }
  return [...nomes];
}

const modulos = new Map();

function carrega(caminhoAbsoluto) {
  const id = chave(caminhoAbsoluto);
  if (modulos.has(id)) return id;
  modulos.set(id, null); // marca para travar ciclos

  const fonte = readFileSync(caminhoAbsoluto, 'utf8');
  const dependencias = [];
  const linhasImport = [];

  // As correspondencias sao todas recolhidas antes de recorrer. Se a recursao
  // acontecesse dentro de um ciclo sobre uma expressao regular global e
  // partilhada, o modulo filho reiniciava o lastIndex e o modulo pai voltava ao
  // principio, duplicando os imports. E um erro que nao rebenta no empacotador,
  // rebenta no browser, e foi apanhado pela verificacao de sintaxe no fim.
  const correspondencias = [...fonte.matchAll(new RegExp(RE_IMPORT.source, 'gm'))];

  for (const m of correspondencias) {
    const [, porDefeito, chaves, espacoUnico, tudoComo, especificador] = m;
    if (!especificador.startsWith('.')) {
      throw new Error(`${id} importa de fora do projeto: ${especificador}`);
    }
    const alvo = resolve(dirname(caminhoAbsoluto), especificador);
    const idAlvo = carrega(alvo);
    dependencias.push(idAlvo);

    const acesso = `__modulos[${JSON.stringify(idAlvo)}]`;
    if (chaves) linhasImport.push(`const {${chaves.replace(/\s+as\s+/g, ': ')}} = ${acesso};`);
    if (tudoComo) linhasImport.push(`const ${tudoComo} = ${acesso};`);
    if (porDefeito || espacoUnico) {
      throw new Error(`${id} usa exportacao por defeito, que este empacotador nao trata.`);
    }
  }

  const corpo = fonte
    .replace(RE_IMPORT, '')
    .replace(RE_EXPORT_DECL, '')
    .replace(RE_EXPORT_LISTA, '');

  const exportados = nomesExportados(fonte);
  const devolve = exportados.length
    ? `return {${exportados.map((n) => `${n}`).join(', ')}};`
    : 'return {};';

  modulos.set(id, { id, dependencias, codigo: `${linhasImport.join('\n')}\n${corpo}\n${devolve}` });
  return id;
}

/** Ordem topologica: uma dependencia e sempre avaliada antes de quem a usa. */
function ordena() {
  const visto = new Set();
  const ordem = [];
  const visita = (id) => {
    if (visto.has(id)) return;
    visto.add(id);
    const mod = modulos.get(id);
    if (!mod) throw new Error(`Ciclo de dependencias em ${id}. O empacotador nao os resolve.`);
    for (const d of mod.dependencias) visita(d);
    ordem.push(mod);
  };
  for (const id of [...modulos.keys()]) visita(id);
  return ordem;
}

// ---------------------------------------------------------------------------

const entrada = join(raiz, 'web/app.js');
carrega(entrada);
const ordem = ordena();

const guiao = `
const __modulos = {};
${ordem.map((m) => `__modulos[${JSON.stringify(m.id)}] = (function(){\n${m.codigo}\n})();`).join('\n\n')}
`;

const css = ['web/tokens.css', 'web/app.css']
  .map((f) => readFileSync(join(raiz, f), 'utf8'))
  .join('\n');

// As substituicoes usam funcao e nao cadeia de texto de proposito. Numa cadeia
// de substituicao, o cifrao tem significado especial: $' significa "o resto do
// texto depois da correspondencia". O codigo-fonte tem `caminho = '$'` no
// auditor de fuga, o que fazia o empacotador cortar o ficheiro a meio e produzir
// um pacote sintaticamente invalido. Com funcao, o texto entra literal.
const html = readFileSync(join(raiz, 'index.html'), 'utf8')
  .replace(/<link rel="stylesheet"[^>]*>\s*/g, '')
  .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
  .replace('</head>', () => `<style>\n${css}\n</style>\n</head>`)
  .replace('</body>', () => `<script type="module">\n${guiao}\n</script>\n</body>`);

// Verificacao de sintaxe antes de escrever. Um pacote invalido nao chega ao
// disco, quanto mais a um browser. Compila sem executar.
try {
  new Script(guiao);
} catch (erro) {
  const linha = Number(erro.stack?.match(/evalmachine[^:]*:(\d+)/)?.[1] ?? 0);
  const contexto = guiao.split('\n').slice(Math.max(0, linha - 3), linha + 2).join('\n');
  process.stderr.write(`Pacote invalido: ${erro.message}\n\n${contexto}\n`);
  process.exit(1);
}

const destino = process.argv[2] ?? join(raiz, 'dist/hub.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, html, 'utf8');

const kb = Math.round(Buffer.byteLength(html) / 1024);
process.stdout.write(`${ordem.length} modulos empacotados em ${relative(raiz, destino)}, ${kb} kB\n`);
