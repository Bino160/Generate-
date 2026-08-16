/**
 * Testes de contrato.
 *
 * Verificam as regras transversais de QA da especificacao contra todas as sete
 * ferramentas de uma vez, em vez de as verificar sete vezes a mao. Uma
 * ferramenta nova que se esqueca de declarar lacunas falha aqui, nao em
 * producao.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Resultado, NATUREZA } from '../src/core/contrato.js';
import { Lacunas } from '../src/core/lacunas.js';
import { pressupostos, ESTADO, porConfirmar, valor, etiqueta } from '../src/config/pressupostos.js';
import { auditaFugaDeIdentificadores } from '../src/core/anonimizacao.js';

import { painelMensal } from '../src/ferramentas/f1-painel-mensal.js';
import { simuladorConvencoes } from '../src/ferramentas/f2-convencoes.js';
import { prontidaoParaTransacao } from '../src/ferramentas/f3-prontidao-transacao.js';
import { barometro } from '../src/ferramentas/f4-barometro.js';
import { funilPlanos } from '../src/ferramentas/f5-funil-planos.js';
import { investimentoEquipamento } from '../src/ferramentas/f6-equipamento.js';
import { remuneracao } from '../src/ferramentas/f7-remuneracao.js';
import { perfilVazio } from '../src/core/perfil.js';
import { analisaSaft } from '../src/core/saft.js';
import { Anonimizador } from '../src/core/anonimizacao.js';
import { cenarioBase } from './fixtures/saft.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Cada ferramenta corrida com a entrada mais pobre possivel.
 * E o caso do primeiro mes de um cliente novo, e o que nunca se testa.
 */
async function todasAsFerramentasComEntradaPobre() {
  const saft = await analisaSaft(cenarioBase(), { anonimizador: await Anonimizador.cria() });
  return [
    painelMensal({ serie: [], perfil: perfilVazio() }),
    simuladorConvencoes({ convencoes: [], atosPrivadosEquivalentes: [], capacidade: {} }),
    prontidaoParaTransacao({ ebitdaDeclaradoCent: 0, equipa: [] }),
    barometro({ saft, perfil: perfilVazio(), contexto: {}, periodo: {} }),
    funilPlanos({ planos: [] }),
    investimentoEquipamento({
      equipamento: { precoSemIvaCent: 100000, vidaUtilAnos: 5, margemContribuicaoPorAtoCent: 1000 },
      perfil: perfilVazio(),
    }),
    remuneracao({ profissionais: [], perfil: perfilVazio() }),
  ];
}

test('contrato: toda a ferramenta declara o que nao conseguiu calcular', async () => {
  for (const r of await todasAsFerramentasComEntradaPobre()) {
    assert.ok(r instanceof Resultado, `${r?.ferramenta} nao devolveu um Resultado`);
    assert.ok(r.lacunas instanceof Lacunas, `${r.ferramenta} nao devolveu lacunas`);
    assert.ok(
      r.lacunas.itens.length > 0,
      `${r.ferramenta} correu com entrada vazia e nao declarou nenhuma lacuna. ` +
      'Silencio sobre um calculo em falta e o erro mais caro em consultoria financeira.',
    );
  }
});

test('contrato: toda a ferramenta produz um veredito em portugues corrente', async () => {
  for (const r of await todasAsFerramentasComEntradaPobre()) {
    assert.ok(r.veredito, `${r.ferramenta} sem veredito`);
    assert.ok(r.veredito.frase.length > 15, `${r.ferramenta} com veredito vazio`);
    assert.ok(r.veredito.frase.length <= 320, `${r.ferramenta} com veredito que nao cabe numa frase`);
    assert.ok(
      !/\b(KPI|dashboard|benchmark|insight|driver|performance)\b/i.test(r.veredito.frase),
      `${r.ferramenta} usa jargao no veredito: ${r.veredito.frase}`,
    );
  }
});

test('contrato: toda a lacuna tem mensagem acionavel', async () => {
  for (const r of await todasAsFerramentasComEntradaPobre()) {
    for (const l of r.lacunas.itens) {
      assert.ok(l.mensagem.length >= 30, `${r.ferramenta}/${l.codigo}: mensagem curta demais`);
      assert.ok(['BLOQUEIA', 'DEGRADA', 'INFORMA'].includes(l.gravidade));
    }
  }
});

test('contrato: nenhuma saida contem identificadores em claro', async () => {
  for (const r of await todasAsFerramentasComEntradaPobre()) {
    const fugas = auditaFugaDeIdentificadores(r.toJSON());
    assert.deepEqual(fugas, [], `${r.ferramenta} deixou passar identificadores: ${JSON.stringify(fugas)}`);
  }
});

test('contrato: sem cedula, qualquer bloco fiscal ou juridico fecha a exportacao', () => {
  assert.equal(valor('P-05').cedulaOCC, false, 'este teste assume o cenario conservador de P-05');
  const r = new Resultado('TESTE', 'Teste');
  r.defineVeredito('Uma frase de veredito com dimensao suficiente.');
  assert.equal(r.exportavel, true);
  r.acrescentaBloco({ id: 'x', titulo: 'x', tipo: 'lista', dados: {}, natureza: NATUREZA.FISCAL });
  assert.equal(r.exportavel, false);
  assert.match(r.motivoNaoExportavel, /P-05/);
});

test('contrato: o limite de tres alertas nao pode ser contornado', () => {
  const r = new Resultado('TESTE', 'Teste');
  for (let i = 0; i < 9; i += 1) {
    r.acrescentaAlerta({ codigo: `a${i}`, titulo: 't', explicacao: 'e', impactoCent: i * 1000 });
  }
  r.limitaAlertas(3);
  assert.equal(r.alertas.length, 3);
  assert.equal(r.alertasEmAnexo.length, 6);
  assert.equal(r.alertas[0].impactoCent, 8000, 'o de maior impacto tem de vir primeiro');
});

test('contrato: uma rutura de nivel nao rouba lugar aos tres desvios', () => {
  const r = new Resultado('TESTE', 'Teste');
  r.acrescentaAlerta({ codigo: 'r', titulo: 't', explicacao: 'e', impactoCent: 1, classe: 'RUTURA' });
  for (let i = 0; i < 5; i += 1) {
    r.acrescentaAlerta({ codigo: `a${i}`, titulo: 't', explicacao: 'e', impactoCent: i * 1000 });
  }
  r.limitaAlertas(3);
  assert.equal(r.alertas.length, 4);
  assert.equal(r.alertas[0].classe, 'RUTURA');
});

test('contrato: um veredito que nao cabe numa frase e recusado', () => {
  const r = new Resultado('TESTE', 'Teste');
  assert.throws(() => r.defineVeredito('a'.repeat(400)), /uma frase/);
});

test('pressupostos: todos tem identificador, estado valido e nota util', () => {
  for (const [chave, p] of Object.entries(pressupostos)) {
    assert.equal(chave, p.id, `a chave ${chave} nao bate com o id ${p.id}`);
    assert.match(p.id, /^P-\d{2}$/);
    assert.ok(Object.values(ESTADO).includes(p.estado), `${p.id} com estado invalido`);
    assert.ok(p.assunto && p.assunto.length > 10, `${p.id} sem assunto`);
    assert.ok(p.nota && p.nota.length > 30, `${p.id} sem nota util para quem vai decidir`);
    assert.ok('valor' in p, `${p.id} sem valor`);
  }
});

test('pressupostos: as cinco decisoes da especificacao estao todas registadas', () => {
  for (const id of ['P-01', 'P-02', 'P-03', 'P-04', 'P-05']) {
    assert.ok(pressupostos[id], `falta o pressuposto ${id}`);
  }
  assert.ok(porConfirmar().length >= 5, 'as cinco decisoes tem de continuar por confirmar ate haver resposta');
});

test('pressupostos: valor e etiqueta rebentam com identificador desconhecido', () => {
  assert.throws(() => valor('P-99'), /desconhecido/);
  assert.throws(() => etiqueta('P-99'), /desconhecido/);
});

test('pressupostos: cada um esta documentado em docs/PRESSUPOSTOS.md', () => {
  const doc = readFileSync(join(raiz, 'docs/PRESSUPOSTOS.md'), 'utf8');
  for (const id of Object.keys(pressupostos)) {
    assert.ok(doc.includes(id), `${id} existe no codigo mas nao esta em docs/PRESSUPOSTOS.md`);
  }
});

test('contrato: nenhum motor tem uma taxa de dominio escrita a mao', () => {
  // Procura percentagens plausiveis de dominio fiscal fora do ficheiro de
  // pressupostos. Se aparecer uma, e um numero magico e tem de subir para P-nn.
  const suspeitas = [/0\.214\b/, /0\.075\b/, /\b23\s*%/];
  const dir = join(raiz, 'src/ferramentas');
  for (const f of readdirSync(dir)) {
    const conteudo = readFileSync(join(dir, f), 'utf8');
    const codigo = conteudo
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .join('\n');
    for (const s of suspeitas) {
      assert.ok(!s.test(codigo), `${f} tem uma taxa de dominio escrita a mao (${s}). Tem de vir de pressupostos.js`);
    }
  }
});
