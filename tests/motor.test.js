/**
 * Testes do motor de calculo.
 * Execucao: npm test   (ou: node --test tests/)
 */
const test = require('node:test');
const assert = require('node:assert');
const Motor = require('../assets/js/motor.js');
const Parametros = require('../assets/js/parametros.js');

const ESC_2024 = Parametros.ESCALOES_IRS[2024].escaloes;

function eq(a, b, tol = 0.01) {
  assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, obtido ${a}`);
}

test('coleta progressiva soma as fatias marginais (2024)', () => {
  eq(Motor.coletaProgressiva(0, ESC_2024), 0);
  eq(Motor.coletaProgressiva(7703, ESC_2024), 1020.65);
  eq(Motor.coletaProgressiva(20000, ESC_2024), 3758.80);
  // Ultimo escalao, sem limite superior.
  const acima = Motor.coletaProgressiva(100000, ESC_2024);
  const noLimite = Motor.coletaProgressiva(81199, ESC_2024);
  eq(acima - noLimite, (100000 - 81199) * 0.48);
});

test('taxa adicional de solidariedade por faixas', () => {
  const tabela = Parametros.porOmissao().solidariedade;
  eq(Motor.solidariedade(50000, tabela), 0);
  eq(Motor.solidariedade(100000, tabela), 20000 * 0.025);
  eq(Motor.solidariedade(300000, tabela), 170000 * 0.025 + 50000 * 0.05);
});

test('quociente conjugal divide o rendimento e multiplica a colecta', () => {
  const p = Parametros.porOmissao();
  const separada = Motor.liquidarIRS(60000, { parametros: p, escaloes: ESC_2024, conjunta: false, dependentes: 0 });
  const conjunta = Motor.liquidarIRS(60000, { parametros: p, escaloes: ESC_2024, conjunta: true, dependentes: 0 });
  eq(conjunta.coletaTaxasGerais, Motor.coletaProgressiva(30000, ESC_2024) * 2);
  assert.ok(conjunta.imposto < separada.imposto, 'a tributacao conjunta deve ser mais favoravel neste caso');
});

test('deducoes a colecta nunca tornam o imposto negativo', () => {
  const p = Parametros.porOmissao();
  const r = Motor.liquidarIRS(5000, { parametros: p, escaloes: ESC_2024, conjunta: false, dependentes: 10 });
  assert.ok(r.imposto >= 0);
  eq(r.imposto, 0);
});

const cenarioBase = () => ({
  sociedade: {
    exercicio: 2024,
    resultadoContabilistico: 120000,
    correcoesFiscais: 0,
    materiaColetavel: 120000,
    ircLiquidado: 24450,      // 12500 * 17% + 107500 * 20%
    derramaMunicipal: 1800,
    derramaEstadual: 0,
    tributacoesAutonomas: 2500,
    pagamentosPorConta: 15000,
    retencoes: 500
  },
  socios: [
    { nome: 'Socio A', participacao: 60, rendimentosA: 30000, rendimentosB: 0, outrosRendimentos: 0, tributacao: 'separada', dependentes: 1 },
    { nome: 'Socio B', participacao: 40, rendimentosA: 20000, rendimentosB: 0, outrosRendimentos: 0, tributacao: 'separada', dependentes: 0 }
  ],
  parametros: { dataReferencia: '2026-06-30', cenarioIRC: 'parcial' }
});

test('simulacao completa: estrutura e coerencia dos indicadores', () => {
  const r = Motor.simular(cenarioBase());

  eq(r.atual.irc.totalDevido, 24450 + 1800 + 2500);
  eq(r.atual.irc.saldoApurado, 24450 + 1800 + 2500 - 15500);

  // A materia colectavel e integralmente imputada segundo as participacoes.
  eq(r.corrigido.socios[0].imputacao, 72000);
  eq(r.corrigido.socios[1].imputacao, 48000);
  eq(r.corrigido.socios.reduce((a, s) => a + s.imputacao, 0), 120000);

  // No cenario corrigido a sociedade so mantem as tributacoes autonomas.
  eq(r.corrigido.irc.totalDevido, 2500);

  assert.ok(r.indicadores.irsAdicional > 0, 'a imputacao deve gerar IRS adicional');
  eq(r.indicadores.exposicaoBruta, r.indicadores.irsAdicional + r.indicadores.juros + r.indicadores.coimas);
  eq(r.indicadores.exposicaoLiquida, r.indicadores.exposicaoBruta - r.indicadores.ircRecuperavel);
});

test('juros compensatorios contam da data limite da Modelo 3 ate a data de referencia', () => {
  const r = Motor.simular(cenarioBase());
  assert.strictEqual(r.juros.dataInicio, '2025-06-30');
  assert.strictEqual(r.juros.dataFim, '2026-06-30');
  assert.strictEqual(r.juros.dias, 365);
  eq(r.juros.montante, r.indicadores.irsAdicional * 0.04);
});

test('tecto de dias dos juros e respeitado quando parametrizado', () => {
  const dados = cenarioBase();
  dados.parametros.juros = { limiteDias: 180 };
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.dias, 180);
  assert.strictEqual(r.juros.limiteAplicado, true);
});

test('coimas: minimo < provavel < maximo e ancoragem legal', () => {
  const r = Motor.simular(cenarioBase());
  const imposto = r.indicadores.irsAdicional;
  eq(r.coimas.provavel.valor, Math.max(imposto * 0.15, 375));
  eq(r.coimas.minimo.valor, Math.max(imposto * 0.15, 375) * 0.125);
  assert.ok(r.coimas.minimo.valor < r.coimas.provavel.valor);
  assert.ok(r.coimas.provavel.valor < r.coimas.maximo.valor);
  assert.ok(r.coimas.maximoLegal <= 22500);
});

test('recuperacao do IRC: tres cenarios sobre colecta e derramas, sem tributacoes autonomas', () => {
  const r = Motor.simular(cenarioBase());
  eq(r.recuperacaoIRC.base, 24450 + 1800);
  eq(r.recuperacaoIRC.cenarios.integral.valor, 26250);
  eq(r.recuperacaoIRC.cenarios.parcial.valor, 13125);
  eq(r.recuperacaoIRC.cenarios.inexistente.valor, 0);
  eq(r.indicadores.ircRecuperavel, 13125);
});

test('matriz de sensibilidade cobre 3 coimas x 3 cenarios de IRC', () => {
  const r = Motor.simular(cenarioBase());
  assert.strictEqual(r.matrizSensibilidade.length, 3);
  r.matrizSensibilidade.forEach((linha) => assert.strictEqual(linha.valores.length, 3));
  const pior = r.matrizSensibilidade.find((l) => l.coima === 'maximo').valores.find((v) => v.irc === 'inexistente').valor;
  const melhor = r.matrizSensibilidade.find((l) => l.coima === 'minimo').valores.find((v) => v.irc === 'integral').valor;
  assert.ok(pior > melhor);
});

test('participacoes que nao somam 100% geram erro de validacao', () => {
  const dados = cenarioBase();
  dados.socios[1].participacao = 30;
  const r = Motor.simular(dados);
  assert.ok(r.avisos.some((a) => a.nivel === 'erro' && /100%/.test(a.texto)));
});

test('IRS ja pago sobre lucros distribuidos e creditado no IRS adicional', () => {
  const dados = cenarioBase();
  const semCredito = Motor.simular(dados);
  dados.socios[0].irsPagoDistribuicoes = 5000;
  const comCredito = Motor.simular(dados);
  eq(comCredito.indicadores.irsAdicional, semCredito.indicadores.irsAdicional - 5000);
});

test('materia colectavel nula nao gera exposicao', () => {
  const dados = cenarioBase();
  dados.sociedade.materiaColetavel = 0;
  const r = Motor.simular(dados);
  eq(r.indicadores.irsAdicional, 0);
  eq(r.indicadores.juros, 0);
  eq(r.coimas.provavel.valor, 375); // piso legal
});

test('parametros do utilizador sobrepoem-se aos valores por omissao', () => {
  const dados = cenarioBase();
  dados.parametros.juros = { taxaAnual: 0.08 };
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.taxaAnual, 0.08);
  eq(r.juros.montante, r.indicadores.irsAdicional * 0.08);
});

test('tabela de exercicio inexistente cai na mais proxima e avisa', () => {
  const dados = cenarioBase();
  dados.sociedade.exercicio = 2019;
  const r = Motor.simular(dados);
  assert.strictEqual(r.meta.tabelaIRS.estado, 'substituido');
  assert.ok(r.avisos.some((a) => /Sem tabela de escalões para 2019/.test(a.texto)));
});

test('comparador apresenta as linhas exigidas e a variacao', () => {
  const r = Motor.simular(cenarioBase());
  const indicadores = r.comparador.map((l) => l.indicador);
  ['IRS dos sócios', 'Juros compensatórios', 'Coimas (cenário provável)'].forEach((i) => {
    assert.ok(indicadores.some((x) => x === i), `falta a linha ${i}`);
  });
  r.comparador.forEach((l) => eq(l.variacao, l.corrigido - l.atual));
});

test('timeline ordenada cronologicamente e marcada face a data de referencia', () => {
  const r = Motor.simular(cenarioBase());
  const datas = r.timeline.map((e) => e.data);
  assert.deepStrictEqual(datas, [...datas].sort());
  r.timeline.forEach((e) => assert.strictEqual(e.passado, e.data <= '2026-06-30'));
});
