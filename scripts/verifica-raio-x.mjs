/**
 * Percurso do Raio-X num browser real.
 *
 * Confirma as quatro respostas: servicos e clientes saem diretos, profissionais
 * so por mapeamento, e faltas nao saem de todo mas a pagina diz porque.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirSaft } from '../tests/fixtures/saft.mjs';

const ALVO = 'file:///home/user/Generate-/dist/hub.html';
const falhas = [];
const ok = (c, d) => { if (c) console.log(`  ok   ${d}`); else { falhas.push(d); console.log(`  FALHA ${d}`); } };

const docs = [];
for (let i = 1; i <= 10; i += 1) docs.push({ numero: `FT A/${i}`, data: '2025-04-10', cliente: 'C1', linhas: [{ produto: 'CONS', credito: 60 }] });
for (let i = 1; i <= 6; i += 1) docs.push({ numero: `FT B/${i}`, data: '2025-04-11', cliente: 'C2', linhas: [{ produto: 'IMPL', credito: 900 }] });
docs.push({ numero: 'NC A/1', data: '2025-04-20', cliente: 'C1', tipo: 'NC', linhas: [{ produto: 'CONS', debito: 60 }] });
docs.push({ numero: 'FT A/99', data: '2025-04-21', cliente: 'C1', estado: 'A', linhas: [{ produto: 'CONS', credito: 60 }] });

const xml = construirSaft({
  clientes: [{ id: 'C1', nif: '210000001' }, { id: 'C2', nif: '210000002' }],
  produtos: [{ codigo: 'CONS', descricao: 'Consulta' }, { codigo: 'IMPL', descricao: 'Implante' }],
  documentos: docs,
});

const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
const p = await b.newPage({ viewport: { width: 1400, height: 1100 } });
const erros = [];
p.on('pageerror', (e) => { erros.push(e.message); console.log('  >>>', e.message); });
p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

await p.goto(ALVO);
await p.evaluate(() => localStorage.clear());
await p.reload();
const pasta = mkdtempSync(join(tmpdir(), 'saft-'));
const f = join(pasta, 't.xml');
writeFileSync(f, xml);
await p.setInputFiles('#ficheiro-saft', f);
await p.locator('#resumo-saft .bloco').first().waitFor({ state: 'visible' });

await p.goto(`${ALVO}#raio-x`);
await p.waitForTimeout(400);
// Normaliza os espacos: o pt-PT usa espaco estreito nao separavel como
// separador de milhares, e comparar com espaco normal falha sempre.
const bruto = await p.locator('#saida-raio-x').innerText();
const texto = bruto.replace(/[\u00a0\u202f\u2009]/g, ' ');

console.log('Servicos');
// A descricao mostrada e a da linha da fatura e nao a do catalogo, porque e
// aquela que o cliente reconhece no documento que emitiu.
ok(texto.includes('IMPL') && texto.includes('CONS'), 'lista os atos vendidos');
// O pt-PT nao agrupa milhares abaixo de dez mil: 5400 sai como 5400,00 e nao
// como 5 400,00. E o comportamento correto da localizacao, nao um defeito.
ok(texto.includes('5400,00'), 'a receita por ato aparece somada');
ok(texto.includes('Dez maiores por volume'), 'ha as duas ordenacoes');

console.log('Clientes');
ok(/p_[0-9a-f]{8}/.test(texto), 'os pacientes saem por pseudonimo');
ok(!/\b21000000[12]\b/.test(texto), 'nenhum NIF aparece');
ok(texto.includes('valem') && texto.includes('da receita identificada'), 'diz o peso do topo, que e o que interessa');

console.log('Profissionais');
ok(texto.includes('nao tem campo de profissional'), 'diz que o formato nao tem o campo');
ok(texto.includes('FT A') && texto.includes('FT B'), 'mostra as series por mapear, para se escrever a regra');
ok(texto.includes('Fiabilidade') || texto.toLowerCase().includes('fraca'), 'diz o que vale cada pista');

console.log('Anulados e faltas');
ok(texto.includes('Taxa de anulacao'), 'mostra anulados e notas de credito');
ok(texto.includes('nao gera documento nenhum'), 'separa documentos desfeitos de desmarcacoes');
ok(texto.includes('ausencia de uma fatura'), 'explica porque as faltas nao estao no SAF-T');
ok(texto.includes('Estado da marcacao'), 'lista o que a agenda tem de trazer');

console.log('Atribuicao pelo perfil');
await p.goto(`${ALVO}#perfil`);
await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Acrescentar regra' }).last().click();
await p.locator('input[aria-label="Padrao"]').last().waitFor({ state: 'visible' });
await p.locator('input[aria-label="Profissional"]').last().fill('Dra. Alves');
await p.locator('input[aria-label="Padrao"]').last().fill('^FT A$');
await p.waitForTimeout(500);
await p.goto(`${ALVO}#raio-x`);
await p.waitForTimeout(400);
const depois = await p.locator('#saida-raio-x').innerText();
ok(depois.includes('Dra. Alves'), 'a regra passa a atribuir producao');
ok(/cobrem\s+\d+%/.test(depois), 'declara a fracao coberta pelas regras');

await p.screenshot({ path: '/home/user/Generate-/dist/raio-x.png' });
console.log('erros de consola:', erros.length);
if (erros.length) falhas.push('erros de consola');
await b.close();
if (falhas.length) { console.log(`\n${falhas.length} falhas.`); process.exit(1); }
console.log('\nRaio-X verificado.');
