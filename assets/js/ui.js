/**
 * ui.js - interface do simulador: 4 ecrãs, formulários gerados por esquema,
 * dashboard de resultados e ligação ao motor de cálculo.
 */
(function () {
  'use strict';

  var F = window.Formato;
  var Motor = window.Motor;
  var Parametros = window.Parametros;
  var Estado = window.Estado;

  var dados = Estado.ler() || Estado.novo();
  var resultado = null;
  var ecraAtual = 1;

  /* ================================================================== *
   * Esquemas de formulário
   * ================================================================== */

  var CAMPOS_SOCIEDADE = [
    { chave: 'designacao', rotulo: 'Designação da sociedade', tipo: 'texto', largo: true, ajuda: 'Apenas para identificação no relatório.' },
    { chave: 'exercicio', rotulo: 'Exercício fiscal', tipo: 'inteiro', min: 2000, max: 2100, ajuda: 'Ano a que respeita a matéria coletável.' },
    { chave: 'resultadoContabilistico', rotulo: 'Resultado contabilístico (€)', tipo: 'euro', ajuda: 'Resultado líquido antes de correções fiscais.' },
    { chave: 'correcoesFiscais', rotulo: 'Correções fiscais (€)', tipo: 'euro', ajuda: 'Acréscimos menos deduções do quadro 07 da Modelo 22.' },
    { chave: 'materiaColetavel', rotulo: 'Matéria coletável (€)', tipo: 'euro', ajuda: 'Campo 311 da Modelo 22. É esta a base imputada aos sócios.' },
    { chave: 'ircLiquidado', rotulo: 'IRC liquidado (€)', tipo: 'euro', ajuda: 'Coleta de IRC do exercício, antes de derramas.' },
    { chave: 'derramaMunicipal', rotulo: 'Derrama municipal (€)', tipo: 'euro' },
    { chave: 'derramaEstadual', rotulo: 'Derrama estadual (€)', tipo: 'euro' },
    { chave: 'tributacoesAutonomas', rotulo: 'Tributações autónomas (€)', tipo: 'euro', ajuda: 'Mantêm-se devidas mesmo em transparência fiscal (artigo 12.º do CIRC).' },
    { chave: 'pagamentosPorConta', rotulo: 'Pagamentos por conta (€)', tipo: 'euro' },
    { chave: 'retencoes', rotulo: 'Retenções na fonte (€)', tipo: 'euro' }
  ];

  var CAMPOS_SOCIO = [
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto' },
    { chave: 'participacao', rotulo: 'Participação (%)', tipo: 'decimal', min: 0, max: 100, passo: 0.01 },
    { chave: 'rendimentosA', rotulo: 'Rendimentos categoria A (€)', tipo: 'euro', ajuda: 'Rendimento bruto do trabalho dependente.' },
    { chave: 'rendimentosB', rotulo: 'Rendimentos categoria B (€)', tipo: 'euro', ajuda: 'Rendimento bruto próprio, fora da sociedade.' },
    { chave: 'categoriaBJaLiquida', rotulo: 'Categoria B já líquida (não aplicar coeficiente)', tipo: 'booleano', largo: true },
    { chave: 'outrosRendimentos', rotulo: 'Outros rendimentos englobados (€)', tipo: 'euro' },
    { chave: 'tributacao', rotulo: 'Tributação', tipo: 'opcoes', opcoes: [['separada', 'Separada'], ['conjunta', 'Conjunta']] },
    { chave: 'rendimentosConjuge', rotulo: 'Rendimento coletável do cônjuge (€)', tipo: 'euro', ajuda: 'Apenas na tributação conjunta.', visivel: function (s) { return s.tributacao === 'conjunta'; } },
    { chave: 'dependentes', rotulo: 'Número de dependentes', tipo: 'inteiro', min: 0, max: 20 },
    { chave: 'irsPagoDistribuicoes', rotulo: 'IRS já pago sobre lucros distribuídos (€)', tipo: 'euro', ajuda: 'Retenção de 28% sobre dividendos já suportada. É creditada no IRS adicional.' }
  ];

  var CAMPOS_CENARIO = [
    { grupo: null, chave: 'dataReferencia', rotulo: 'Data de referência', tipo: 'data', ajuda: 'Data até à qual se contam os juros.' },
    { grupo: null, chave: 'dataInicioJuros', rotulo: 'Início dos juros (opcional)', tipo: 'data', ajuda: 'Vazio = termo do prazo de entrega da Modelo 3.' },
    { grupo: null, chave: 'cenarioIRC', rotulo: 'Cenário de recuperação do IRC', tipo: 'opcoes', opcoes: [['integral', 'Reembolso integral'], ['parcial', 'Reembolso parcial'], ['inexistente', 'Reembolso inexistente']] }
  ];

  var CAMPOS_JUROS = [
    { grupo: 'juros', chave: 'taxaAnual', rotulo: 'Taxa anual (%)', tipo: 'percentagem', ajuda: 'Taxa dos juros legais. Por omissão 4%.' },
    { grupo: 'juros', chave: 'baseDias', rotulo: 'Base de dias do ano', tipo: 'inteiro' },
    { grupo: 'juros', chave: 'limiteDias', rotulo: 'Limite de dias (opcional)', tipo: 'inteiro', ajuda: 'Preencher com 180 para o teto do artigo 35.º, n.º 7 da LGT.' },
    { grupo: 'juros', chave: 'diaLimiteIRS', rotulo: 'Dia limite da Modelo 3', tipo: 'inteiro', min: 1, max: 31 },
    { grupo: 'juros', chave: 'mesLimiteIRS', rotulo: 'Mês limite da Modelo 3', tipo: 'inteiro', min: 1, max: 12 }
  ];

  var CAMPOS_COIMAS = [
    { grupo: 'coimas', chave: 'percentagemMinima', rotulo: 'Coima mínima (% do imposto)', tipo: 'percentagem', ajuda: 'Artigo 114.º, n.º 2 do RGIT.' },
    { grupo: 'coimas', chave: 'percentagemMaxima', rotulo: 'Coima máxima (% do imposto)', tipo: 'percentagem' },
    { grupo: 'coimas', chave: 'reducaoVoluntaria', rotulo: 'Redução por regularização voluntária (%)', tipo: 'percentagem', ajuda: 'Artigo 29.º, n.º 1, alínea a) do RGIT.' },
    { grupo: 'coimas', chave: 'coimaMinimaAbsoluta', rotulo: 'Piso da coima (€)', tipo: 'euro' },
    { grupo: 'coimas', chave: 'tectoNegligencia', rotulo: 'Teto por negligência (€)', tipo: 'euro' },
    { grupo: 'coimas', chave: 'coimaDeclaracaoMinima', rotulo: 'Coima declarativa mínima (€)', tipo: 'euro', ajuda: 'Artigo 119.º do RGIT, por declaração.' },
    { grupo: 'coimas', chave: 'coimaDeclaracaoMaxima', rotulo: 'Coima declarativa máxima (€)', tipo: 'euro' },
    { grupo: 'coimas', chave: 'aplicarCoimaDeclaracaoPorSocio', rotulo: 'Aplicar coima declarativa a cada sócio', tipo: 'booleano', largo: true }
  ];

  var CAMPOS_IRS = [
    { grupo: 'irs', chave: 'deducaoEspecificaCategoriaA', rotulo: 'Dedução específica da categoria A (€)', tipo: 'euro' },
    { grupo: 'irs', chave: 'coeficienteCategoriaB', rotulo: 'Coeficiente da categoria B', tipo: 'decimal', passo: 0.01, ajuda: 'Artigo 31.º do CIRS. 0,75 para serviços do artigo 151.º.' },
    { grupo: 'irs', chave: 'deducaoPorDependente', rotulo: 'Dedução por dependente (€)', tipo: 'euro' },
    { grupo: 'irs', chave: 'quocienteConjugal', rotulo: 'Quociente conjugal', tipo: 'decimal', passo: 0.5 },
    { grupo: 'irs', chave: 'limiteDeducoesColeta', rotulo: 'Limite global de deduções (€, opcional)', tipo: 'euro' }
  ];

  var CAMPOS_RECUPERACAO = [
    { grupo: 'recuperacao', chave: 'percentagemParcial', rotulo: 'Reembolso parcial (%)', tipo: 'percentagem' },
    { grupo: 'recuperacao', chave: 'incluirDerramas', rotulo: 'Incluir derramas na base recuperável', tipo: 'booleano', largo: true },
    { grupo: 'recuperacao', chave: 'incluirTributacoesAutonomas', rotulo: 'Incluir tributações autónomas na base recuperável', tipo: 'booleano', largo: true }
  ];

  /* ================================================================== *
   * Utilitários de DOM
   * ================================================================== */

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  function el(tag, props, filhos) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'texto') n.textContent = props[k];
      else if (k === 'html') n.innerHTML = props[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== null && props[k] !== undefined && props[k] !== false) n.setAttribute(k, props[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  /* ================================================================== *
   * Geração de campos
   * ================================================================== */

  function valorEfetivo(campo) {
    if (!campo.grupo) return dados.parametros[campo.chave];
    var base = Parametros.porOmissao();
    var sobre = (dados.parametros[campo.grupo] || {});
    return sobre[campo.chave] !== undefined ? sobre[campo.chave] : base[campo.grupo][campo.chave];
  }

  function definirParametro(campo, valor) {
    if (!campo.grupo) { dados.parametros[campo.chave] = valor; return; }
    if (!dados.parametros[campo.grupo]) dados.parametros[campo.grupo] = {};
    dados.parametros[campo.grupo][campo.chave] = valor;
  }

  function criarCampo(campo, obterValor, definirValor) {
    var valor = obterValor();
    var id = 'c-' + (campo.grupo || 'x') + '-' + campo.chave + '-' + Math.random().toString(36).slice(2, 7);
    var entrada;

    if (campo.tipo === 'opcoes') {
      entrada = el('select', { id: id });
      campo.opcoes.forEach(function (o) {
        entrada.appendChild(el('option', { value: o[0], texto: o[1], selected: valor === o[0] }));
      });
    } else if (campo.tipo === 'booleano') {
      entrada = el('input', { id: id, type: 'checkbox', checked: !!valor });
    } else if (campo.tipo === 'texto') {
      entrada = el('input', { id: id, type: 'text', value: valor === null || valor === undefined ? '' : valor });
    } else if (campo.tipo === 'data') {
      entrada = el('input', { id: id, type: 'date', value: valor || '' });
    } else {
      var mostrado = valor === null || valor === undefined || valor === '' ? '' :
        (campo.tipo === 'percentagem' ? +(valor * 100).toFixed(6) : valor);
      entrada = el('input', {
        id: id, type: 'number', value: mostrado,
        step: campo.passo || (campo.tipo === 'inteiro' ? 1 : (campo.tipo === 'percentagem' ? 0.1 : 0.01)),
        min: campo.min, max: campo.max, inputmode: 'decimal'
      });
    }

    entrada.addEventListener('change', function () {
      var v;
      if (campo.tipo === 'booleano') v = entrada.checked;
      else if (campo.tipo === 'texto' || campo.tipo === 'data' || campo.tipo === 'opcoes') v = entrada.value;
      else if (entrada.value === '') v = campo.opcional === false ? 0 : null;
      else if (campo.tipo === 'percentagem') v = parseFloat(entrada.value) / 100;
      else if (campo.tipo === 'inteiro') v = parseInt(entrada.value, 10);
      else v = parseFloat(entrada.value);
      if (typeof v === 'number' && isNaN(v)) v = 0;
      if ((campo.tipo === 'euro' || campo.tipo === 'decimal' || campo.tipo === 'inteiro') && v === null &&
          campo.chave !== 'limiteDias' && campo.chave !== 'limiteDeducoesColeta') v = 0;
      definirValor(v);
      aoAlterar(campo);
    });

    var classe = 'campo' + (campo.largo ? ' campo--largo' : '') + (campo.tipo === 'booleano' ? ' campo--interruptor' : '');
    var etiqueta = el('label', { for: id, texto: campo.rotulo });
    var filhos = campo.tipo === 'booleano' ? [entrada, etiqueta] : [etiqueta, entrada];
    if (campo.ajuda) filhos.push(el('p', { class: 'ajuda', texto: campo.ajuda }));
    return el('div', { class: classe }, filhos);
  }

  function renderFormulario(alvo, campos, obter, definir, contexto) {
    var no = $(alvo);
    no.innerHTML = '';
    campos.forEach(function (campo) {
      if (campo.visivel && !campo.visivel(contexto)) return;
      no.appendChild(criarCampo(campo,
        function () { return obter(campo); },
        function (v) { definir(campo, v); }));
    });
  }

  function aoAlterar(campo) {
    Estado.guardar(dados);
    if (campo && campo.chave === 'tributacao') renderSocios();
    if (campo && (campo.chave === 'exercicio')) renderEscaloes();
    if (campo && campo.chave === 'participacao') atualizarSomaParticipacoes();
    if (ecraAtual === 1) verificarCoerencia();
    if (ecraAtual === 4) simular();
  }

  /* ================================================================== *
   * Ecrã 1
   * ================================================================== */

  function renderSociedade() {
    renderFormulario('#form-sociedade', CAMPOS_SOCIEDADE,
      function (c) { return dados.sociedade[c.chave]; },
      function (c, v) { dados.sociedade[c.chave] = v; },
      dados.sociedade);
    verificarCoerencia();
  }

  function verificarCoerencia() {
    var s = dados.sociedade;
    var lista = $('#coerencia-sociedade');
    if (!lista) return;
    var notas = [];
    var teorica = F.numeroBruto(s.resultadoContabilistico) + F.numeroBruto(s.correcoesFiscais);
    var mc = F.numeroBruto(s.materiaColetavel);

    if (mc > 0 && Math.abs(teorica - mc) > 1) {
      notas.push({ classe: 'erro', texto: 'Resultado contabilístico + correções = ' + F.euro(teorica) +
        ', diferença de ' + F.euro(mc - teorica) + ' face à matéria coletável introduzida. Justificável por prejuízos fiscais reportados ou benefícios.' });
    } else if (mc > 0) {
      notas.push({ classe: 'ok', texto: 'Matéria coletável coerente com o resultado e as correções fiscais.' });
    } else {
      notas.push({ classe: '', texto: 'Introduza a matéria coletável para iniciar a simulação.' });
    }

    var totalIRC = F.numeroBruto(s.ircLiquidado) + F.numeroBruto(s.derramaMunicipal) +
      F.numeroBruto(s.derramaEstadual) + F.numeroBruto(s.tributacoesAutonomas);
    var saldo = totalIRC - F.numeroBruto(s.pagamentosPorConta) - F.numeroBruto(s.retencoes);
    notas.push({ classe: '', texto: 'Imposto total suportado pela sociedade: ' + F.euro(totalIRC) +
      '. Saldo apurado após pagamentos por conta e retenções: ' + F.euro(saldo) + '.' });

    if (mc > 0 && F.numeroBruto(s.ircLiquidado) > 0) {
      notas.push({ classe: '', texto: 'Taxa efetiva de IRC sobre a matéria coletável: ' +
        F.percentagem(totalIRC / mc, 2) + '.' });
    }

    lista.innerHTML = '';
    notas.forEach(function (n) { lista.appendChild(el('li', { class: n.classe, texto: n.texto })); });
  }

  /* ================================================================== *
   * Ecrã 2
   * ================================================================== */

  function renderSocios() {
    var alvo = $('#lista-socios');
    alvo.innerHTML = '';
    dados.socios.forEach(function (socio, indice) {
      var cartao = el('div', { class: 'cartao socio' });
      var cabeca = el('div', { class: 'socio__cabeca' }, [
        el('div', {}, [
          el('div', { class: 'socio__titulo', texto: socio.nome || ('Sócio ' + (indice + 1)) }),
          el('div', { class: 'socio__quota', texto: F.percentagemDireta(socio.participacao) + ' do capital' })
        ]),
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno btn--perigo', texto: 'Remover',
          onclick: function () {
            dados.socios.splice(indice, 1);
            if (!dados.socios.length) dados.socios.push(Estado.socioVazio(1));
            Estado.guardar(dados); renderSocios();
          }
        })
      ]);
      var grelha = el('div', { class: 'grelha' });
      CAMPOS_SOCIO.forEach(function (campo) {
        if (campo.visivel && !campo.visivel(socio)) return;
        grelha.appendChild(criarCampo(campo,
          function () { return socio[campo.chave]; },
          function (v) {
            socio[campo.chave] = v;
            if (campo.chave === 'nome') $('.socio__titulo', cartao).textContent = v || ('Sócio ' + (indice + 1));
            if (campo.chave === 'participacao') $('.socio__quota', cartao).textContent = F.percentagemDireta(v) + ' do capital';
          }));
      });
      cartao.appendChild(cabeca);
      cartao.appendChild(grelha);
      alvo.appendChild(cartao);
    });
    atualizarSomaParticipacoes();
  }

  function atualizarSomaParticipacoes() {
    var soma = dados.socios.reduce(function (a, s) { return a + F.numeroBruto(s.participacao); }, 0);
    var no = $('#soma-participacoes');
    if (!no) return;
    var ok = Math.abs(soma - 100) < 0.01;
    no.className = 'barra-socios__soma ' + (ok ? 'ok' : 'erro');
    no.textContent = 'Soma das participações: ' + F.percentagemDireta(soma) +
      (ok ? ' ✓' : ' — deve totalizar 100%');
  }

  /* ================================================================== *
   * Ecrã 3
   * ================================================================== */

  function renderParametros() {
    var obter = valorEfetivo;
    var definir = definirParametro;
    renderFormulario('#form-cenario', CAMPOS_CENARIO, obter, definir);
    renderFormulario('#form-juros', CAMPOS_JUROS, obter, definir);
    renderFormulario('#form-coimas', CAMPOS_COIMAS, obter, definir);
    renderFormulario('#form-irs', CAMPOS_IRS, obter, definir);
    renderFormulario('#form-recuperacao', CAMPOS_RECUPERACAO, obter, definir);
    renderEscaloes();
  }

  function tabelaEscaloesAtual() {
    var ano = F.numeroBruto(dados.sociedade.exercicio);
    var p = Motor.mesclarParametros(dados.parametros);
    return { ano: ano, tabela: Parametros.tabelaDoExercicio(p, ano) };
  }

  function renderEscaloes() {
    var alvo = $('#tabela-escaloes');
    if (!alvo) return;
    var info = tabelaEscaloesAtual();
    $('#rotulo-ano-escaloes').textContent = info.ano;
    $('#fonte-escaloes').textContent = info.tabela.fonte +
      (info.tabela.estado === 'provisorio' ? ' ⚠ Tabela provisória: confirme antes de emitir o relatório.' : '');

    var corpo = $('tbody', alvo);
    corpo.innerHTML = '';
    info.tabela.escaloes.forEach(function (esc, i) {
      var linha = el('tr', {}, [
        el('td', { texto: (i + 1) + '.º' }),
        el('td', {}, [el('input', {
          type: 'number', step: '1', value: esc.limite === null ? '' : esc.limite, placeholder: 'sem limite',
          onchange: function (ev) {
            escalaoEditado(info.ano, i, 'limite', ev.target.value === '' ? null : parseFloat(ev.target.value));
          }
        })]),
        el('td', {}, [el('input', {
          type: 'number', step: '0.01', value: +(esc.taxa * 100).toFixed(4),
          onchange: function (ev) { escalaoEditado(info.ano, i, 'taxa', parseFloat(ev.target.value) / 100); }
        })]),
        el('td', {}, [el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno btn--perigo', texto: '×',
          onclick: function () { removerEscalao(info.ano, i); }
        })])
      ]);
      corpo.appendChild(linha);
    });
  }

  function garantirTabelaEditavel(ano) {
    if (!dados.parametros.escaloesIRS) dados.parametros.escaloesIRS = {};
    if (!dados.parametros.escaloesIRS[ano]) {
      var info = tabelaEscaloesAtual();
      dados.parametros.escaloesIRS[ano] = {
        estado: 'personalizado',
        fonte: 'Tabela editada pelo utilizador. Origem: ' + info.tabela.fonte,
        escaloes: JSON.parse(JSON.stringify(info.tabela.escaloes))
      };
    }
    return dados.parametros.escaloesIRS[ano];
  }

  function escalaoEditado(ano, indice, chave, valor) {
    var t = garantirTabelaEditavel(ano);
    t.escaloes[indice][chave] = valor;
    Estado.guardar(dados);
    renderEscaloes();
  }

  function removerEscalao(ano, indice) {
    var t = garantirTabelaEditavel(ano);
    if (t.escaloes.length <= 1) return;
    t.escaloes.splice(indice, 1);
    Estado.guardar(dados);
    renderEscaloes();
  }

  /* ================================================================== *
   * Ecrã 4 - resultados
   * ================================================================== */

  function simular() {
    try {
      resultado = Motor.simular(dados);
    } catch (erro) {
      $('#avisos').innerHTML = '';
      $('#avisos').appendChild(el('div', { class: 'aviso-caixa aviso-caixa--erro', texto: 'Não foi possível simular: ' + erro.message }));
      return;
    }
    window.__resultado = resultado;
    renderAvisos();
    renderKPIs();
    renderComparador();
    renderTabelaSocios();
    renderTimeline();
    renderCenariosCoima();
    renderCenariosIRC();
    renderMatriz();
    renderMemoria();
  }

  function renderAvisos() {
    var alvo = $('#avisos');
    alvo.innerHTML = '';
    resultado.avisos.forEach(function (a) {
      alvo.appendChild(el('div', { class: 'aviso-caixa aviso-caixa--' + a.nivel, texto: a.texto }));
    });
  }

  function kpi(rotulo, valor, nota, modificador) {
    return el('div', { class: 'kpi' + (modificador ? ' kpi--' + modificador : '') }, [
      el('div', { class: 'kpi__rotulo', texto: rotulo }),
      el('div', { class: 'kpi__valor', texto: F.euro(valor) }),
      el('div', { class: 'kpi__nota', texto: nota })
    ]);
  }

  function renderKPIs() {
    var i = resultado.indicadores;
    var alvo = $('#cartoes-financeiros');
    alvo.innerHTML = '';
    alvo.appendChild(kpi('Exposição fiscal líquida', i.exposicaoLiquida,
      'IRS adicional + juros + coima − IRC recuperado', 'destaque'));
    alvo.appendChild(kpi('IRS adicional', i.irsAdicional,
      'Imputação de ' + F.euro(resultado.atual.irc.materiaColetavel) + ' a ' + resultado.socios.length + ' sócio(s)'));
    alvo.appendChild(kpi('Juros compensatórios', i.juros,
      resultado.juros.dias + ' dias à taxa de ' + F.percentagem(resultado.juros.taxaAnual, 2) + ' ao ano'));
    alvo.appendChild(kpi('Coimas', i.coimas, resultado.coimas.provavel.rotulo));
    alvo.appendChild(kpi('IRC recuperável', i.ircRecuperavel,
      resultado.recuperacaoIRC.cenarios[resultado.recuperacaoIRC.cenarioSelecionado].rotulo, 'positivo'));
  }

  function renderComparador() {
    var corpo = $('#tabela-comparador tbody');
    corpo.innerHTML = '';
    resultado.comparador.forEach(function (l, i) {
      var ultima = i === resultado.comparador.length - 1;
      corpo.appendChild(el('tr', { class: ultima ? 'destaque' : '' }, [
        el('td', { texto: l.indicador }),
        el('td', { texto: F.euro(l.atual) }),
        el('td', { texto: F.euro(l.corrigido) }),
        el('td', { class: l.variacao > 0 ? 'subiu' : (l.variacao < 0 ? 'desceu' : ''),
          texto: (l.variacao > 0 ? '+' : '') + F.euro(l.variacao) })
      ]));
    });
  }

  function renderTabelaSocios() {
    var corpo = $('#tabela-socios tbody');
    corpo.innerHTML = '';
    resultado.socios.forEach(function (s) {
      corpo.appendChild(el('tr', {}, [
        el('td', { texto: s.nome }),
        el('td', { texto: F.percentagemDireta(s.participacao) }),
        el('td', { texto: F.euro(s.imputacao) }),
        el('td', { texto: F.euro(s.irsAtual) }),
        el('td', { texto: F.euro(s.irsCorrigido) }),
        el('td', { class: 'subiu', texto: F.euro(s.irsAdicional) }),
        el('td', { texto: F.percentagem(s.taxaMarginalAtual, 2) + ' → ' + F.percentagem(s.taxaMarginalCorrigida, 2) })
      ]));
    });

    var barras = $('#barras-socios');
    barras.innerHTML = '';
    var maximo = Math.max.apply(null, resultado.socios.map(function (s) { return s.irsAdicional; }).concat([1]));
    resultado.socios.forEach(function (s) {
      barras.appendChild(el('div', { class: 'barra' }, [
        el('span', { texto: s.nome }),
        el('div', { class: 'barra__trilho' }, [
          el('div', { class: 'barra__preenchido', style: 'width:' + Math.max(2, (s.irsAdicional / maximo) * 100) + '%' })
        ]),
        el('span', { class: 'barra__valor', texto: F.euro(s.irsAdicional) })
      ]));
    });
  }

  function renderTimeline() {
    var alvo = $('#timeline');
    alvo.innerHTML = '';
    resultado.timeline.forEach(function (e) {
      alvo.appendChild(el('li', { class: (e.passado ? 'passado ' : '') + e.tipo }, [
        el('div', { class: 'timeline__data', texto: F.data(e.data) }),
        el('div', { class: 'timeline__titulo', texto: e.titulo }),
        el('div', { class: 'timeline__texto', texto: e.descricao })
      ]));
    });
  }

  function renderCenariosCoima() {
    var alvo = $('#cenarios-coima');
    alvo.innerHTML = '';
    ['minimo', 'provavel', 'maximo'].forEach(function (chave) {
      var c = resultado.coimas[chave];
      alvo.appendChild(el('div', { class: 'cenario' + (chave === 'provavel' ? ' selecionado' : '') }, [
        el('div', {}, [
          el('div', { class: 'cenario__rotulo', texto: rotuloCenario(chave) + ' · ' + c.rotulo }),
          el('div', { class: 'cenario__fundamento', texto: c.fundamento })
        ]),
        el('div', { class: 'cenario__valor', texto: F.euro(c.valor) })
      ]));
    });
  }

  function rotuloCenario(chave) {
    return { minimo: 'Mínimo', provavel: 'Provável', maximo: 'Máximo' }[chave] || chave;
  }

  function renderCenariosIRC() {
    var alvo = $('#cenarios-irc');
    alvo.innerHTML = '';
    var r = resultado.recuperacaoIRC;
    alvo.appendChild(el('p', { class: 'ajuda', texto: 'Base recuperável: ' + F.euro(r.base) +
      ' (coleta de IRC e derramas efetivamente pagas). As tributações autónomas mantêm-se devidas pela sociedade transparente.' }));
    ['integral', 'parcial', 'inexistente'].forEach(function (chave) {
      var c = r.cenarios[chave];
      alvo.appendChild(el('div', { class: 'cenario' + (chave === r.cenarioSelecionado ? ' selecionado' : '') }, [
        el('div', {}, [
          el('div', { class: 'cenario__rotulo', texto: c.rotulo }),
          el('div', { class: 'cenario__fundamento', texto: fundamentoIRC(chave) })
        ]),
        el('div', { class: 'cenario__valor', texto: F.euro(c.valor) })
      ]));
    });
  }

  function fundamentoIRC(chave) {
    return {
      integral: 'Revisão oficiosa deferida dentro do prazo do artigo 78.º da LGT, com anulação total do IRC liquidado.',
      parcial: 'Deferimento parcial, compensação apenas de parte do imposto, ou perda de exercícios já fora de prazo.',
      inexistente: 'Prazo de revisão esgotado ou indeferimento. O IRC pago não é recuperado e acresce integralmente ao custo.'
    }[chave];
  }

  function renderMatriz() {
    var corpo = $('#tabela-matriz tbody');
    corpo.innerHTML = '';
    var todos = [];
    resultado.matrizSensibilidade.forEach(function (l) { l.valores.forEach(function (v) { todos.push(v.valor); }); });
    var pior = Math.max.apply(null, todos);
    var melhor = Math.min.apply(null, todos);
    resultado.matrizSensibilidade.forEach(function (linha) {
      var celulas = [el('td', { texto: 'Coima ' + ({ minimo: 'mínima', provavel: 'provável', maximo: 'máxima' })[linha.coima] })];
      linha.valores.forEach(function (v) {
        celulas.push(el('td', {
          class: v.valor === pior ? 'celula-pior' : (v.valor === melhor ? 'celula-melhor' : ''),
          texto: F.euro(v.valor)
        }));
      });
      corpo.appendChild(el('tr', {}, celulas));
    });
  }

  function renderMemoria() {
    var alvo = $('#memoria-calculo');
    alvo.innerHTML = '';
    var r = resultado;

    alvo.appendChild(detalhe('Cenário atual — sociedade tributada em IRC', [
      linhaMemoria('Matéria coletável', r.atual.irc.materiaColetavel),
      linhaMemoria('IRC liquidado', r.atual.irc.coleta),
      linhaMemoria('Derrama municipal', r.atual.irc.derramaMunicipal),
      linhaMemoria('Derrama estadual', r.atual.irc.derramaEstadual),
      linhaMemoria('Tributações autónomas', r.atual.irc.tributacoesAutonomas),
      linhaMemoria('Total devido pela sociedade', r.atual.irc.totalDevido, true),
      linhaMemoria('IRS dos sócios sem imputação', r.atual.irsTotal)
    ]));

    alvo.appendChild(detalhe('Cenário corrigido — imputação aos sócios', r.corrigido.socios.map(function (s) {
      return linhaMemoria(s.nome + ' — imputação ' + F.percentagemDireta(s.participacao) +
        ', rendimento coletável ' + F.euro(s.liquidacao.rendimentoColetavel) +
        ', coleta ' + F.euro(s.liquidacao.coletaTotal) +
        (s.liquidacao.taxaAdicionalSolidariedade > 0 ? ' (inclui solidariedade ' + F.euro(s.liquidacao.taxaAdicionalSolidariedade) + ')' : '') +
        ', deduções ' + F.euro(s.liquidacao.deducoesColeta), s.irs);
    }).concat([linhaMemoria('IRS total no cenário corrigido', r.corrigido.irsTotal, true)])));

    alvo.appendChild(detalhe('Juros compensatórios', [
      linhaMemoria('Base (IRS adicional)', r.juros.base),
      linhaMemoria('Período: ' + F.data(r.juros.dataInicio) + ' a ' + F.data(r.juros.dataFim) +
        ' (' + r.juros.dias + ' dias' + (r.juros.limiteAplicado ? ', teto aplicado' : '') + ')', null),
      linhaMemoria('Cálculo: ' + F.euro(r.juros.base) + ' × ' + F.percentagem(r.juros.taxaAnual, 2) +
        ' × ' + r.juros.dias + '/' + r.parametros.juros.baseDias, r.juros.montante, true)
    ]));

    alvo.appendChild(detalhe('Composição da exposição', [
      linhaMemoria('IRS adicional bruto', r.indicadores.irsAdicionalBruto),
      linhaMemoria('Crédito por IRS já pago sobre distribuições', -r.indicadores.creditoDistribuicoes),
      linhaMemoria('Juros compensatórios', r.indicadores.juros),
      linhaMemoria('Coima (cenário provável)', r.indicadores.coimas),
      linhaMemoria('IRC recuperado', -r.indicadores.ircRecuperavel),
      linhaMemoria('Exposição fiscal líquida', r.indicadores.exposicaoLiquida, true)
    ]));
  }

  function detalhe(titulo, linhas) {
    var tabela = el('table', { class: 'tabela' }, [el('tbody', {}, linhas)]);
    return el('details', { class: 'memoria' }, [el('summary', { texto: titulo }), tabela]);
  }

  function linhaMemoria(rotulo, valor, forte) {
    return el('tr', { class: forte ? 'destaque' : '' }, [
      el('td', { texto: rotulo }),
      el('td', { texto: valor === null || valor === undefined ? '' : F.euro(valor) })
    ]);
  }

  /* ================================================================== *
   * Navegação e ações
   * ================================================================== */

  function irPara(n) {
    ecraAtual = n;
    $$('.ecra').forEach(function (s) { s.hidden = s.id !== 'ecra-' + n; });
    $$('.passo').forEach(function (b) { b.setAttribute('aria-current', b.dataset.ecra === String(n)); });
    if (n === 2) renderSocios();
    if (n === 3) renderParametros();
    if (n === 4) simular();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function descarregar(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function nomeFicheiro(extensao) {
    var base = (dados.sociedade.designacao || 'simulacao').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return 'transparencia-fiscal-' + base + '-' + dados.sociedade.exercicio + '.' + extensao;
  }

  var ACOES = {
    exemplo: function () {
      dados = Estado.exemplo();
      Estado.guardar(dados);
      renderTudo();
      irPara(1);
    },
    limpar: function () {
      if (!confirm('Limpar todos os dados introduzidos?')) return;
      Estado.apagar();
      dados = Estado.novo();
      renderTudo();
      irPara(1);
    },
    guardar: function () { descarregar(nomeFicheiro('json'), JSON.stringify(dados, null, 2), 'application/json'); },
    'exportar-json': function () {
      descarregar(nomeFicheiro('resultado.json'), JSON.stringify({ dados: dados, resultado: resultado }, null, 2), 'application/json');
    },
    'adicionar-socio': function () {
      dados.socios.push(Estado.socioVazio(dados.socios.length + 1));
      Estado.guardar(dados);
      renderSocios();
    },
    'adicionar-escalao': function () {
      var info = tabelaEscaloesAtual();
      var t = garantirTabelaEditavel(info.ano);
      t.escaloes.push({ limite: null, taxa: 0.48 });
      Estado.guardar(dados);
      renderEscaloes();
    },
    'repor-escaloes': function () {
      var ano = F.numeroBruto(dados.sociedade.exercicio);
      if (dados.parametros.escaloesIRS) delete dados.parametros.escaloesIRS[ano];
      Estado.guardar(dados);
      renderEscaloes();
    },
    relatorio: function () {
      if (!resultado) simular();
      window.Relatorio.abrir(dados, resultado);
    }
  };

  function renderTudo() {
    renderSociedade();
    renderSocios();
    renderParametros();
  }

  function iniciar() {
    document.addEventListener('click', function (ev) {
      var alvoAcao = ev.target.closest('[data-acao]');
      if (alvoAcao && ACOES[alvoAcao.dataset.acao]) { ACOES[alvoAcao.dataset.acao](); return; }
      var alvoIr = ev.target.closest('[data-ir]');
      if (alvoIr) { irPara(Number(alvoIr.dataset.ir)); return; }
      var passo = ev.target.closest('.passo');
      if (passo) irPara(Number(passo.dataset.ecra));
    });

    $('#ficheiro').addEventListener('change', function (ev) {
      var ficheiro = ev.target.files && ev.target.files[0];
      if (!ficheiro) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try {
          var lido = JSON.parse(leitor.result);
          dados = Estado.normalizar(lido.dados ? lido.dados : lido);
          Estado.guardar(dados);
          renderTudo();
          irPara(1);
        } catch (e) {
          alert('Ficheiro inválido: ' + e.message);
        }
      };
      leitor.readAsText(ficheiro);
      ev.target.value = '';
    });

    renderTudo();
    irPara(1);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
