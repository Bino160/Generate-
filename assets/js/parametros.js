/**
 * parametros.js
 * Tabelas fiscais parametrizáveis do simulador.
 *
 * Todos os valores aqui definidos sao apenas VALORES POR OMISSAO.
 * O Ecra 3 (Parametros da simulacao) permite alterar qualquer um deles
 * sem tocar no codigo. Cada tabela indica a base legal e o estado
 * ("confirmado" / "provisorio") para que o utilizador saiba o que deve validar.
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.Parametros = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Versao do conjunto de regras fiscais.
   * Aparece na interface e no relatorio: um relatorio sem versao de regras
   * nao e defensavel meses depois.
   * ------------------------------------------------------------------ */
  var VERSAO = {
    versao: '2026.08',
    atualizadoEm: '2026-08-20',
    nota: 'Regras e tabelas confirmadas a esta data. Confirme sempre a legislacao em vigor no exercicio analisado antes de emitir um relatorio.'
  };

  /* ------------------------------------------------------------------ *
   * Escaloes de IRS - taxas gerais (artigo 68.º do CIRS)
   * limite = limite superior do escalao (null = sem limite)
   * ------------------------------------------------------------------ */
  var ESCALOES_IRS = {
    2023: {
      estado: 'confirmado',
      fonte: 'Artigo 68.º do CIRS, redação da Lei n.º 24-D/2022 (OE 2023)',
      escaloes: [
        { limite: 7479, taxa: 0.145 },
        { limite: 11284, taxa: 0.21 },
        { limite: 15992, taxa: 0.265 },
        { limite: 20700, taxa: 0.285 },
        { limite: 26355, taxa: 0.35 },
        { limite: 38632, taxa: 0.37 },
        { limite: 50483, taxa: 0.435 },
        { limite: 78834, taxa: 0.45 },
        { limite: null, taxa: 0.48 }
      ]
    },
    2024: {
      estado: 'confirmado',
      fonte: 'Artigo 68.º do CIRS, redação da Lei n.º 33/2024',
      escaloes: [
        { limite: 7703, taxa: 0.1325 },
        { limite: 11623, taxa: 0.18 },
        { limite: 16472, taxa: 0.23 },
        { limite: 21321, taxa: 0.26 },
        { limite: 27146, taxa: 0.3275 },
        { limite: 39791, taxa: 0.37 },
        { limite: 51997, taxa: 0.435 },
        { limite: 81199, taxa: 0.45 },
        { limite: null, taxa: 0.48 }
      ]
    },
    2025: {
      estado: 'confirmado',
      fonte: 'Artigo 68.º do CIRS, redação da Lei n.º 33/2025 (descida de taxas do 1.º ao 8.º escalão)',
      escaloes: [
        { limite: 8059, taxa: 0.125 },
        { limite: 12160, taxa: 0.16 },
        { limite: 17233, taxa: 0.215 },
        { limite: 22306, taxa: 0.244 },
        { limite: 28400, taxa: 0.314 },
        { limite: 41629, taxa: 0.349 },
        { limite: 44987, taxa: 0.431 },
        { limite: 83696, taxa: 0.446 },
        { limite: null, taxa: 0.48 }
      ]
    },
    2026: {
      estado: 'provisorio',
      fonte: 'ESTIMATIVA não confirmada. Replica a tabela de 2025 até à publicação do Orçamento do Estado. Confirme antes de usar.',
      escaloes: [
        { limite: 8059, taxa: 0.125 },
        { limite: 12160, taxa: 0.16 },
        { limite: 17233, taxa: 0.215 },
        { limite: 22306, taxa: 0.244 },
        { limite: 28400, taxa: 0.314 },
        { limite: 41629, taxa: 0.349 },
        { limite: 44987, taxa: 0.431 },
        { limite: 83696, taxa: 0.446 },
        { limite: null, taxa: 0.48 }
      ]
    }
  };

  /* ------------------------------------------------------------------ *
   * Taxa adicional de solidariedade (artigo 68.º-A do CIRS)
   * ------------------------------------------------------------------ */
  var SOLIDARIEDADE = [
    { de: 80000, ate: 250000, taxa: 0.025 },
    { de: 250000, ate: null, taxa: 0.05 }
  ];

  /* ------------------------------------------------------------------ *
   * Juros compensatorios (artigo 35.º da LGT + artigo 559.º do Codigo Civil)
   * ------------------------------------------------------------------ */
  var JUROS = {
    fonte: 'Artigo 35.º da LGT. Taxa dos juros legais fixada em 4% ao ano (Portaria n.º 291/2003).',
    taxaAnual: 0.04,
    baseDias: 365,
    // Termo do prazo de entrega da declaracao Modelo 3 do ano seguinte ao exercicio.
    diaLimiteIRS: 30,
    mesLimiteIRS: 6,
    /* ---------------------------------------------------------------- *
     * O periodo de juros NAO e uma formula unica: depende da origem da
     * correccao. Artigo 35.º, n.º 7 da LGT: os juros contam-se dia a dia
     * desde o termo do prazo de entrega ate ao suprimento, correccao ou
     * deteccao da falta, mas sao devidos apenas por 180 dias no caso de
     * erro do sujeito passivo evidenciado na declaracao e, em caso de
     * falta apurada em accao de fiscalizacao, ate 90 dias apos a sua
     * conclusao.
     * ---------------------------------------------------------------- */
    regimeOmissao: 'omissaoDeclarativa',
    regimes: {
      regularizacaoVoluntaria: {
        rotulo: 'Regularização voluntária pelo sujeito passivo',
        descricao: 'O sujeito passivo substitui a declaração por iniciativa própria. Os juros correm dia a dia até à data da substituição.',
        regra: 'Artigo 35.º, n.º 7 da LGT: contagem dia a dia até ao suprimento da falta.',
        limiteDias: null,
        fim: 'referencia'
      },
      omissaoDeclarativa: {
        rotulo: 'Omissão não evidenciada na declaração',
        descricao: 'A imputação não consta da declaração e o erro não é detetável na própria declaração. É o caso típico da transparência fiscal não declarada: a matéria coletável está na sociedade, não na Modelo 3 do sócio.',
        regra: 'Artigo 35.º, n.º 7 da LGT: contagem dia a dia até à correção ou deteção da falta. O teto de 180 dias não se aplica.',
        limiteDias: null,
        fim: 'referencia'
      },
      erroEvidenciado: {
        rotulo: 'Erro evidenciado na própria declaração',
        descricao: 'O erro é percetível na declaração entregue, pelo que a demora da liquidação não é integralmente imputável ao sujeito passivo.',
        regra: 'Artigo 35.º, n.º 7 da LGT: juros devidos pelo prazo máximo de 180 dias.',
        limiteDias: 180,
        fim: 'referencia'
      },
      inspecao: {
        rotulo: 'Falta apurada em ação de fiscalização',
        descricao: 'A correção resulta de procedimento inspetivo. Exige a data de conclusão da ação.',
        regra: 'Artigo 35.º, n.º 7 da LGT: juros devidos até 90 dias após a conclusão da ação de fiscalização.',
        limiteDias: null,
        fim: 'conclusaoInspecao',
        diasAposConclusao: 90
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * Juros de mora (artigo 44.º da LGT)
   *
   * Sao devidos quando o imposto liquidado nao e pago no prazo legal. Nao se
   * confundem com os compensatorios: estes correm ate a liquidacao, os de
   * mora correm a partir do fim do prazo de pagamento voluntario.
   * ------------------------------------------------------------------ */
  var MORA = {
    estado: 'confirmado',
    fonte: 'Artigo 44.º da LGT. Taxa das dívidas ao Estado fixada em 7,221% para 2026 ' +
      '(Aviso n.º 18/2026/2, de 2 de janeiro). A taxa é revista anualmente: confirme a do ano em causa.',
    taxaAnual: 0.07221,
    baseDias: 365,
    // Artigo 44.º, n.º 2 da LGT: o prazo maximo de contagem e de tres anos,
    // salvo pagamento em prestacoes, caso em que vai ate oito.
    limiteAnos: 3,
    limiteAnosPrestacoes: 8,
    // Prazo de pagamento voluntario apos a notificacao da liquidacao.
    prazoPagamentoDias: 30
  };

  /* ------------------------------------------------------------------ *
   * Coimas (RGIT)
   * ------------------------------------------------------------------ */
  var COIMAS = {
    fonte: 'Artigos 114.º e 119.º do RGIT; limites e reduções dos artigos 26.º, 29.º e 30.º do RGIT.',
    // Artigo 114.º, n.º 2 do RGIT - falta de entrega da prestacao tributaria, negligencia.
    percentagemMinima: 0.15,
    percentagemMaxima: 0.50,
    // Reducao por regularizacao voluntaria antes de qualquer procedimento inspectivo
    // (artigo 29.º, n.º 1, alinea a) do RGIT: 12,5% do montante minimo legal).
    reducaoVoluntaria: 0.125,
    // Multiplicador do limite minimo legal usado no cenario de referencia.
    // NAO representa a coima que a AT vira a aplicar: e apenas a ancoragem
    // do cenario intermedio no limite minimo previsto na lei.
    fatorReferencia: 1.0,
    // Pisos e tectos (pessoas singulares, negligencia).
    coimaMinimaAbsoluta: 375,
    tectoNegligencia: 22500,
    // Coima autonoma por declaracao inexacta ou omitida (artigo 119.º do RGIT).
    coimaDeclaracaoMinima: 375,
    coimaDeclaracaoMaxima: 22500,
    // Uma coima por declaracao inexacta e uma questao de imputacao da
    // infraccao a cada sujeito passivo. Nao se assume automaticamente.
    aplicarCoimaDeclaracaoPorSocio: false
  };

  /* ------------------------------------------------------------------ *
   * Parametros de IRS diversos
   * ------------------------------------------------------------------ */
  var IRS = {
    deducaoEspecificaCategoriaA: 4104,
    coeficienteCategoriaB: 0.75, // artigo 31.º do CIRS, regime simplificado, servicos do artigo 151.º
    deducaoPorDependente: 600,
    // O motor nao modela despesas gerais familiares, saude, educacao,
    // habitacao nem os respectivos limites. Quem tiver os valores reais
    // da Modelo 3 introduz-os por socio no campo proprio.
    modelaDeducoesDetalhadas: false,
    limiteDeducoesColeta: null, // null = sem limite global
    quocienteConjugal: 2
  };

  /* ------------------------------------------------------------------ *
   * Leitura de gestao
   *
   * Os limiares abaixo NAO tem base fiscal. Sao criterios de gestao, para
   * traduzir a exposicao em termos que um gestor decide: quanto do resultado
   * anual, do volume de negocios e da tesouraria e que isto representa.
   * ------------------------------------------------------------------ */
  var NEGOCIO = {
    fonte: 'Critérios de gestão, sem base legal. Servem para dimensionar o impacto, não para o qualificar juridicamente.',
    limiarTesourariaContido: 0.25,
    limiarTesourariaSignificativo: 0.50,
    limiarTesourariaElevado: 1.00
  };

  /* ------------------------------------------------------------------ *
   * Prazos (LGT)
   * ------------------------------------------------------------------ */
  var PRAZOS = {
    fonte: 'Artigos 45.º e 78.º da LGT; artigo 70.º do CPPT. Prazos indicativos: ' +
      'o artigo 78.º prevê vias e prazos distintos consoante o fundamento invocado.',
    caducidadeAnos: 4,        // artigo 45.º da LGT
    revisaoOficiosaAnos: 4,   // artigo 78.º, n.º 1 da LGT, via de iniciativa do sujeito passivo
    reclamacaoGraciosaDias: 120, // artigo 70.º do CPPT
    prazoEntregaModelo22: { dia: 31, mes: 5 },
    prazoEntregaModelo3: { dia: 30, mes: 6 }
  };

  /* ------------------------------------------------------------------ *
   * Recuperacao do IRC
   * ------------------------------------------------------------------ */
  var RECUPERACAO = {
    // Percentagem do cenario intermedio. E uma hipotese de trabalho
    // escolhida pelo utilizador, sem qualquer significado juridico.
    percentagemParcial: 0.5,
    // As tributacoes autonomas mantem-se devidas pela sociedade transparente
    // (artigo 12.º do CIRC), logo nao entram na base recuperavel por omissao.
    incluirTributacoesAutonomas: false,
    incluirDerramas: true,
    // Retencoes na fonte suportadas pela sociedade. Numa sociedade
    // transparente nao ha IRC contra o qual as deduzir: ou sao imputadas aos
    // socios, ou sao restituidas a sociedade. Em qualquer das vias o montante
    // nao se perde, pelo que integra a base recuperavel por omissao. A via
    // concreta tem de ser determinada caso a caso.
    incluirRetencoes: true
  };

  function porOmissao() {
    return JSON.parse(JSON.stringify({
      versao: VERSAO,
      escaloesIRS: ESCALOES_IRS,
      solidariedade: SOLIDARIEDADE,
      juros: JUROS,
      mora: MORA,
      coimas: COIMAS,
      irs: IRS,
      negocio: NEGOCIO,
      prazos: PRAZOS,
      recuperacao: RECUPERACAO
    }));
  }

  function tabelaDoExercicio(parametros, exercicio) {
    var tabelas = parametros.escaloesIRS || {};
    if (tabelas[exercicio]) return tabelas[exercicio];
    // Sem tabela para o exercicio: usa o ano mais proximo disponivel.
    var anos = Object.keys(tabelas).map(Number).sort(function (a, b) { return a - b; });
    if (!anos.length) return null;
    var escolhido = anos[0];
    for (var i = 0; i < anos.length; i++) if (anos[i] <= exercicio) escolhido = anos[i];
    var t = tabelas[escolhido];
    return {
      estado: 'substituido',
      fonte: 'Sem tabela de escalões para ' + exercicio + '. Aplicada a tabela de ' + escolhido + '. ' + (t.fonte || ''),
      anoAplicado: escolhido,
      escaloes: t.escaloes
    };
  }

  return {
    porOmissao: porOmissao,
    tabelaDoExercicio: tabelaDoExercicio,
    VERSAO: VERSAO,
    ESCALOES_IRS: ESCALOES_IRS
  };
});
