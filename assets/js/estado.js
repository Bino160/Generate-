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
  var VERSAO_DADOS = 2;

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

  /** Um exercício: os dados da sociedade nesse ano e os sócios desse ano. */
  function exercicioVazio(ano) {
    return {
      sociedade: {
        designacao: '',
        exercicio: ano,
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
      socios: [socioVazio(1), socioVazio(2)]
    };
  }

  /**
   * Exercícios ainda dentro do prazo de caducidade à data indicada.
   * Artigo 45.º, n.os 1 e 4 da LGT: para o exercício Y o prazo termina em
   * 31/12/(Y+4). Ficam de fora o ano em curso e o ano corrente, cujas
   * declarações ainda não venceram ou acabaram de vencer.
   */
  function anosEmAberto(referencia) {
    var ano = (referencia ? new Date(referencia) : new Date()).getFullYear();
    var lista = [];
    for (var y = ano - 4; y <= ano - 1; y++) lista.push(y);
    return lista;
  }

  function novo() {
    var abertos = anosEmAberto();
    return {
      versao: VERSAO_DADOS,
      // Começa no exercício mais antigo ainda dentro do prazo: é o que decide
      // e o que expira primeiro.
      exercicios: [exercicioVazio(abertos[0])],
      ativo: 0,
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

  /** Caso de exemplo com três exercícios, que é como o problema aparece. */
  function exemplo() {
    var d = novo();
    var anos = [
      { ano: 2022, mc: 132000, irc: 24900, derrama: 1980, ta: 2900, ppc: 15000, ret: 700 },
      { ano: 2023, mc: 141000, irc: 26700, derrama: 2115, ta: 3100, ppc: 16500, ret: 780 },
      { ano: 2024, mc: 150000, irc: 28500, derrama: 2250, ta: 3400, ppc: 18000, ret: 850 }
    ];

    d.exercicios = anos.map(function (a) {
      var ex = exercicioVazio(a.ano);
      ex.sociedade = {
        designacao: 'Clínica Exemplo, Unipessoal Lda.',
        exercicio: a.ano,
        resultadoContabilistico: a.mc - 2000,
        correcoesFiscais: 2000,
        materiaColetavel: a.mc,
        ircLiquidado: a.irc,
        derramaMunicipal: a.derrama,
        derramaEstadual: 0,
        tributacoesAutonomas: a.ta,
        pagamentosPorConta: a.ppc,
        retencoes: a.ret
      };
      ex.socios = [
        {
          nome: 'Dra. Sócia maioritária', participacao: 70,
          rendimentosA: 42000, rendimentosB: 0, categoriaBJaLiquida: false,
          outrosRendimentos: 0, tributacao: 'conjunta', rendimentosConjuge: 28000,
          dependentes: 2, outrasDeducoesColeta: 0, irsPagoDistribuicoes: 0
        },
        {
          nome: 'Dr. Sócio minoritário', participacao: 30,
          rendimentosA: 24000, rendimentosB: 6000, categoriaBJaLiquida: false,
          outrosRendimentos: 0, tributacao: 'separada', rendimentosConjuge: 0,
          dependentes: 0, outrasDeducoesColeta: 0, irsPagoDistribuicoes: 0
        }
      ];
      return ex;
    });
    d.ativo = 0;
    d.parametros.dataReferencia = new Date().toISOString().slice(0, 10);
    return d;
  }

  function normalizarExercicio(ex, ano) {
    var base = exercicioVazio(ano);
    if (!ex || typeof ex !== 'object') return base;
    base.sociedade = Object.assign(base.sociedade, ex.sociedade || {});
    if (Array.isArray(ex.socios) && ex.socios.length) {
      base.socios = ex.socios.map(function (x, i) { return Object.assign(socioVazio(i + 1), x); });
    }
    return base;
  }

  /**
   * Aceita o formato de um só exercício (versão 1) e o de vários (versão 2).
   * Um ficheiro guardado antes desta alteração continua a abrir.
   */
  function normalizar(dados) {
    var base = novo();
    if (!dados || typeof dados !== 'object') return base;
    base.parametros = Object.assign(base.parametros, dados.parametros || {});

    if (Array.isArray(dados.exercicios) && dados.exercicios.length) {
      base.exercicios = dados.exercicios.map(function (ex, i) {
        return normalizarExercicio(ex, (ex && ex.sociedade && ex.sociedade.exercicio) || (2024 + i));
      });
    } else if (dados.sociedade || dados.socios) {
      // Formato antigo: um exercício solto.
      base.exercicios = [normalizarExercicio(dados, (dados.sociedade && dados.sociedade.exercicio) || 2024)];
    }

    base.exercicios.sort(function (a, b) { return a.sociedade.exercicio - b.sociedade.exercicio; });
    base.ativo = Math.min(Math.max(0, parseInt(dados.ativo, 10) || 0), base.exercicios.length - 1);
    base.versao = VERSAO_DADOS;
    return base;
  }

  /** O exercício que está a ser editado. */
  function ativo(dados) {
    return dados.exercicios[dados.ativo] || dados.exercicios[0];
  }

  /**
   * Acrescenta um exercício. Por omissão copia os sócios do ano mais recente:
   * a composição societária raramente muda de um ano para o outro, e obrigar
   * a reintroduzi-la seria a forma mais rápida de ninguém usar o multi-exercício.
   */
  function adicionarExercicio(dados, ano) {
    var anos = dados.exercicios.map(function (e) { return Number(e.sociedade.exercicio); });
    var novoAno = ano || (Math.max.apply(null, anos.concat([0])) + 1);
    var ex = exercicioVazio(novoAno);

    var modelo = dados.exercicios[dados.exercicios.length - 1];
    if (modelo) {
      ex.sociedade.designacao = modelo.sociedade.designacao;
      ex.socios = JSON.parse(JSON.stringify(modelo.socios));
    }
    dados.exercicios.push(ex);
    dados.exercicios.sort(function (a, b) { return a.sociedade.exercicio - b.sociedade.exercicio; });
    dados.ativo = dados.exercicios.findIndex(function (e) { return e === ex; });
    return ex;
  }

  /** Cria de uma vez todos os exercícios ainda dentro do prazo. */
  function criarAnosEmAberto(dados, referencia) {
    var existentes = dados.exercicios.map(function (e) { return Number(e.sociedade.exercicio); });
    anosEmAberto(referencia).forEach(function (ano) {
      if (existentes.indexOf(ano) === -1) adicionarExercicio(dados, ano);
    });
    // Remove um primeiro exercício ainda por preencher, se ficou órfão.
    if (dados.exercicios.length > 1) {
      dados.exercicios = dados.exercicios.filter(function (e, i) {
        var vazio = !Number(e.sociedade.materiaColetavel) && !Number(e.sociedade.ircLiquidado);
        var duplicadoDeAberto = anosEmAberto(referencia).indexOf(Number(e.sociedade.exercicio)) === -1;
        return !(vazio && duplicadoDeAberto);
      });
    }
    dados.ativo = 0;
    return dados;
  }

  function removerExercicio(dados, indice) {
    if (dados.exercicios.length <= 1) return false;
    dados.exercicios.splice(indice, 1);
    dados.ativo = Math.min(dados.ativo, dados.exercicios.length - 1);
    return true;
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
    VERSAO_DADOS: VERSAO_DADOS,
    novo: novo,
    exemplo: exemplo,
    socioVazio: socioVazio,
    exercicioVazio: exercicioVazio,
    anosEmAberto: anosEmAberto,
    criarAnosEmAberto: criarAnosEmAberto,
    normalizar: normalizar,
    ativo: ativo,
    adicionarExercicio: adicionarExercicio,
    removerExercicio: removerExercicio,
    guardar: guardar,
    ler: ler,
    apagar: apagar
  };
});
