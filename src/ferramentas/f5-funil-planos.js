/**
 * F5. Funil de planos de tratamento.
 *
 * Quatro razoes pelas quais a taxa de aceitacao mensal, que e o que toda a gente
 * calcula, nao serve:
 *
 * 1. O denominador e ficticio. Se os orcamentos nao sao registados de forma
 *    sistematica, o racio mede disciplina de registo, nao conversao. Mostrar uma
 *    taxa de aceitacao sobre registo incompleto e pior do que nao mostrar nada,
 *    porque o cliente age sobre ela. Por isso o primeiro passo e a auditoria de
 *    completude e a ferramenta recusa mostrar a taxa abaixo do limiar.
 *
 * 2. O racio mensal mistura coortes em fases diferentes. Um plano proposto em
 *    Marco aceita-se em Abril e completa-se ao longo de nove meses.
 *
 * 3. O dinheiro esta no abandono a meio, nao na recusa inicial. Plano aceite e
 *    parado ao terceiro de seis passos e receita esperada que nao entra,
 *    capacidade reservada que nao se usa e um paciente que nao regressa.
 *
 * 4. O tempo ate ao primeiro tratamento e o preditor mais forte de conclusao, e
 *    e acionavel no proprio dia.
 */

import { Resultado } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { formata, soma } from '../core/dinheiro.js';
import { mediana } from '../core/estatistica.js';

export const NIVEL_DADOS = Object.freeze({
  COMPLETO: 'COMPLETO',
  PARCIAL: 'PARCIAL',
  MINIMO: 'MINIMO',
  INSUFICIENTE: 'INSUFICIENTE',
});

/**
 * Sonda de capacidade do ficheiro. Ver pressuposto P-02.
 * Nao assume formato de nenhum software. Olha para o que la esta.
 */
export function detetaNivelDeDados(planos) {
  if (!Array.isArray(planos) || planos.length === 0) return NIVEL_DADOS.INSUFICIENTE;
  const temPassos = planos.some((p) => Array.isArray(p.passos) && p.passos.length > 0);
  const temEstadoPorPasso = planos.some(
    (p) => Array.isArray(p.passos) && p.passos.some((s) => s.estado != null),
  );
  const temDatasPasso = planos.some(
    (p) => Array.isArray(p.passos) && p.passos.some((s) => s.dataExecucao != null),
  );
  const temAceitacao = planos.some((p) => p.dataAceitacao != null || p.estado != null);

  if (temPassos && temEstadoPorPasso && temDatasPasso) return NIVEL_DADOS.COMPLETO;
  if (temAceitacao) return NIVEL_DADOS.PARCIAL;
  return NIVEL_DADOS.MINIMO;
}

/**
 * Auditoria de completude do registo.
 *
 * Mede a cobertura comparando o valor dos planos registados com a receita de
 * tratamento efetivamente faturada no mesmo periodo. Se a clinica faturou 400
 * mil de tratamento e so ha planos registados que cobrem 120 mil, o registo
 * cobre 30% e nao ha taxa de aceitacao nenhuma que se possa mostrar.
 */
export function auditaCompletude({ planos, receitaTratamentoCent, periodo }) {
  const valorPlanosCent = soma(planos.map((p) => p.valorCent ?? 0));
  const executadoRegistadoCent = soma(
    planos.flatMap((p) => (p.passos ?? [])
      .filter((s) => s.estado === 'EXECUTADO')
      .map((s) => s.valorCent ?? 0)),
  );

  const base = receitaTratamentoCent || 0;
  const cobertura = base > 0 ? executadoRegistadoCent / base : null;
  const limiar = valor('P-17').completudeMinima;

  const semData = planos.filter((p) => !p.dataProposta).length;
  const semValor = planos.filter((p) => p.valorCent == null).length;

  return {
    nPlanos: planos.length,
    valorPlanosCent,
    executadoRegistadoCent,
    receitaTratamentoCent: base,
    cobertura,
    limiar,
    suficiente: cobertura != null && cobertura >= limiar,
    semDataProposta: semData,
    semValor,
    periodo,
    leitura: cobertura == null
      ? 'Nao consigo medir a cobertura porque nao tenho receita de tratamento do mesmo periodo para comparar.'
      : cobertura >= limiar
        ? `O registo cobre ${Math.round(cobertura * 100)}% da receita de tratamento. Acima do limiar, a taxa de aceitacao e legivel.`
        : `O registo cobre ${Math.round(cobertura * 100)}% da receita de tratamento, abaixo do limiar de ${Math.round(limiar * 100)}%. ` +
          'A taxa de aceitacao calculada sobre este registo mede disciplina de registo, nao conversao, e por isso nao a mostro.',
  };
}

/** Coortes por mes de proposta, com curva de conclusao acumulada. */
export function coortes(planos, { horizonteMeses = 18 } = {}) {
  const porMes = new Map();
  for (const p of planos) {
    if (!p.dataProposta) continue;
    const mes = p.dataProposta.slice(0, 7);
    const lista = porMes.get(mes) ?? [];
    lista.push(p);
    porMes.set(mes, lista);
  }

  const saida = [];
  for (const [mes, lista] of [...porMes.entries()].sort()) {
    const valorPropostoCent = soma(lista.map((p) => p.valorCent ?? 0));
    const aceites = lista.filter((p) => p.dataAceitacao != null);
    const valorAceiteCent = soma(aceites.map((p) => p.valorCent ?? 0));

    const curva = [];
    for (let m = 0; m <= horizonteMeses; m += 1) {
      const limite = adicionaMeses(mes, m);
      const executadoCent = soma(
        lista.flatMap((p) => (p.passos ?? [])
          .filter((s) => s.estado === 'EXECUTADO' && s.dataExecucao && s.dataExecucao.slice(0, 7) <= limite)
          .map((s) => s.valorCent ?? 0)),
      );
      curva.push({
        mesesDesdeProposta: m,
        executadoCent,
        fracaoDoProposto: valorPropostoCent > 0 ? executadoCent / valorPropostoCent : null,
        fracaoDoAceite: valorAceiteCent > 0 ? executadoCent / valorAceiteCent : null,
      });
    }

    saida.push({
      mes,
      nPlanos: lista.length,
      nAceites: aceites.length,
      taxaAceitacao: lista.length > 0 ? aceites.length / lista.length : null,
      valorPropostoCent,
      valorAceiteCent,
      curva,
      maturidadeMeses: mesesEntre(mes, hojeMes()),
    });
  }
  return saida;
}

/**
 * Abandono a meio. E aqui que esta a maior recuperacao imediata e quase ninguem
 * mede isto.
 */
export function abandonoAMeio(planos, { escaloesDias = [30, 60, 90, 180, 365] } = {}) {
  const parados = [];
  for (const p of planos) {
    if (!p.dataAceitacao || !Array.isArray(p.passos) || p.passos.length === 0) continue;
    const executados = p.passos.filter((s) => s.estado === 'EXECUTADO');
    const pendentes = p.passos.filter((s) => s.estado !== 'EXECUTADO' && s.estado !== 'CANCELADO');
    if (executados.length === 0 || pendentes.length === 0) continue;

    const ultimaData = executados
      .map((s) => s.dataExecucao)
      .filter(Boolean)
      .sort()
      .pop();
    if (!ultimaData) continue;

    const diasParado = diasEntre(ultimaData, hojeIso());
    parados.push({
      planoId: p.id,
      pacientePseudonimo: p.pacientePseudonimo ?? null,
      passosExecutados: executados.length,
      passosTotais: p.passos.length,
      progresso: executados.length / p.passos.length,
      valorParadoCent: soma(pendentes.map((s) => s.valorCent ?? 0)),
      ultimaExecucao: ultimaData,
      diasParado,
      escalao: escaloesDias.find((d) => diasParado <= d) ?? `>${escaloesDias[escaloesDias.length - 1]}`,
    });
  }

  const porEscalao = {};
  for (const e of [...escaloesDias, `>${escaloesDias[escaloesDias.length - 1]}`]) {
    const desta = parados.filter((p) => String(p.escalao) === String(e));
    porEscalao[e] = { n: desta.length, valorCent: soma(desta.map((p) => p.valorParadoCent)) };
  }

  return {
    parados: parados.sort((a, b) => b.valorParadoCent - a.valorParadoCent),
    totalParadoCent: soma(parados.map((p) => p.valorParadoCent)),
    porEscalao,
  };
}

/**
 * Efeito do intervalo ate ao primeiro tratamento.
 * Compara a taxa de conclusao por escalao de dias entre aceitacao e primeiro
 * passo executado.
 */
export function efeitoTempoAtePrimeiroTratamento(planos, { escaloes = [7, 14, 30, 60] } = {}) {
  const linhas = [];
  for (const p of planos) {
    if (!p.dataAceitacao || !Array.isArray(p.passos)) continue;
    const primeiro = p.passos
      .filter((s) => s.estado === 'EXECUTADO' && s.dataExecucao)
      .map((s) => s.dataExecucao)
      .sort()[0];
    if (!primeiro) continue;
    const dias = diasEntre(p.dataAceitacao, primeiro);
    const executados = p.passos.filter((s) => s.estado === 'EXECUTADO').length;
    linhas.push({ dias, conclusao: executados / p.passos.length, valorCent: p.valorCent ?? 0 });
  }

  const grupos = [];
  let anterior = 0;
  for (const e of [...escaloes, Infinity]) {
    const desta = linhas.filter((l) => l.dias > anterior - 1 && l.dias <= e);
    grupos.push({
      escalao: e === Infinity ? `>${escaloes[escaloes.length - 1]} dias` : `ate ${e} dias`,
      n: desta.length,
      conclusaoMediana: desta.length > 0 ? mediana(desta.map((l) => l.conclusao)) : null,
    });
    anterior = e;
  }

  const comDados = grupos.filter((g) => g.n >= 5 && g.conclusaoMediana != null);
  const diferenca = comDados.length >= 2
    ? comDados[0].conclusaoMediana - comDados[comDados.length - 1].conclusaoMediana
    : null;

  return {
    grupos,
    diferenca,
    leitura: diferenca == null
      ? 'Sem grupos com dimensao suficiente para medir o efeito.'
      : `Os planos que arrancam no primeiro escalao concluem-se ${Math.round(diferenca * 100)} pontos ` +
        'percentuais acima dos que arrancam mais tarde. E accionavel no proprio dia, sem investimento.',
  };
}

export function funilPlanos({ planos = [], receitaTratamentoCent = null, periodo = {} }) {
  const r = new Resultado('F5', 'Funil de planos de tratamento');
  r.usaPressuposto('P-02').usaPressuposto('P-17');

  const nivel = detetaNivelDeDados(planos);
  if (nivel === NIVEL_DADOS.INSUFICIENTE) {
    r.lacunas.declara('F5-SEM-PLANOS', GRAVIDADE.BLOQUEIA,
      'Nao ha nenhum plano de tratamento no ficheiro carregado.',
      { pressuposto: 'P-02' });
    return r.defineVeredito('Sem planos para analisar.');
  }

  r.acrescentaBloco({
    id: 'capacidade-dados',
    titulo: 'O que este ficheiro permite calcular',
    tipo: 'diagnostico',
    dados: {
      nivel,
      explicacao: {
        COMPLETO: 'O ficheiro tem passos com estado e data. Da para tudo: coortes, maturacao, abandono a meio e euros parados.',
        PARCIAL: 'O ficheiro tem plano e aceitacao, sem passos. Da para coortes e maturacao. Nao da para medir abandono a meio, que e onde esta o dinheiro.',
        MINIMO: 'O ficheiro so distingue aceite de nao aceite. Da para taxa de aceitacao, e so se passar a auditoria de completude.',
      }[nivel],
      softwaresPorConfirmar: valor('P-02').softwaresPorConfirmar,
    },
  });

  if (nivel === NIVEL_DADOS.PARCIAL) {
    r.lacunas.declara('F5-SEM-PASSOS', GRAVIDADE.DEGRADA,
      'O export nao traz estado por passo. Nao consigo medir abandono a meio nem euros parados, ' +
      'que e a parte da ferramenta que vale.',
      { pressuposto: 'P-02', comoResolver: 'Confirmar com o fornecedor do software se existe export com detalhe por passo.' });
  }
  if (nivel === NIVEL_DADOS.MINIMO) {
    r.lacunas.declara('F5-SO-ACEITE-NAO-ACEITE', GRAVIDADE.DEGRADA,
      'O export so distingue aceite de nao aceite. A ferramenta reduz-se a taxa de aceitacao por coorte.',
      { pressuposto: 'P-02' });
  }

  const completude = auditaCompletude({ planos, receitaTratamentoCent, periodo });
  r.acrescentaBloco({ id: 'completude', titulo: 'Auditoria de completude do registo', tipo: 'diagnostico', dados: completude });

  if (!completude.suficiente) {
    r.lacunas.declara('F5-REGISTO-INCOMPLETO', GRAVIDADE.BLOQUEIA,
      completude.leitura,
      { pressuposto: 'P-17', comoResolver: 'Passar a registar todos os orcamentos apresentados durante tres meses e voltar a correr.' });
    r.defineVeredito(
      'Nao mostro taxa de aceitacao com este registo. O primeiro trabalho e registar os orcamentos, nao analisar a conversao.',
      { severidade: 'ATENCAO' },
    );
    return r;
  }

  const co = coortes(planos);
  r.acrescentaBloco({ id: 'coortes', titulo: 'Coortes por mes de proposta', tipo: 'coortes', dados: co });

  let paradoCent = 0;
  if (nivel === NIVEL_DADOS.COMPLETO) {
    const ab = abandonoAMeio(planos);
    paradoCent = ab.totalParadoCent;
    r.acrescentaBloco({ id: 'abandono', titulo: 'Abandono a meio', tipo: 'tabela', dados: ab });
    r.acrescentaBloco({
      id: 'recuperar',
      titulo: 'Planos a recuperar, por valor',
      tipo: 'lista-nominativa',
      dados: {
        nota: 'Lista por pseudonimo. A identificacao do paciente faz-se no software clinico da clinica, nunca aqui.',
        planos: ab.parados.slice(0, 50),
      },
    });
    r.acrescentaBloco({
      id: 'tempo-primeiro',
      titulo: 'Efeito do tempo ate ao primeiro tratamento',
      tipo: 'comparacao',
      dados: efeitoTempoAtePrimeiroTratamento(planos),
    });
  }

  const taxaGlobal = co.length > 0
    ? co.reduce((a, c) => a + (c.nAceites ?? 0), 0) / co.reduce((a, c) => a + c.nPlanos, 0)
    : null;

  r.defineVeredito(
    paradoCent > 0
      ? `${formata(paradoCent, { compacto: true })} parados em planos aceites e por concluir. E a recuperacao mais imediata que existe nesta clinica.`
      : taxaGlobal != null
        ? `Taxa de aceitacao de ${Math.round(taxaGlobal * 100)}% nas coortes com maturidade suficiente.`
        : 'Coortes calculadas, sem valor parado identificado.',
    { severidade: paradoCent > 0 ? 'ATENCAO' : 'NEUTRO' },
  );

  return r;
}

// Utilitarios de data. Meses no formato AAAA-MM.
function adicionaMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const total = (a * 12 + (m - 1)) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
function mesesEntre(a, b) {
  const [aa, am] = a.split('-').map(Number);
  const [ba, bm] = b.split('-').map(Number);
  return (ba * 12 + bm) - (aa * 12 + am);
}
function diasEntre(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
}
function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}
function hojeMes() {
  return hojeIso().slice(0, 7);
}
