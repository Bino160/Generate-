import test from 'node:test';
import assert from 'node:assert/strict';

import {
  avaliaConvencao, margemPorHora, sensibilidadeCanibalizacao, sensibilidadeOcupacao,
  alocacaoHoraria, simuladorConvencoes, medeCaudaPrivada, QUADRANTE,
} from '../src/ferramentas/f2-convencoes.js';
import { analisaSaft } from '../src/core/saft.js';
import { Anonimizador } from '../src/core/anonimizacao.js';
import { criaCorrespondencia } from '../src/core/perfil.js';
import { construirSaft } from './fixtures/saft.mjs';

/**
 * Convencao com margem positiva mas inferior ao privado por hora.
 * 25 euros de preco, 5 de custo variavel, 30 minutos.
 * Margem 20 euros por ato, 40 euros por hora.
 */
const convencaoAbaixoDoPrivado = {
  id: 'X',
  nome: 'Convencao X',
  canibalizacao: 0,
  prazoRecebimentoDias: 90,
  atos: [{ codigo: 'CONS', nome: 'Consulta', precoCent: 2500, custoVariavelCent: 500, duracaoMinutos: 30, volume: 100 }],
};

/** Privado: 60 euros, 10 de custo, 30 minutos. Margem 50 por ato, 100 por hora. */
const privado = [
  { codigo: 'CONS-P', nome: 'Consulta privada', precoCent: 6000, custoVariavelCent: 1000, duracaoMinutos: 30, volume: 100 },
];

// ---------------------------------------------------------------------------
// Teste dos extremos. Obrigatorio pela especificacao.
// Se a ferramenta der a mesma resposta nos dois cenarios, esta errada e nao sai.
// ---------------------------------------------------------------------------

test('OBRIGATORIO: a 100% de ocupacao, convencao abaixo do privado por hora sai ou renegoceia', () => {
  const r = avaliaConvencao({
    convencao: convencaoAbaixoDoPrivado,
    atosPrivadosEquivalentes: privado,
    horasLivres: 0,
  });
  assert.ok(
    r.quadrante === QUADRANTE.SAIR || r.quadrante === QUADRANTE.RENEGOCIAR,
    `com capacidade esgotada esperava SAIR ou RENEGOCIAR, veio ${r.quadrante}`,
  );
  assert.ok(r.valorManterCent < 0, 'manter tem de destruir resultado com a clinica cheia');
});

test('OBRIGATORIO: a 50% de ocupacao, a mesma convencao mantem-se', () => {
  const r = avaliaConvencao({
    convencao: convencaoAbaixoDoPrivado,
    atosPrivadosEquivalentes: privado,
    horasLivres: 200, // muito espaco vazio
  });
  assert.equal(r.quadrante, QUADRANTE.MANTER,
    `com gabinetes vazios esperava MANTER, veio ${r.quadrante}`);
  assert.ok(r.valorManterCent > 0, 'com espaco vazio qualquer margem acima do custo variavel acrescenta');
});

test('OBRIGATORIO: as duas respostas tem de ser diferentes', () => {
  const cheia = avaliaConvencao({
    convencao: convencaoAbaixoDoPrivado, atosPrivadosEquivalentes: privado, horasLivres: 0,
  });
  const vazia = avaliaConvencao({
    convencao: convencaoAbaixoDoPrivado, atosPrivadosEquivalentes: privado, horasLivres: 200,
  });
  assert.notEqual(cheia.quadrante, vazia.quadrante,
    'a ferramenta deu a mesma resposta com a clinica cheia e com a clinica vazia. Esta errada e nao sai.');
  assert.ok(Math.sign(cheia.valorManterCent) !== Math.sign(vazia.valorManterCent),
    'o sinal do valor de manter tem de inverter-se entre os dois extremos');
});

test('a inversao tem um ponto de ocupacao identificavel', () => {
  const s = sensibilidadeOcupacao(
    { convencao: convencaoAbaixoDoPrivado, atosPrivadosEquivalentes: privado },
    100,
  );
  assert.ok(s.ocupacaoEmQueDeixaDeCompensar != null, 'tem de existir uma ocupacao a partir da qual deixa de compensar');
  assert.ok(s.ocupacaoEmQueDeixaDeSerManter <= s.ocupacaoEmQueDeixaDeCompensar,
    'o aviso de limitar a horarios vazios tem de vir antes de o valor ficar negativo');
  // Estado intermedio existe, nao ha so dois estados.
  assert.ok(s.pontos.some((p) => p.quadrante === QUADRANTE.LIMITAR_A_HORARIOS_VAZIOS));
});

// ---------------------------------------------------------------------------
// A unidade de decisao e a hora-gabinete, nao o ato.
// ---------------------------------------------------------------------------

test('o ranking por ato inverte-se quando se converte em hora', () => {
  // Exemplo da especificacao: 12 euros em 20 minutos rende 36 por hora,
  // 40 euros em duas horas rende 20 por hora.
  const m = margemPorHora([
    { codigo: 'A', nome: 'Ato curto', precoCent: 1200, custoVariavelCent: 0, duracaoMinutos: 20, volume: 1 },
    { codigo: 'B', nome: 'Ato longo', precoCent: 4000, custoVariavelCent: 0, duracaoMinutos: 120, volume: 1 },
  ]);
  const a = m.detalhe.find((x) => x.codigo === 'A');
  const b = m.detalhe.find((x) => x.codigo === 'B');
  assert.equal(a.margemPorHoraCent, 3600);
  assert.equal(b.margemPorHoraCent, 2000);
  assert.ok(a.margemAtoCent < b.margemAtoCent, 'por ato B ganha');
  assert.ok(a.margemPorHoraCent > b.margemPorHoraCent, 'por hora A ganha, e e a hora que decide');
});

test('a ferramenta assinala a inversao quando ela existe', () => {
  const r = avaliaConvencao({
    convencao: {
      id: 'Y',
      canibalizacao: 0,
      atos: [
        { codigo: 'A', nome: 'Ato curto', precoCent: 1200, custoVariavelCent: 0, duracaoMinutos: 20, volume: 10 },
        { codigo: 'B', nome: 'Ato longo', precoCent: 4000, custoVariavelCent: 0, duracaoMinutos: 120, volume: 10 },
      ],
    },
    atosPrivadosEquivalentes: privado,
    horasLivres: 1000,
  });
  assert.ok(r.inversaoDoRanking, 'tinha de detetar a inversao');
  assert.equal(r.inversaoDoRanking.porAto[0], 'B');
  assert.equal(r.inversaoDoRanking.porHora[0], 'A');
});

test('um ato sem duracao rebenta em vez de assumir um valor', () => {
  assert.throws(
    () => margemPorHora([{ codigo: 'Z', precoCent: 1000, custoVariavelCent: 0, volume: 1 }]),
    /sem duracao/,
  );
});

// ---------------------------------------------------------------------------
// Canibalizacao
// ---------------------------------------------------------------------------

test('a canibalizacao tem um ponto de viragem e e esse o output util', () => {
  // Convencao acima do privado por hora, com espaco vazio.
  const convencaoBoa = {
    id: 'B',
    canibalizacao: 0,
    atos: [{ codigo: 'C', precoCent: 9000, custoVariavelCent: 1000, duracaoMinutos: 30, volume: 100 }],
  };
  const s = sensibilidadeCanibalizacao({
    convencao: convencaoBoa,
    atosPrivadosEquivalentes: privado,
    horasLivres: 1000,
  });
  assert.equal(s.pontos.length, 21);
  assert.ok(s.pontos[0].valorManterCent > s.pontos[20].valorManterCent,
    'mais canibalizacao tem de valer menos');
});

test('com canibalizacao total, manter uma convencao pior que o privado destroi resultado mesmo com espaco vazio', () => {
  const r = avaliaConvencao({
    convencao: { ...convencaoAbaixoDoPrivado, canibalizacao: 1 },
    atosPrivadosEquivalentes: privado,
    horasLivres: 10000,
  });
  assert.ok(r.valorManterCent < 0,
    'se todos os pacientes viriam na mesma como privados, a convencao esta a subsidiar-se');
  assert.equal(r.quadrante, QUADRANTE.SAIR);
});

// ---------------------------------------------------------------------------
// Preco minimo, tesouraria, alocacao
// ---------------------------------------------------------------------------

test('o preco minimo por ato e o numero que vai para a mesa', () => {
  const r = avaliaConvencao({
    convencao: convencaoAbaixoDoPrivado, atosPrivadosEquivalentes: privado, horasLivres: 0,
  });
  const p = r.precosMinimos[0];
  // Custo variavel 5 euros mais 100 euros por hora vezes meia hora igual 55 euros.
  assert.equal(p.precoMinimoIsoladoCent, 5500);
  assert.ok(p.precoAtualCent < p.precoMinimoIsoladoCent);
});

test('o prazo de recebimento nunca entra na margem', () => {
  const semPrazo = avaliaConvencao({
    convencao: { ...convencaoAbaixoDoPrivado, prazoRecebimentoDias: 0 },
    atosPrivadosEquivalentes: privado, horasLivres: 200,
  });
  const comPrazo = avaliaConvencao({
    convencao: { ...convencaoAbaixoDoPrivado, prazoRecebimentoDias: 180 },
    atosPrivadosEquivalentes: privado, horasLivres: 200,
  });
  assert.equal(semPrazo.valorManterCent, comPrazo.valorManterCent,
    'o prazo de recebimento afeta tesouraria, nao margem');
  assert.ok(comPrazo.tesouraria.custoFinanciamentoCent > semPrazo.tesouraria.custoFinanciamentoCent);
});

test('a alocacao horaria escolhe as faixas mais vazias primeiro', () => {
  const r = alocacaoHoraria({
    horasNecessarias: 30,
    faixas: {
      'seg-manha': { disponivel: 40, ocupado: 38, livre: 2, ocupacao: 0.95 },
      'ter-tarde': { disponivel: 40, ocupado: 10, livre: 30, ocupacao: 0.25 },
      'qua-manha': { disponivel: 40, ocupado: 24, livre: 16, ocupacao: 0.60 },
    },
  });
  assert.equal(r.plano[0].faixa, 'ter-tarde');
  assert.equal(r.cobreTudo, true);
  assert.equal(r.horasColocadas, 30);
});

test('a alocacao diz o que nao consegue colocar', () => {
  const r = alocacaoHoraria({
    horasNecessarias: 100,
    faixas: { 'ter-tarde': { disponivel: 40, ocupado: 10, livre: 30, ocupacao: 0.25 } },
  });
  assert.equal(r.cobreTudo, false);
  assert.equal(r.horasPorColocar, 70);
});

// ---------------------------------------------------------------------------
// Efeito porta de entrada, medido e nao estimado
// ---------------------------------------------------------------------------

test('a cauda privada mede-se no SAF-T seguindo o paciente', async () => {
  const xml = construirSaft({
    clientes: [{ id: 'C1', nif: '210000001' }, { id: 'C2', nif: '210000002' }],
    produtos: [{ codigo: 'MEDIS-CONS', descricao: 'Consulta MEDIS' }, { codigo: 'IMPL', descricao: 'Implante' }],
    documentos: [
      // Entra pela convencao e depois faz privado.
      { numero: 'FT 1/1', data: '2025-01-10', cliente: 'C1', linhas: [{ produto: 'MEDIS-CONS', credito: 25 }] },
      { numero: 'FT 1/2', data: '2025-03-10', cliente: 'C1', linhas: [{ produto: 'IMPL', credito: 900 }] },
      // Entra direto em privado. Nao conta para a cauda de nenhuma convencao.
      { numero: 'FT 1/3', data: '2025-01-11', cliente: 'C2', linhas: [{ produto: 'IMPL', credito: 700 }] },
    ],
  });
  const s = await analisaSaft(xml, { anonimizador: await Anonimizador.cria() });
  const corresp = criaCorrespondencia({
    correspondenciaEntidades: [{ entidade: 'MEDIS', campo: 'produto', padrao: '^MEDIS-' }],
  });
  const cauda = medeCaudaPrivada(s, corresp);
  assert.equal(cauda.MEDIS.pacientesNovos, 1);
  assert.equal(cauda.MEDIS.porPacienteCent, 90000);
  assert.equal(cauda.PRIVADO, undefined, 'quem entra direto em privado nao gera cauda de convencao');
});

// ---------------------------------------------------------------------------
// Calibracao contra os volumes reais da A+ de 2025
// ---------------------------------------------------------------------------

test('calibracao A+ 2025: corre com os volumes reais e produz uma decisao por convencao', () => {
  // Volumes observados em 2025 na A+. Os precos e duracoes sao de trabalho e
  // estao marcados como tal: sao substituidos pela tabela real antes da entrega.
  const volumes = { MEDIS: 109, SAMS: 33, 'SAMS Quadros': 23, CGD: 25 };
  const convencoes = Object.entries(volumes).map(([nome, volume]) => ({
    id: nome,
    nome,
    canibalizacao: 0.15,
    prazoRecebimentoDias: 60,
    atos: [{
      codigo: `${nome}-CONS`,
      nome: 'Consulta',
      precoCent: 2500,
      custoVariavelCent: 600,
      duracaoMinutos: 30,
      volume,
    }],
  }));

  const r = simuladorConvencoes({
    convencoes,
    atosPrivadosEquivalentes: privado,
    capacidade: { horasDisponiveis: 1000, horasOcupadas: 950 },
  });

  const matriz = r.blocos.find((b) => b.id === 'matriz').dados.matriz;
  const total = Object.values(matriz).reduce((a, v) => a + v.length, 0);
  assert.equal(total, 4, 'as quatro convencoes da A+ tem de sair todas classificadas');
  assert.ok(r.veredito.frase.length > 0);
  assert.ok(r.lacunas.itens.some((l) => l.codigo.startsWith('F2-CAUDA-')),
    'sem medicao da cauda a ferramenta tem de o declarar');
});

test('o simulador bloqueia sem tabela de precos privados em vez de inventar um custo de oportunidade', () => {
  const r = simuladorConvencoes({
    convencoes: [convencaoAbaixoDoPrivado],
    atosPrivadosEquivalentes: [],
    capacidade: { horasDisponiveis: 100, horasOcupadas: 50 },
  });
  assert.ok(r.lacunas.bloqueia);
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F2-SEM-PRECARIO'));
});

test('o aviso contratual sai sempre e e de natureza juridica', () => {
  const r = simuladorConvencoes({
    convencoes: [convencaoAbaixoDoPrivado],
    atosPrivadosEquivalentes: privado,
    capacidade: { horasDisponiveis: 1000, horasOcupadas: 100 },
  });
  const aviso = r.blocos.find((b) => b.id === 'aviso-contratual');
  assert.ok(aviso, 'o aviso contratual nao pode faltar');
  assert.equal(aviso.natureza, 'JURIDICA');
  assert.equal(r.exportavel, false, 'sem cedula, um bloco juridico fecha a exportacao');
  assert.match(aviso.dados.pontos.join(' '), /ERS/);
  assert.match(aviso.dados.pontos.join(' '), /30 dias/);
});
