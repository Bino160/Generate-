import test from 'node:test';
import assert from 'node:assert/strict';

import { analisaSaft, receitaPorMes, atosPorMes, sinalDoTipo } from '../src/core/saft.js';
import { Anonimizador, auditaFugaDeIdentificadores } from '../src/core/anonimizacao.js';
import { criaCorrespondencia } from '../src/core/perfil.js';
import { prazoMedioPorEntidade } from '../src/core/tesouraria.js';
import { cenarioBase, construirSaft } from './fixtures/saft.mjs';

async function le(xml) {
  return analisaSaft(xml, { anonimizador: await Anonimizador.cria() });
}

test('saft: recusa correr sem anonimizador', async () => {
  await assert.rejects(() => analisaSaft(cenarioBase(), {}), /exige um anonimizador/);
});

test('saft: le o cabecalho', async () => {
  const s = await le(cenarioBase());
  assert.equal(s.cabecalho.empresa, 'Clinica de Teste, Lda');
  assert.equal(s.cabecalho.nifEmpresa, '500000000');
  assert.equal(s.cabecalho.ano, 2025);
  assert.equal(s.cabecalho.versao, '1.04_01');
});

test('saft: a nota de credito abate em vez de somar', async () => {
  const s = await le(cenarioBase());
  // 60 + 25 + 45 + 60 - 60 (NC) + 30 (consumidor final) = 160.
  // O documento anulado de 999 nao entra.
  assert.equal(s.resumo.receitaCent, 16000);
  assert.equal(sinalDoTipo('NC'), -1);
  assert.equal(sinalDoTipo('FT'), 1);
});

test('saft: o documento anulado nao conta para nada', async () => {
  const s = await le(cenarioBase());
  assert.equal(s.resumo.nAnulados, 1);
  assert.equal(s.documentosValidos.some((d) => d.numero === 'FT 1/4'), false);
});

test('saft: consumidor final nao colapsa num paciente unico', async () => {
  const xml = construirSaft({
    clientes: [{ id: 'CF', nif: '999999990' }],
    produtos: [{ codigo: 'CONS', descricao: 'Consulta' }],
    documentos: Array.from({ length: 40 }, (_, i) => ({
      numero: `FS 1/${i + 1}`,
      data: '2025-05-10',
      cliente: 'CF',
      tipo: 'FS',
      linhas: [{ produto: 'CONS', credito: 30 }],
    })),
  });
  const s = await le(xml);
  assert.equal(s.resumo.nPacientesIdentificados, 0,
    'quarenta documentos de consumidor final nao podem produzir um paciente com quarenta atos');
  assert.equal(s.resumo.fracaoConsumidorFinal, 1);
  assert.ok(s.lacunas.itens.some((l) => l.codigo === 'SAFT-CONSUMIDOR-FINAL'),
    'tem de declarar que a analise por paciente nao cobre esta receita');
});

test('saft: nenhum NIF sobrevive a leitura', async () => {
  const s = await le(cenarioBase());
  const fugas = auditaFugaDeIdentificadores({
    clientes: [...s.clientes.values()],
    documentos: s.documentosValidos,
    resumo: s.resumo,
  });
  assert.deepEqual(fugas, [], `o auditor encontrou identificadores: ${JSON.stringify(fugas)}`);
});

test('saft: o mesmo paciente e reconhecido entre documentos', async () => {
  const s = await le(cenarioBase());
  const doC1 = s.documentosValidos.filter((d) => ['FT 1/1', 'FT 1/3', 'NC 1/1'].includes(d.numero));
  const pseudonimos = new Set(doC1.map((d) => d.pseudonimo));
  assert.equal(pseudonimos.size, 1, 'os documentos do mesmo paciente tem de partilhar pseudonimo');
});

test('saft: agrega receita e atos por mes', async () => {
  const s = await le(cenarioBase());
  const receitas = receitaPorMes(s);
  assert.equal(receitas.get('2025-01'), 8500);
  assert.equal(receitas.get('2025-02'), 4500); // 45 + 60 - 60
  assert.equal(receitas.get('2025-03'), 3000);

  const atos = atosPorMes(s);
  assert.equal(atos.get('2025-02'), 2, 'as linhas da nota de credito nao contam como atos');
});

test('saft: deteta divergencia entre linhas e totais declarados', async () => {
  const xml = construirSaft({
    clientes: [{ id: 'C1', nif: '210000001' }],
    produtos: [{ codigo: 'CONS', descricao: 'Consulta' }],
    documentos: [{ numero: 'FT 1/1', data: '2025-01-10', cliente: 'C1', linhas: [{ produto: 'CONS', credito: 60 }] }],
  }).replace('<NetTotal>60.00</NetTotal>', '<NetTotal>75.00</NetTotal>');

  const s = await le(xml);
  assert.ok(s.lacunas.itens.some((l) => l.codigo === 'SAFT-DIVERGENCIA'));
  assert.equal(s.resumo.receitaCent, 6000, 'com divergencia manda a soma das linhas');
});

test('saft: ficheiro sem documentos bloqueia em vez de devolver zeros', async () => {
  const s = await le(construirSaft({}));
  assert.ok(s.lacunas.bloqueia);
  assert.ok(s.lacunas.itens.some((l) => l.codigo === 'SAFT-VAZIO'));
});

test('saft: correspondencia de entidades resolve a partir do codigo de produto', async () => {
  const s = await le(cenarioBase());
  const corresp = criaCorrespondencia({
    correspondenciaEntidades: [{ entidade: 'MEDIS', campo: 'produto', padrao: '^MEDIS-' }],
  });
  const doc = s.documentosValidos.find((d) => d.numero === 'FT 1/2');
  assert.equal(corresp.resolve(doc, doc.linhas[0]), 'MEDIS');
  const outro = s.documentosValidos.find((d) => d.numero === 'FT 1/1');
  assert.equal(corresp.resolve(outro, outro.linhas[0]), 'PRIVADO');
});

test('tesouraria: prazo medio por entidade exige recibos suficientes', async () => {
  const s = await le(cenarioBase());
  const corresp = criaCorrespondencia({
    correspondenciaEntidades: [{ entidade: 'MEDIS', campo: 'produto', padrao: '^MEDIS-' }],
  });
  const r = prazoMedioPorEntidade(s, corresp);
  assert.deepEqual(r.porEntidade, {}, 'com dois recibos nao ha prazo medio nenhum');
  assert.ok(r.insuficientes.length > 0, 'tem de dizer de que entidades faltam recibos');
});

test('tesouraria: prazo medio calcula-se com recibos suficientes', async () => {
  const documentos = Array.from({ length: 8 }, (_, i) => ({
    numero: `FT 1/${i + 1}`,
    data: '2025-01-10',
    cliente: 'C1',
    linhas: [{ produto: 'MEDIS-CONS', credito: 25 }],
  }));
  const pagamentos = documentos.map((d, i) => ({
    referencia: `RC 1/${i + 1}`,
    data: '2025-03-11', // 60 dias depois
    cliente: 'C1',
    linhas: [{ documentoOrigem: d.numero, dataDocumentoOrigem: '2025-01-10', valor: 25 }],
  }));
  const s = await le(construirSaft({
    clientes: [{ id: 'C1', nif: '210000001' }],
    produtos: [{ codigo: 'MEDIS-CONS', descricao: 'Consulta MEDIS' }],
    documentos,
    pagamentos,
  }));
  const corresp = criaCorrespondencia({
    correspondenciaEntidades: [{ entidade: 'MEDIS', campo: 'produto', padrao: '^MEDIS-' }],
  });
  const r = prazoMedioPorEntidade(s, corresp);
  assert.equal(r.porEntidade.MEDIS.mediana, 60);
  assert.equal(r.porEntidade.MEDIS.n, 8);
});
