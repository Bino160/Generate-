/**
 * Verificador de etiquetas de fonte.
 *
 * Regra transversal de QA: nenhum benchmark internacional aparece sem etiqueta
 * de origem visivel no ecra, nao so na metodologia.
 *
 * Uma regra escrita num documento e uma regra que se esquece. Este verificador
 * garante quatro coisas de forma estatica:
 *
 *   1. Toda a Referencia declarada tem metrica, nivel, origem, fonte e ano.
 *   2. O renderizador imprime a etiqueta sempre que o bloco traz fonte.
 *   3. Os ficheiros de dados nao declaram valores sem terem estado carregado.
 *   4. Nenhum modulo fora de src/dados/ constroi uma Referencia, para que as
 *      referencias vivam todas no mesmo sitio e possam ser auditadas de uma vez.
 *
 * Corre com: npm run qa:fontes
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { referenciasFinanceiras, estadoDados } from '../src/dados/benchmark-financeiro.js';
import { referenciaMultiplosInternacional, transacoesPortuguesas } from '../src/dados/multiplos-observados.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const achados = [];

function reporta(regra, ficheiro, mensagem) {
  achados.push({ regra, ficheiro, mensagem });
}

function ficheiros(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (['node_modules', '.git', 'dados', 'dist'].includes(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) ficheiros(caminho, saida);
    else if (['.js', '.mjs'].includes(extname(caminho))) saida.push(caminho);
  }
  return saida;
}

// 1. Referencias completas ---------------------------------------------------
const todas = [...referenciasFinanceiras, referenciaMultiplosInternacional];
for (const r of todas) {
  for (const campo of ['metrica', 'nivel', 'origem', 'fonte', 'ano']) {
    if (!r[campo]) reporta('referencia-incompleta', 'src/dados', `${r.metrica ?? 'sem metrica'} sem ${campo}`);
  }
  if (r.origem === 'INTERNACIONAL' && !r.etiqueta.aviso) {
    reporta('aviso-em-falta', 'src/dados', `${r.metrica} e internacional e nao tem aviso na etiqueta`);
  }
}

// 2. O renderizador imprime a etiqueta --------------------------------------
const render = readFileSync(join(raiz, 'web/render.js'), 'utf8');
if (!/renderFonte\s*\(\s*bloco\.fonte\s*\)/.test(render)) {
  reporta('render-sem-etiqueta', 'web/render.js',
    'renderBloco nao chama renderFonte com a fonte do bloco. Um numero de benchmark pode sair sem origem.');
}
if (!/data-origem/.test(render)) {
  reporta('render-sem-origem', 'web/render.js', 'A etiqueta nao marca a origem, logo o estilo de aviso nunca se aplica.');
}
const css = readFileSync(join(raiz, 'web/app.css'), 'utf8');
if (!/\.fonte\[data-origem="INTERNACIONAL"\]/.test(css)) {
  reporta('css-sem-destaque', 'web/app.css',
    'Nao ha estilo de destaque para origem internacional. A etiqueta ficaria indistinguivel de uma nota.');
}

// 3. Coerencia dos ficheiros de dados ---------------------------------------
if (estadoDados.carregado === false && referenciasFinanceiras.length > 0) {
  reporta('dados-incoerentes', 'src/dados/benchmark-financeiro.js',
    'O estado diz que os dados nao estao carregados mas ha referencias declaradas.');
}
if (estadoDados.carregado === true && referenciasFinanceiras.length === 0) {
  reporta('dados-incoerentes', 'src/dados/benchmark-financeiro.js',
    'O estado diz que os dados estao carregados mas nao ha nenhuma referencia.');
}
for (const t of transacoesPortuguesas) {
  if (!t.fonte) reporta('transacao-sem-fonte', 'src/dados/multiplos-observados.js',
    `Transacao portuguesa de ${t.ano ?? 'ano desconhecido'} sem fonte declarada.`);
}

// 4. Referencias so em src/dados --------------------------------------------
for (const caminho of ficheiros(join(raiz, 'src'))) {
  const rel = relative(raiz, caminho);
  if (rel.startsWith('src/dados') || rel.endsWith('src/core/benchmark.js')) continue;
  const conteudo = readFileSync(caminho, 'utf8');
  if (/new\s+Referencia\s*\(/.test(conteudo)) {
    reporta('referencia-fora-de-dados', rel,
      'Constroi uma Referencia fora de src/dados. As referencias tem de viver todas no mesmo sitio.');
  }
}

// 5. Nenhum multiplo por defeito ---------------------------------------------
const f3 = readFileSync(join(raiz, 'src/ferramentas/f3-prontidao-transacao.js'), 'utf8');
if (!/multiploIntroduzido\s*=\s*null/.test(f3)) {
  reporta('multiplo-por-defeito', 'src/ferramentas/f3-prontidao-transacao.js',
    'O F3 tem de exigir a introducao do multiplo. Um valor por defeito seria apresentar o mercado errado.');
}

if (achados.length === 0) {
  process.stdout.write('lint-fontes: limpo.\n');
  process.exit(0);
}
process.stdout.write(`lint-fontes: ${achados.length} achados.\n\n`);
for (const a of achados) process.stdout.write(`${a.ficheiro}  [${a.regra}]\n  ${a.mensagem}\n\n`);
process.exit(1);
