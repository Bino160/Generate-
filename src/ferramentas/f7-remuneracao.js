/**
 * F7. Remuneracao de socios e prestadores.
 *
 * Quatro coisas que uma calculadora de percentagem sobre producao nao faz.
 *
 * 1. Sobre producao ou sobre recebido. Com convencoes a pagar a 60 ou 90 dias e
 *    com glosas, pagar sobre producao transfere todo o risco de cobranca para a
 *    clinica. E a origem de boa parte dos conflitos entre socios e a maioria dos
 *    contratos nao distingue. Aqui as duas bases sao calculadas lado a lado e a
 *    diferenca aparece em euros.
 *
 * 2. Quem suporta materiais, laboratorio e assistente muda a percentagem efetiva
 *    em dez a quinze pontos. Comparar percentagens nominais e comparar nada.
 *
 * 3. Risco laboral quantificado, nao mencionado. Mesmo sem reclassificacao, a
 *    contribuicao de entidade contratante e devida e apurada oficiosamente no
 *    ano seguinte. Isto apanha clinicas de surpresa e tem de entrar no custo por
 *    hora desde o inicio.
 *
 * 4. Transparencia fiscal. Sociedade de profissionais cai no artigo 6.o do CIRC
 *    e isso altera a conclusao sobre distribuicao de resultados.
 */

import { Resultado, NATUREZA } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { formata, aplicaTaxa, porUnidade, soma } from '../core/dinheiro.js';

export const MODELO = Object.freeze({
  FIXO: 'FIXO',
  PERCENTAGEM: 'PERCENTAGEM',
  MISTO_COM_MINIMO: 'MISTO_COM_MINIMO',
});

/** Indicios do artigo 12.o do Codigo do Trabalho. Assinalados, nunca pontuados em opaco. */
export const INDICIOS_ARTIGO_12 = [
  { id: 'local', descricao: 'A atividade e realizada em local pertencente a clinica ou por ela determinado' },
  { id: 'equipamento', descricao: 'Os equipamentos e instrumentos de trabalho pertencem a clinica' },
  { id: 'horario', descricao: 'Ha horario de inicio e de termo determinado pela clinica' },
  { id: 'retribuicao', descricao: 'E paga uma quantia certa com periodicidade regular ao profissional' },
  { id: 'chefia', descricao: 'O profissional desempenha funcoes de chefia ou direcao na estrutura da clinica' },
];

/**
 * Custo efetivo por hora-gabinete para a clinica.
 *
 * A percentagem nominal nao chega. O que a clinica paga por hora depende de quem
 * suporta materiais, laboratorio e assistente, e da contribuicao de entidade
 * contratante que aparece no ano seguinte.
 */
export function custoEfetivoParaClinica({
  producaoCent,
  recebidoCent,
  baseDeCalculo = 'PRODUCAO',
  modelo,
  percentagem = 0,
  fixoMensalCent = 0,
  minimoGarantidoCent = 0,
  horasGabinete,
  suporta = {},
  dependenciaEconomica = null,
  anosDeRelacao = 1,
}) {
  const baseCent = baseDeCalculo === 'RECEBIDO' ? recebidoCent : producaoCent;

  let remuneracaoCent;
  switch (modelo) {
    case MODELO.FIXO:
      remuneracaoCent = fixoMensalCent;
      break;
    case MODELO.PERCENTAGEM:
      remuneracaoCent = aplicaTaxa(baseCent, percentagem);
      break;
    case MODELO.MISTO_COM_MINIMO:
      remuneracaoCent = Math.max(minimoGarantidoCent, fixoMensalCent + aplicaTaxa(baseCent, percentagem));
      break;
    default:
      throw new Error(`Modelo desconhecido: ${modelo}`);
  }

  // Custos que a clinica suporta por conta do ato, quando nao vao a conta do profissional.
  const materiaisCent = suporta.materiaisPelaClinica ? (suporta.materiaisCent ?? 0) : 0;
  const laboratorioCent = suporta.laboratorioPelaClinica ? (suporta.laboratorioCent ?? 0) : 0;
  const assistenteCent = suporta.assistentePelaClinica ? (suporta.assistenteCent ?? 0) : 0;

  // Contribuicao de entidade contratante. Ver P-06.
  const escaloes = valor('P-06').escaloes;
  const escalao = dependenciaEconomica != null
    ? escaloes.find((e) => dependenciaEconomica >= e.dependenciaMin && dependenciaEconomica < e.dependenciaMax)
    : null;
  const contribuicaoCent = escalao ? aplicaTaxa(remuneracaoCent, escalao.taxa) : 0;

  const custoTotalCent = remuneracaoCent + materiaisCent + laboratorioCent + assistenteCent + contribuicaoCent;

  return {
    baseDeCalculo,
    baseCent,
    remuneracaoCent,
    percentagemNominal: modelo === MODELO.PERCENTAGEM ? percentagem : null,
    // O numero que importa: quanto do que entra fica para a clinica depois de tudo.
    percentagemEfetiva: baseCent > 0 ? custoTotalCent / baseCent : null,
    custosDeSuporte: { materiaisCent, laboratorioCent, assistenteCent },
    contribuicaoEntidadeContratante: {
      aplicavel: Boolean(escalao),
      taxa: escalao ? escalao.taxa : 0,
      valorMensalCent: contribuicaoCent,
      valorAnualCent: contribuicaoCent * 12,
      exposicaoAcumuladaCent: contribuicaoCent * 12 * Math.min(anosDeRelacao, valor('P-07').anos),
      nota: 'Apurada oficiosamente pela Seguranca Social a partir do anexo SS, no ano seguinte. ' +
        'Nao depende de a clinica a declarar e nao e negociavel com o profissional.',
    },
    custoTotalCent,
    custoPorHoraGabineteCent: horasGabinete > 0 ? porUnidade(custoTotalCent, horasGabinete) : null,
    margemParaClinicaCent: baseCent - custoTotalCent,
    margemPorHoraCent: horasGabinete > 0 ? porUnidade(baseCent - custoTotalCent, horasGabinete) : null,
  };
}

/**
 * Rendimento liquido do profissional.
 *
 * Aproximacao declarada, nao uma simulacao de IRS. Usa o coeficiente do regime
 * simplificado e a contribuicao de independente, e pede a taxa marginal de IRS
 * em vez de a adivinhar, porque depende do agregado e nao da clinica. Ver P-12 e
 * P-13.
 */
export function liquidoDoProfissional({
  remuneracaoAnualCent,
  vinculo = 'INDEPENDENTE',
  taxaMarginalIrs,
  suporta = {},
  coeficienteSimplificado = null,
  taxaSsIndependente = null,
}) {
  const custosProprioCent = soma([
    suporta.materiaisPelaClinica ? 0 : (suporta.materiaisCent ?? 0) * 12,
    suporta.laboratorioPelaClinica ? 0 : (suporta.laboratorioCent ?? 0) * 12,
    suporta.assistentePelaClinica ? 0 : (suporta.assistenteCent ?? 0) * 12,
  ]);

  const brutoLiquidoDeCustosCent = remuneracaoAnualCent - custosProprioCent;

  if (vinculo === 'DEPENDENTE') {
    const ssTrabalhadorCent = aplicaTaxa(remuneracaoAnualCent, 0.11);
    const irsCent = aplicaTaxa(remuneracaoAnualCent - ssTrabalhadorCent, taxaMarginalIrs);
    return {
      vinculo,
      brutoAnualCent: remuneracaoAnualCent,
      custosSuportadosCent: custosProprioCent,
      contribuicoesCent: ssTrabalhadorCent,
      irsCent,
      liquidoAnualCent: remuneracaoAnualCent - ssTrabalhadorCent - irsCent - custosProprioCent,
      aproximacao: 'Taxa de trabalhador dependente de 11%. IRS pela taxa marginal indicada, sem deducoes.',
    };
  }

  const coef = coeficienteSimplificado ?? valor('P-13').coeficiente;
  const cfgSs = valor('P-12');
  const taxaSs = taxaSsIndependente ?? cfgSs.taxa;
  const baseSsCent = aplicaTaxa(remuneracaoAnualCent, cfgSs.coeficienteBase);
  const ssCent = aplicaTaxa(baseSsCent, taxaSs);
  const rendimentoTributavelCent = aplicaTaxa(remuneracaoAnualCent, coef);
  const irsCent = aplicaTaxa(rendimentoTributavelCent, taxaMarginalIrs);

  return {
    vinculo,
    brutoAnualCent: remuneracaoAnualCent,
    custosSuportadosCent: custosProprioCent,
    baseContributivaCent: baseSsCent,
    contribuicoesCent: ssCent,
    rendimentoTributavelCent,
    irsCent,
    liquidoAnualCent: brutoLiquidoDeCustosCent - ssCent - irsCent,
    aproximacao:
      `Regime simplificado com coeficiente de ${coef} e contribuicao de ${Math.round(taxaSs * 1000) / 10}% sobre ` +
      `${Math.round(cfgSs.coeficienteBase * 100)}% do rendimento. Nao substitui simulacao de IRS: nao trata ` +
      'agregado, deducoes, minimo de existencia nem regime de contabilidade organizada.',
  };
}

/** Indice de risco de reclassificacao. Mostra os indicios, nao uma pontuacao opaca. */
export function riscoDeReclassificacao(assinalados) {
  const marcados = INDICIOS_ARTIGO_12.filter((i) => assinalados[i.id] === true);
  const nivel = marcados.length >= 3 ? 'ALTO' : marcados.length === 2 ? 'MEDIO' : marcados.length === 1 ? 'BAIXO' : 'NENHUM';
  return {
    indiciosAssinalados: marcados,
    nIndicios: marcados.length,
    nTotal: INDICIOS_ARTIGO_12.length,
    nivel,
    leitura:
      marcados.length === 0
        ? 'Nenhum indicio do artigo 12.o assinalado.'
        : `Assinalados ${marcados.length} de ${INDICIOS_ARTIGO_12.length} indicios: ${marcados.map((m) => m.id).join(', ')}. ` +
          'A presunca de contrato de trabalho do artigo 12.o do Codigo do Trabalho funciona com a verificacao de alguns destes indicios.',
    limite: 'Isto identifica indicios. A qualificacao juridica da relacao nao se faz numa folha de calculo.',
  };
}

/** Efeito da transparencia fiscal na distribuicao de resultados. Artigo 6.o do CIRC. */
export function transparenciaFiscal({ sociedadeProfissionais, resultadoCent, nSocios }) {
  if (!sociedadeProfissionais) {
    return {
      aplicavel: false,
      leitura: 'A sociedade nao foi identificada como sociedade de profissionais. A tributacao segue as regras gerais de IRC.',
    };
  }
  return {
    aplicavel: true,
    resultadoCent,
    nSocios,
    imputacaoPorSocioCent: nSocios > 0 ? Math.round(resultadoCent / nSocios) : null,
    leitura:
      'Sociedade de profissionais no ambito do artigo 6.o do CIRC. A materia coletavel e imputada aos socios ' +
      'e tributada em IRS na esfera de cada um, independentemente de haver ou nao distribuicao. Isto muda a ' +
      'conclusao sobre reter resultado na sociedade, que deixa de ser um diferimento de imposto.',
    reutilizacao: 'A logica de imputacao vem do motor partilhado. Nao ha copia deste calculo no F3, ' +
      'para que as duas ferramentas nao possam divergir.',
  };
}

export function remuneracao({
  profissionais,
  perfil,
  horasGabinetePorProfissional = {},
  modelosAComparar = [MODELO.FIXO, MODELO.PERCENTAGEM, MODELO.MISTO_COM_MINIMO],
}) {
  const r = new Resultado('F7', 'Remuneracao de socios e prestadores');
  r.usaPressuposto('P-06').usaPressuposto('P-07').usaPressuposto('P-12').usaPressuposto('P-13');

  if (!profissionais || profissionais.length === 0) {
    r.lacunas.declara('F7-SEM-EQUIPA', GRAVIDADE.BLOQUEIA, 'Nao ha profissionais definidos no perfil.');
    return r.defineVeredito('Sem equipa para analisar.');
  }

  const linhas = [];
  let exposicaoTotalCent = 0;

  for (const p of profissionais) {
    const horas = horasGabinetePorProfissional[p.id] ?? p.horasGabinete ?? 0;
    if (!horas) {
      r.lacunas.declara(`F7-SEM-HORAS-${p.id}`, GRAVIDADE.DEGRADA,
        `Nao tenho horas-gabinete de ${p.nome ?? p.id}. Sem elas nao ha custo por hora, que e a vista que interessa a clinica.`);
    }
    if (p.recebidoCent == null) {
      r.lacunas.declara(`F7-SEM-RECEBIDO-${p.id}`, GRAVIDADE.DEGRADA,
        `Nao tenho o recebido de ${p.nome ?? p.id}, so a producao. Nao consigo mostrar quanto custa pagar sobre ` +
        'producao em vez de sobre recebido, que e a origem de boa parte dos conflitos entre socios.',
        { comoResolver: 'Exportar o SAF-T com recibos, ou indicar a taxa de cobranca por entidade.' });
    }

    // Um modelo sem os seus parametros nao produz um cenario, produz um zero
    // com aspeto de resultado. Fica de fora e a falta e declarada.
    const modelosViaveis = modelosAComparar.filter((modelo) => {
      const temFixo = (p.fixoMensalCent ?? 0) > 0;
      const temPercentagem = (p.percentagem ?? 0) > 0;
      if (modelo === MODELO.FIXO) return temFixo;
      if (modelo === MODELO.PERCENTAGEM) return temPercentagem;
      return temFixo || temPercentagem || (p.minimoGarantidoCent ?? 0) > 0;
    });
    for (const modelo of modelosAComparar.filter((m) => !modelosViaveis.includes(m))) {
      r.lacunas.declara(`F7-MODELO-${modelo}-${p.id}`, GRAVIDADE.INFORMA,
        `Nao comparei o modelo ${modelo.toLowerCase().replace(/_/g, ' ')} para ${p.nome ?? p.id} porque ` +
        'faltam os parametros que o definem. Mostrar zero seria pior do que nao mostrar.',
        { comoResolver: 'Indicar o valor fixo mensal, a percentagem ou o minimo garantido a testar.' });
    }

    const cenarios = modelosViaveis.map((modelo) => {
      const sobreProducao = custoEfetivoParaClinica({
        producaoCent: p.producaoCent,
        recebidoCent: p.recebidoCent ?? p.producaoCent,
        baseDeCalculo: 'PRODUCAO',
        modelo,
        percentagem: p.percentagem ?? 0,
        fixoMensalCent: p.fixoMensalCent ?? 0,
        minimoGarantidoCent: p.minimoGarantidoCent ?? 0,
        horasGabinete: horas,
        suporta: p.suporta ?? {},
        dependenciaEconomica: p.dependenciaEconomica,
        anosDeRelacao: p.anosDeRelacao ?? 1,
      });
      const sobreRecebido = p.recebidoCent != null
        ? custoEfetivoParaClinica({
          producaoCent: p.producaoCent,
          recebidoCent: p.recebidoCent,
          baseDeCalculo: 'RECEBIDO',
          modelo,
          percentagem: p.percentagem ?? 0,
          fixoMensalCent: p.fixoMensalCent ?? 0,
          minimoGarantidoCent: p.minimoGarantidoCent ?? 0,
          horasGabinete: horas,
          suporta: p.suporta ?? {},
          dependenciaEconomica: p.dependenciaEconomica,
          anosDeRelacao: p.anosDeRelacao ?? 1,
        })
        : null;

      const liquido = liquidoDoProfissional({
        remuneracaoAnualCent: sobreProducao.remuneracaoCent * 12,
        vinculo: p.vinculo ?? 'INDEPENDENTE',
        taxaMarginalIrs: p.taxaMarginalIrs ?? 0.35,
        suporta: p.suporta ?? {},
      });

      return {
        modelo,
        clinica: sobreProducao,
        clinicaSobreRecebido: sobreRecebido,
        diferencaBaseCent: sobreRecebido ? sobreProducao.custoTotalCent - sobreRecebido.custoTotalCent : null,
        profissional: liquido,
      };
    });

    const risco = riscoDeReclassificacao(p.indicios ?? {});
    exposicaoTotalCent += cenarios[0]?.clinica.contribuicaoEntidadeContratante.exposicaoAcumuladaCent ?? 0;

    linhas.push({
      id: p.id,
      nome: p.nome ?? p.id,
      horasGabinete: horas,
      producaoCent: p.producaoCent,
      recebidoCent: p.recebidoCent ?? null,
      cenarios,
      risco,
    });
  }

  r.acrescentaBloco({
    id: 'duas-vistas',
    titulo: 'Custo para a clinica e liquido para o profissional, lado a lado',
    tipo: 'duas-colunas',
    dados: linhas,
  });

  r.acrescentaBloco({
    id: 'producao-recebido',
    titulo: 'Pagar sobre producao ou sobre recebido',
    tipo: 'comparacao',
    dados: {
      nota:
        'Pagar sobre producao transfere o risco de cobranca e de glosa para a clinica. Com convencoes a 60 ou ' +
        '90 dias e uma taxa de glosa de poucos pontos, a diferenca anual e material e quase nunca esta escrita ' +
        'no contrato.',
      porProfissional: linhas.map((l) => ({
        nome: l.nome,
        diferencaMensalCent: l.cenarios[0]?.diferencaBaseCent ?? null,
        diferencaAnualCent: l.cenarios[0]?.diferencaBaseCent != null
          ? l.cenarios[0].diferencaBaseCent * 12
          : null,
      })),
    },
  });

  r.acrescentaBloco({
    id: 'risco-laboral',
    titulo: 'Indice de risco de reclassificacao',
    tipo: 'testes',
    natureza: NATUREZA.JURIDICA,
    dados: {
      porProfissional: linhas.map((l) => ({ nome: l.nome, ...l.risco })),
      exposicaoAcumuladaCent: exposicaoTotalCent,
    },
  });

  r.acrescentaBloco({
    id: 'transparencia',
    titulo: 'Transparencia fiscal',
    tipo: 'indicador',
    natureza: NATUREZA.FISCAL,
    dados: transparenciaFiscal({
      sociedadeProfissionais: perfil.fiscal?.sociedadeProfissionais ?? false,
      resultadoCent: perfil.fiscal?.resultadoCent ?? 0,
      nSocios: perfil.fiscal?.nSocios ?? 0,
    }),
  });

  const altoRisco = linhas.filter((l) => l.risco.nivel === 'ALTO');
  r.defineVeredito(
    exposicaoTotalCent > 0
      ? `Contribuicao de entidade contratante por regularizar em ${formata(exposicaoTotalCent, { compacto: true })} acumulados, ` +
        `e ${altoRisco.length} ${altoRisco.length === 1 ? 'relacao' : 'relacoes'} com tres ou mais indicios do artigo 12.o.`
      : 'Nenhuma relacao atinge o limiar de dependencia economica que gera contribuicao de entidade contratante.',
    { severidade: exposicaoTotalCent > 0 || altoRisco.length > 0 ? 'MAU' : 'BOM' },
  );

  return r;
}
