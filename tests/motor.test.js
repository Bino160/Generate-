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

test('regime por omissao nao aplica o tecto de 180 dias', () => {
  const r = Motor.simular(cenarioBase());
  assert.strictEqual(r.juros.regime, 'omissaoDeclarativa');
  assert.strictEqual(r.juros.limiteAplicado, false);
});

test('erro evidenciado na declaracao limita os juros a 180 dias', () => {
  const dados = cenarioBase();
  dados.parametros.regimeJuros = 'erroEvidenciado';
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.dias, 180);
  assert.strictEqual(r.juros.diasDecorridos, 365);
  assert.strictEqual(r.juros.limiteAplicado, true);
  assert.ok(r.juros.notas.length > 0);
});

test('falta apurada em fiscalizacao conta ate 90 dias apos a conclusao da acao', () => {
  const dados = cenarioBase();
  dados.parametros.regimeJuros = 'inspecao';
  dados.parametros.dataConclusaoInspecao = '2025-12-31';
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.dataFim, '2026-03-31'); // 31/12/2025 + 90 dias
  assert.strictEqual(r.juros.dias, 274);
});

test('regime de fiscalizacao sem data de conclusao avisa em vez de inventar', () => {
  const dados = cenarioBase();
  dados.parametros.regimeJuros = 'inspecao';
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.dataFim, '2026-06-30');
  assert.ok(r.juros.notas.some((n) => /sem data de conclusão/.test(n)));
  assert.ok(r.qualidade.itens.some((i) => i.chave === 'juros' && i.estado === 'falta'));
});

test('limite de dias explicito sobrepoe-se ao regime', () => {
  const dados = cenarioBase();
  dados.parametros.juros = { limiteDias: 30 };
  const r = Motor.simular(dados);
  assert.strictEqual(r.juros.dias, 30);
  assert.strictEqual(r.juros.limiteAplicado, true);
});

test('coimas: cenarios baixo < referencia < alto, ancorados na lei', () => {
  const r = Motor.simular(cenarioBase());
  const imposto = r.indicadores.irsAdicional;
  eq(r.coimas.referencia.valor, Math.max(imposto * 0.15, 375));
  eq(r.coimas.baixo.valor, Math.max(imposto * 0.15, 375) * 0.125);
  assert.ok(r.coimas.baixo.valor < r.coimas.referencia.valor);
  assert.ok(r.coimas.referencia.valor < r.coimas.alto.valor);
  assert.ok(r.coimas.maximoLegal <= 22500);
});

test('nenhum cenario de coima e apresentado como previsao', () => {
  const r = Motor.simular(cenarioBase());
  const textos = [r.coimas.aviso, r.coimas.baixo.rotulo, r.coimas.referencia.rotulo, r.coimas.alto.rotulo,
    r.coimas.referencia.fundamento].join(' ').toLowerCase();
  assert.ok(!/prov[áa]vel/.test(textos), 'a palavra "provavel" nao pode aparecer nas coimas');
  assert.ok(/n[ãa]o.*(previs[ãa]o|constitui)/.test(textos));
});

test('coima declarativa nao e multiplicada por socio sem escolha explicita', () => {
  const r = Motor.simular(cenarioBase());
  assert.strictEqual(r.coimas.coimasDeclarativas.declaracoes, 1);
  const dados = cenarioBase();
  dados.parametros.coimas = { aplicarCoimaDeclaracaoPorSocio: true };
  const r2 = Motor.simular(dados);
  assert.strictEqual(r2.coimas.coimasDeclarativas.declaracoes, 2);
  assert.ok(r2.coimas.alto.valor > r.coimas.alto.valor);
});

test('recuperacao do IRC: rotulos sao percentagens, sem juizo juridico', () => {
  const r = Motor.simular(cenarioBase());
  assert.strictEqual(r.recuperacaoIRC.cenarios.integral.rotulo, 'Recuperação 100%');
  assert.strictEqual(r.recuperacaoIRC.cenarios.parcial.rotulo, 'Recuperação 50%');
  assert.strictEqual(r.recuperacaoIRC.cenarios.inexistente.rotulo, 'Recuperação 0%');
  assert.ok(/potencialmente recuper[áa]vel/i.test(r.recuperacaoIRC.aviso));
});

test('recuperacao do IRC assenta na colecta e derramas, sem tributacoes autonomas', () => {
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
  const pior = r.matrizSensibilidade.find((l) => l.coima === 'alto').valores.find((v) => v.irc === 'inexistente').valor;
  const melhor = r.matrizSensibilidade.find((l) => l.coima === 'baixo').valores.find((v) => v.irc === 'integral').valor;
  assert.ok(pior > melhor);
});

test('participacoes que nao somam 100% geram erro de validacao', () => {
  const dados = cenarioBase();
  dados.socios[1].participacao = 30;
  const r = Motor.simular(dados);
  assert.ok(r.avisos.some((a) => a.nivel === 'erro' && /100%/.test(a.texto)));
});

test('IRS pago sobre lucros distribuidos NAO e abatido, apenas assinalado', () => {
  const dados = cenarioBase();
  const sem = Motor.simular(dados);
  dados.socios[0].irsPagoDistribuicoes = 5000;
  const com = Motor.simular(dados);
  eq(com.indicadores.irsAdicional, sem.indicadores.irsAdicional);
  eq(com.indicadores.distribuicoesAssinaladas, 5000);
  assert.ok(com.avisos.some((a) => /NÃO é abatido/.test(a.texto)));
});

test('deducoes a coleta reais reduzem o IRS de ambos os cenarios', () => {
  const dados = cenarioBase();
  const sem = Motor.simular(dados);
  dados.socios.forEach((s) => { s.outrasDeducoesColeta = 1500; });
  const com = Motor.simular(dados);
  assert.ok(com.corrigido.irsTotal < sem.corrigido.irsTotal);
  assert.ok(com.atual.irsTotal < sem.atual.irsTotal);
  eq(com.corrigido.socios[0].liquidacao.deducoesOutras, 1500);
});

test('sem deducoes introduzidas o motor avisa que e impacto marginal', () => {
  const r = Motor.simular(cenarioBase());
  assert.ok(r.avisos.some((a) => /impacto marginal/.test(a.texto)));
  assert.ok(r.qualidade.itens.some((i) => i.chave === 'deducoes' && i.estado === 'falta'));
});

test('confianca da simulacao e explicita e desce com dados em falta', () => {
  const bom = cenarioBase();
  bom.socios.forEach((s) => { s.outrasDeducoesColeta = 1000; });
  bom.parametros.dataLiquidacaoIRC = '2025-07-31';
  const alta = Motor.simular(bom);

  const mau = cenarioBase();
  mau.socios[1].participacao = 30;
  const baixa = Motor.simular(mau);

  assert.ok(alta.qualidade.indice > baixa.qualidade.indice);
  assert.ok(['Alta', 'Média', 'Baixa'].includes(alta.qualidade.grau));
  assert.ok(/não uma liquidação/i.test(alta.qualidade.resumo));
});

test('materia colectavel nula nao gera exposicao', () => {
  const dados = cenarioBase();
  dados.sociedade.materiaColetavel = 0;
  const r = Motor.simular(dados);
  eq(r.indicadores.irsAdicional, 0);
  eq(r.indicadores.juros, 0);
  eq(r.coimas.referencia.valor, 375); // piso legal
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
  ['IRS dos sócios', 'Juros compensatórios', 'Coimas (cenário de referência)'].forEach((i) => {
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

test('cada evento da timeline declara a regra aplicavel', () => {
  const r = Motor.simular(cenarioBase());
  r.timeline.forEach((e) => assert.ok(e.regra && e.regra.length > 5, `evento sem regra: ${e.titulo}`));
  const revisao = r.timeline.find((e) => /revis[ãa]o/i.test(e.titulo));
  assert.ok(/potencial/i.test(revisao.titulo));
  assert.strictEqual(revisao.aproximado, true);
  assert.ok(/vias e prazos distintos/i.test(revisao.descricao));
});

test('data de liquidacao introduzida ancora o prazo de revisao e deixa de ser aproximado', () => {
  const dados = cenarioBase();
  dados.parametros.dataLiquidacaoIRC = '2025-08-15';
  const r = Motor.simular(dados);
  const revisao = r.timeline.find((e) => /revis[ãa]o/i.test(e.titulo));
  assert.strictEqual(revisao.data, '2029-08-15');
  assert.strictEqual(revisao.aproximado, false);
});

test('a simulacao identifica a versao das regras fiscais usadas', () => {
  const r = Motor.simular(cenarioBase());
  assert.ok(r.meta.regras.versao);
  assert.ok(r.meta.regras.atualizadoEm);
});
