/**
 * F6. Investimento em equipamento.
 *
 * A ordem das perguntas e a ferramenta.
 *
 * Primeiro: quantos atos por mes sao precisos para o equilibrio, e a procura
 * observada no SAF-T chega la? Se nao chegar, a analise financeira acabou e nao
 * e preciso discutir financiamento. Equipamento usado quatro horas por semana
 * nao paga com juro zero.
 *
 * Segundo: o IVA. Com atividade isenta pelo artigo 9.o do CIVA o imposto do
 * investimento nao e dedutivel e entra no custo, o que significa mais 23% de
 * capex real. Se a clinica tambem tiver atividade tributada, ha deducao parcial
 * pelo artigo 23.o, por pro rata ou por afetacao real, e para um equipamento
 * identificavel a afetacao real costuma ser mais favoravel do que o pro rata
 * geral. E ha regularizacao de bens de investimento ao longo de cinco anos pelos
 * artigos 24.o e 25.o se a proporcao de uso mudar. Nenhuma calculadora generica
 * de investimento modela isto, e e aqui que a ferramenta paga o servico.
 *
 * Terceiro: leasing contra compra nao muda o IVA no cenario isento. Muda o
 * momento e o veiculo do gasto.
 *
 * Quarto: o equipamento ocupa uma sala que tinha outro uso.
 */

import { Resultado, NATUREZA } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { formata, aplicaTaxa } from '../core/dinheiro.js';

export const REGIME_IVA = Object.freeze({
  ISENTO_ART9: 'ISENTO_ART9',
  MISTO_PRO_RATA: 'MISTO_PRO_RATA',
  MISTO_AFETACAO_REAL: 'MISTO_AFETACAO_REAL',
  TRIBUTADO: 'TRIBUTADO',
});

/**
 * Capex real, depois do tratamento do IVA.
 * @param {object} e
 * @param {number} e.precoSemIvaCent
 * @param {number} e.taxaIva
 * @param {string} e.regime
 * @param {number} [e.proRata] fracao dedutivel pelo pro rata geral
 * @param {number} [e.afetacaoRealUsoTributado] fracao de uso em atividade tributada
 */
export function capexReal({ precoSemIvaCent, taxaIva, regime, proRata = null, afetacaoRealUsoTributado = null }) {
  const ivaCent = aplicaTaxa(precoSemIvaCent, taxaIva);
  let fracaoDedutivel = 0;
  let metodo = 'SEM_DEDUCAO';

  switch (regime) {
    case REGIME_IVA.TRIBUTADO:
      fracaoDedutivel = 1;
      metodo = 'DEDUCAO_INTEGRAL';
      break;
    case REGIME_IVA.MISTO_PRO_RATA:
      if (proRata == null) throw new Error('Regime de pro rata sem pro rata indicado.');
      fracaoDedutivel = proRata;
      metodo = 'PRO_RATA_ARTIGO_23';
      break;
    case REGIME_IVA.MISTO_AFETACAO_REAL:
      if (afetacaoRealUsoTributado == null) {
        throw new Error('Afetacao real sem fracao de uso tributado indicada.');
      }
      fracaoDedutivel = afetacaoRealUsoTributado;
      metodo = 'AFETACAO_REAL_ARTIGO_23';
      break;
    case REGIME_IVA.ISENTO_ART9:
    default:
      fracaoDedutivel = 0;
      metodo = 'SEM_DEDUCAO_ARTIGO_9';
      break;
  }

  const ivaDedutivelCent = aplicaTaxa(ivaCent, fracaoDedutivel);
  const ivaNoCustoCent = ivaCent - ivaDedutivelCent;

  return {
    precoSemIvaCent,
    ivaCent,
    fracaoDedutivel,
    metodo,
    ivaDedutivelCent,
    ivaNoCustoCent,
    capexRealCent: precoSemIvaCent + ivaNoCustoCent,
    sobrecustoIvaFracao: precoSemIvaCent > 0 ? ivaNoCustoCent / precoSemIvaCent : 0,
  };
}

/**
 * Compara pro rata geral com afetacao real para um equipamento identificavel.
 * Para um equipamento afeto sobretudo a atividade tributada, a afetacao real
 * costuma ser mais favoravel do que o pro rata da empresa inteira.
 */
export function comparaMetodosDeDeducao({ precoSemIvaCent, taxaIva, proRata, usoTributado }) {
  if (proRata == null || usoTributado == null) return null;
  const comProRata = capexReal({
    precoSemIvaCent, taxaIva, regime: REGIME_IVA.MISTO_PRO_RATA, proRata,
  });
  const comAfetacao = capexReal({
    precoSemIvaCent, taxaIva, regime: REGIME_IVA.MISTO_AFETACAO_REAL, afetacaoRealUsoTributado: usoTributado,
  });
  const diferencaCent = comProRata.capexRealCent - comAfetacao.capexRealCent;
  return {
    comProRata,
    comAfetacao,
    diferencaCent,
    recomendado: diferencaCent > 0 ? 'AFETACAO_REAL' : diferencaCent < 0 ? 'PRO_RATA' : 'INDIFERENTE',
    leitura: diferencaCent === 0
      ? 'Os dois metodos dao o mesmo resultado neste equipamento.'
      : `A afetacao real ${diferencaCent > 0 ? 'poupa' : 'custa'} ${formata(Math.abs(diferencaCent))} de capex face ao pro rata geral.`,
    aviso:
      'A escolha do metodo de deducao nao e livre caso a caso e tem condicoes de aplicacao. ' +
      'Esta comparacao quantifica o efeito, nao decide o enquadramento.',
  };
}

/**
 * Regularizacao de bens de investimento, artigos 24.o e 25.o do CIVA.
 * Se a proporcao de uso mudar durante o periodo de regularizacao, ha imposto a
 * devolver ou a recuperar. Uma clinica que compra a contar com 60% de uso
 * tributado e acaba com 20% tem uma conta a pagar que ninguem projetou.
 */
export function regularizacaoBensInvestimento({ ivaCent, fracaoInicial, fracoesPorAno, anos = null }) {
  const periodo = anos ?? valor('P-10').moveis;
  const linhas = [];
  let totalCent = 0;
  for (let ano = 1; ano < periodo; ano += 1) {
    const fracaoAno = fracoesPorAno[ano];
    if (fracaoAno == null) continue;
    const delta = fracaoAno - fracaoInicial;
    // Regularizacao anual de um quinto da diferenca de imposto.
    const ajusteCent = Math.round((ivaCent * delta) / periodo);
    totalCent += ajusteCent;
    linhas.push({ ano, fracaoAno, delta, ajusteCent, sentido: ajusteCent >= 0 ? 'A_RECUPERAR' : 'A_ENTREGAR' });
  }
  return {
    periodoAnos: periodo,
    fracaoInicial,
    linhas,
    totalCent,
    nota: 'Regularizacao anual de um quinto por cada ponto de variacao da proporcao de uso. Ver P-10.',
  };
}

/**
 * Ponto de equilibrio em atos por mes.
 * E a primeira pergunta e a que fecha muitas analises.
 */
export function pontoDeEquilibrio({
  capexRealCent,
  vidaUtilAnos,
  custoFixoMensalAdicionalCent = 0,
  margemContribuicaoPorAtoCent,
  custoOportunidadeEspacoMensalCent = 0,
  taxaFinanciamentoAnual = 0,
}) {
  if (!margemContribuicaoPorAtoCent || margemContribuicaoPorAtoCent <= 0) {
    return { calculavel: false, motivo: 'A margem de contribuicao por ato tem de ser positiva.' };
  }
  const meses = vidaUtilAnos * 12;
  const amortizacaoMensalCent = Math.round(capexRealCent / meses);
  const jurosMensalMedioCent = Math.round((capexRealCent / 2) * (taxaFinanciamentoAnual / 12));
  const custoMensalTotalCent =
    amortizacaoMensalCent + jurosMensalMedioCent + custoFixoMensalAdicionalCent + custoOportunidadeEspacoMensalCent;

  return {
    calculavel: true,
    amortizacaoMensalCent,
    jurosMensalMedioCent,
    custoFixoMensalAdicionalCent,
    custoOportunidadeEspacoMensalCent,
    custoMensalTotalCent,
    atosPorMes: Math.ceil(custoMensalTotalCent / margemContribuicaoPorAtoCent),
    margemContribuicaoPorAtoCent,
  };
}

/**
 * Leasing contra compra.
 * No cenario isento o IVA nao muda. Muda o momento e o veiculo do gasto:
 * depreciacao num caso, renda no outro, com efeito diferente em IRC e em
 * autonomia financeira.
 */
export function leasingContraCompra({
  capexRealCent, vidaUtilAnos, rendaMensalCent, prazoMesesLeasing, valorResidualCent = 0,
  taxaIrc = 0.21, quotaDepreciacao = null,
}) {
  const quota = quotaDepreciacao ?? valor('P-11').maxima;
  const quotaMin = valor('P-11').minima;

  const depreciacaoAnualCent = Math.round(capexRealCent * quota);
  const depreciacaoAnualMinimaCent = Math.round(capexRealCent * quotaMin);
  const custoTotalLeasingCent = rendaMensalCent * prazoMesesLeasing + valorResidualCent;

  return {
    compra: {
      desembolsoInicialCent: capexRealCent,
      depreciacaoAnualCent,
      depreciacaoAnualMinimaCent,
      poupancaFiscalAnualCent: aplicaTaxa(depreciacaoAnualCent, taxaIrc),
      anosDeDepreciacao: Math.ceil(1 / quota),
      margemDePlaneamento:
        `A quota pode variar entre ${Math.round(quotaMin * 100)}% e ${Math.round(quota * 100)}%, ` +
        'o que da margem para acomodar o resultado do exercicio.',
    },
    leasing: {
      desembolsoInicialCent: 0,
      custoTotalCent: custoTotalLeasingCent,
      sobrecustoFaceACompraCent: custoTotalLeasingCent - capexRealCent,
      poupancaFiscalAnualCent: aplicaTaxa(rendaMensalCent * 12, taxaIrc),
      efeitoAutonomiaFinanceira:
        'A renda nao entra no ativo nem no passivo da mesma forma que a compra financiada, ' +
        'o que altera a autonomia financeira que o banco ve.',
    },
    ivaNota: 'No cenario de isencao pelo artigo 9.o o tratamento de IVA e o mesmo nas duas vias. Nao e criterio de escolha.',
    vidaUtilAnos,
  };
}

export function investimentoEquipamento({
  equipamento,
  perfil,
  procuraObservadaAtosPorMes = null,
  capacidadeDisponivelHorasMes = null,
  cenarios = null,
}) {
  const r = new Resultado('F6', 'Investimento em equipamento');
  r.usaPressuposto('P-09').usaPressuposto('P-10').usaPressuposto('P-11');

  const taxaIva = valor('P-09')[perfil.identificacao?.regiao ?? 'CONTINENTE'];
  const capex = capexReal({
    precoSemIvaCent: equipamento.precoSemIvaCent,
    taxaIva,
    regime: equipamento.regimeIva ?? perfil.fiscal?.regimeIva ?? REGIME_IVA.ISENTO_ART9,
    proRata: equipamento.proRata ?? perfil.fiscal?.proRataDedutivel ?? null,
    afetacaoRealUsoTributado: equipamento.usoTributado ?? null,
  });

  const equilibrio = pontoDeEquilibrio({
    capexRealCent: capex.capexRealCent,
    vidaUtilAnos: equipamento.vidaUtilAnos,
    custoFixoMensalAdicionalCent: equipamento.custoFixoMensalAdicionalCent ?? 0,
    margemContribuicaoPorAtoCent: equipamento.margemContribuicaoPorAtoCent,
    custoOportunidadeEspacoMensalCent: equipamento.custoOportunidadeEspacoMensalCent ?? 0,
    taxaFinanciamentoAnual: equipamento.taxaFinanciamentoAnual ?? 0,
  });

  r.acrescentaBloco({
    id: 'equilibrio',
    titulo: 'Atos por mes no ponto de equilibrio',
    tipo: 'indicador',
    dados: { ...equilibrio, procuraObservadaAtosPorMes },
  });

  if (!equilibrio.calculavel) {
    r.lacunas.declara('F6-SEM-MARGEM', GRAVIDADE.BLOQUEIA, equilibrio.motivo);
    return r.defineVeredito('Sem margem de contribuicao por ato nao ha analise possivel.');
  }

  // A pergunta que fecha a analise.
  if (procuraObservadaAtosPorMes == null) {
    r.lacunas.declara('F6-SEM-PROCURA', GRAVIDADE.BLOQUEIA,
      'Nao tenho a procura historica destes atos no SAF-T. Sem ela nao consigo dizer se o ponto de ' +
      'equilibrio e alcancavel, que e a unica pergunta que interessa antes de falar de financiamento.',
      { comoResolver: 'Identificar os codigos de ato que este equipamento executa e medir o volume dos ultimos doze meses.' });
  } else if (procuraObservadaAtosPorMes < equilibrio.atosPorMes) {
    const defice = equilibrio.atosPorMes - procuraObservadaAtosPorMes;
    r.acrescentaAlerta({
      codigo: 'F6-PROCURA-INSUFICIENTE',
      titulo: 'A procura observada nao chega ao ponto de equilibrio',
      explicacao:
        `Sao precisos ${equilibrio.atosPorMes} atos por mes e a clinica faz ${procuraObservadaAtosPorMes}. ` +
        `Faltam ${defice} atos por mes, ou seja ${Math.round((defice / equilibrio.atosPorMes) * 100)}% acima do volume atual. ` +
        'O que domina o payback e a utilizacao, nao o juro. Com este volume o equipamento nao paga nem com financiamento gratuito.',
      impactoCent: -(defice * equilibrio.margemContribuicaoPorAtoCent),
    });
  }

  if (capacidadeDisponivelHorasMes != null && equipamento.duracaoMinutosPorAto) {
    const horasNecessarias = (equilibrio.atosPorMes * equipamento.duracaoMinutosPorAto) / 60;
    if (horasNecessarias > capacidadeDisponivelHorasMes) {
      r.acrescentaAlerta({
        codigo: 'F6-CAPACIDADE-INSUFICIENTE',
        titulo: 'Nao ha horas disponiveis para o ponto de equilibrio',
        explicacao:
          `O equilibrio exige ${Math.round(horasNecessarias)} horas por mes e so ha ` +
          `${Math.round(capacidadeDisponivelHorasMes)} disponiveis. O problema nao e comercial, e de agenda.`,
        impactoCent: null,
      });
    }
  }

  r.acrescentaBloco({
    id: 'iva',
    titulo: 'Tratamento do IVA do investimento',
    tipo: 'tabela',
    natureza: NATUREZA.FISCAL,
    dados: {
      ...capex,
      leitura: capex.fracaoDedutivel === 0
        ? `Com atividade isenta pelo artigo 9.o o IVA nao e dedutivel e entra no custo. O capex real e ` +
          `${formata(capex.capexRealCent)}, mais ${Math.round(capex.sobrecustoIvaFracao * 100)}% do que o preco de tabela.`
        : `Deducao de ${Math.round(capex.fracaoDedutivel * 100)}% pelo metodo ${capex.metodo}. ` +
          `Ficam ${formata(capex.ivaNoCustoCent)} de IVA no custo.`,
    },
  });

  const comparacao = comparaMetodosDeDeducao({
    precoSemIvaCent: equipamento.precoSemIvaCent,
    taxaIva,
    proRata: equipamento.proRata ?? perfil.fiscal?.proRataDedutivel ?? null,
    usoTributado: equipamento.usoTributado ?? null,
  });
  if (comparacao) {
    r.acrescentaBloco({
      id: 'metodos-deducao',
      titulo: 'Pro rata geral contra afetacao real',
      tipo: 'comparacao',
      natureza: NATUREZA.FISCAL,
      dados: comparacao,
    });
  } else if (perfil.fiscal?.temAtividadeTributada) {
    r.lacunas.declara('F6-SEM-DADOS-DEDUCAO', GRAVIDADE.DEGRADA,
      'O perfil diz que ha atividade tributada mas nao tenho pro rata nem fracao de uso do equipamento. ' +
      'Nao consigo comparar pro rata geral com afetacao real, que e onde costuma estar a poupanca.',
      { comoResolver: 'Obter o pro rata definitivo do ultimo exercicio e estimar a fracao de uso tributado deste equipamento.' });
  }

  if (equipamento.fracoesPorAno) {
    r.acrescentaBloco({
      id: 'regularizacao',
      titulo: 'Regularizacao de bens de investimento',
      tipo: 'tabela',
      natureza: NATUREZA.FISCAL,
      dados: regularizacaoBensInvestimento({
        ivaCent: capex.ivaCent,
        fracaoInicial: capex.fracaoDedutivel,
        fracoesPorAno: equipamento.fracoesPorAno,
      }),
    });
  }

  if (equipamento.rendaMensalCent && equipamento.prazoMesesLeasing) {
    r.acrescentaBloco({
      id: 'leasing',
      titulo: 'Leasing contra compra',
      tipo: 'comparacao',
      dados: leasingContraCompra({
        capexRealCent: capex.capexRealCent,
        vidaUtilAnos: equipamento.vidaUtilAnos,
        rendaMensalCent: equipamento.rendaMensalCent,
        prazoMesesLeasing: equipamento.prazoMesesLeasing,
        valorResidualCent: equipamento.valorResidualCent ?? 0,
        taxaIrc: equipamento.taxaIrc ?? 0.21,
      }),
    });
  }

  if (equipamento.custoOportunidadeEspacoMensalCent == null) {
    r.lacunas.declara('F6-SEM-CUSTO-ESPACO', GRAVIDADE.DEGRADA,
      'Nao entrou custo de oportunidade do espaco. O equipamento ocupa uma sala que tinha outro uso, ' +
      'e ignorar isso baixa artificialmente o ponto de equilibrio.',
      { comoResolver: 'Calcular a margem que a sala gerava no uso anterior, por mes.' });
  }

  const tresCenarios = cenarios
    ?? construirCenarios(equilibrio, procuraObservadaAtosPorMes, capex.capexRealCent);
  r.acrescentaBloco({ id: 'cenarios', titulo: 'Tres cenarios', tipo: 'cenarios', dados: tresCenarios });

  const viavel = procuraObservadaAtosPorMes != null && procuraObservadaAtosPorMes >= equilibrio.atosPorMes;
  r.defineVeredito(
    procuraObservadaAtosPorMes == null
      ? `O equilibrio exige ${equilibrio.atosPorMes} atos por mes. Sem a procura observada nao digo se e alcancavel.`
      : viavel
        ? `O equilibrio exige ${equilibrio.atosPorMes} atos por mes e a clinica ja faz ${procuraObservadaAtosPorMes}. O investimento paga-se com a procura atual.`
        : `O equilibrio exige ${equilibrio.atosPorMes} atos por mes e a clinica faz ${procuraObservadaAtosPorMes}. Com esta procura nao compra.`,
    { severidade: viavel ? 'BOM' : procuraObservadaAtosPorMes == null ? 'NEUTRO' : 'MAU' },
  );

  return r;
}

function construirCenarios(equilibrio, procuraAtual, capexRealCent) {
  const base = procuraAtual ?? equilibrio.atosPorMes;
  // Custos que saem mesmo, para o payback. A amortizacao nao sai de caixa e por
  // isso nao entra aqui: se entrasse, estava a descontar o investimento duas
  // vezes, uma no numerador e outra no denominador.
  const custoDeCaixaMensalCent =
    equilibrio.jurosMensalMedioCent
    + equilibrio.custoFixoMensalAdicionalCent
    + equilibrio.custoOportunidadeEspacoMensalCent;

  return [
    { nome: 'Pessimista', atosPorMes: Math.round(base * 0.7) },
    { nome: 'Central', atosPorMes: base },
    { nome: 'Otimista', atosPorMes: Math.round(base * 1.3) },
  ].map((c) => {
    const margemCent = c.atosPorMes * equilibrio.margemContribuicaoPorAtoCent;
    const resultadoCent = margemCent - equilibrio.custoMensalTotalCent;
    const caixaMensalCent = margemCent - custoDeCaixaMensalCent;
    return {
      ...c,
      margemMensalCent: margemCent,
      resultadoMensalCent: resultadoCent,
      caixaMensalCent,
      coberturaDoCusto: equilibrio.custoMensalTotalCent > 0
        ? margemCent / equilibrio.custoMensalTotalCent
        : null,
      paybackMeses: caixaMensalCent > 0 ? Math.ceil(capexRealCent / caixaMensalCent) : null,
    };
  });
}
