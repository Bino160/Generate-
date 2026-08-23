/* Confronta o motor JS com os valores produzidos pelo M1_modelo_comparativo.xlsx.
 * Os valores esperados foram extraidos do ficheiro Excel apos avaliacao das formulas,
 * e o Excel esta por sua vez validado contra o recalculo independente em Python.
 * Se este teste falhar, o simulador NAO pode ser publicado. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('./motor.js');

const r = M.calcular({});
const TOL = 0.01;
const casos = [
  ['Operacao — capacidade anual',        r.operacao.capAno,            4693.333333],
  ['Operacao — taxa de utilizacao',      r.operacao.utilizacao,        0.447443182],
  ['Operacao — faturacao total',         r.operacao.fatTotal,          100800],
  ['Operacao — preco medio',             r.operacao.precoMedio,        48],
  ['BreakEven — margem de contribuicao', r.economia.mcPct,             0.67],
  ['BreakEven — break-even anual',       r.economia.breakEven,         29701.49254],
  ['BreakEven — utilizacao no BE',       r.economia.utilizacaoBreakEven, 0.131840579],
  ['Via 1 — Seguranca Social',           r.vias.v1.ss,                 15099.84],
  ['Via 1 — IRS imputavel',              r.vias.v1.irs,                21022.9390],
  ['Via 1 — liquido para a socia',       r.vias.v1.liquido,            11513.2210],
  ['Via 2 — Seguranca Social',           r.vias.v2.ss,                 8660.4516],
  ['Via 2 — IRS imputavel',              r.vias.v2.irs,                7300.0558],
  ['Via 2 — liquido para a socia',       r.vias.v2.liquido,            31675.4926],
  ['Via 3 — IRS imputavel',              r.vias.v3.irs,                7477.9216],
  ['Via 3 — liquido para a socia',       r.vias.v3.liquido,            33520.0784],
  ['IVA irrecuperavel',                  r.tesouraria.ivaIrrecuperavel, 10810],
  ['Tesouraria — arranque',              r.tesouraria.arranque,        61410],
  ['Tesouraria — necessidade maxima',    r.tesouraria.necessidade,     62330.9286],
  ['Tesouraria — total antes de abrir',  r.tesouraria.totalAntesDeAbrir, 67305.9286],
  ['Tesouraria — faturacao ano 1',       r.tesouraria.faturacaoAno1,   78097.0667],
  ['Risco laboral — passivo',            r.riscoLaboral.passivo,       77064.75],
];

let falhas = 0;
console.log('grandeza'.padEnd(38) + 'motor JS'.padStart(16) + 'Excel'.padStart(16) + '  estado');
for (const [nome, obtido, esperado] of casos) {
  const ok = Math.abs(obtido - esperado) < TOL;
  if (!ok) falhas++;
  console.log(nome.padEnd(38) + obtido.toFixed(4).padStart(16) +
              esperado.toFixed(4).padStart(16) + '  ' + (ok ? 'OK' : 'DIVERGE'));
}
// coerencia interna
const soma = r.vias.v2.liquido + r.vias.v2.carga;
const ok2 = Math.abs(soma - r.economia.caixa) < TOL;
console.log('\nidentidade caixa = liquido + carga (via 2): ' + (ok2 ? 'OK' : 'DIVERGE'));
if (!ok2) falhas++;

console.log(`\n${casos.length + 1} verificacoes, ${falhas} divergencia(s)`);
process.exit(falhas ? 1 : 0);
