/**
 * F1. Painel mensal do CFO Clinico.
 *
 * O produto do retainer. Sem ele o check-up e uma venda unica.
 *
 * As tres decisoes que separam esta versao do dashboard obvio:
 *
 * 1. Nenhuma metrica primaria e um valor absoluto. Tudo por dia util clinico e
 *    por hora-gabinete disponivel. Marco e Abril tem entre 19 e 23 dias uteis e
 *    compara-los em absoluto e apresentar aritmetica como analise.
 *
 * 2. O alerta e controlo estatistico, nao semaforo. E antes de haver serie, so
 *    limiares absolutos, com a ferramenta a dizer que esta a calibrar. Um
 *    semaforo numa clinica com 600 atos por mes dispara ruido, e ao terceiro mes
 *    o cliente aprende que os alertas nao significam nada.
 *
 * 3. Maximo de tres alertas. Se sairem nove, ordena por impacto em euros e
 *    mostra tres.
 *
 * Achado F-004, que fica registado e nao escondido: 1,5 sigma sobre oito
 * metricas produz uma taxa de falsos alertas alta. O motor mede a taxa empirica
 * na propria serie do cliente e reporta-a no bloco de calibracao, para que a
 * decisao de manter ou subir o limiar seja tomada com o numero a vista.
 */

import { Resultado } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import {
  zScoreExcluindoProprio, mediaMovelAnterior, variacao, desvioPadrao,
} from '../core/estatistica.js';
import { formata, porUnidade, aplicaTaxa } from '../core/dinheiro.js';
import { diasUteisClinicos, horasGabineteDisponiveis } from '../core/capacidade.js';
import { receitaPorMes, atosPorMes } from '../core/saft.js';
import { estadoDados as estadoBenchmark } from '../dados/benchmark-financeiro.js';

/**
 * Definicao das metricas do painel.
 * direcaoMa significa qual o sentido do desvio que constitui problema.
 */
export const METRICAS = [
  {
    id: 'receita-por-hora-gabinete',
    nome: 'Receita por hora-gabinete disponivel',
    unidade: 'CENT_POR_HORA',
    direcaoMa: 'DESCE',
    primaria: true,
    calcula: (m) => porUnidade(m.receitaCent, m.horasGabinete),
    impacto: (delta, m) => Math.round(delta * m.horasGabinete),
  },
  {
    id: 'receita-por-dia-util',
    nome: 'Receita por dia util clinico',
    unidade: 'CENT_POR_DIA',
    direcaoMa: 'DESCE',
    primaria: true,
    calcula: (m) => porUnidade(m.receitaCent, m.diasUteis),
    impacto: (delta, m) => Math.round(delta * m.diasUteis),
  },
  {
    id: 'atos-por-dia-util',
    nome: 'Atos por dia util clinico',
    unidade: 'NUMERO',
    direcaoMa: 'DESCE',
    calcula: (m) => (m.diasUteis ? m.atos / m.diasUteis : null),
    impacto: (delta, m) => Math.round(delta * m.diasUteis * (m.ticketMedioCent ?? 0)),
  },
  {
    id: 'ticket-medio',
    nome: 'Valor medio por ato',
    unidade: 'CENT',
    direcaoMa: 'DESCE',
    calcula: (m) => (m.atos ? porUnidade(m.receitaCent, m.atos) : null),
    impacto: (delta, m) => Math.round(delta * m.atos),
  },
  {
    id: 'ocupacao',
    nome: 'Taxa de ocupacao de gabinete',
    unidade: 'FRACAO',
    direcaoMa: 'DESCE',
    exigeAgenda: true,
    calcula: (m) => (m.horasGabinete && m.horasOcupadas != null ? m.horasOcupadas / m.horasGabinete : null),
    impacto: (delta, m) => Math.round(delta * m.horasGabinete * (m.receitaPorHoraOcupadaCent ?? 0)),
  },
  {
    id: 'receita-por-hora-ocupada',
    nome: 'Receita por hora efetivamente ocupada',
    unidade: 'CENT_POR_HORA',
    direcaoMa: 'DESCE',
    exigeAgenda: true,
    calcula: (m) => (m.horasOcupadas ? porUnidade(m.receitaCent, m.horasOcupadas) : null),
    impacto: (delta, m) => Math.round(delta * (m.horasOcupadas ?? 0)),
  },
  {
    id: 'peso-custos-fixos',
    nome: 'Peso dos custos fixos na receita',
    unidade: 'FRACAO',
    direcaoMa: 'SOBE',
    calcula: (m) => (m.receitaCent ? m.custosFixosCent / m.receitaCent : null),
    impacto: (delta, m) => Math.round(delta * m.receitaCent),
  },
  {
    id: 'dias-tesouraria',
    nome: 'Dias de tesouraria',
    unidade: 'DIAS',
    direcaoMa: 'DESCE',
    limiarAbsoluto: { operador: '<', limite: () => valor('P-16').diasTesourariaMinimos },
    calcula: (m) => {
      const saidaDiaria = (m.custosFixosCent + m.custosVariaveisCent) / 30;
      return saidaDiaria > 0 && m.saldoCent != null ? m.saldoCent / saidaDiaria : null;
    },
    impacto: (delta, m) => Math.round((delta * (m.custosFixosCent + m.custosVariaveisCent)) / 30),
  },
];

/**
 * Constroi a serie mensal a partir do SAF-T e do perfil.
 * A agenda e opcional. Sem agenda, as metricas que dependem dela ficam nulas e
 * a ferramenta declara-o, em vez de estimar ocupacao.
 */
export function constroiSerie(saft, perfil, { agendaPorMes = {}, saldosPorMes = {} } = {}) {
  const receitas = receitaPorMes(saft);
  const atos = atosPorMes(saft);
  const meses = [...new Set([...receitas.keys(), ...atos.keys()])].sort();

  return meses.map((mes) => {
    const [ano, m] = mes.split('-').map(Number);
    const { dias } = diasUteisClinicos({
      ano,
      mes: m,
      diasSemanaAbertos: perfil.capacidade?.diasSemanaAbertos,
      encerramentos: perfil.capacidade?.encerramentos ?? [],
      feriadosMunicipais: perfil.capacidade?.feriadosMunicipais ?? [],
    });
    const cap = horasGabineteDisponiveis(perfil, ano, m);
    const receitaCent = receitas.get(mes) ?? 0;
    const nAtos = atos.get(mes) ?? 0;
    const custosFixosCent = perfil.custos?.fixosMensaisCent ?? 0;
    const custoVariavelFracao = perfil.custos?.variavelFracaoReceita ?? 0;

    return {
      mes,
      ano,
      receitaCent,
      atos: nAtos,
      diasUteis: dias,
      horasGabinete: cap.horas,
      horasOcupadas: agendaPorMes[mes] ?? null,
      custosFixosCent,
      custosVariaveisCent: aplicaTaxa(receitaCent, custoVariavelFracao),
      saldoCent: saldosPorMes[mes] ?? null,
      ticketMedioCent: nAtos ? porUnidade(receitaCent, nAtos) : null,
      receitaPorHoraOcupadaCent: agendaPorMes[mes]
        ? porUnidade(receitaCent, agendaPorMes[mes])
        : null,
    };
  });
}

function serieDaMetrica(serie, metrica) {
  return serie.map((m) => {
    const v = metrica.calcula(m);
    return Number.isFinite(v) ? v : null;
  });
}

function adverso(delta, direcaoMa) {
  return direcaoMa === 'DESCE' ? delta < 0 : delta > 0;
}

/**
 * Deteta rutura de nivel. Ver pressuposto P-04.
 *
 * Nao e um alerta de desvio e nao consome um dos tres lugares. Existe porque ha
 * eventos, como a saida de um profissional que produzia um quinto da receita,
 * em que o mes anterior e o unico sinal e a media movel dilui o degrau por tres
 * meses.
 */
function detetaRutura(serieMetrica, indice, metrica, componentes) {
  const cfg = valor('P-04');
  if (!cfg.detetaRuturaDeNivel) return null;
  const atual = serieMetrica[indice];
  const mm3 = mediaMovelAnterior(serieMetrica, indice, 3);
  if (atual == null || mm3 == null || mm3 === 0) return null;

  const queda = (atual - mm3) / Math.abs(mm3);
  const caiu = metrica.direcaoMa === 'DESCE' ? queda <= -cfg.quedaMinimaRutura : queda >= cfg.quedaMinimaRutura;
  if (!caiu) return null;

  // A rutura so se confirma se a queda estiver concentrada num componente.
  const concentrado = (componentes ?? []).find((c) => Math.abs(c.contribuicao) >= 0.6);
  if (!concentrado) return null;

  return { queda, componente: concentrado };
}

/**
 * Taxa empirica de meses com pelo menos um alerta, correndo a regra sobre toda a
 * serie historica. E a resposta ao achado F-004. Se der 70%, o limiar esta
 * errado e o numero esta a vista para quem decide.
 */
export function taxaEmpiricaDeAlerta(serie, metricas = METRICAS) {
  const sigma = valor('P-15').sigma;
  const utilizaveis = metricas.filter((m) => serieDaMetrica(serie, m).some((v) => v != null));
  let mesesComAlerta = 0;
  let mesesAvaliados = 0;

  for (let i = 12; i < serie.length; i += 1) {
    mesesAvaliados += 1;
    let disparou = false;
    for (const metrica of utilizaveis) {
      const s = serieDaMetrica(serie, metrica);
      const janela = s.slice(i - 12, i + 1);
      const z = zScoreExcluindoProprio(s[i], janela, janela.length - 1);
      if (z != null && Math.abs(z) > sigma) disparou = true;
    }
    if (disparou) mesesComAlerta += 1;
  }

  return {
    mesesAvaliados,
    mesesComAlerta,
    taxa: mesesAvaliados === 0 ? null : mesesComAlerta / mesesAvaliados,
    nMetricas: utilizaveis.length,
    sigma,
  };
}

/**
 * @param {object} entrada
 * @param {Array} entrada.serie serie mensal ordenada
 * @param {object} entrada.perfil
 * @param {string} [entrada.mesAlvo] por defeito, o ultimo da serie
 * @param {Array} [entrada.componentesPorMetrica] decomposicao para deteccao de rutura
 * @param {object} [entrada.projecao] resultado do motor de tesouraria a 13 semanas
 */
export function painelMensal({
  serie, perfil, mesAlvo = null, componentesPorMetrica = {}, projecao = null,
}) {
  const r = new Resultado('F1', 'Painel mensal do CFO Clinico');
  r.usaPressuposto('P-04').usaPressuposto('P-15').usaPressuposto('P-16');

  if (!Array.isArray(serie) || serie.length === 0) {
    r.lacunas.declara('F1-SEM-SERIE', GRAVIDADE.BLOQUEIA,
      'Nao ha nenhum mes de dados. Sem SAF-T nao ha painel.');
    return r.defineVeredito('Sem dados para analisar.', { severidade: 'NEUTRO' });
  }

  const indice = mesAlvo ? serie.findIndex((m) => m.mes === mesAlvo) : serie.length - 1;
  if (indice < 0) {
    r.lacunas.declara('F1-MES-INEXISTENTE', GRAVIDADE.BLOQUEIA,
      `O mes ${mesAlvo} nao existe na serie carregada.`);
    return r.defineVeredito('O mes pedido nao esta nos dados.', { severidade: 'NEUTRO' });
  }

  const mes = serie[indice];
  const mesesDisponiveis = indice + 1;
  const minimo = valor('P-15').mesesMinimosParaCalibrar;
  const calibrado = mesesDisponiveis >= minimo;
  const sigma = valor('P-15').sigma;

  if (!calibrado) {
    r.lacunas.declara('F1-A-CALIBRAR', GRAVIDADE.DEGRADA,
      `So ha ${mesesDisponiveis} meses de serie. Sao precisos ${minimo} para o controlo estatistico. ` +
      'Ate la so disparam os limiares absolutos de risco e a ferramenta esta a calibrar.',
      { pressuposto: 'P-15' });
  }

  const temAgenda = serie.some((m) => m.horasOcupadas != null);
  if (!temAgenda) {
    r.lacunas.declara('F1-SEM-AGENDA', GRAVIDADE.DEGRADA,
      'Nao ha dados de agenda. Nao calculo taxa de ocupacao nem receita por hora ocupada. ' +
      'Nao estimo ocupacao a partir da receita, porque isso seria inventar o numero que interessa.',
      { comoResolver: 'Exportar a agenda em CSV com horas marcadas por gabinete e por mes.' });
  }
  if (!perfil.capacidade?.gabinetes?.length) {
    r.lacunas.declara('F1-SEM-GABINETES', GRAVIDADE.DEGRADA,
      'O perfil nao tem gabinetes detalhados. Sem eles nao ha hora-gabinete disponivel, ' +
      'que e o denominador de metade do painel.');
  }
  // Achado C-003 da revisao contabilistica. O SAF-T de faturacao nao tem gastos.
  // Tudo o que esta do lado do custo vem do perfil, introduzido a mao, e uma
  // serie de custos constante faz com que o peso dos custos e os dias de
  // tesouraria oscilem apenas porque a receita oscila. Isso nao e informacao
  // nova, e a mesma metrica duas vezes, e tem de ser dito.
  const custosDistintos = new Set(serie.map((m) => m.custosFixosCent)).size;
  if (custosDistintos <= 1 && serie.length > 1) {
    r.lacunas.declara('F1-CUSTOS-CONSTANTES', GRAVIDADE.DEGRADA,
      'Os custos fixos sao o mesmo valor em todos os meses, porque vem do perfil e nao da contabilidade. ' +
      'O peso dos custos e os dias de tesouraria variam apenas em funcao da receita, e nao captam ' +
      'nenhuma alteracao real do lado do custo.',
      { comoResolver: 'Carregar o balancete mensal, ou pelo menos atualizar os custos fixos sempre que mudarem.' });
  }

  if (!estadoBenchmark.carregado) {
    r.lacunas.declara('F1-SEM-BENCHMARK', GRAVIDADE.INFORMA,
      'Nao ha benchmark financeiro carregado. Os desvios sao contra a propria historia da clinica, ' +
      'nao contra o setor.',
      { comoResolver: 'Carregar a Central de Balancos em src/dados/benchmark-financeiro.js.' });
  }

  const linhas = [];
  for (const metrica of METRICAS) {
    if (metrica.exigeAgenda && !temAgenda) continue;
    const s = serieDaMetrica(serie, metrica);
    const atual = s[indice];
    if (atual == null) continue;

    const mm3 = mediaMovelAnterior(s, indice, 3);
    const homologoIdx = serie.findIndex((m) => m.mes === mesHomologo(mes.mes));
    const homologo = homologoIdx >= 0 ? s[homologoIdx] : null;
    const anteriorIdx = indice - 1;
    const anterior = anteriorIdx >= 0 ? s[anteriorIdx] : null;

    const janela = s.slice(Math.max(0, indice - 12), indice + 1);
    const z = calibrado ? zScoreExcluindoProprio(atual, janela, janela.length - 1) : null;

    const linha = {
      metrica: metrica.id,
      nome: metrica.nome,
      unidade: metrica.unidade,
      atual,
      mediaMovel3: mm3,
      homologo,
      anterior,
      variacaoContraMm3: variacao(atual, mm3),
      variacaoContraHomologo: variacao(atual, homologo),
      variacaoContraAnterior: variacao(atual, anterior),
      z,
      desvioPadraoSerie: desvioPadrao(janela.slice(0, -1)),
      disparouPorAnterior: false,
    };
    linhas.push(linha);

    // Gatilho estatistico, so contra media movel e homologo.
    let dispara = false;
    let base = null;
    let baseNome = null;
    if (calibrado && z != null && Math.abs(z) > sigma) {
      const referencia = mm3 ?? homologo;
      if (referencia != null && adverso(atual - referencia, metrica.direcaoMa)) {
        dispara = true;
        base = referencia;
        baseNome = mm3 != null ? 'media movel de tres meses' : 'mesmo mes do ano anterior';
      }
    }

    // Gatilho absoluto, corre sempre, mesmo sem serie calibrada.
    let disparoAbsoluto = false;
    if (metrica.limiarAbsoluto) {
      const limite = metrica.limiarAbsoluto.limite();
      if (metrica.limiarAbsoluto.operador === '<' && atual < limite) disparoAbsoluto = true;
      if (metrica.limiarAbsoluto.operador === '>' && atual > limite) disparoAbsoluto = true;
      if (disparoAbsoluto) {
        base = limite;
        baseNome = 'limiar absoluto de risco';
        dispara = true;
      }
    }

    // O mes anterior nunca dispara. Ver pressuposto P-04.
    if (!valor('P-04').mesAnteriorDisparaAlerta && anterior != null) {
      linha.disparouPorAnterior = false;
    }

    if (dispara) {
      const delta = atual - base;
      const impactoCent = metrica.impacto ? metrica.impacto(delta, mes) : null;
      r.acrescentaAlerta({
        codigo: `F1-${metrica.id}`,
        titulo: metrica.nome,
        explicacao: explicaAlerta(metrica, atual, base, baseNome, z, disparoAbsoluto),
        impactoCent,
        classe: 'DESVIO',
        accao: null,
      });
    }

    // Rutura de nivel, classe separada.
    const rutura = detetaRutura(s, indice, metrica, componentesPorMetrica[metrica.id]);
    if (rutura) {
      r.acrescentaAlerta({
        codigo: `F1-RUTURA-${metrica.id}`,
        titulo: `Rutura de nivel em ${metrica.nome.toLowerCase()}`,
        explicacao:
          `Caiu ${Math.abs(Math.round(rutura.queda * 100))}% contra a media movel de tres meses e a queda ` +
          `esta concentrada em ${rutura.componente.nome}, que explica ` +
          `${Math.round(Math.abs(rutura.componente.contribuicao) * 100)}% do desvio. ` +
          'Isto nao e variacao, e uma mudanca de patamar.',
        impactoCent: metrica.impacto
          ? metrica.impacto(s[indice] - mediaMovelAnterior(s, indice, 3), mes)
          : null,
        classe: 'RUTURA',
      });
    }
  }

  r.limitaAlertas(3);

  r.acrescentaBloco({
    id: 'metricas',
    titulo: 'Metricas normalizadas',
    tipo: 'tabela',
    dados: { mes: mes.mes, diasUteis: mes.diasUteis, horasGabinete: mes.horasGabinete, linhas },
  });

  r.acrescentaBloco({
    id: 'absolutos',
    titulo: 'Valores absolutos do mes',
    tipo: 'tabela',
    dados: {
      receitaCent: mes.receitaCent,
      atos: mes.atos,
      custosFixosCent: mes.custosFixosCent,
      nota: 'Os valores absolutos aparecem para leitura. Nenhum deles dispara alerta.',
    },
  });

  if (projecao) {
    r.acrescentaBloco({ id: 'tesouraria', titulo: 'Tesouraria a 13 semanas', tipo: 'projecao', dados: projecao });
  } else {
    r.lacunas.declara('F1-SEM-PROJECAO', GRAVIDADE.DEGRADA,
      'Nao ha saldo bancario nem historico de recebimentos suficiente para a projecao a 13 semanas.',
      { comoResolver: 'Introduzir o saldo bancario a data e, se possivel, exportar o SAF-T com recibos.' });
  }

  if (serie.length > 12) {
    const taxa = taxaEmpiricaDeAlerta(serie);
    r.acrescentaBloco({
      id: 'calibracao',
      titulo: 'Calibracao da regra de alerta',
      tipo: 'diagnostico',
      dados: {
        ...taxa,
        leitura:
          taxa.taxa == null
            ? 'Serie curta demais para medir.'
            : `Com o limiar atual de ${taxa.sigma} sigma sobre ${taxa.nMetricas} metricas, ` +
              `${Math.round(taxa.taxa * 100)}% dos meses historicos teriam gerado pelo menos um alerta. ` +
              'Se este numero for alto, o limiar esta a produzir ruido e deve subir. Ver P-15.',
      },
    });
  }

  // Memo com espacos de julgamento, como no pipeline da clinica de psicologia.
  // A ferramenta calcula, a leitura e de quem apresenta. Os espacos ficam vazios
  // de proposito: um memo pre-preenchido por maquina e o oposto do que isto e.
  r.acrescentaBloco({
    id: 'memo',
    titulo: 'Memo para a reuniao',
    tipo: 'memo',
    dados: {
      mes: mes.mes,
      campos: [
        { id: 'leitura', titulo: 'A minha leitura do mes', texto: '' },
        { id: 'contexto', titulo: 'O que aconteceu na clinica que os numeros nao mostram', texto: '' },
        { id: 'decisao', titulo: 'Decisao que proponho para este mes', texto: '' },
        { id: 'seguimento', titulo: 'O que vou verificar no proximo painel', texto: '' },
      ],
      nota: 'Estes campos ficam em branco por construcao. A analise e da ferramenta, o julgamento e teu.',
    },
  });

  const nAlertas = r.alertas.length;
  const impactoTotal = r.alertas.reduce((a, x) => a + Math.abs(x.impactoCent ?? 0), 0);
  r.defineVeredito(
    nAlertas === 0
      ? calibrado
        ? `Mes dentro do normal da clinica. Nenhuma metrica saiu do intervalo habitual em ${mes.mes}.`
        : `Nada a assinalar em ${mes.mes}, mas a ferramenta ainda esta a calibrar e so verifica limiares absolutos.`
      : `${nAlertas} ${nAlertas === 1 ? 'ponto' : 'pontos'} a tratar em ${mes.mes}, com impacto estimado de ${formata(impactoTotal, { compacto: true })}.`,
    { severidade: nAlertas === 0 ? 'BOM' : nAlertas >= 3 ? 'MAU' : 'ATENCAO' },
  );

  return r;
}

function explicaAlerta(metrica, atual, base, baseNome, z, absoluto) {
  const dir = atual < base ? 'abaixo' : 'acima';
  const pct = base ? Math.abs(Math.round(((atual - base) / Math.abs(base)) * 100)) : null;
  if (absoluto) {
    return `${metrica.nome} esta em ${arredonda(atual)} contra o ${baseNome} de ${arredonda(base)}. ` +
      'Dispara independentemente da historia da clinica.';
  }
  return `${metrica.nome} esta ${pct}% ${dir} do ${baseNome}. ` +
    `Corresponde a ${Math.abs(z).toFixed(1)} desvios-padrao da propria serie da clinica.`;
}

function arredonda(v) {
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 'n/d';
}

function mesHomologo(mes) {
  const [ano, m] = mes.split('-');
  return `${Number(ano) - 1}-${m}`;
}
