/**
 * motor.js
 * Motor de calculo do impacto da reclassificacao para o regime
 * de transparencia fiscal (artigo 6.º do CIRC).
 *
 * PRESSUPOSTO: a elegibilidade para o artigo 6.º do CIRC ja foi determinada.
 * Este motor nao decide se ha transparencia fiscal. Quantifica o custo.
 *
 * Sem dependencias externas. Funciona no browser (global `Motor`)
 * e em Node (module.exports).
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = fabrica(require('./parametros.js'));
  } else {
    raiz.Motor = fabrica(raiz.Parametros);
  }
})(typeof self !== 'undefined' ? self : this, function (Parametros) {
  'use strict';

  var DIA_MS = 24 * 60 * 60 * 1000;

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function arred(v, casas) {
    var f = Math.pow(10, casas === undefined ? 2 : casas);
    return Math.round((num(v) + Number.EPSILON) * f) / f;
  }

  function data(v) {
    if (v instanceof Date) return v;
    if (!v) return new Date();
    var d = new Date(v);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  function dias(de, ate) {
    return Math.max(0, Math.floor((data(ate).getTime() - data(de).getTime()) / DIA_MS));
  }

  /* ================================================================== *
   * 1. Coleta de IRS
   * ================================================================== */

  /**
   * Coleta pelas taxas gerais do artigo 68.º do CIRS, calculada
   * por fatias marginais (equivalente ao metodo taxa media / taxa normal).
   */
  function coletaProgressiva(rendimentoColetavel, escaloes) {
    var rc = Math.max(0, num(rendimentoColetavel));
    var imposto = 0;
    var anterior = 0;
    for (var i = 0; i < escaloes.length; i++) {
      var esc = escaloes[i];
      var topo = esc.limite === null || esc.limite === undefined ? Infinity : num(esc.limite);
      if (rc <= anterior) break;
      var fatia = Math.min(rc, topo) - anterior;
      if (fatia > 0) imposto += fatia * num(esc.taxa);
      anterior = topo;
      if (!isFinite(topo)) break;
    }
    return imposto;
  }

  function taxaMarginal(rendimentoColetavel, escaloes) {
    var rc = Math.max(0, num(rendimentoColetavel));
    for (var i = 0; i < escaloes.length; i++) {
      var topo = escaloes[i].limite === null || escaloes[i].limite === undefined
        ? Infinity : num(escaloes[i].limite);
      if (rc <= topo) return num(escaloes[i].taxa);
    }
    return num(escaloes[escaloes.length - 1].taxa);
  }

  /** Taxa adicional de solidariedade (artigo 68.º-A do CIRS). */
  function solidariedade(rendimentoColetavel, tabela) {
    var rc = Math.max(0, num(rendimentoColetavel));
    var total = 0;
    (tabela || []).forEach(function (faixa) {
      var de = num(faixa.de);
      var ate = faixa.ate === null || faixa.ate === undefined ? Infinity : num(faixa.ate);
      if (rc > de) total += (Math.min(rc, ate) - de) * num(faixa.taxa);
    });
    return total;
  }

  /**
   * Liquidacao de IRS de um agregado.
   * Aplica o quociente conjugal quando a tributacao e conjunta
   * (artigo 69.º do CIRS).
   */
  function liquidarIRS(rendimentoColetavel, opcoes) {
    var p = opcoes.parametros;
    var escaloes = opcoes.escaloes;
    var rc = Math.max(0, num(rendimentoColetavel));
    var divisor = opcoes.conjunta ? num(p.irs.quocienteConjugal) || 2 : 1;

    var coletaBase = coletaProgressiva(rc / divisor, escaloes) * divisor;
    var adicional = solidariedade(rc / divisor, p.solidariedade) * divisor;
    var coletaTotal = coletaBase + adicional;

    // O motor nao modela despesas gerais familiares, saude, educacao nem
    // habitacao. Modela a deducao por dependente e aceita, por socio, o
    // valor real das restantes deducoes a coleta retirado da Modelo 3.
    var deducoesDependentes = num(opcoes.dependentes) * num(p.irs.deducaoPorDependente);
    var deducoesOutras = num(opcoes.outrasDeducoesColeta);
    var deducoes = deducoesDependentes + deducoesOutras;
    if (p.irs.limiteDeducoesColeta !== null && p.irs.limiteDeducoesColeta !== undefined) {
      deducoes = Math.min(deducoes, num(p.irs.limiteDeducoesColeta));
    }
    deducoes = Math.min(deducoes, coletaTotal);

    return {
      rendimentoColetavel: arred(rc),
      quociente: divisor,
      coletaTaxasGerais: arred(coletaBase),
      taxaAdicionalSolidariedade: arred(adicional),
      coletaTotal: arred(coletaTotal),
      deducoesColeta: arred(deducoes),
      deducoesDependentes: arred(deducoesDependentes),
      deducoesOutras: arred(deducoesOutras),
      imposto: arred(Math.max(0, coletaTotal - deducoes)),
      taxaMarginal: taxaMarginal(rc / divisor, escaloes),
      taxaEfetiva: rc > 0 ? arred(Math.max(0, coletaTotal - deducoes) / rc, 6) : 0
    };
  }

  /* ================================================================== *
   * 2. Rendimento coletavel do socio
   * ================================================================== */

  function rendimentoColetavelSocio(socio, p, imputacao) {
    var catA = Math.max(0, num(socio.rendimentosA) - num(p.irs.deducaoEspecificaCategoriaA));
    var coef = socio.categoriaBJaLiquida ? 1 : (num(p.irs.coeficienteCategoriaB) || 1);
    var catB = num(socio.rendimentosB) * coef;
    var outros = num(socio.outrosRendimentos);
    var conjuge = socio.tributacao === 'conjunta' ? num(socio.rendimentosConjuge) : 0;
    return {
      categoriaA: arred(catA),
      categoriaB: arred(catB),
      outros: arred(outros),
      conjuge: arred(conjuge),
      imputacao: arred(num(imputacao)),
      total: arred(catA + catB + outros + conjuge + num(imputacao))
    };
  }

  /* ================================================================== *
   * 3. Cenario actual (sociedade tributada em IRC)
   * ================================================================== */

  function cenarioActual(dados, p) {
    var s = dados.sociedade;
    var ircColecta = num(s.ircLiquidado);
    var derramas = num(s.derramaMunicipal) + num(s.derramaEstadual);
    var ta = num(s.tributacoesAutonomas);
    var totalDevido = ircColecta + derramas + ta;
    var pagoAntecipado = num(s.pagamentosPorConta) + num(s.retencoes);

    var escaloes = escaloesDoExercicio(p, s.exercicio);
    var socios = (dados.socios || []).map(function (socio) {
      var componentes = rendimentoColetavelSocio(socio, p, 0);
      var liq = liquidarIRS(componentes.total, {
        parametros: p,
        escaloes: escaloes.escaloes,
        conjunta: socio.tributacao === 'conjunta',
        dependentes: socio.dependentes,
        outrasDeducoesColeta: socio.outrasDeducoesColeta
      });
      return { nome: socio.nome, componentes: componentes, liquidacao: liq, irs: liq.imposto };
    });

    return {
      irc: {
        materiaColetavel: arred(s.materiaColetavel),
        coleta: arred(ircColecta),
        derramaMunicipal: arred(s.derramaMunicipal),
        derramaEstadual: arred(s.derramaEstadual),
        tributacoesAutonomas: arred(ta),
        totalDevido: arred(totalDevido),
        pagamentosPorConta: arred(s.pagamentosPorConta),
        retencoes: arred(s.retencoes),
        saldoApurado: arred(totalDevido - pagoAntecipado)
      },
      socios: socios,
      irsTotal: arred(socios.reduce(function (a, x) { return a + x.irs; }, 0)),
      impostoTotal: arred(totalDevido + socios.reduce(function (a, x) { return a + x.irs; }, 0))
    };
  }

  /* ================================================================== *
   * 4. Cenario corrigido (transparencia fiscal)
   * ================================================================== */

  function cenarioCorrigido(dados, p) {
    var s = dados.sociedade;
    var escaloes = escaloesDoExercicio(p, s.exercicio);
    var mc = num(s.materiaColetavel);
    var ta = num(s.tributacoesAutonomas);

    // Só há imputação quando há matéria colectável. Um prejuízo fiscal nao e
    // imputado aos socios: fica na sociedade, reportavel nos termos do artigo
    // 52.º do CIRC. Imputar um valor negativo reduziria o IRS dos socios e
    // faria a ferramenta anunciar um ganho que nao existe.
    var baseImputavel = Math.max(0, mc);
    var socios = (dados.socios || []).map(function (socio) {
      var quota = num(socio.participacao) / 100;
      var imputacao = baseImputavel * quota;
      var componentes = rendimentoColetavelSocio(socio, p, imputacao);
      var liq = liquidarIRS(componentes.total, {
        parametros: p,
        escaloes: escaloes.escaloes,
        conjunta: socio.tributacao === 'conjunta',
        dependentes: socio.dependentes,
        outrasDeducoesColeta: socio.outrasDeducoesColeta
      });
      return {
        nome: socio.nome,
        participacao: num(socio.participacao),
        imputacao: arred(imputacao),
        componentes: componentes,
        liquidacao: liq,
        irs: liq.imposto
      };
    });

    return {
      irc: {
        // Artigo 12.º do CIRC: a sociedade transparente nao e tributada em IRC,
        // salvo quanto as tributacoes autonomas.
        coleta: 0,
        derramaMunicipal: 0,
        derramaEstadual: 0,
        tributacoesAutonomas: arred(ta),
        totalDevido: arred(ta)
      },
      socios: socios,
      irsTotal: arred(socios.reduce(function (a, x) { return a + x.irs; }, 0)),
      impostoTotal: arred(ta + socios.reduce(function (a, x) { return a + x.irs; }, 0))
    };
  }

  function escaloesDoExercicio(p, exercicio) {
    var t = Parametros.tabelaDoExercicio(p, num(exercicio));
    if (!t) throw new Error('Sem tabela de escalões de IRS configurada.');
    return t;
  }

  /* ================================================================== *
   * 5. Juros compensatorios (artigo 35.º da LGT)
   * ================================================================== */

  function calcularJuros(impostoEmFalta, dados, p) {
    var base = Math.max(0, num(impostoEmFalta));
    var exercicio = num(dados.sociedade.exercicio);
    var par = dados.parametros || {};

    var chave = par.regimeJuros || p.juros.regimeOmissao;
    var regime = p.juros.regimes[chave] || p.juros.regimes[p.juros.regimeOmissao];

    var inicio = par.dataInicioJuros
      ? data(par.dataInicioJuros)
      : new Date(Date.UTC(exercicio + 1, num(p.juros.mesLimiteIRS) - 1, num(p.juros.diaLimiteIRS)));
    var referencia = data(par.dataReferencia);
    var fim = referencia;
    var notas = [];

    // Falta apurada em accao de fiscalizacao: os juros sao devidos ate 90 dias
    // apos a conclusao da accao, e nao ate hoje.
    if (regime.fim === 'conclusaoInspecao') {
      if (par.dataConclusaoInspecao) {
        var teto = new Date(data(par.dataConclusaoInspecao).getTime() +
          num(regime.diasAposConclusao) * DIA_MS);
        if (teto < fim) {
          fim = teto;
          notas.push('Contagem encerrada em ' + iso(teto) + ': ' + regime.diasAposConclusao +
            ' dias após a conclusão da ação de fiscalização.');
        }
      } else {
        notas.push('Regime de fiscalização selecionado sem data de conclusão da ação. ' +
          'A contagem foi feita até à data de referência, o que sobreavalia os juros.');
      }
    }

    var nDias = dias(inicio, fim);
    var brutos = nDias;

    // O limite do regime pode ser sobreposto explicitamente nos parametros.
    var limiteDias = p.juros.limiteDias !== undefined && p.juros.limiteDias !== null
      ? num(p.juros.limiteDias)
      : (regime.limiteDias === null || regime.limiteDias === undefined ? null : num(regime.limiteDias));

    var limitado = false;
    if (limiteDias !== null && nDias > limiteDias) {
      nDias = limiteDias;
      limitado = true;
      notas.push('Contagem limitada a ' + limiteDias + ' dias. ' + regime.regra);
    }

    var baseDias = num(p.juros.baseDias) || 365;
    var montante = base * num(p.juros.taxaAnual) * (nDias / baseDias);

    return {
      base: arred(base),
      taxaAnual: num(p.juros.taxaAnual),
      regime: chave,
      regimeRotulo: regime.rotulo,
      regra: regime.regra,
      notas: notas,
      dataInicio: iso(inicio),
      dataFim: iso(fim),
      diasDecorridos: brutos,
      dias: nDias,
      limiteAplicado: limitado,
      montante: arred(montante)
    };
  }

  function iso(d) {
    return data(d).toISOString().slice(0, 10);
  }

  /* ================================================================== *
   * 5-B. Juros de mora (artigo 44.º da LGT)
   *
   * Correm depois da liquidacao, quando o imposto nao e pago no prazo de
   * pagamento voluntario. So entram no calculo quando o utilizador declara
   * um atraso: assumir que o cliente paga tarde seria inventar um cenario.
   * ================================================================== */

  function calcularMora(impostoEmFalta, dados, p) {
    var base = Math.max(0, num(impostoEmFalta));
    var par = dados.parametros || {};
    var meses = Math.max(0, num(par.mesesAtrasoPagamento));
    var prestacoes = !!par.pagamentoEmPrestacoes;

    var limiteAnos = prestacoes ? num(p.mora.limiteAnosPrestacoes) : num(p.mora.limiteAnos);
    var mesesMaximos = limiteAnos * 12;
    var limitado = meses > mesesMaximos;
    var mesesContados = limitado ? mesesMaximos : meses;

    var montante = base * num(p.mora.taxaAnual) * (mesesContados / 12);

    return {
      base: arred(base),
      taxaAnual: num(p.mora.taxaAnual),
      meses: meses,
      mesesContados: mesesContados,
      limiteAnos: limiteAnos,
      limiteAplicado: limitado,
      prestacoes: prestacoes,
      prazoPagamentoDias: num(p.mora.prazoPagamentoDias),
      regra: 'Artigo 44.º da LGT: juros de mora desde o termo do prazo de pagamento voluntário de ' +
        num(p.mora.prazoPagamentoDias) + ' dias, com o limite de ' + limiteAnos + ' anos' +
        (prestacoes ? ' por a dívida ser paga em prestações' : '') + '.',
      montante: arred(montante)
    };
  }

  /* ================================================================== *
   * 6. Coimas (RGIT)
   * ================================================================== */

  function calcularCoimas(impostoEmFalta, dados, p) {
    var base = Math.max(0, num(impostoEmFalta));
    var nSocios = Math.max(1, (dados.socios || []).length);
    var c = p.coimas;

    var minimoLegal = Math.max(base * num(c.percentagemMinima), num(c.coimaMinimaAbsoluta));
    var maximoLegal = Math.min(
      Math.max(base * num(c.percentagemMaxima), num(c.coimaMinimaAbsoluta)),
      num(c.tectoNegligencia)
    );
    if (maximoLegal < minimoLegal) maximoLegal = minimoLegal;

    var declaracoes = c.aplicarCoimaDeclaracaoPorSocio ? nSocios : 1;
    var coimaDeclMin = num(c.coimaDeclaracaoMinima) * declaracoes;
    var coimaDeclMax = num(c.coimaDeclaracaoMaxima) * declaracoes;

    return {
      base: arred(base),
      minimoLegal: arred(minimoLegal),
      maximoLegal: arred(maximoLegal),
      // Tres cenarios de simulacao. Nenhum deles e uma previsao da coima
      // que a Autoridade Tributaria venha a aplicar: a graduacao concreta
      // depende da culpa, do beneficio obtido e da situacao economica do
      // agente (artigo 27.º do RGIT).
      baixo: {
        valor: arred(minimoLegal * num(c.reducaoVoluntaria)),
        rotulo: 'Cenário baixo — regularização voluntária',
        fundamento: 'Artigo 29.º, n.º 1, alínea a) do RGIT: redução a ' +
          (num(c.reducaoVoluntaria) * 100) + '% do montante mínimo legal quando a regularização ' +
          'ocorre por iniciativa do sujeito passivo, antes de qualquer procedimento inspetivo.'
      },
      referencia: {
        valor: arred(minimoLegal * num(c.fatorReferencia)),
        rotulo: 'Cenário de referência — limite mínimo legal',
        fundamento: 'Artigo 114.º, n.º 2 do RGIT: coima de ' +
          (num(c.percentagemMinima) * 100) + '% a ' + (num(c.percentagemMaxima) * 100) +
          '% do imposto em falta a título de negligência. Este cenário ancora-se no limite mínimo ' +
          'e não constitui previsão da coima aplicável.'
      },
      alto: {
        valor: arred(maximoLegal + coimaDeclMax),
        rotulo: 'Cenário alto — limite máximo com coimas declarativas',
        fundamento: 'Limite máximo do artigo 114.º, n.º 2 do RGIT, com o teto do artigo 26.º, ' +
          'acrescido das coimas do artigo 119.º do RGIT por declaração inexata (' +
          declaracoes + ' declaração(ões) considerada(s)).'
      },
      coimasDeclarativas: { minimo: arred(coimaDeclMin), maximo: arred(coimaDeclMax), declaracoes: declaracoes },
      aviso: 'Os três valores são cenários de simulação. Não representam uma previsão da coima ' +
        'que venha a ser aplicada pela Autoridade Tributária, que gradua a coima caso a caso.'
    };
  }

  /* ================================================================== *
   * 7. Recuperacao do IRC
   * ================================================================== */

  function calcularRecuperacaoIRC(actual, dados, p) {
    var irc = actual.irc;
    var base = irc.coleta;
    if (p.recuperacao.incluirDerramas) base += irc.derramaMunicipal + irc.derramaEstadual;
    if (p.recuperacao.incluirTributacoesAutonomas) base += irc.tributacoesAutonomas;
    if (p.recuperacao.incluirRetencoes) base += irc.retencoes;

    var parcial = num(p.recuperacao.percentagemParcial);
    var pct = function (x) { return 'Recuperação ' + arred(x * 100, 1) + '%'; };
    var cenarios = {
      integral: { rotulo: pct(1), percentagem: 1, valor: arred(base) },
      parcial: { rotulo: pct(parcial), percentagem: parcial, valor: arred(base * parcial) },
      inexistente: { rotulo: pct(0), percentagem: 0, valor: 0 }
    };
    var escolhido = (dados.parametros && dados.parametros.cenarioIRC) || 'parcial';
    if (!cenarios[escolhido]) escolhido = 'parcial';

    return {
      base: arred(base),
      cenarios: cenarios,
      cenarioSelecionado: escolhido,
      valorConsiderado: cenarios[escolhido].valor,
      componentes: {
        coleta: irc.coleta,
        derramas: p.recuperacao.incluirDerramas ? arred(irc.derramaMunicipal + irc.derramaEstadual) : 0,
        tributacoesAutonomas: p.recuperacao.incluirTributacoesAutonomas ? irc.tributacoesAutonomas : 0,
        retencoes: p.recuperacao.incluirRetencoes ? irc.retencoes : 0
      },
      aviso: 'As percentagens são hipóteses de trabalho escolhidas pelo utilizador e não têm ' +
        'significado jurídico. O montante é potencialmente recuperável, sujeito à validação da ' +
        'via processual aplicável (artigo 78.º da LGT ou artigo 70.º do CPPT) e dos respetivos prazos.'
    };
  }

  /* ================================================================== *
   * 8. Prazos e cronologia
   * ================================================================== */

  function construirTimeline(dados, p, juros, recuperacao) {
    var exercicio = num(dados.sociedade.exercicio);
    var par = dados.parametros || {};
    var ref = data(par.dataReferencia);
    var d = function (y, m, dia) { return new Date(Date.UTC(y, m - 1, dia)).toISOString().slice(0, 10); };

    var eventos = [
      {
        data: d(exercicio, 12, 31),
        titulo: 'Fecho do exercício de ' + exercicio,
        descricao: 'Apuramento do resultado contabilístico e da matéria coletável.',
        regra: 'Facto apurado nas contas da sociedade.',
        tipo: 'facto'
      },
      {
        data: d(exercicio + 1, p.prazos.prazoEntregaModelo22.mes, p.prazos.prazoEntregaModelo22.dia),
        titulo: 'Prazo de entrega da Modelo 22',
        descricao: 'Declaração de rendimentos de IRC do exercício de ' + exercicio + '.',
        regra: 'Artigo 120.º do CIRC.',
        tipo: 'prazo'
      },
      {
        data: d(exercicio + 1, p.prazos.prazoEntregaModelo3.mes, p.prazos.prazoEntregaModelo3.dia),
        titulo: 'Prazo de entrega da Modelo 3 de IRS',
        descricao: 'Termo do prazo em que a imputação deveria ter sido declarada pelos sócios. ' +
          'Início da contagem dos juros compensatórios.',
        regra: 'Artigo 60.º do CIRS; início da contagem nos termos do artigo 35.º, n.º 7 da LGT.',
        tipo: 'prazo'
      }
    ];

    // Factos opcionais: so entram na cronologia se o utilizador os introduzir.
    if (par.dataLiquidacaoIRC) {
      eventos.push({
        data: iso(par.dataLiquidacaoIRC),
        titulo: 'Liquidação do IRC do exercício',
        descricao: 'Ato tributário cuja revisão será pedida para recuperar ' +
          formatarEuro(recuperacao.base) + '.',
        regra: 'Data introduzida pelo utilizador. É a partir daqui que correm os prazos de reclamação e de revisão.',
        tipo: 'facto'
      });
    }
    if (par.dataPagamentoIRC) {
      eventos.push({
        data: iso(par.dataPagamentoIRC),
        titulo: 'Pagamento do IRC',
        descricao: 'Saída de caixa efetiva que se pretende recuperar.',
        regra: 'Data introduzida pelo utilizador.',
        tipo: 'facto'
      });
    }
    if (par.dataConclusaoInspecao) {
      eventos.push({
        data: iso(par.dataConclusaoInspecao),
        titulo: 'Conclusão da ação de fiscalização',
        descricao: 'Os juros compensatórios são devidos até 90 dias após esta data.',
        regra: 'Artigo 35.º, n.º 7 da LGT.',
        tipo: 'facto'
      });
    }

    eventos.push({
      data: juros.dataFim,
      titulo: 'Fim da contagem de juros',
      descricao: juros.dias + ' dias de juros compensatórios sobre ' + formatarEuro(juros.base) +
        ', no regime «' + juros.regimeRotulo + '».',
      regra: juros.regra,
      tipo: 'referencia'
    });

    // Prazos de quatro anos. Quando ha data de liquidacao, conta-se a partir
    // dela; caso contrario e uma aproximacao a partir do fim do ano seguinte
    // ao exercicio, e e assinalada como tal.
    var aproximado = !par.dataLiquidacaoIRC;
    var baseRevisao = par.dataLiquidacaoIRC
      ? new Date(data(par.dataLiquidacaoIRC).getTime())
      : new Date(Date.UTC(exercicio + 1, 11, 31));
    var revisao = new Date(baseRevisao.getTime());
    revisao.setUTCFullYear(revisao.getUTCFullYear() + num(p.prazos.revisaoOficiosaAnos));

    eventos.push({
      data: revisao.toISOString().slice(0, 10),
      titulo: 'Prazo potencial de revisão do IRC',
      descricao: 'Indicação aproximada do limite para pedir a revisão do ato tributário. ' +
        'O artigo 78.º da LGT prevê vias e prazos distintos consoante o fundamento invocado ' +
        '(iniciativa do sujeito passivo, erro imputável aos serviços, injustiça grave ou notória, ' +
        'duplicação de coleta). A via aplicável tem de ser determinada caso a caso.' +
        (aproximado ? ' Sem data de liquidação introduzida, esta data é uma estimativa.' : ''),
      regra: 'Artigo 78.º da LGT. Ver também o prazo de reclamação graciosa do artigo 70.º do CPPT (' +
        p.prazos.reclamacaoGraciosaDias + ' dias).',
      aproximado: aproximado,
      tipo: 'limite'
    });

    eventos.push({
      data: d(exercicio + num(p.prazos.caducidadeAnos), 12, 31),
      titulo: 'Prazo potencial de caducidade',
      descricao: 'Limite para a Autoridade Tributária liquidar IRS adicional do exercício de ' + exercicio +
        '. Nos impostos periódicos o prazo conta-se do termo do ano em que ocorreu o facto tributário, ' +
        'pelo que corre de 01/01/' + (exercicio + 1) + ' a esta data. Suspende-se ou interrompe-se em ' +
        'várias situações, designadamente durante a ação de inspeção.',
      regra: 'Artigo 45.º, n.os 1 e 4 da LGT, com as causas de suspensão e interrupção do artigo 46.º.',
      aproximado: true,
      tipo: 'limite'
    });

    eventos.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    var refIso = ref.toISOString().slice(0, 10);
    eventos.forEach(function (e) { e.passado = e.data <= refIso; });
    return eventos;
  }

  function formatarEuro(v) {
    var x = num(v);
    var sinal = x < 0 ? '-' : '';
    var partes = Math.abs(x).toFixed(2).split('.');
    var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    return sinal + inteiro + ',' + partes[1] + '\u00a0\u20ac';
  }

  /* ================================================================== *
   * 9. Qualidade dos dados e confianca da simulacao
   * ================================================================== */

  /**
   * Traduz o estado dos inputs num grau de confianca explicito.
   * Um numero com duas casas decimais nao pode ser apresentado com o mesmo
   * peso quando assenta em pressupostos e quando assenta em dados reais.
   */
  function avaliarQualidade(dados, p, tabela, recuperacao) {
    var s = dados.sociedade;
    var socios = dados.socios || [];
    var par = dados.parametros || {};
    var itens = [];

    var soma = socios.reduce(function (a, x) { return a + num(x.participacao); }, 0);
    itens.push({
      chave: 'participacoes',
      rotulo: 'Participações dos sócios',
      estado: socios.length && Math.abs(soma - 100) < 0.01 ? 'ok' : 'falta',
      texto: socios.length && Math.abs(soma - 100) < 0.01
        ? 'Somam 100%.'
        : 'Não somam 100%. A imputação está distorcida.'
    });

    var teorica = num(s.resultadoContabilistico) + num(s.correcoesFiscais);
    itens.push({
      chave: 'materiaColetavel',
      rotulo: 'Matéria coletável',
      estado: num(s.materiaColetavel) <= 0 ? 'falta'
        : (Math.abs(teorica - num(s.materiaColetavel)) > 1 ? 'aviso' : 'ok'),
      texto: num(s.materiaColetavel) <= 0
        ? 'Não introduzida. Sem ela não há imputação a calcular.'
        : (Math.abs(teorica - num(s.materiaColetavel)) > 1
          ? 'Não reconcilia com o resultado e as correções fiscais. Confirmar prejuízos ou benefícios.'
          : 'Reconcilia com o resultado contabilístico e as correções fiscais.')
    });

    itens.push({
      chave: 'tabelaIRS',
      rotulo: 'Tabela de IRS do exercício',
      estado: tabela.estado === 'confirmado' ? 'ok' : 'aviso',
      texto: tabela.estado === 'confirmado'
        ? 'Tabela confirmada para ' + s.exercicio + '.'
        : 'Tabela ' + tabela.estado + '. ' + tabela.fonte
    });

    var temDeducoes = socios.some(function (x) { return num(x.outrasDeducoesColeta) > 0; });
    itens.push({
      chave: 'deducoes',
      rotulo: 'Deduções à coleta',
      estado: temDeducoes ? 'ok' : 'falta',
      texto: temDeducoes
        ? 'Introduzidas a partir dos valores reais dos sócios.'
        : 'Só está modelada a dedução por dependente. Despesas de saúde, educação, habitação e ' +
          'despesas gerais familiares não estão consideradas: o IRS de cada cenário está sobreavaliado.'
    });

    var regimeInspecaoSemData = par.regimeJuros === 'inspecao' && !par.dataConclusaoInspecao;
    itens.push({
      chave: 'juros',
      rotulo: 'Regime de juros compensatórios',
      estado: regimeInspecaoSemData ? 'falta' : (par.regimeJuros ? 'ok' : 'aviso'),
      texto: regimeInspecaoSemData
        ? 'Regime de fiscalização sem data de conclusão da ação. Os juros estão sobreavaliados.'
        : (par.regimeJuros
          ? 'Regime escolhido explicitamente.'
          : 'A usar o regime por omissão. Confirme a origem da correção no ecrã de parâmetros.')
    });

    itens.push({
      chave: 'recuperacaoIRC',
      rotulo: 'Recuperação do IRC',
      estado: 'aviso',
      texto: 'A percentagem é uma hipótese de trabalho. A via processual e o respetivo prazo ' +
        'têm de ser determinados caso a caso.'
    });

    itens.push({
      chave: 'datasProcessuais',
      rotulo: 'Data de liquidação do IRC',
      estado: par.dataLiquidacaoIRC ? 'ok' : 'aviso',
      texto: par.dataLiquidacaoIRC
        ? 'Introduzida. Os prazos são contados a partir dela.'
        : 'Não introduzida. Os prazos de revisão e caducidade são aproximações.'
    });

    var pesos = { ok: 1, aviso: 0.5, falta: 0 };
    var pontos = itens.reduce(function (a, i) { return a + pesos[i.estado]; }, 0);
    var indice = Math.round((pontos / itens.length) * 100);
    var grau = indice >= 80 ? 'Alta' : (indice >= 55 ? 'Média' : 'Baixa');

    return {
      indice: indice,
      grau: grau,
      itens: itens,
      resumo: 'Confiança ' + grau.toLowerCase() + ' (' + indice + '%). ' +
        'Os valores são uma estimativa de impacto marginal, não uma liquidação.'
    };
  }

  /* ================================================================== *
   * 9. Avisos e validacoes
   * ================================================================== */

  function validar(dados, p, tabela) {
    var avisos = [];
    var socios = dados.socios || [];
    var soma = socios.reduce(function (a, s) { return a + num(s.participacao); }, 0);

    if (!socios.length) {
      avisos.push({ nivel: 'erro', texto: 'Não foi introduzido nenhum sócio. A imputação não pode ser calculada.' });
    } else if (Math.abs(soma - 100) > 0.01) {
      avisos.push({
        nivel: 'erro',
        texto: 'A soma das participações é de ' + arred(soma) + '%. Deve totalizar 100%. ' +
          'A matéria coletável imputada está ' + (soma < 100 ? 'subavaliada' : 'sobreavaliada') + '.'
      });
    }

    var s = dados.sociedade;
    var mcTeorica = num(s.resultadoContabilistico) + num(s.correcoesFiscais);
    if (num(s.materiaColetavel) > 0 && Math.abs(mcTeorica - num(s.materiaColetavel)) > 1) {
      avisos.push({
        nivel: 'aviso',
        texto: 'Resultado contabilístico + correções fiscais = ' + formatarEuro(mcTeorica) +
          ', mas a matéria coletável introduzida é ' + formatarEuro(s.materiaColetavel) +
          '. Diferença de ' + formatarEuro(num(s.materiaColetavel) - mcTeorica) +
          ' (pode justificar-se por prejuízos fiscais reportados ou benefícios).'
      });
    }

    if (num(s.materiaColetavel) < 0) {
      avisos.push({
        nivel: 'erro',
        texto: 'Matéria coletável negativa: o prejuízo fiscal não é imputado aos sócios, fica na sociedade e é ' +
          'reportável nos termos do artigo 52.º do CIRC. A imputação foi fixada em zero, mas a simulação de um ' +
          'exercício com prejuízo não é conclusiva — o tratamento dos prejuízos difere entre os dois regimes.'
      });
    } else if (num(s.materiaColetavel) === 0) {
      avisos.push({ nivel: 'aviso', texto: 'Matéria coletável nula: não há imputação a tributar em IRS.' });
    }

    if (tabela && tabela.estado === 'provisorio') {
      avisos.push({ nivel: 'aviso', texto: 'A tabela de IRS de ' + s.exercicio + ' está marcada como PROVISÓRIA. ' + tabela.fonte });
    }
    if (tabela && tabela.estado === 'substituido') {
      avisos.push({ nivel: 'aviso', texto: tabela.fonte });
    }

    var distribuicoes = socios.reduce(function (a, x) { return a + num(x.irsPagoDistribuicoes); }, 0);
    if (distribuicoes > 0) {
      avisos.push({
        nivel: 'info',
        texto: 'Foram assinalados ' + formatarEuro(distribuicoes) + ' de IRS suportado sobre lucros ' +
          'distribuídos. Este valor NÃO é abatido ao IRS adicional: a transparência fiscal implica ' +
          'imputação independentemente da distribuição e o tratamento dos montantes já distribuídos ' +
          'depende da sua natureza e qualificação jurídica.'
      });
    }

    if (!socios.some(function (x) { return num(x.outrasDeducoesColeta) > 0; })) {
      avisos.push({
        nivel: 'aviso',
        texto: 'Não foram introduzidas deduções à coleta para além dos dependentes. O resultado é uma ' +
          'estimativa de impacto marginal antes das restantes deduções à coleta, não um cálculo de IRS.'
      });
    }

    var ref = data(dados.parametros && dados.parametros.dataReferencia);
    var limiteRevisao = new Date(Date.UTC(num(s.exercicio) + 1 + num(p.prazos.revisaoOficiosaAnos), 11, 31));
    if (ref > limiteRevisao) {
      avisos.push({
        nivel: 'erro',
        texto: 'A data de referência ultrapassa o prazo de revisão do artigo 78.º da LGT (' +
          limiteRevisao.toISOString().slice(0, 10) + '). O IRC pago dificilmente será recuperável.'
      });
    }
    var limiteCaducidade = new Date(Date.UTC(num(s.exercicio) + num(p.prazos.caducidadeAnos), 11, 31));
    if (ref > limiteCaducidade) {
      avisos.push({
        nivel: 'info',
        texto: 'A data de referência ultrapassa o prazo de caducidade do artigo 45.º da LGT (' +
          limiteCaducidade.toISOString().slice(0, 10) + '). A liquidação adicional de IRS poderá já não ser exigível.'
      });
    }
    return avisos;
  }

  /* ================================================================== *
   * 10. Simulacao completa
   * ================================================================== */

  function simular(dados) {
    var p = mesclarParametros(dados.parametros);
    var tabela = escaloesDoExercicio(p, dados.sociedade.exercicio);

    var actual = cenarioActual(dados, p);
    var corrigido = cenarioCorrigido(dados, p);

    // O IRS suportado sobre lucros distribuidos NAO e abatido automaticamente.
    // A transparencia fiscal implica imputacao independentemente da distribuicao
    // (artigo 6.º do CIRC, artigo 20.º do CIRS) e o tratamento dos montantes ja
    // distribuidos depende da sua natureza e qualificacao. Fica assinalado como
    // valor a tratar juridicamente, fora do calculo.
    var distribuicoesAssinaladas = (dados.socios || []).reduce(function (a, s) {
      return a + num(s.irsPagoDistribuicoes);
    }, 0);

    var irsAdicionalBruto = Math.max(0, corrigido.irsTotal - actual.irsTotal);
    var irsAdicional = irsAdicionalBruto;

    var juros = calcularJuros(irsAdicional, dados, p);
    var mora = calcularMora(irsAdicional, dados, p);
    var coimas = calcularCoimas(irsAdicional, dados, p);
    var recuperacao = calcularRecuperacaoIRC(actual, dados, p);

    var porSocio = corrigido.socios.map(function (sc, i) {
      var base = actual.socios[i] || { irs: 0 };
      var delta = Math.max(0, sc.irs - base.irs);
      return {
        nome: sc.nome || ('Socio ' + (i + 1)),
        participacao: sc.participacao,
        imputacao: sc.imputacao,
        irsAtual: base.irs,
        irsCorrigido: sc.irs,
        irsAdicional: arred(delta),
        taxaMarginalAtual: base.liquidacao ? base.liquidacao.taxaMarginal : 0,
        taxaMarginalCorrigida: sc.liquidacao.taxaMarginal,
        rendimentoColetavelAtual: base.liquidacao ? base.liquidacao.rendimentoColetavel : 0,
        rendimentoColetavelCorrigido: sc.liquidacao.rendimentoColetavel,
        quotaImputacao: irsAdicionalBruto > 0 ? arred(delta / irsAdicionalBruto, 4) : 0
      };
    });

    function exposicao(valorCoima, valorIRC) {
      return arred(irsAdicional + juros.montante + mora.montante + valorCoima - valorIRC);
    }

    var exposicaoLiquida = exposicao(coimas.referencia.valor, recuperacao.valorConsiderado);

    var matriz = ['baixo', 'referencia', 'alto'].map(function (chaveCoima) {
      return {
        coima: chaveCoima,
        valores: ['integral', 'parcial', 'inexistente'].map(function (chaveIRC) {
          return {
            irc: chaveIRC,
            valor: exposicao(coimas[chaveCoima].valor, recuperacao.cenarios[chaveIRC].valor)
          };
        })
      };
    });

    var comparador = [
      { indicador: 'IRC (coleta + derramas)', atual: arred(actual.irc.coleta + actual.irc.derramaMunicipal + actual.irc.derramaEstadual), corrigido: 0 },
      { indicador: 'Tributações autónomas', atual: actual.irc.tributacoesAutonomas, corrigido: corrigido.irc.tributacoesAutonomas },
      { indicador: 'IRS dos sócios', atual: actual.irsTotal, corrigido: corrigido.irsTotal },
      { indicador: 'Juros compensatórios', atual: 0, corrigido: juros.montante },
      { indicador: 'Juros de mora', atual: 0, corrigido: mora.montante },
      { indicador: 'Coimas (cenário de referência)', atual: 0, corrigido: coimas.referencia.valor },
      { indicador: 'Carga fiscal total', atual: arred(actual.impostoTotal), corrigido: arred(corrigido.impostoTotal + juros.montante + mora.montante + coimas.referencia.valor) }
    ].map(function (l) {
      l.variacao = arred(l.corrigido - l.atual);
      return l;
    });

    return {
      meta: {
        exercicio: num(dados.sociedade.exercicio),
        dataReferencia: iso(dados.parametros && dados.parametros.dataReferencia),
        tabelaIRS: { estado: tabela.estado, fonte: tabela.fonte },
        regras: p.versao,
        geradoEm: new Date().toISOString()
      },
      parametros: p,
      atual: actual,
      corrigido: corrigido,
      socios: porSocio,
      juros: juros,
      mora: mora,
      coimas: coimas,
      recuperacaoIRC: recuperacao,
      indicadores: {
        irsAdicionalBruto: arred(irsAdicionalBruto),
        distribuicoesAssinaladas: arred(distribuicoesAssinaladas),
        irsAdicional: arred(irsAdicional),
        juros: juros.montante,
        mora: mora.montante,
        coimas: coimas.referencia.valor,
        ircRecuperavel: recuperacao.valorConsiderado,
        exposicaoBruta: arred(irsAdicional + juros.montante + mora.montante + coimas.referencia.valor),
        exposicaoLiquida: exposicaoLiquida
      },
      matrizSensibilidade: matriz,
      comparador: comparador,
      timeline: construirTimeline(dados, p, juros, recuperacao),
      qualidade: avaliarQualidade(dados, p, tabela, recuperacao),
      avisos: validar(dados, p, tabela)
    };
  }

  /* ================================================================== *
   * 11. Consolidacao de varios exercicios
   *
   * Um enquadramento incorrecto instala-se ao longo de anos. Cada exercicio
   * tem o seu proprio prazo de caducidade, o seu proprio periodo de juros e
   * pode ter sinal diferente: ha anos em que regularizar custa e anos em que
   * compensa. Consolidar nao e somar — e ordenar por urgencia e por sinal.
   * ================================================================== */

  function consolidar(dados) {
    var exercicios = (dados.exercicios || []).map(function (ex) {
      var resultado = simular({
        sociedade: ex.sociedade,
        socios: ex.socios,
        parametros: dados.parametros
      });
      var caducidade = resultado.timeline.filter(function (e) {
        return /caducidade/i.test(e.titulo);
      })[0];
      var revisao = resultado.timeline.filter(function (e) {
        return /revis/i.test(e.titulo);
      })[0];
      var ref = data(dados.parametros && dados.parametros.dataReferencia);
      var diasAteCaducidade = caducidade ? dias(ref, caducidade.data) : null;

      return {
        exercicio: resultado.meta.exercicio,
        resultado: resultado,
        exposicaoLiquida: resultado.indicadores.exposicaoLiquida,
        irsAdicional: resultado.indicadores.irsAdicional,
        juros: resultado.indicadores.juros,
        mora: resultado.indicadores.mora,
        coimas: resultado.indicadores.coimas,
        ircRecuperavel: resultado.indicadores.ircRecuperavel,
        favoravel: resultado.indicadores.exposicaoLiquida < 0,
        confianca: resultado.qualidade.indice,
        caducidade: caducidade ? caducidade.data : null,
        diasAteCaducidade: diasAteCaducidade,
        caducado: diasAteCaducidade !== null && diasAteCaducidade <= 0,
        revisao: revisao ? revisao.data : null,
        erros: resultado.avisos.filter(function (a) { return a.nivel === 'erro'; }).length
      };
    });

    exercicios.sort(function (a, b) { return a.exercicio - b.exercicio; });

    var soma = function (campo) {
      return arred(exercicios.reduce(function (a, x) { return a + x[campo]; }, 0));
    };
    var abertos = exercicios.filter(function (x) { return !x.caducado; });

    // Ordem de tratamento: primeiro o que caduca mais cedo. E o prazo, e nao o
    // montante, que define a urgencia — um exercicio que caduca perde-se.
    var urgencia = abertos.slice().sort(function (a, b) {
      if (a.diasAteCaducidade === null) return 1;
      if (b.diasAteCaducidade === null) return -1;
      return a.diasAteCaducidade - b.diasAteCaducidade;
    });

    var avisos = [];
    var aExpirar = abertos.filter(function (x) {
      return x.diasAteCaducidade !== null && x.diasAteCaducidade <= 183;
    });
    if (aExpirar.length) {
      avisos.push({
        nivel: 'erro',
        texto: 'Exercício(s) de ' + aExpirar.map(function (x) { return x.exercicio; }).join(', ') +
          ' com prazo de caducidade a terminar dentro de seis meses. ' +
          'A decisão sobre esse(s) ano(s) não pode ser adiada: passado o prazo, ' +
          'nem a Autoridade Tributária pode liquidar nem faz sentido regularizar voluntariamente.'
      });
    }
    var caducados = exercicios.filter(function (x) { return x.caducado; });
    if (caducados.length) {
      avisos.push({
        nivel: 'info',
        texto: 'Exercício(s) de ' + caducados.map(function (x) { return x.exercicio; }).join(', ') +
          ' já fora do prazo de caducidade à data de referência. Ficam fora do total consolidado.'
      });
    }
    var favoraveis = exercicios.filter(function (x) { return x.favoravel && !x.caducado; });
    if (favoraveis.length && favoraveis.length < exercicios.length) {
      avisos.push({
        nivel: 'aviso',
        texto: 'Em ' + favoraveis.map(function (x) { return x.exercicio; }).join(', ') +
          ' a reclassificação é favorável ao contribuinte. Regularizar apenas os anos favoráveis ' +
          'não é uma opção autónoma: expor o enquadramento traz consigo os exercícios desfavoráveis ainda abertos.'
      });
    }

    var somaAbertos = function (campo) {
      return arred(abertos.reduce(function (a, x) { return a + x[campo]; }, 0));
    };

    return {
      exercicios: exercicios,
      ordemUrgencia: urgencia.map(function (x) { return x.exercicio; }),
      totais: {
        exercicios: exercicios.length,
        abertos: abertos.length,
        irsAdicional: somaAbertos('irsAdicional'),
        juros: somaAbertos('juros'),
        mora: somaAbertos('mora'),
        coimas: somaAbertos('coimas'),
        ircRecuperavel: somaAbertos('ircRecuperavel'),
        exposicaoLiquida: somaAbertos('exposicaoLiquida'),
        exposicaoTodos: soma('exposicaoLiquida'),
        confiancaMinima: exercicios.length
          ? Math.min.apply(null, exercicios.map(function (x) { return x.confianca; }))
          : 0
      },
      avisos: avisos
    };
  }

  /* ================================================================== *
   * 12. Custo de esperar
   *
   * Adiar a decisao nao tem apenas um efeito. Os juros continuam a correr,
   * o que agrava; mas ha exercicios que saem do prazo de caducidade, o que
   * alivia — e leva consigo o IRC que deixa de ser recuperavel. O saldo pode
   * ir em qualquer direccao, e e por isso que tem de ser calculado e nao
   * assumido.
   * ================================================================== */

  function projetarEspera(dados, horizontes) {
    horizontes = horizontes || [0, 1, 2, 3];
    var referenciaBase = data(dados.parametros && dados.parametros.dataReferencia);

    var pontos = horizontes.map(function (anos) {
      var copia = JSON.parse(JSON.stringify(dados));
      var ref = new Date(referenciaBase.getTime());
      ref.setUTCFullYear(ref.getUTCFullYear() + anos);
      copia.parametros.dataReferencia = ref.toISOString().slice(0, 10);

      var c = consolidar(copia);
      var abertos = c.exercicios.filter(function (x) { return !x.caducado; });
      var porAno = {};
      c.exercicios.forEach(function (x) { porAno[x.exercicio] = x; });

      return {
        anos: anos,
        data: copia.parametros.dataReferencia,
        exposicao: c.totais.exposicaoLiquida,
        juros: c.totais.juros,
        irsAdicional: c.totais.irsAdicional,
        ircRecuperavel: c.totais.ircRecuperavel,
        abertos: c.totais.abertos,
        exerciciosAbertos: abertos.map(function (x) { return x.exercicio; }),
        porAno: porAno
      };
    });

    var hoje = pontos[0];
    pontos.forEach(function (ponto) {
      ponto.variacao = arred(ponto.exposicao - hoje.exposicao);
      ponto.perdidos = hoje.exerciciosAbertos.filter(function (ano) {
        return ponto.exerciciosAbertos.indexOf(ano) === -1;
      });

      // A variacao tem duas origens de sinal contrario. Apresentar so o saldo
      // seria dizer que esperar compensa, quando o que se passa e que ha
      // exercicios a sair do alcance da Autoridade Tributaria.
      var comuns = ponto.exerciciosAbertos.filter(function (ano) {
        return hoje.exerciciosAbertos.indexOf(ano) !== -1;
      });
      ponto.jurosAcrescidos = arred(comuns.reduce(function (a, ano) {
        return a + (ponto.porAno[ano].juros - hoje.porAno[ano].juros);
      }, 0));
      ponto.exposicaoCaducada = arred(ponto.perdidos.reduce(function (a, ano) {
        return a + hoje.porAno[ano].exposicaoLiquida;
      }, 0));
      ponto.ircPerdido = arred(ponto.perdidos.reduce(function (a, ano) {
        return a + hoje.porAno[ano].ircRecuperavel;
      }, 0));
    });

    // Custo medio de cada mes de espera no primeiro ano, que e o horizonte
    // em que a decisao costuma ser tomada.
    var primeiroAno = pontos.filter(function (p) { return p.anos === 1; })[0];
    var custoMensal = primeiroAno ? arred(primeiroAno.variacao / 12) : 0;

    var ultimo = pontos[pontos.length - 1];
    return {
      pontos: pontos,
      custoMensalPrimeiroAno: custoMensal,
      // Quando a exposicao desce com o tempo, e porque ha exercicios a cair
      // fora do prazo — e nao porque esperar seja gratuito.
      desceComEspera: pontos.some(function (p) { return p.variacao < 0; }),
      haCaducidades: pontos.some(function (p) { return p.perdidos.length > 0; }),
      ircPerdidoNoHorizonte: ultimo ? ultimo.ircPerdido : 0,
      ressalva: 'A descida da exposição com o tempo resulta de exercícios saírem do prazo de ' +
        'caducidade, e não de esperar ser gratuito. O prazo suspende-se com a ação de inspeção ' +
        '(artigo 46.º da LGT): se a Autoridade Tributária atuar antes do termo, a exposição ' +
        'mantém-se e os juros continuam a correr. O IRC desses exercícios deixa também de ser ' +
        'recuperável, e essa perda é definitiva.'
    };
  }

  /** Funde parametros do utilizador sobre os valores por omissao. */
  function mesclarParametros(personalizados) {
    var base = Parametros.porOmissao();
    if (!personalizados) return base;
    Object.keys(base).forEach(function (chave) {
      if (personalizados[chave] === undefined) return;
      if (Array.isArray(base[chave]) || typeof base[chave] !== 'object') {
        base[chave] = personalizados[chave];
      } else {
        Object.keys(personalizados[chave] || {}).forEach(function (sub) {
          base[chave][sub] = personalizados[chave][sub];
        });
      }
    });
    return base;
  }

  return {
    simular: simular,
    consolidar: consolidar,
    projetarEspera: projetarEspera,
    avaliarQualidade: avaliarQualidade,
    liquidarIRS: liquidarIRS,
    coletaProgressiva: coletaProgressiva,
    solidariedade: solidariedade,
    calcularJuros: calcularJuros,
    calcularMora: calcularMora,
    calcularCoimas: calcularCoimas,
    calcularRecuperacaoIRC: calcularRecuperacaoIRC,
    mesclarParametros: mesclarParametros,
    rendimentoColetavelSocio: rendimentoColetavelSocio,
    arred: arred,
    num: num
  };
});
