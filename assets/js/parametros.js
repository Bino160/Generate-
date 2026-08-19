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
    limiteDias: null, // preencher para impor o tecto de 180 dias do artigo 35.º, n.º 7 da LGT
    // Termo do prazo de entrega da declaracao Modelo 3 do ano seguinte ao exercicio.
    diaLimiteIRS: 30,
    mesLimiteIRS: 6
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
    // Coima aplicada em pratica corrente quando ha correccao oficiosa sem dolo.
    fatorProvavel: 1.0, // multiplicador do limite minimo legal
    // Pisos e tectos (pessoas singulares, negligencia).
    coimaMinimaAbsoluta: 375,
    tectoNegligencia: 22500,
    // Coima autonoma por declaracao inexacta ou omitida (artigo 119.º do RGIT).
    coimaDeclaracaoMinima: 375,
    coimaDeclaracaoMaxima: 22500,
    aplicarCoimaDeclaracaoPorSocio: true
  };

  /* ------------------------------------------------------------------ *
   * Parametros de IRS diversos
   * ------------------------------------------------------------------ */
  var IRS = {
    deducaoEspecificaCategoriaA: 4104,
    coeficienteCategoriaB: 0.75, // artigo 31.º do CIRS, regime simplificado, servicos do artigo 151.º
    deducaoPorDependente: 600,
    limiteDeducoesColeta: null, // null = sem limite global
    quocienteConjugal: 2
  };

  /* ------------------------------------------------------------------ *
   * Prazos (LGT)
   * ------------------------------------------------------------------ */
  var PRAZOS = {
    caducidadeAnos: 4,        // artigo 45.º da LGT
    revisaoOficiosaAnos: 4,   // artigo 78.º, n.º 1 da LGT
    reclamacaoGraciosaDias: 120, // artigo 70.º do CPPT
    prazoEntregaModelo22: { dia: 31, mes: 5 },
    prazoEntregaModelo3: { dia: 30, mes: 6 }
  };

  /* ------------------------------------------------------------------ *
   * Recuperacao do IRC
   * ------------------------------------------------------------------ */
  var RECUPERACAO = {
    percentagemParcial: 0.5,
    // As tributacoes autonomas mantem-se devidas pela sociedade transparente
    // (artigo 12.º do CIRC), logo nao entram na base recuperavel por omissao.
    incluirTributacoesAutonomas: false,
    incluirDerramas: true
  };

  function porOmissao() {
    return JSON.parse(JSON.stringify({
      escaloesIRS: ESCALOES_IRS,
      solidariedade: SOLIDARIEDADE,
      juros: JUROS,
      coimas: COIMAS,
      irs: IRS,
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
    ESCALOES_IRS: ESCALOES_IRS
  };
});
