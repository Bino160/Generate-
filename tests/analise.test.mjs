import test from 'node:test';
import assert from 'node:assert/strict';

import {
  servicosVendidos, pacientesPorReceita, entidadesPorReceita,
  criaAtribuicao, producaoPorProfissional, atosDesfeitos, porqueNaoHaFaltas,
  PISTAS_DE_AUTORIA,
} from '../src/core/analise.js';
import { analisaSaft } from '../src/core/saft.js';
import { Anonimizador } from '../src/core/anonimizacao.js';
import { criaCorrespondencia } from '../src/core/perfil.js';
import { construirSaft, cenarioBase } from './fixtures/saft.mjs';

async function le(xml) {
  return analisaSaft(xml, { anonimizador: await Anonimizador.cria() });
}

/** Cenario com series por profissional, que e o caso realista de atribuicao. */
function comProfissionais() {
  const docs = [];
  // Dra. Alves, serie A: 10 consultas de 60 euros.
  for (let i = 1; i <= 10; i += 1) {
    docs.push({ numero: `FT A/${i}`, data: '2025-04-10', cliente: 'C1', linhas: [{ produto: 'CONS', credito: 60 }] });
  }
  // Dr. Bento, serie B: 4 destartarizacoes de 45 e 2 implantes de 900.
  for (let i = 1; i <= 4; i += 1) {
    docs.push({ numero: `FT B/${i}`, data: '2025-04-11', cliente: 'C2', linhas: [{ produto: 'DEST', credito: 45 }] });
  }
  for (let i = 5; i <= 6; i += 1) {
    docs.push({ numero: `FT B/${i}`, data: '2025-04-12', cliente: 'C2', linhas: [{ produto: 'IMPL', credito: 900 }] });
  }
  // Sem serie reconhecivel.
  docs.push({ numero: 'FS X/1', data: '2025-04-13', cliente: 'CF', tipo: 'FS', linhas: [{ produto: 'CONS', credito: 60 }] });

  return construirSaft({
    clientes: [
      { id: 'C1', nif: '210000001' },
      { id: 'C2', nif: '210000002' },
      { id: 'CF', nif: '999999990' },
    ],
    produtos: [
      { codigo: 'CONS', descricao: 'Consulta' },
      { codigo: 'DEST', descricao: 'Destartarizacao' },
      { codigo: 'IMPL', descricao: 'Implante' },
    ],
    documentos: docs,
  });
}

// ---------------------------------------------------------------------------
// Servicos
// ---------------------------------------------------------------------------

test('servicos: ordena por receita e conta atos', async () => {
  const s = await le(comProfissionais());
  const r = servicosVendidos(s);
  assert.equal(r.nDistintos, 3);
  assert.equal(r.porReceita[0].codigo, 'IMPL');
  assert.equal(r.porReceita[0].receitaCent, 180000);
  assert.equal(r.porVolume[0].codigo, 'CONS');
  assert.equal(r.porVolume[0].atos, 11);
});

test('servicos: a nota de credito abate na receita e na contagem', async () => {
  const s = await le(cenarioBase());
  const r = servicosVendidos(s);
  const consulta = [...r.porReceita, ...r.porVolume].find((x) => x.codigo === 'CONS');
  // Tres consultas faturadas a 60, 60 e 30, menos uma nota de credito de 60.
  assert.equal(consulta.receitaCent, 9000);
  assert.equal(consulta.atos, 2, 'um ato faturado e depois creditado nao foi vendido');
});

test('servicos: o peso na receita soma um', async () => {
  const s = await le(comProfissionais());
  const r = servicosVendidos(s);
  const total = r.porReceita.reduce((a, l) => a + l.pesoNaReceita, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test('servicos: com precario acrescenta margem por hora e ordena por ela', async () => {
  const s = await le(comProfissionais());
  const precario = new Map([
    ['CONS', { duracaoMinutos: 30, custoVariavelCent: 900 }],
    ['IMPL', { duracaoMinutos: 120, custoVariavelCent: 40000 }],
  ]);
  const r = servicosVendidos(s, { precario });

  const cons = r.porReceita.find((x) => x.codigo === 'CONS');
  // 11 consultas a 60 menos 9 de custo, em meia hora cada.
  assert.equal(cons.margemPorHoraCent, 10200);
  const impl = r.porReceita.find((x) => x.codigo === 'IMPL');
  // 2 implantes a 900 menos 400, em duas horas cada.
  assert.equal(impl.margemPorHoraCent, 25000);

  assert.equal(r.porMargemHora[0].codigo, 'IMPL');
  assert.deepEqual(r.codigosSemPrecario, ['DEST'], 'diz que codigos e que nao tem duracao');
  assert.ok(r.coberturaDoPrecario < 1);
});

test('servicos: sem precario nao inventa margem', async () => {
  const s = await le(comProfissionais());
  const r = servicosVendidos(s);
  assert.ok(r.porReceita.every((l) => l.margemPorHoraCent === null));
  assert.equal(r.porMargemHora.length, 0);
});

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

test('pacientes: agrupa por pseudonimo e declara a cobertura', async () => {
  const s = await le(comProfissionais());
  const r = pacientesPorReceita(s);
  assert.equal(r.nPacientes, 2, 'o consumidor final nao e um paciente');
  assert.equal(r.topo[0].receitaCent, 198000, 'C2 fez 4 destartarizacoes e 2 implantes');
  assert.ok(r.cobertura < 1, 'a receita de consumidor final fica de fora e isso tem de aparecer');
  assert.equal(r.receitaConsumidorFinalCent, 6000);
});

test('pacientes: o peso do topo e o numero que interessa, nao a lista', async () => {
  const s = await le(comProfissionais());
  const r = pacientesPorReceita(s, { limite: 1 });
  assert.equal(r.topo.length, 1);
  assert.ok(r.pesoDoTopo > 0.7, 'com dois pacientes o maior pesa muito, e o risco tem de ser visivel');
});

test('pacientes: nenhum identificador em claro na saida', async () => {
  const s = await le(comProfissionais());
  const r = pacientesPorReceita(s);
  assert.ok(r.topo.every((p) => /^p_[0-9a-f]{32}$/.test(p.pseudonimo)));
});

test('entidades: reparte por pagador e mede a concentracao', async () => {
  const s = await le(cenarioBase());
  const corresp = criaCorrespondencia({
    correspondenciaEntidades: [{ entidade: 'MEDIS', campo: 'produto', padrao: '^MEDIS-' }],
  });
  const r = entidadesPorReceita(s, corresp);
  const medis = r.linhas.find((l) => l.entidade === 'MEDIS');
  assert.equal(medis.receitaCent, 2500);
  assert.ok(r.pesoDaMaior > 0.5);
  assert.equal(r.temRegras, true);
});

test('entidades: sem regras marca tudo como nao mapeado em vez de fingir', async () => {
  const s = await le(cenarioBase());
  const r = entidadesPorReceita(s, criaCorrespondencia({}));
  assert.equal(r.temRegras, false);
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].entidade, 'NAO MAPEADO');
});

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------

test('saft: guarda a serie e o utilizador que emitiu', async () => {
  const s = await le(comProfissionais());
  const d = s.documentosValidos.find((x) => x.numero === 'FT A/3');
  assert.equal(d.serie, 'FT A');
  assert.equal(d.origemId, '1', 'o SourceID do documento, nao o de DocumentStatus');
});

test('profissionais: atribui por serie e declara o que ficou de fora', async () => {
  const s = await le(comProfissionais());
  const atribuicao = criaAtribuicao([
    { profissional: 'Dra. Alves', pista: 'serie', padrao: '^FT A$' },
    { profissional: 'Dr. Bento', pista: 'serie', padrao: '^FT B$' },
  ]);
  const r = producaoPorProfissional(s, atribuicao);

  assert.equal(r.linhas.length, 2);
  const alves = r.linhas.find((l) => l.profissional === 'Dra. Alves');
  const bento = r.linhas.find((l) => l.profissional === 'Dr. Bento');
  assert.equal(alves.receitaCent, 60000);
  assert.equal(bento.receitaCent, 198000);
  assert.equal(bento.atos, 6);

  assert.equal(r.naoAtribuidoCent, 6000, 'a fatura simplificada sem serie reconhecida fica por atribuir');
  assert.ok(r.cobertura < 1 && r.cobertura > 0.9);
});

test('profissionais: sem regras nao atribui nada e diz porque', async () => {
  const s = await le(comProfissionais());
  const r = producaoPorProfissional(s, criaAtribuicao([]));
  assert.equal(r.temRegras, false);
  assert.equal(r.linhas.length, 0);
  assert.equal(r.cobertura, 0);
  assert.equal(r.atribuidoCent, 0);
});

test('profissionais: mostra as pistas por mapear, para se escrever a regra em falta', async () => {
  const s = await le(comProfissionais());
  const r = producaoPorProfissional(s, criaAtribuicao([]));
  const series = r.pistasPorMapear.filter((p) => p.pista === 'serie').map((p) => p.valor);
  assert.ok(series.includes('FT A'));
  assert.ok(series.includes('FT B'));
  assert.ok(r.pistasPorMapear[0].linhas > 0);
});

test('profissionais: as tres pistas de autoria estao documentadas com a sua fiabilidade', () => {
  assert.equal(PISTAS_DE_AUTORIA.length, 3);
  for (const p of PISTAS_DE_AUTORIA) {
    assert.ok(p.nome && p.descricao.length > 30 && p.fiabilidade.length > 30, `${p.id} sem descricao util`);
    assert.equal(typeof p.extrai, 'function');
  }
  const origem = PISTAS_DE_AUTORIA.find((p) => p.id === 'origem');
  assert.match(origem.fiabilidade, /Fraca/, 'o utilizador que emitiu nao e quem trata, e isso tem de estar escrito');
});

// ---------------------------------------------------------------------------
// Atos desfeitos e faltas
// ---------------------------------------------------------------------------

test('desfeitos: separa anulados de notas de credito', async () => {
  const s = await le(cenarioBase());
  const r = atosDesfeitos(s);
  assert.equal(r.nAnulados, 1);
  assert.equal(r.nNotasCredito, 1);
  assert.equal(r.valorCreditadoCent, 6000);
  assert.ok(r.taxaDeCredito > 0 && r.taxaDeCredito < 1);
  assert.equal(r.creditadoPorMes[0].mes, '2025-02');
});

test('desfeitos: diz explicitamente que isto nao sao desmarcacoes', async () => {
  const s = await le(cenarioBase());
  const r = atosDesfeitos(s);
  assert.match(r.naoSaoDesmarcacoes, /nao gera documento nenhum/);
});

test('faltas: o SAF-T nao responde, e a ferramenta diz porque e o que precisa', () => {
  const r = porqueNaoHaFaltas();
  assert.equal(r.respondivelComSaft, false);
  assert.match(r.razao, /ausencia de uma fatura/);
  assert.ok(r.oQuePrecisa.length >= 5);
  assert.ok(r.oQuePrecisa.every((c) => c.campo && c.porque.length > 15));
  assert.ok(r.oQueSeMedeDepois.length >= 4);
  assert.match(r.entretanto, /grelha de ocupacao/);
});
