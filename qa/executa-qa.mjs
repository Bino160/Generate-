/**
 * Painel de QA.
 *
 * Corre tudo o que se consegue verificar por maquina e imprime, no fim, o que
 * so uma pessoa pode verificar. A lista do que falta e tao importante como a
 * lista do que passou, porque e a diferenca entre estar testado e parecer
 * testado.
 *
 * Corre com: npm run qa
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { pressupostos, porConfirmar, ESTADO } from '../src/config/pressupostos.js';
import { estadoDados } from '../src/dados/benchmark-financeiro.js';
import { transacoesPortuguesas } from '../src/dados/multiplos-observados.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const resultados = [];

function corre(nome, comando, args, { obrigatorio = true } = {}) {
  process.stdout.write(`\n=== ${nome} ===\n`);
  const r = spawnSync(comando, args, { cwd: raiz, encoding: 'utf8' });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const passou = r.status === 0;
  process.stdout.write(resumo(saida));
  resultados.push({ nome, passou, obrigatorio });
  return passou;
}

function resumo(saida) {
  const linhas = saida.split('\n');
  const interessantes = linhas.filter((l) => /^(not ok|# (tests|pass|fail|skipped)|slop-lint|lint-fontes|\s+FALHA|\s+ok\s)/.test(l));
  return `${(interessantes.length > 0 ? interessantes : linhas.slice(-12)).join('\n')}\n`;
}

corre('Testes unitarios', 'node', ['--test', 'tests/*.test.mjs']);
corre('Texto', 'node', ['qa/slop-lint.mjs']);
corre('Etiquetas de fonte', 'node', ['qa/lint-fontes.mjs']);

// O fumo precisa de um browser. Se nao houver, nao e falha, e ausencia.
if (existsSync(join(raiz, 'node_modules/playwright'))) {
  corre('Fumo no browser', 'node', ['scripts/fumo.mjs']);
} else {
  process.stdout.write('\n=== Fumo no browser ===\nPlaywright nao instalado. Correr npm install para incluir esta verificacao.\n');
}

// Portao de aceitacao --------------------------------------------------------
process.stdout.write('\n=== Portao de aceitacao ===\n');
const temDadosAplus = ['serie.json', 'perfil.json', 'alertas-manuais.json']
  .every((f) => existsSync(join(raiz, 'dados/aplus', f)));
if (temDadosAplus) {
  corre('Aceitacao F1 contra a A+', 'node', ['--test', 'tests/aceitacao/f1-a-mais.test.mjs']);
} else {
  process.stdout.write(
    'POR CUMPRIR. Faltam os doze meses reais da A+ em dados/aplus/.\n' +
    'A especificacao classifica este teste como obrigatorio antes do primeiro cliente.\n' +
    'Enquanto nao correr, o F1 nao deve ser entregue.\n',
  );
  resultados.push({ nome: 'Aceitacao F1 contra a A+', passou: false, obrigatorio: true, humano: true });
}

// Inventario de pressupostos -------------------------------------------------
process.stdout.write('\n=== Pressupostos ===\n');
const pendentes = porConfirmar();
process.stdout.write(`${Object.keys(pressupostos).length} pressupostos, ${pendentes.length} por confirmar.\n\n`);
for (const p of pendentes) {
  process.stdout.write(`${p.id}  ${p.assunto}\n      ${p.estado.toLowerCase().replace(/_/g, ' ')}\n`);
}

// Dados em falta -------------------------------------------------------------
process.stdout.write('\n=== Dados de referencia ===\n');
process.stdout.write(`Benchmark financeiro: ${estadoDados.carregado ? 'carregado' : 'POR CARREGAR'}.\n`);
process.stdout.write(`Transacoes portuguesas observadas: ${transacoesPortuguesas.length}.\n`);
process.stdout.write(`Barometro operacional: por construcao so existe depois de doze meses de recolha.\n`);

// O que so uma pessoa verifica ----------------------------------------------
const REVISAO_HUMANA = [
  'Revisao fiscal das conclusoes do F3 e do F6 por quem tem cedula. Ver P-05.',
  'Confirmacao dos codigos CAE e da revisao aplicavel. Ver P-01.',
  'Confirmacao do que o iMED exporta. Ver P-02.',
  'Leitura do relatorio do F1 por quem o vai apresentar, antes do primeiro cliente.',
  'Teste de regressao contra a clinica de psicologia, alem da A+.',
];
process.stdout.write('\n=== So uma pessoa pode verificar ===\n');
for (const item of REVISAO_HUMANA) process.stdout.write(`- ${item}\n`);

// Veredito -------------------------------------------------------------------
const falhados = resultados.filter((r) => !r.passou && r.obrigatorio);
process.stdout.write('\n=== Veredito ===\n');
for (const r of resultados) {
  process.stdout.write(`${r.passou ? 'passa ' : 'FALHA '} ${r.nome}${r.humano ? ' (por cumprir, nao e falha de codigo)' : ''}\n`);
}

const soFaltaAceitacao = falhados.length === 1 && falhados[0].humano;
if (falhados.length === 0) {
  process.stdout.write('\nTudo verde, incluindo o portao de aceitacao.\n');
  process.exit(0);
}
if (soFaltaAceitacao) {
  process.stdout.write(
    '\nCodigo verde. O portao de aceitacao contra dados reais esta por cumprir, ' +
    'o que impede entrega a cliente mas nao impede continuar a construir.\n',
  );
  process.exit(0);
}
process.stdout.write(`\n${falhados.length} verificacoes obrigatorias falharam.\n`);
process.exit(1);
