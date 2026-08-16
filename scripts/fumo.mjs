/**
 * Teste de fumo do hub num browser real.
 *
 * Nao substitui os testes unitarios. Verifica o que so quebra no browser:
 * modulos que nao resolvem, WebCrypto indisponivel, erros de consola,
 * e o percurso completo de carregar um SAF-T e correr as sete ferramentas.
 *
 * Corre com: node scripts/fumo.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cenarioBase } from '../tests/fixtures/saft.mjs';

const PORTA = 8099;
const BASE = `http://localhost:${PORTA}`;

const servidor = spawn(process.execPath, ['scripts/servidor.mjs'], {
  env: { ...process.env, PORTA: String(PORTA) },
  stdio: 'ignore',
});

async function esperaServidor() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return;
    } catch { /* ainda a subir */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('O servidor nao subiu.');
}

const falhas = [];
function verifica(condicao, descricao) {
  if (condicao) process.stdout.write(`  ok   ${descricao}\n`);
  else { falhas.push(descricao); process.stdout.write(`  FALHA ${descricao}\n`); }
}

try {
  await esperaServidor();
  const browser = await chromium.launch(
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
  );
  const pagina = await browser.newPage();

  const errosConsola = [];
  const pedidosExternos = [];
  pagina.on('console', (m) => { if (m.type() === 'error') errosConsola.push(m.text()); });
  pagina.on('pageerror', (e) => errosConsola.push(String(e)));
  pagina.on('request', (r) => {
    if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) pedidosExternos.push(r.url());
  });

  process.stdout.write('Carregamento inicial\n');
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  verifica(await pagina.title() !== '', 'a pagina tem titulo');
  verifica(await pagina.locator('.marca').isVisible(), 'a navegacao aparece');

  process.stdout.write('Carregar SAF-T\n');
  const pasta = mkdtempSync(join(tmpdir(), 'saft-'));
  const ficheiro = join(pasta, 'teste.xml');
  writeFileSync(ficheiro, cenarioBase());
  await pagina.setInputFiles('#ficheiro-saft', ficheiro);
  await pagina.locator('#resumo-saft .bloco').first().waitFor({ state: 'visible', timeout: 5000 });
  const resumo = await pagina.locator('#resumo-saft').innerText();
  verifica(resumo.includes('Clinica de Teste'), 'o resumo mostra a clinica lida');
  verifica(/1[\s.]?60|1,60/.test(resumo) || resumo.includes('160,00'), 'a receita liquida aparece formatada em euros');
  verifica(!/\b21000000[12]\b/.test(resumo), 'nenhum NIF de paciente aparece no ecra');

  process.stdout.write('Percorrer as sete ferramentas\n');
  for (const rota of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'privacidade', 'pressupostos', 'perfil']) {
    await pagina.goto(`${BASE}/#${rota}`);
    await pagina.waitForTimeout(120);
    const visivel = await pagina.locator(`#seccao-${rota}`).isVisible();
    verifica(visivel, `a seccao ${rota} abre`);
  }

  process.stdout.write('Correr as ferramentas com entrada estruturada\n');
  for (const rota of ['f3', 'f5', 'f6']) {
    await pagina.goto(`${BASE}/#${rota}`);
    await pagina.waitForTimeout(100);
    await pagina.locator(`#controlo-${rota} button`).click();
    await pagina.waitForTimeout(200);
    const saida = await pagina.locator(`#saida-${rota}`).innerText();
    verifica(saida.length > 80, `${rota} produz saida`);
    verifica(saida.includes('nao consegui calcular') || saida.includes('Nao consegui'),
      `${rota} declara o que nao conseguiu calcular`);
  }

  process.stdout.write('F1 e F2 com o SAF-T carregado\n');
  await pagina.goto(`${BASE}/#dados`);
  await pagina.setInputFiles('#ficheiro-saft', ficheiro);
  await pagina.locator('#resumo-saft .bloco').first().waitFor({ state: 'visible' });
  await pagina.goto(`${BASE}/#f1`);
  await pagina.waitForTimeout(300);
  const f1 = await pagina.locator('#saida-f1').innerText();
  verifica(f1.includes('calibrar') || f1.includes('Painel') || f1.length > 100, 'o F1 corre com o SAF-T carregado');
  verifica(f1.toLowerCase().includes('agenda'), 'o F1 declara a ausencia de agenda em vez de estimar ocupacao');

  // Sem convencoes no perfil, o F2 encaminha para o perfil em vez de mostrar uma
  // caixa de JSON. O percurso com o perfil preenchido esta em verifica-perfil.mjs,
  // que e onde se verifica a matriz de decisao a serio.
  await pagina.goto(`${BASE}/#f2`);
  await pagina.waitForTimeout(200);
  const f2 = (await pagina.locator('#seccao-f2').innerText()).toLowerCase();
  verifica(f2.includes('perfil'), 'o F2 sem convencoes encaminha para o perfil');
  verifica(
    (await pagina.locator('#controlo-f2 a[href="#perfil"]').count()) === 1,
    'o encaminhamento e uma ligacao e nao so uma frase',
  );

  process.stdout.write('Privacidade e rede\n');
  verifica(pedidosExternos.length === 0, `nenhum pedido para fora da origem (vieram ${pedidosExternos.length})`);
  verifica(errosConsola.length === 0, `sem erros de consola (vieram ${errosConsola.length}: ${errosConsola.slice(0, 3).join(' | ')})`);

  const guardado = await pagina.evaluate(() => JSON.stringify(localStorage));
  verifica(!/\b\d{9}\b/.test(guardado), 'nao ha identificadores de nove digitos no armazenamento local');

  await browser.close();
} finally {
  servidor.kill();
}

if (falhas.length > 0) {
  process.stdout.write(`\n${falhas.length} falhas de fumo.\n`);
  process.exit(1);
}
process.stdout.write('\nFumo limpo.\n');
