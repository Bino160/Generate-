/* Motor de cálculo do simulador — projeto Dra. Júlia Best / Gerir Saúde.
 *
 * TERCEIRA implementação das mesmas regras. As outras duas são as fórmulas do
 * M1_modelo_comparativo.xlsx e o recálculo independente em Python que valida a
 * folha `Validacao`. Este ficheiro só pode ser publicado depois de
 * `testa_motor.mjs` confirmar que reproduz os valores do Excel ao cêntimo.
 *
 * Nenhuma taxa é escrita fora de PARAM, pela mesma razão que na folha Parâmetros.
 */
const PARAM = {
  // Segurança Social
  IAS: 522.50, SS_TI_PCT: 0.70, SS_TI_TAXA: 0.214, SS_TI_TETO: 12, SS_TI_MIN: 20,
  SS_MOE_ENT: 0.2375, SS_MOE_BEN: 0.11, SS_MOE_MIN: 1,
  TSU_ENT: 0.2375, TSU_TRAB: 0.11, PRESCR: 5, JUROS_MORA: 0.05, COIMA_PCT: 0.50,
  // IRS categoria B
  COEF: 0.75, COEF_SALA: 0.35, LIM_JUST: 0.15, DED_ESP: 4104, LIM_CONTRIB: 0.10,
  DED_CATA: 4104,
  // Amortizações
  AM_OBRAS: 0.10, AM_EQUIP: 0.20, AM_SOFT: 0.3333,
  // IVA
  IVA_NORM: 0.23, IVA_RED: 0.06,
  // Escalões de IRS 2025 — POR ATUALIZAR PARA 2026 (R1-10)
  ESCALOES: [[0, 0.1250], [8059, 0.1600], [12160, 0.2150], [17233, 0.2440],
             [22306, 0.3140], [28400, 0.3490], [41629, 0.4310], [44987, 0.4460],
             [83696, 0.4800]],
  SOLID: [[80000, 0.025], [250000, 0.05]],
  ANO_PARAMETROS: 2025,
};

function escala(x, tabela) {
  let total = 0, anterior = 0;
  for (const [inf, taxa] of tabela) {
    if (x > inf) total += (x - inf) * (taxa - anterior);
    anterior = taxa;
  }
  return total;
}
const coleta = x => escala(x, PARAM.ESCALOES);
const solidariedade = x => escala(x, PARAM.SOLID);

/** Coleta de IRS do agregado, com quociente conjugal (art. 69.º CIRS). */
function irsAgregado(rc, conjunta) {
  if (conjunta) { const h = rc / 2; return 2 * (coleta(h) + solidariedade(h)); }
  return coleta(rc) + solidariedade(rc);
}

const RAMPA_PADRAO = [0.15, 0.20, 0.25, 0.30, 0.33, 0.36, 0.39, 0.41, 0.43, 0.44, 0.45, 0.45];

const INPUTS_PADRAO = {
  nGab: 2, diasAno: 220, horasDia: 8, durCons: 45,
  diasJulia: 200, consDiaJulia: 6, precoJulia: 48,
  nFisio: 1, diasFisio: 180, consDiaFisio: 5, precoFisio: 48,
  modColab: 1, pctHonor: 0.70, pctSala: 0.30,
  renda: 14400, condominio: 1500, seguros: 1100, software: 900, outros: 2000,
  pctConsumiveis: 0.03,
  invObras: 25000, invEquip: 20000, invEquipReduzido: 0, invSoftware: 2000,
  remGerencia: 16800, tribAutonomas: 800,
  rendimentoConjuge: 18000, tributacaoConjunta: 1,
  mesesCaucao: 3, pctRecebidoNoMes: 0.85, mesesMargemSeguranca: 3,
  rampa: RAMPA_PADRAO,
  // Comparação de espaços
  rendaB: 19200, condominioB: 2000, obrasB: 38000, equipB: 26000, nGabB: 3,
};

function calcular(entrada) {
  const i = Object.assign({}, INPUTS_PADRAO, entrada || {});
  const P = PARAM;
  const tetoAnual = P.IAS * P.SS_TI_TETO * 12;
  const minAnual = P.SS_TI_MIN * 12;

  // ---- capacidade e procura
  const capDia = i.horasDia * 60 / i.durCons;
  const capAno = i.nGab * i.diasAno * capDia;
  const consJulia = i.diasJulia * i.consDiaJulia;
  const consFisio = i.nFisio * i.diasFisio * i.consDiaFisio;
  const consTotal = consJulia + consFisio;
  const utilizacao = capAno > 0 ? consTotal / capAno : 0;
  const fatJulia = consJulia * i.precoJulia;
  const fatFisio = consFisio * i.precoFisio;
  const fatTotal = fatJulia + fatFisio;
  const precoMedio = consTotal > 0 ? fatTotal / consTotal : 0;

  // ---- modelo de colaboração
  const prestacao = i.modColab === 1;
  const fatIsenta = fatJulia + (prestacao ? fatFisio : 0);
  const recNaoProf = prestacao ? 0 : fatFisio * i.pctSala;
  const custoColab = prestacao ? fatFisio * i.pctHonor : 0;
  const margemColab = prestacao ? fatFisio * (1 - i.pctHonor) : fatFisio * i.pctSala;

  const consumiveis = fatIsenta * i.pctConsumiveis;
  const receita = fatIsenta + recNaoProf;
  const custosFixos = i.renda + i.condominio + i.seguros + i.software + i.outros;
  const custosOpSemColab = custosFixos + consumiveis;
  const custosOp = custosOpSemColab + custoColab;
  const caixa = receita - custosOp;

  const investimento = i.invObras + i.invEquip + i.invEquipReduzido + i.invSoftware;
  const amortizacoes = i.invObras * P.AM_OBRAS
    + (i.invEquip + i.invEquipReduzido) * P.AM_EQUIP + i.invSoftware * P.AM_SOFT;

  const irsSem = irsAgregado(i.rendimentoConjuge, i.tributacaoConjunta === 1);
  const irsCom = rj => irsAgregado(rj + i.rendimentoConjuge, i.tributacaoConjunta === 1) - irsSem;

  // ---- via 1: ENI simplificado
  const despesasJustificadas = P.DED_ESP + custosOpSemColab + custoColab + investimento;
  const rtCoef = fatIsenta * P.COEF + recNaoProf * P.COEF_SALA;
  const rbCatB = rtCoef + Math.max(0, receita * P.LIM_JUST - despesasJustificadas);
  const ss1 = Math.max(Math.min(receita * P.SS_TI_PCT, tetoAnual) * P.SS_TI_TAXA, minAnual);
  const rlCatB = rbCatB - Math.max(0, ss1 - receita * P.LIM_CONTRIB);
  const irs1 = irsCom(rlCatB);
  const v1 = { irs: irs1, ss: ss1, carga: irs1 + ss1, liquido: caixa - irs1 - ss1 };

  // ---- via 2: ENI com contabilidade organizada
  const lt2Antes = receita - custosOpSemColab - custoColab - amortizacoes;
  const ss2 = Math.max(Math.min(Math.max(lt2Antes, 0), tetoAnual) * P.SS_TI_TAXA, minAnual);
  const lt2 = Math.max(0, lt2Antes - ss2);
  const irs2 = irsCom(lt2);
  const v2 = { irs: irs2, ss: ss2, carga: irs2 + ss2, liquido: caixa - irs2 - ss2 };

  // ---- via 3: sociedade com transparência fiscal
  const baseMoe = Math.max(i.remGerencia, P.IAS * P.SS_MOE_MIN * 12);
  const tsuEntidade = baseMoe * P.SS_MOE_ENT;
  const ssSocia = baseMoe * P.SS_MOE_BEN;
  const lt3 = receita - custosOpSemColab - custoColab - amortizacoes - i.remGerencia - tsuEntidade;
  const deducaoCatA = Math.min(i.remGerencia, Math.max(P.DED_CATA, ssSocia));
  const liquidoCatA = Math.max(0, i.remGerencia - deducaoCatA);
  const irs3 = irsCom(liquidoCatA + Math.max(lt3, 0));
  const carga3 = irs3 + ssSocia + tsuEntidade + i.tribAutonomas;
  const v3 = { irs: irs3, ss: ssSocia + tsuEntidade, carga: carga3, liquido: caixa - carga3 };

  // ---- break-even operacional
  const custosVariaveis = consumiveis + custoColab;
  const margemContribuicao = receita - custosVariaveis;
  const mcPct = receita > 0 ? margemContribuicao / receita : 0;
  const breakEven = mcPct > 0 ? custosFixos / mcPct : Infinity;
  const consultasBreakEven = precoMedio > 0 ? breakEven / precoMedio : Infinity;

  // ---- IVA e tesouraria
  const ivaIrrecuperavel = (i.invObras + i.invEquip + i.invSoftware) * P.IVA_NORM
    + i.invEquipReduzido * P.IVA_RED;
  const caucao = i.mesesCaucao * i.renda / 12;
  const arranque = investimento + ivaIrrecuperavel + caucao;

  const capMes = capAno / 12, cfMes = custosFixos / 12, ssMes = ss2 / 12;
  const pctVar = 1 - mcPct;
  let acumulado = 0, minimo = 0, fatAnterior = 0, mesMinimo = 1, mesPositivo = 0;
  const meses = [];
  i.rampa.forEach((ocup, m) => {
    const fat = capMes * ocup * precoMedio;
    const recebido = fat * i.pctRecebidoNoMes + (m > 0 ? fatAnterior * (1 - i.pctRecebidoNoMes) : 0);
    const saldo = recebido - fat * pctVar - cfMes - ssMes - (m === 0 ? arranque : 0);
    const anterior = acumulado;
    acumulado += saldo;
    if (acumulado < minimo) { minimo = acumulado; mesMinimo = m + 1; }
    if (anterior < 0 && acumulado >= 0 && !mesPositivo) mesPositivo = m + 1;
    meses.push({ mes: m + 1, ocupacao: ocup, faturacao: fat, saldo, acumulado });
    fatAnterior = fat;
  });
  const necessidade = -minimo;
  const margemSeguranca = i.mesesMargemSeguranca * cfMes;
  const tesouraria = {
    arranque, ivaIrrecuperavel, caucao, necessidade, margemSeguranca,
    totalAntesDeAbrir: necessidade + margemSeguranca,
    mesMinimo, mesPositivo, meses,
    faturacaoAno1: meses.reduce((s, m) => s + m.faturacao, 0),
  };

  // ---- passivo contingente da requalificação laboral
  const baseRetro = custoColab * P.PRESCR;
  const tsuE = baseRetro * P.TSU_ENT, tsuT = baseRetro * P.TSU_TRAB;
  const juros = (tsuE + tsuT) * P.JUROS_MORA * P.PRESCR / 2;
  const coima = tsuE * P.COIMA_PCT;
  const passivo = tsuE + tsuT + juros + coima;
  const riscoLaboral = {
    base: baseRetro, tsuEntidade: tsuE, tsuTrabalhador: tsuT, juros, coima, passivo,
    anosDeResultado: v2.liquido > 0 ? passivo / v2.liquido : null,
  };

  // ---- terceiro gabinete: a partir de que procura compensa
  const capA = 2 * i.diasAno * capDia;
  const capB = i.nGabB * i.diasAno * capDia;
  const cfA = i.renda + i.condominio + i.seguros + i.software + i.outros;
  const cfB = i.rendaB + i.condominioB + i.seguros + i.software + i.outros;
  const deltaCF = cfB - cfA;
  const ganhoPorConsulta = precoMedio * mcPct;
  const espaco = {
    capacidadeA: capA, capacidadeB: capB, custoDegrau: deltaCF,
    investimentoAdicional: (i.obrasB + i.equipB) * (1 + P.IVA_NORM)
      - (i.invObras + i.invEquip) * (1 + P.IVA_NORM),
    consultasViragem: ganhoPorConsulta > 0 ? capA + deltaCF / ganhoPorConsulta : Infinity,
  };
  espaco.consultasDiaViragem = espaco.consultasViragem / i.diasAno;
  espaco.utilizacaoViragemEmA = capA > 0 ? espaco.consultasViragem / capA : Infinity;

  return {
    operacao: { capDia, capAno, consJulia, consFisio, consTotal, utilizacao,
                fatJulia, fatFisio, fatTotal, precoMedio },
    colaboracao: { fatIsenta, recNaoProf, custoColab, margemColab },
    economia: { receita, custosFixos, custosVariaveis, custosOp, caixa,
                margemContribuicao, mcPct, breakEven, breakEvenMes: breakEven / 12,
                consultasBreakEven, consultasDiaBreakEven: consultasBreakEven / i.diasAno,
                utilizacaoBreakEven: capAno > 0 ? consultasBreakEven / capAno : Infinity,
                investimento, amortizacoes },
    vias: { v1, v2, v3 },
    tesouraria, riscoLaboral, espaco,
  };
}

const MOTOR = { PARAM, calcular, coleta, solidariedade, irsAgregado,
                INPUTS_PADRAO, RAMPA_PADRAO };
if (typeof module !== 'undefined' && module.exports) module.exports = MOTOR;
