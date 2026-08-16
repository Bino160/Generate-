/**
 * Percurso completo do editor de perfil num browser real.
 *
 * Preenche gabinetes, ocupacao, equipa, precario e uma convencao, e confirma
 * que o F1, o F2 e o F7 passam a correr a partir do perfil em vez de caixas de
 * JSON. E o teste que distingue "os motores existem" de "da para usar".
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cenarioBase } from '../tests/fixtures/saft.mjs';

const ALVO = 'file:///home/user/Generate-/dist/hub.html';
const falhas = [];
const ok = (c, d) => { if (c) console.log(`  ok   ${d}`); else { falhas.push(d); console.log(`  FALHA ${d}`); } };

/** Clica e espera que a linha nova exista, em vez de adivinhar um tempo. */
async function acrescenta(pagina, botao, seletorEsperado) {
  await pagina.getByRole('button', { name: botao }).click();
  await pagina.locator(seletorEsperado).first().waitFor({ state: 'visible', timeout: 5000 });
}

const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const erros = [];
p.on('pageerror', (e) => { erros.push(e.message); console.log('  >>> PAGEERROR:', e.message); });
p.on('console', (m) => { if (m.type() === 'error') { erros.push(m.text()); console.log('  >>> CONSOLE:', m.text()); } });

await p.goto(ALVO);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(300);

// SAF-T primeiro, para o mes de referencia e a correspondencia terem base.
const pasta = mkdtempSync(join(tmpdir(), 'saft-'));
const f = join(pasta, 't.xml');
writeFileSync(f, cenarioBase());
await p.setInputFiles('#ficheiro-saft', f);
await p.locator('#resumo-saft .bloco').first().waitFor({ state: 'visible' });

await p.goto(`${ALVO}#perfil`);
await p.waitForTimeout(300);

console.log('Gabinetes');
await acrescenta(p, 'Acrescentar gabinete', 'input[aria-label="Horas por dia"]');
await p.getByRole('button', { name: 'Acrescentar gabinete' }).click();
await p.locator('input[aria-label="Horas por dia"]').nth(1).waitFor({ state: 'visible' });
ok(await p.locator('tr.detalhe .dias').count() === 2, 'cada gabinete tem seletor de dias');
ok(await p.locator('input[aria-label="Horas por dia"]').count() === 2, 'cada gabinete tem horas por dia');

console.log('Ocupacao por faixa');
const caixasOcupacao = p.locator('input[aria-label^="Horas ocupadas"]');
const nFaixas = await caixasOcupacao.count();
ok(nFaixas >= 10, `a grelha tem ${nFaixas} faixas com capacidade`);
for (let i = 0; i < Math.min(4, nFaixas); i += 1) {
  await caixasOcupacao.nth(i).fill('20');
}
await p.waitForTimeout(200);
ok((await p.locator('table.grelha').innerText()).includes('%'), 'a grelha calcula a ocupacao');

console.log('Equipa');
await acrescenta(p, 'Acrescentar pessoa', 'select[aria-label="Vinculo"]');
ok(await p.locator('select[aria-label="Vinculo"]').count() === 1, 'ha campo de vinculo');
ok(await p.locator('select[aria-label="Remuneracao"]').count() === 1, 'ha tipo de remuneracao');
ok(await p.locator('select[aria-label="Base"]').count() === 1, 'ha base, producao ou recebido');
ok(await p.locator('label.caixa').count() >= 8, 'ha quem suporta e os indicios do artigo 12');
await p.locator('input[aria-label="Nome"]').first().fill('Dra. A');
await p.locator('input[aria-label="%"]').first().fill('45');
await p.locator('input[aria-label="Producao por mes, em euros"]').fill('12000');
await p.locator('input[aria-label="Horas-gabinete por mes"]').fill('120');
await p.locator('input[aria-label="Dependencia economica, %"]').fill('90');
await p.waitForTimeout(300);

console.log('Tabela de precos');
await acrescenta(p, 'Acrescentar ato', 'input[aria-label="Codigo"]');
await p.locator('input[aria-label="Codigo"]').first().fill('CONS');
await p.locator('input[aria-label="Ato"]').first().fill('Consulta');
await p.locator('input[aria-label="Preco"]').first().fill('60');
await p.locator('input[aria-label="Custo variavel"]').first().fill('9');
await p.locator('input[aria-label="Minutos"]').first().fill('30');
await p.locator('input[aria-label="Volume por mes"]').first().fill('100');
await p.waitForTimeout(600);
// Localiza a tabela pelo conteudo e nao pela posicao: com a grelha de ocupacao
// presente o indice muda, e um teste que depende de indices parte sozinho.
const precario = await p.locator('input[aria-label="Codigo"]').first()
  .evaluate((n) => n.closest('table').innerText);
ok(precario.replace(/\u00a0/g, ' ').includes('102,00'),
  `margem por hora calculada: 51 euros em meia hora dao 102 por hora. Veio: ${JSON.stringify(precario)}`);

console.log('Convencao');
await acrescenta(p, 'Acrescentar convencao', 'input[aria-label="Entidade"]');
await p.locator('input[aria-label="Entidade"]').first().fill('MEDIS');
await p.waitForTimeout(200);
const precoConv = p.locator('input[aria-label^="precoCent de"]').first();
ok(await precoConv.count() > 0, 'a convencao mostra o catalogo de atos para dar preco');
await precoConv.fill('25');
await p.locator('input[aria-label^="volumeMes de"]').first().fill('109');
await p.waitForTimeout(300);
const conv = await p.locator('tr.detalhe').last().innerText();
ok(conv.includes('/h'), 'a convencao mostra a margem por hora');
ok((await p.locator('.abaixo-do-privado').count()) > 0, 'marca quando a convencao rende menos por hora que o privado');

console.log('Correspondencia de entidades');
await acrescenta(p, 'Acrescentar regra', 'input[aria-label="Padrao"]');
await p.locator('input[aria-label="Entidade"]').last().fill('MEDIS');
await p.locator('input[aria-label="Padrao"]').fill('^MEDIS-');
await p.waitForTimeout(300);

console.log('As ferramentas passam a correr do perfil');
await p.goto(`${ALVO}#f2`);
await p.waitForTimeout(500);
const f2 = (await p.locator('#saida-f2').innerText()).toLowerCase();
ok(f2.includes('manter') || f2.includes('sair') || f2.includes('renegociar'), 'o F2 corre do perfil, sem JSON');
ok((await p.locator('#controlo-f2').innerText()).includes('Horas ocupadas declaradas'), 'o F2 mostra de onde vem cada numero');
ok(f2.includes('alocacao') || f2.includes('faixa'), 'o modulo de alocacao a faixas vazias passa a correr');

await p.goto(`${ALVO}#f7`);
await p.waitForTimeout(500);
const f7 = (await p.locator('#saida-f7').innerText()).toLowerCase();
ok(f7.includes('entidade contratante'), 'o F7 corre da equipa do perfil');
ok(f7.includes('artigo 12') || f7.includes('reclassificacao'), 'o F7 mostra o risco laboral');

await p.goto(`${ALVO}#f1`);
await p.waitForTimeout(500);
const f1 = (await p.locator('#saida-f1').innerText()).toLowerCase();
ok(f1.includes('ocupacao'), 'o F1 passa a ter taxa de ocupacao');

console.log('Persistencia');
await p.reload();
await p.waitForTimeout(400);
await p.goto(`${ALVO}#perfil`);
await p.waitForTimeout(400);
ok((await p.locator('input[aria-label="Nome"]').first().inputValue()) === 'Dra. A', 'o perfil sobrevive ao recarregar');

console.log('erros de consola:', erros.length, erros.slice(0, 3).join(' | '));
if (erros.length) falhas.push('erros de consola');
await p.screenshot({ path: '/home/user/Generate-/dist/perfil.png', fullPage: false });
await b.close();

if (falhas.length) { console.log(`\n${falhas.length} falhas.`); process.exit(1); }
console.log('\nPerfil completo, verificado.');
