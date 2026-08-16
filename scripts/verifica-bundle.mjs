import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cenarioBase } from '/home/user/Generate-/tests/fixtures/saft.mjs';

const ALVO = process.env.ALVO || 'file:///home/user/Generate-/dist/hub.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const pagina = await browser.newPage();
const erros = [];
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
pagina.on('pageerror', (e) => erros.push(String(e)));

await pagina.goto(ALVO);
await pagina.waitForTimeout(500);

const pasta = mkdtempSync(join(tmpdir(), 'saft-'));
const f = join(pasta, 't.xml');
writeFileSync(f, cenarioBase());
await pagina.setInputFiles('#ficheiro-saft', f);
await pagina.waitForTimeout(900);
const resumo = await pagina.locator('#resumo-saft').innerText();
console.log('SAF-T lido:', resumo.includes('Clinica de Teste') ? 'sim' : 'NAO');
console.log('receita 160,00:', resumo.includes('160,00') ? 'sim' : 'NAO');

for (const r of ['f1','f2','f3','f4','f5','f6','f7','privacidade','pressupostos','perfil']) {
  await pagina.goto(ALVO + '#' + r);
  await pagina.waitForTimeout(150);
  if (!(await pagina.locator('#seccao-' + r).isVisible())) console.log('SECCAO FALHOU:', r);
}
await pagina.goto(ALVO + '#f3');
await pagina.waitForTimeout(200);
await pagina.locator('#controlo-f3 button').click();
await pagina.waitForTimeout(500);
const f3 = await pagina.locator('#saida-f3').innerText();
console.log('F3 corre:', f3.length > 200 ? 'sim' : 'NAO');
console.log('F3 declara lacunas:', /nao consegui/i.test(f3) ? 'sim' : 'NAO');
console.log('erros de consola:', erros.length, erros.slice(0,3).join(' | '));
await browser.close();
