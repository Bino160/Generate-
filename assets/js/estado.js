/**
 * estado.js - estado da aplicação, valores por omissão, persistência local
 * e importação/exportação de ficheiros JSON.
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica(require('./parametros.js'));
  else raiz.Estado = fabrica(raiz.Parametros);
})(typeof self !== 'undefined' ? self : this, function (Parametros) {
  'use strict';

  var CHAVE = 'simulador-transparencia-fiscal/v1';

  function socioVazio(n) {
    return {
      nome: 'Sócio ' + n,
      participacao: 0,
      rendimentosA: 0,
      rendimentosB: 0,
      categoriaBJaLiquida: false,
      outrosRendimentos: 0,
      tributacao: 'separada',
      rendimentosConjuge: 0,
      dependentes: 0,
      outrasDeducoesColeta: 0,
      irsPagoDistribuicoes: 0
    };
  }

  function novo() {
    var anoCorrente = new Date().getFullYear();
    return {
      versao: 1,
      sociedade: {
        designacao: '',
        exercicio: anoCorrente - 2,
        resultadoContabilistico: 0,
        correcoesFiscais: 0,
        materiaColetavel: 0,
        ircLiquidado: 0,
        derramaMunicipal: 0,
        derramaEstadual: 0,
        tributacoesAutonomas: 0,
        pagamentosPorConta: 0,
        retencoes: 0
      },
      socios: [socioVazio(1), socioVazio(2)],
      parametros: {
        dataReferencia: new Date().toISOString().slice(0, 10),
        dataInicioJuros: '',
        regimeJuros: 'omissaoDeclarativa',
        dataConclusaoInspecao: '',
        dataLiquidacaoIRC: '',
        dataPagamentoIRC: '',
        cenarioIRC: 'parcial'
      }
    };
  }

  function exemplo() {
    var d = novo();
    d.sociedade = {
      designacao: 'Clínica Exemplo, Unipessoal Lda.',
      exercicio: 2024,
      resultadoContabilistico: 148000,
      correcoesFiscais: 2000,
      materiaColetavel: 150000,
      ircLiquidado: 28500,
      derramaMunicipal: 2250,
      derramaEstadual: 0,
      tributacoesAutonomas: 3400,
      pagamentosPorConta: 18000,
      retencoes: 850
    };
    d.socios = [
      {
        nome: 'Dra. Sócia maioritária', participacao: 70, rendimentosA: 42000, rendimentosB: 0,
        categoriaBJaLiquida: false, outrosRendimentos: 0, tributacao: 'conjunta',
        rendimentosConjuge: 28000, dependentes: 2, outrasDeducoesColeta: 0, irsPagoDistribuicoes: 0
      },
      {
        nome: 'Dr. Sócio minoritário', participacao: 30, rendimentosA: 24000, rendimentosB: 6000,
        categoriaBJaLiquida: false, outrosRendimentos: 0, tributacao: 'separada',
        rendimentosConjuge: 0, dependentes: 0, outrasDeducoesColeta: 0, irsPagoDistribuicoes: 0
      }
    ];
    d.parametros.dataReferencia = new Date().toISOString().slice(0, 10);
    return d;
  }

  function normalizar(dados) {
    var base = novo();
    if (!dados || typeof dados !== 'object') return base;
    base.sociedade = Object.assign(base.sociedade, dados.sociedade || {});
    base.parametros = Object.assign(base.parametros, dados.parametros || {});
    if (Array.isArray(dados.socios) && dados.socios.length) {
      base.socios = dados.socios.map(function (s, i) { return Object.assign(socioVazio(i + 1), s); });
    }
    return base;
  }

  function guardar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); return true; }
    catch (e) { return false; }
  }

  function ler() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      return bruto ? normalizar(JSON.parse(bruto)) : null;
    } catch (e) { return null; }
  }

  function apagar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* ignorado */ }
  }

  return {
    CHAVE: CHAVE,
    novo: novo,
    exemplo: exemplo,
    socioVazio: socioVazio,
    normalizar: normalizar,
    guardar: guardar,
    ler: ler,
    apagar: apagar
  };
});
