/**
 * relatorio.js - geração do relatório imprimível (PDF via impressão do navegador).
 * Estrutura: resumo executivo, fundamentação jurídica, simulação financeira,
 * recomendações e plano de regularização.
 */
(function (raiz) {
  'use strict';
  var F = raiz.Formato;

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Identidade VC Level aplicada ao documento formal: Lora, a "alternativa
     executiva" do brandbook, com Deep Forest Green e Champagne Gold. */
  function estilo() {
    return [
      '@import url("https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Montserrat:wght@500;600;700&display=swap");',
      '@page { size: A4; margin: 18mm 16mm; }',
      'body { font: 11pt/1.55 "Lora", Georgia, "Times New Roman", serif; color: #14201b; margin: 0; }',
      'h1, h2, h3, .marca-nome, thead th { font-family: "Montserrat", "Segoe UI", sans-serif; }',
      'h1 { font-size: 18pt; font-weight: 600; margin: 0 0 .2em; letter-spacing: -.01em; }',
      'h2 { font-size: 12.5pt; font-weight: 600; margin: 1.6em 0 .5em; padding-bottom: .25em; border-bottom: 1.5px solid #9f8e6a; color: #0c271f; page-break-after: avoid; }',
      'h3 { font-size: 11pt; font-weight: 600; margin: 1.1em 0 .3em; color: #0c271f; page-break-after: avoid; }',
      'p, li { margin: 0 0 .55em; text-align: justify; }',
      '.capa { border-bottom: 2px solid #0c271f; padding-bottom: 1em; margin-bottom: 1.4em; }',
      '.capa .sub { color: #3f5349; font-size: 10pt; }',
      '.marca { display: flex; align-items: center; gap: .7em; margin-bottom: 1.2em; }',
      '.marca-nome { font-size: 8.5pt; font-weight: 600; letter-spacing: .3em; color: #9f8e6a; }',
      '.meta { font-size: 9pt; color: #6e7c72; margin-top: .6em; }',
      '.destaque-caixa { background: #f2f4f1; border-left: 4px solid #9f8e6a; padding: .8em 1em; margin: 1em 0; page-break-inside: avoid; }',
      '.numero-grande { font-family: "Montserrat", sans-serif; font-size: 22pt; font-weight: 700; color: #8f3b22; display: block; line-height: 1.1; }',
      'table { width: 100%; border-collapse: collapse; margin: .6em 0 1em; font-size: 9.5pt; page-break-inside: avoid; }',
      'th, td { border-bottom: 1px solid #dee3dd; padding: .38em .5em; text-align: right; }',
      'th:first-child, td:first-child { text-align: left; }',
      'thead th { background: #f2f4f1; border-bottom: 1.5px solid #0c271f; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #0c271f; }',
      'tr.total td { font-weight: bold; background: #f7f8f6; }',
      'td.celula-texto { text-align: left; }',
      '.nota { font-size: 8.5pt; color: #3f5349; }',
      '.legal { font-size: 9.5pt; color: #24302a; }',
      '.legal dt { font-weight: 700; margin-top: .5em; }',
      '.legal dd { margin: 0 0 .4em; }',
      '.aviso { border-left: 3px solid #8f3b22; background: #f8ece6; color: #6d2c18; padding: .6em .8em; margin: .5em 0; font-size: 9.5pt; }',
      '.rodape-doc { margin-top: 2em; padding-top: .7em; border-top: 1px solid #dee3dd; font-size: 8.5pt; color: #6e7c72; }',
      '.assinatura { font-family: "Montserrat", sans-serif; font-size: 8pt; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #9f8e6a; margin-top: .8em; }',
      'ol.plano li { margin-bottom: .5em; }',
      '.quebra { page-break-before: always; }',
      '@media print { .barra-imprimir { display: none !important; } }',
      '.barra-imprimir { position: fixed; top: 0; left: 0; right: 0; background: #0c271f; color: #f2f2f2; padding: .6em 1em; font-family: "Montserrat", system-ui, sans-serif; font-size: 10pt; display: flex; gap: 1em; align-items: center; justify-content: space-between; z-index: 9; }',
      '.barra-imprimir button { font: inherit; font-weight: 600; padding: .35em .9em; border-radius: 6px; border: 0; cursor: pointer; background: #9f8e6a; color: #0c271f; }',
      '.corpo { margin-top: 3.2em; }',
      '@media print { .corpo { margin-top: 0; } }'
    ].join('\n');
  }

  function marca() {
    return '<div class="marca"><span class="marca-nome">VC LEVEL</span></div>';
  }

  function tabela(cabecalhos, linhas) {
    var th = cabecalhos.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
    var tr = linhas.map(function (l) {
      var classe = l.total ? ' class="total"' : '';
      var celulas = (l.celulas || l).map(function (c) {
        if (c && typeof c === 'object' && c.html !== undefined) return '<td class="celula-texto">' + c.html + '</td>';
        return '<td>' + esc(c) + '</td>';
      }).join('');
      return '<tr' + classe + '>' + celulas + '</tr>';
    }).join('');
    return '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>';
  }

  /** Quadro consolidado: só aparece quando a análise abrange vários anos. */
  function consolidadoSeccao(c) {
    if (!c || !c.exercicios || c.exercicios.length < 2) return '';
    var t = c.totais;
    var linhas = c.exercicios.map(function (x) {
      return {
        celulas: [
          String(x.exercicio) + (x.caducado ? ' (caducado)' : ''),
          (x.favoravel ? '−' : '') + F.euro(Math.abs(x.exposicaoLiquida)),
          F.data(x.caducidade),
          x.caducado ? '—' : x.diasAteCaducidade + ' dias',
          x.confianca + '%'
        ]
      };
    }).concat([{
      celulas: ['Total dos exercícios dentro do prazo', F.euro(t.exposicaoLiquida), '', '', t.confiancaMinima + '%'],
      total: true
    }]);

    return [
      '<h2>1. Exposição consolidada</h2>',
      '<div class="destaque-caixa">',
      '<span class="numero-grande">' + esc(F.euro(t.exposicaoLiquida)) + '</span>',
      '<strong>Exposição consolidada</strong> de ' + esc(t.abertos) + ' exercício(s) dentro do prazo de caducidade, ',
      'num total de ' + esc(t.exercicios) + ' analisado(s).',
      '</div>',
      tabela(['Exercício', 'Exposição líquida', 'Caducidade', 'Prazo restante', 'Confiança'], linhas),
      '<p>Ordem de tratamento pelo prazo e não pelo montante: <strong>' + esc(c.ordemUrgencia.join(' → ')) +
      '</strong>. Um exercício cujo prazo termine deixa de ser recuperável e deixa de ser exigível, ' +
      'pelo que a decisão sobre ele não se adia.</p>',
      c.avisos.map(function (a) {
        return a.nivel === 'erro' ? '<div class="aviso">' + esc(a.texto) + '</div>'
          : '<p class="nota">' + esc(a.texto) + '</p>';
      }).join('')
    ].join('\n');
  }

  /** Custo de esperar: a secção que transforma o relatório numa decisão. */
  function esperaSeccao(e) {
    if (!e || !e.pontos || e.pontos.length < 2) return '';
    var linhas = e.pontos.map(function (p) {
      var nota = [];
      if (p.jurosAcrescidos > 0) nota.push('juros +' + F.euro(p.jurosAcrescidos));
      if (p.perdidos.length) nota.push('sai do prazo ' + p.perdidos.join(', '));
      return {
        celulas: [
          { html: '<strong>' + esc(p.anos === 0 ? 'Regularizar hoje' : '+' + p.anos + (p.anos === 1 ? ' ano' : ' anos')) +
            '</strong><br><span class="nota">' + esc(F.data(p.data)) + (nota.length ? ' · ' + esc(nota.join(' · ')) : '') + '</span>' },
          F.euro(p.exposicao),
          p.anos === 0 ? '—' : (p.variacao > 0 ? '+' : '') + F.euro(p.variacao)
        ],
        total: p.anos === 0
      };
    });

    return [
      '<h2>5. Custo de esperar</h2>',
      tabela(['Momento da regularização', 'Exposição líquida', 'Variação'], linhas),
      e.haCaducidades
        ? '<div class="aviso">' + esc(e.ressalva) + '</div>' +
          '<p>IRC que deixa de ser recuperável no horizonte de ' +
          esc(e.pontos[e.pontos.length - 1].anos) + ' anos: <strong>' +
          esc(F.euro(e.ircPerdidoNoHorizonte)) + '</strong>.</p>'
        : '<p>Cada mês de espera acrescenta em média <strong>' + esc(F.euro(e.custoMensalPrimeiroAno)) +
          '</strong> no primeiro ano, apenas em juros compensatórios.</p>'
    ].join('\n');
  }

  function resumoExecutivo(d, r) {
    var i = r.indicadores;
    var nome = d.sociedade.designacao || 'a sociedade';
    return [
      '<h2>2. Resumo executivo</h2>',
      '<div class="destaque-caixa">',
      '<span class="numero-grande">' + esc(F.euro(i.exposicaoLiquida)) + '</span>',
      '<strong>Exposição fiscal líquida estimada</strong> para o exercício de ' + esc(r.meta.exercicio) +
      ', no cenário de coima de referência e com ' +
      esc(r.recuperacaoIRC.cenarios[r.recuperacaoIRC.cenarioSelecionado].rotulo.toLowerCase()) + ' do IRC.',
      '</div>',
      '<p>Caso a Autoridade Tributária conclua que ' + esc(nome) + ' preenchia os pressupostos do artigo 6.º do Código do IRC ' +
      'no exercício de ' + esc(r.meta.exercicio) + ', a matéria coletável de ' + esc(F.euro(r.atual.irc.materiaColetavel)) +
      ' deixa de ser tributada em sede de IRC e passa a ser imputada aos sócios, sendo englobada no respetivo IRS.</p>',
      '<p>O efeito financeiro decompõe-se em quatro parcelas: o IRS adicional estimado de ' + esc(F.euro(i.irsAdicional)) +
      ', os juros compensatórios de ' + esc(F.euro(i.juros)) + ' correspondentes a ' + esc(r.juros.dias) + ' dias de mora, ' +
      'a coima estimada de ' + esc(F.euro(i.coimas)) + ' e o IRC potencialmente recuperável de ' + esc(F.euro(i.ircRecuperavel)) +
      ', este último a abater ao custo total.</p>',
      tabela(['Indicador', 'Montante'], [
        ['IRS adicional estimado dos sócios', F.euro(i.irsAdicional)],
        ['Juros compensatórios', F.euro(i.juros)]
      ].concat(i.mora > 0 ? [['Juros de mora', F.euro(i.mora)]] : []).concat([
        ['Coimas (cenário de referência)', F.euro(i.coimas)],
        { celulas: ['Exposição bruta', F.euro(i.exposicaoBruta)], total: true },
        ['IRC potencialmente recuperável', '−' + F.euro(i.ircRecuperavel)],
        { celulas: ['Exposição fiscal líquida', F.euro(i.exposicaoLiquida)], total: true }
      ])),
      confianca(r),
      r.avisos.filter(function (a) { return a.nivel === 'erro'; })
        .map(function (a) { return '<div class="aviso">' + esc(a.texto) + '</div>'; }).join('')
    ].join('\n');
  }

  function confianca(r) {
    var q = r.qualidade;
    var itens = q.itens.map(function (i) {
      var marca = { ok: '&#10003;', aviso: '!', falta: '&#10007;' }[i.estado];
      return '<li><strong>' + marca + ' ' + esc(i.rotulo) + '.</strong> ' + esc(i.texto) + '</li>';
    }).join('');
    return '<h3>Confiança da simulação: ' + esc(q.grau) + ' (' + esc(q.indice) + '%)</h3>' +
      '<ul class="legal">' + itens + '</ul>' +
      '<div class="aviso">Estimativa de impacto marginal. Não é uma liquidação de imposto nem uma ' +
      'previsão da posição da Autoridade Tributária. Regras fiscais versão ' + esc(r.meta.regras.versao) +
      ', de ' + esc(F.data(r.meta.regras.atualizadoEm)) + '.</div>';
  }

  function fundamentacao(r) {
    return [
      '<h2>3. Fundamentação jurídica</h2>',
      '<p>A presente simulação parte do pressuposto, previamente verificado, de que a sociedade se enquadra ' +
      'no regime de transparência fiscal. Não é objeto deste relatório determinar se esse enquadramento existe, ' +
      'mas apenas quantificar as consequências financeiras da sua aplicação.</p>',
      '<dl class="legal">',
      '<dt>Artigo 6.º do CIRC — Transparência fiscal</dt>',
      '<dd>Imputa aos sócios a matéria coletável das sociedades de profissionais, ainda que não haja distribuição de lucros. ' +
      'A sociedade deixa de ser tributada em IRC sobre essa matéria coletável.</dd>',
      '<dt>Artigo 12.º do CIRC — Sociedades abrangidas pelo regime de transparência fiscal</dt>',
      '<dd>As sociedades transparentes não são tributadas em IRC, salvo quanto às tributações autónomas. ' +
      'Por isso o montante de ' + esc(F.euro(r.corrigido.irc.tributacoesAutonomas)) + ' se mantém devido no cenário corrigido.</dd>',
      '<dt>Artigo 20.º do CIRS — Imputação especial</dt>',
      '<dd>A matéria coletável imputada integra-se como rendimento líquido da categoria B na declaração de cada sócio, ' +
      'sendo objeto de englobamento e sujeita às taxas gerais do artigo 68.º do CIRS.</dd>',
      '<dt>Artigo 68.º e 68.º-A do CIRS — Taxas gerais e taxa adicional de solidariedade</dt>',
      '<dd>Tabela aplicada: ' + esc(r.meta.tabelaIRS.fonte) + '</dd>',
      '<dt>Artigo 35.º da LGT — Juros compensatórios</dt>',
      '<dd>São devidos quando, por facto imputável ao sujeito passivo, for retardada a liquidação de parte do imposto. ' +
      'O período de contagem depende da origem da correção: os juros contam-se dia a dia até ao suprimento, ' +
      'correção ou deteção da falta, mas são devidos apenas por 180 dias no caso de erro do sujeito passivo ' +
      'evidenciado na declaração e, em caso de falta apurada em ação de fiscalização, até 90 dias após a sua conclusão. ' +
      'Regime aplicado nesta simulação: <strong>' + esc(r.juros.regimeRotulo) + '</strong>. ' + esc(r.juros.regra) + ' ' +
      'Taxa de ' + esc(F.percentagem(r.juros.taxaAnual, 2)) + ' ao ano, de ' + esc(F.data(r.juros.dataInicio)) +
      ' a ' + esc(F.data(r.juros.dataFim)) + '.</dd>',
      '<dt>Artigo 44.º da LGT — Juros de mora</dt>',
      '<dd>Devidos quando o imposto liquidado não é pago no prazo de pagamento voluntário. ' +
      'Não se confundem com os compensatórios: estes correm até à liquidação, os de mora a partir dela. ' +
      'A contagem tem o limite de três anos, ou de oito quando a dívida é paga em prestações. ' +
      (r.mora.montante > 0
        ? 'Nesta simulação foram considerados ' + esc(r.mora.mesesContados) + ' meses de atraso à taxa de ' +
          esc(F.percentagem(r.mora.taxaAnual, 3)) + ', num total de ' + esc(F.euro(r.mora.montante)) + '.'
        : 'Nesta simulação assume-se pagamento dentro do prazo, pelo que não há juros de mora.') + '</dd>',
      '<dt>Artigos 114.º e 119.º do RGIT — Coimas</dt>',
      '<dd>Falta de entrega da prestação tributária e inexatidão das declarações. ' +
      'Redução por regularização voluntária nos termos dos artigos 29.º e 30.º do RGIT. ' +
      'A graduação concreta da coima depende da culpa, do benefício obtido e da situação económica do agente ' +
      '(artigo 27.º do RGIT), pelo que os valores apresentados são cenários de simulação e não previsões.</dd>',
      '<dt>Artigos 45.º e 78.º da LGT — Prazos</dt>',
      '<dd>Caducidade do direito à liquidação e revisão do ato tributário. O artigo 78.º prevê vias e prazos ' +
      'distintos consoante o fundamento invocado — iniciativa do sujeito passivo, erro imputável aos serviços, ' +
      'injustiça grave ou notória, duplicação de coleta — pelo que o IRC pago é <em>potencialmente</em> recuperável, ' +
      'sujeito à validação da via processual aplicável e dos respetivos prazos. Ver ainda o prazo de reclamação ' +
      'graciosa do artigo 70.º do CPPT.</dd>',
      '</dl>'
    ].join('\n');
  }

  function simulacaoFinanceira(d, r) {
    var comparador = tabela(['Indicador', 'Situação atual', 'Situação corrigida', 'Variação'],
      r.comparador.map(function (l, idx) {
        return {
          celulas: [l.indicador, F.euro(l.atual), F.euro(l.corrigido), (l.variacao > 0 ? '+' : '') + F.euro(l.variacao)],
          total: idx === r.comparador.length - 1
        };
      }));

    var socios = tabela(['Sócio', 'Participação', 'Imputação', 'IRS atual', 'IRS corrigido', 'IRS adicional estimado'],
      r.socios.map(function (s) {
        return [s.nome, F.percentagemDireta(s.participacao), F.euro(s.imputacao), F.euro(s.irsAtual), F.euro(s.irsCorrigido), F.euro(s.irsAdicional)];
      }).concat([{
        celulas: ['Total', F.percentagemDireta(r.socios.reduce(function (a, s) { return a + s.participacao; }, 0)),
          F.euro(r.atual.irc.materiaColetavel), F.euro(r.atual.irsTotal), F.euro(r.corrigido.irsTotal), F.euro(r.indicadores.irsAdicionalBruto)],
        total: true
      }]));

    var coimas = tabela(['Cenário e fundamento', 'Montante'], ['baixo', 'referencia', 'alto'].map(function (k) {
      var c = r.coimas[k];
      return [
        { html: '<strong>' + esc(c.rotulo) + '</strong><br><span class="nota">' + esc(c.fundamento) + '</span>' },
        F.euro(c.valor)
      ];
    }));

    var irc = tabela(['Cenário de recuperação do IRC', 'Percentagem', 'Montante'],
      ['integral', 'parcial', 'inexistente'].map(function (k) {
        var c = r.recuperacaoIRC.cenarios[k];
        return [c.rotulo + (k === r.recuperacaoIRC.cenarioSelecionado ? ' (selecionado)' : ''), F.percentagem(c.percentagem, 0), F.euro(c.valor)];
      }));

    var matriz = tabela(['Coima \\ IRC'].concat(['integral', 'parcial', 'inexistente'].map(function (k) {
      return r.recuperacaoIRC.cenarios[k].rotulo;
    })),
      r.matrizSensibilidade.map(function (l) {
        return ['Coima — cenário ' + { baixo: 'baixo', referencia: 'de referência', alto: 'alto' }[l.coima]]
          .concat(l.valores.map(function (v) { return F.euro(v.valor); }));
      }));

    var cronologia = '<ul>' + r.timeline.map(function (e) {
      return '<li><strong>' + esc(F.data(e.data)) + (e.aproximado ? ' (aproximada)' : '') + '</strong> — ' +
        esc(e.titulo) + '. ' + esc(e.descricao) +
        '<br><span class="nota">Regra aplicável: ' + esc(e.regra) + '</span></li>';
    }).join('') + '</ul>';

    return [
      '<h2 class="quebra">4. Simulação financeira</h2>',
      '<h3>4.1 Comparador entre a situação atual e a situação corrigida</h3>', comparador,
      '<h3>4.2 Impacto por sócio</h3>', socios,
      '<h3>4.3 Juros compensatórios</h3>',
      '<p>Regime aplicado: <strong>' + esc(r.juros.regimeRotulo) + '</strong>. ' + esc(r.juros.regra) + '</p>',
      '<p>Base de cálculo de ' + esc(F.euro(r.juros.base)) + ', à taxa anual de ' + esc(F.percentagem(r.juros.taxaAnual, 2)) +
      ', durante ' + esc(r.juros.dias) + ' dias' +
      (r.juros.limiteAplicado ? ' (de ' + esc(r.juros.diasDecorridos) + ' dias decorridos, por aplicação do limite legal)' : '') +
      ' (' + esc(F.data(r.juros.dataInicio)) + ' a ' + esc(F.data(r.juros.dataFim)) +
      '), num total de <strong>' + esc(F.euro(r.juros.montante)) + '</strong>.</p>',
      (r.juros.notas || []).map(function (n) { return '<div class="aviso">' + esc(n) + '</div>'; }).join(''),
      (r.mora.montante > 0
        ? '<h3>4.3-A Juros de mora</h3><p>' + esc(r.mora.regra) + ' Base de ' + esc(F.euro(r.mora.base)) +
          ', ' + esc(r.mora.mesesContados) + ' meses' +
          (r.mora.limiteAplicado ? ' (dos ' + esc(r.mora.meses) + ' declarados, por aplicação do limite legal)' : '') +
          ', à taxa de ' + esc(F.percentagem(r.mora.taxaAnual, 3)) + ', num total de <strong>' +
          esc(F.euro(r.mora.montante)) + '</strong>.</p>'
        : ''),
      '<h3>4.4 Cenários de coima</h3>', coimas,
      '<h3>4.5 Recuperação do IRC</h3>',
      '<p>Base potencialmente recuperável de ' + esc(F.euro(r.recuperacaoIRC.base)) + ', correspondente à coleta de IRC ' +
      'e derramas pagas. As tributações autónomas mantêm-se devidas e não integram esta base.</p>',
      '<div class="aviso">' + esc(r.recuperacaoIRC.aviso) + '</div>', irc,
      '<h3>4.6 Matriz de exposição líquida</h3>', matriz,
      '<h3>4.7 Cronologia fiscal</h3>', cronologia
    ].join('\n');
  }

  function recomendacoes(d, r) {
    var i = r.indicadores;
    var linhas = [];
    var prazoRevisao = r.timeline.filter(function (e) { return /revisão/i.test(e.titulo); })[0];

    linhas.push('Confirmar documentalmente o preenchimento dos pressupostos do artigo 6.º do CIRC no exercício de ' +
      r.meta.exercicio + ', em particular a natureza das atividades exercidas e a composição do capital social.');

    if (i.ircRecuperavel > 0 && prazoRevisao) {
      linhas.push('Avaliar o pedido de revisão do ato tributário do IRC ao abrigo do artigo 78.º da LGT. ' +
        'O prazo termina em ' + F.data(prazoRevisao.data) + ' e estão em causa ' + F.euro(r.recuperacaoIRC.base) + '.');
    } else {
      linhas.push('O prazo de revisão do IRC pago está esgotado ou o cenário selecionado não prevê recuperação. ' +
        'O IRC suportado deve ser considerado custo irrecuperável nesta análise.');
    }

    if (i.irsAdicional > 0) {
      linhas.push('Ponderar a substituição das declarações Modelo 3 dos sócios do exercício de ' + r.meta.exercicio +
        '. A regularização voluntária, antes de qualquer procedimento inspetivo, reduz a coima de ' +
        F.euro(r.coimas.referencia.valor) + ' para ' + F.euro(r.coimas.baixo.valor) +
        ', uma diferença de ' + F.euro(r.coimas.referencia.valor - r.coimas.baixo.valor) +
        ' entre cenários de simulação.');
      linhas.push('Os juros compensatórios continuam a correr até à regularização, a um custo aproximado de ' +
        F.euro(i.irsAdicional * r.juros.taxaAnual / 12) + ' por mês de atraso.');
    }

    linhas.push('Articular a substituição das Modelo 3 com o pedido de anulação do IRC, para evitar uma janela em que ' +
      'o IRS adicional já é exigível e o IRC ainda não foi devolvido.');
    linhas.push('Avaliar o impacto nos exercícios seguintes e corrigir o enquadramento declarativo para o futuro, ' +
      'de modo a interromper a acumulação de exposição.');

    return '<h2>6. Recomendações</h2><ol class="plano">' +
      linhas.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>';
  }

  function plano(d, r) {
    var passos = [
      ['Fase 1 — Diagnóstico e prova (0 a 30 dias)',
        'Reunir contratos, certidões, pactos sociais, atas e evidência da atividade dos sócios. ' +
        'Fixar por escrito a posição sobre o artigo 6.º do CIRC e quantificar o exercício ou exercícios afetados.'],
      ['Fase 2 — Decisão sobre a via de regularização (30 a 45 dias)',
        'Escolher entre a substituição declarativa voluntária e a espera por procedimento inspetivo. ' +
        'A diferença entre os cenários de coima é de ' + F.euro(r.coimas.referencia.valor - r.coimas.baixo.valor) + '.'],
      ['Fase 3 — Substituição das declarações de IRS (45 a 60 dias)',
        'Entrega das Modelo 3 de substituição com a imputação de ' + F.euro(r.atual.irc.materiaColetavel) +
        ' repartida pelos sócios, gerando IRS adicional de ' + F.euro(r.indicadores.irsAdicionalBruto) + '.'],
      ['Fase 4 — Pedido de anulação do IRC (em simultâneo)',
        'Reclamação graciosa ou pedido de revisão oficiosa para recuperação de ' + F.euro(r.recuperacaoIRC.base) +
        ' de IRC e derramas, com pedido de compensação com a dívida de IRS sempre que admissível.'],
      ['Fase 5 — Pagamento ou plano prestacional (60 a 90 dias)',
        'Liquidação do saldo apurado ou requerimento de pagamento em prestações. ' +
        'Exposição líquida a financiar: ' + F.euro(r.indicadores.exposicaoLiquida) + '.'],
      ['Fase 6 — Correção prospetiva',
        'Adequação do enquadramento declarativo dos exercícios seguintes e, se aplicável, revisão da estrutura societária.']
    ];
    return '<h2>7. Plano de regularização</h2>' + passos.map(function (p) {
      return '<h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p>';
    }).join('');
  }

  function html(d, r, c, e, semBarra) {
    var titulo = 'Relatório de impacto — transparência fiscal — exercício de ' + r.meta.exercicio;
    return [
      '<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title>',
      '<style>' + estilo() + '</style></head><body>',
      semBarra ? '' : '<div class="barra-imprimir">' +
      '<span>Use “Guardar como PDF” na janela de impressão.</span>' +
      '<button onclick="window.print()">Imprimir / Guardar PDF</button></div>',
      '<div class="corpo">',
      marca(),
      '<div class="capa">',
      '<h1>Impacto da reclassificação para o regime de transparência fiscal</h1>',
      '<div class="sub">' + esc(d.sociedade.designacao || 'Sociedade não identificada') +
      (c && c.exercicios.length > 1
        ? ' · Exercícios de ' + esc(c.exercicios[0].exercicio) + ' a ' + esc(c.exercicios[c.exercicios.length - 1].exercicio) +
          ' · detalhe do exercício de ' + esc(r.meta.exercicio)
        : ' · Exercício de ' + esc(r.meta.exercicio)) + '</div>',
      '<div class="meta">Relatório gerado em ' + esc(F.data(r.meta.geradoEm)) +
      ' · Data de referência da simulação: ' + esc(F.data(r.meta.dataReferencia)) + '</div>',
      '</div>',
      consolidadoSeccao(c),
      resumoExecutivo(d, r),
      fundamentacao(r),
      simulacaoFinanceira(d, r),
      esperaSeccao(e),
      recomendacoes(d, r),
      plano(d, r),
      '<div class="rodape-doc">',
      'Documento produzido pelo Simulador de Impacto da Reclassificação da Transparência Fiscal. ',
      'Os valores apresentados são estimativas assentes em parâmetros configuráveis e nos dados introduzidos pelo utilizador. ',
      'Não constituem liquidação de imposto nem substituem parecer jurídico-fiscal. ',
      'A elegibilidade para o artigo 6.º do CIRC é pressuposto assumido e não objeto de apreciação neste documento.',
      '<div class="assinatura">VC Level · Strategic Leadership. Fractional Impact.</div>',
      '</div></div></body></html>'
    ].join('\n');
  }

  /**
   * Alternativa para contextos em que as janelas emergentes são bloqueadas
   * (telemóvel, páginas em moldura): o relatório abre sobreposto à aplicação.
   */
  function sobrepor(d, r, c, e) {
    var fundo = document.createElement('div');
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-label', 'Relatório');
    fundo.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;background:#10151c;';

    var barra = document.createElement('div');
    barra.style.cssText = 'display:flex;gap:.5rem;align-items:center;justify-content:space-between;' +
      'padding:.6rem .8rem;background:#0f3d6e;color:#fff;font:14px/1.4 system-ui,sans-serif;';
    barra.appendChild(criarTexto('Relatório pronto. Imprima para guardar em PDF.'));

    var acoes = document.createElement('div');
    acoes.style.cssText = 'display:flex;gap:.5rem;';
    var estiloBotao = 'font:inherit;padding:.4em 1em;border-radius:6px;border:0;cursor:pointer;';
    var imprimir = document.createElement('button');
    imprimir.type = 'button';
    imprimir.textContent = 'Imprimir / PDF';
    imprimir.style.cssText = estiloBotao;
    var fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.textContent = 'Fechar';
    fechar.style.cssText = estiloBotao + 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);';
    acoes.appendChild(imprimir);
    acoes.appendChild(fechar);
    barra.appendChild(acoes);

    var moldura = document.createElement('iframe');
    moldura.title = 'Relatório de impacto';
    moldura.style.cssText = 'flex:1;width:100%;border:0;background:#fff;';
    moldura.srcdoc = html(d, r, c, e, true);

    imprimir.addEventListener('click', function () {
      try {
        moldura.contentWindow.focus();
        moldura.contentWindow.print();
      } catch (e) {
        window.print();
      }
    });
    fechar.addEventListener('click', function () { document.body.removeChild(fundo); });

    fundo.appendChild(barra);
    fundo.appendChild(moldura);
    document.body.appendChild(fundo);
  }

  function criarTexto(t) {
    var s = document.createElement('span');
    s.textContent = t;
    return s;
  }

  raiz.Relatorio = {
    html: html,
    sobrepor: sobrepor,
    abrir: function (d, r, c, e) {
      var janela = null;
      try { janela = window.open('', '_blank'); } catch (erro) { janela = null; }
      if (!janela) { sobrepor(d, r, c, e); return; }
      janela.document.open();
      janela.document.write(html(d, r, c, e));
      janela.document.close();
    }
  };
})(typeof self !== 'undefined' ? self : this);
