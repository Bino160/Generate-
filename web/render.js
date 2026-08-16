/**
 * Renderizador unico dos resultados das sete ferramentas.
 *
 * Existe um so porque sete renderizadores produzem sete maneiras de mostrar um
 * alerta, e ao terceiro relatorio o cliente ja nao sabe ler nenhum.
 *
 * Duas regras estao aqui e nao na folha de estilos, porque sao de conteudo e
 * nao de aparencia:
 *   - um bloco com fonte de benchmark imprime sempre a etiqueta de origem
 *   - as lacunas aparecem em todos os resultados, mesmo quando estao vazias
 */

import { formata, formataPercentagem } from '../src/core/dinheiro.js';

const el = (tag, props = {}, filhos = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'texto') n.textContent = v;
    else if (k === 'classe') n.className = v;
    else if (v != null) n.setAttribute(k, v);
  }
  for (const f of [].concat(filhos)) {
    if (f == null) continue;
    n.append(typeof f === 'string' ? document.createTextNode(f) : f);
  }
  return n;
};

const UNIDADES = {
  CENT: (v) => formata(v),
  CENT_POR_HORA: (v) => `${formata(v)}/h`,
  CENT_POR_DIA: (v) => `${formata(v)}/dia`,
  FRACAO: (v) => formataPercentagem(v),
  DIAS: (v) => `${Math.round(v)} dias`,
  NUMERO: (v) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(v),
};

export function formataValor(v, unidade) {
  if (v == null || !Number.isFinite(v)) return null;
  return (UNIDADES[unidade] ?? UNIDADES.NUMERO)(v);
}

function celulaNumero(v, unidade) {
  const texto = formataValor(v, unidade);
  return el('td', { classe: 'numero' }, texto == null ? el('span', { classe: 'nulo', texto: 'n/d' }) : texto);
}

/** Etiqueta de origem. Obrigatoria em qualquer numero de benchmark. */
export function renderFonte(fonte) {
  if (!fonte) return null;
  return el('div', { classe: 'fonte', 'data-origem': fonte.origem ?? 'PT' }, [
    el('strong', { texto: `Fonte: ${fonte.texto}` }),
    fonte.aviso ? el('div', { texto: fonte.aviso }) : null,
  ]);
}

function renderVeredito(veredito) {
  if (!veredito) return null;
  return el('div', { classe: 'veredito', 'data-severidade': veredito.severidade }, veredito.frase);
}

function renderAlertas(alertas, emAnexo) {
  if (!alertas || alertas.length === 0) return null;
  const lista = el('div', { classe: 'alertas' }, alertas.map((a) => el(
    'article',
    { classe: 'alerta', 'data-classe': a.classe },
    [
      el('div', {}, [
        a.classe === 'RUTURA' ? el('span', { classe: 'etiqueta-classe', texto: 'Rutura de nivel' }) : null,
        el('h4', { texto: a.titulo }),
        el('p', { texto: a.explicacao }),
        a.accao ? el('p', { texto: a.accao }) : null,
      ]),
      el('div', { classe: 'impacto', texto: a.impactoCent == null ? '' : formata(a.impactoCent, { compacto: true }) }),
    ],
  )));

  if (emAnexo && emAnexo.length > 0) {
    lista.append(el('details', {}, [
      el('summary', { texto: `Mais ${emAnexo.length} pontos, em anexo` }),
      el('ul', {}, emAnexo.map((a) => el('li', { texto: `${a.titulo}. ${a.explicacao}` }))),
    ]));
  }
  return lista;
}

function tabelaDeLinhasF1(dados) {
  const cabeca = el('tr', {}, [
    el('th', { texto: 'Metrica' }),
    el('th', { classe: 'numero', texto: 'Este mes' }),
    el('th', { classe: 'numero', texto: 'Media 3 meses' }),
    el('th', { classe: 'numero', texto: 'Homologo' }),
    el('th', { classe: 'numero', texto: 'Mes anterior' }),
    el('th', { classe: 'numero', texto: 'Desvios-padrao' }),
  ]);
  const corpo = dados.linhas.map((l) => el('tr', {}, [
    el('td', { texto: l.nome }),
    celulaNumero(l.atual, l.unidade),
    celulaNumero(l.mediaMovel3, l.unidade),
    celulaNumero(l.homologo, l.unidade),
    celulaNumero(l.anterior, l.unidade),
    celulaNumero(l.z, 'NUMERO'),
  ]));
  return el('table', {}, [el('thead', {}, cabeca), el('tbody', {}, corpo)]);
}

function renderQuadrantes(dados) {
  const nomes = {
    MANTER: 'Manter',
    RENEGOCIAR: 'Renegociar',
    LIMITAR_A_HORARIOS_VAZIOS: 'Limitar a horarios vazios',
    SAIR: 'Sair',
  };
  return el('div', { classe: 'quadrantes' }, Object.entries(dados.matriz).map(([q, itens]) => el(
    'div',
    { classe: 'quadrante', 'data-q': q },
    [
      el('h4', { texto: nomes[q] ?? q }),
      itens.length === 0
        ? el('p', { classe: 'vazio', texto: 'Nenhuma' })
        : el('ul', {}, itens.map((i) => el('li', {}, [
          el('strong', { texto: i.nome }),
          ` ${formata(i.valorManterCent, { compacto: true })} por periodo. `,
          i.multiplicadorMinimo != null && i.multiplicadorMinimo > 1
            ? `Precisa de ${formataPercentagem(i.multiplicadorMinimo - 1, 0)} de aumento.`
            : `Rende ${formata(i.margemPorHoraCent)} por hora contra ${formata(i.margemPrivadaPorHoraCent)} do privado.`,
        ]))),
    ],
  )));
}

function renderProjecao(p) {
  const cabeca = el('tr', {}, [
    el('th', { texto: 'Semana' }),
    el('th', { texto: 'Ate' }),
    el('th', { classe: 'numero', texto: 'Entradas' }),
    el('th', { classe: 'numero', texto: 'Saidas' }),
    el('th', { classe: 'numero', texto: 'Saldo' }),
  ]);
  const corpo = p.semanas.map((s) => el('tr', {}, [
    el('td', { texto: String(s.semana) }),
    el('td', { texto: s.ate }),
    celulaNumero(s.entradasCent, 'CENT'),
    celulaNumero(-s.saidasCent, 'CENT'),
    celulaNumero(s.saldoFinalCent, 'CENT'),
  ]));
  return el('div', {}, [
    el('p', { classe: 'nota', texto: p.baseDeEstimativa }),
    el('table', {}, [el('thead', {}, cabeca), el('tbody', {}, corpo)]),
  ]);
}

function renderGenerico(dados) {
  if (Array.isArray(dados) && dados.length > 0 && typeof dados[0] === 'object') {
    const colunas = [...new Set(dados.flatMap((d) => Object.keys(d)))]
      .filter((c) => typeof dados[0][c] !== 'object' || dados[0][c] === null);
    return el('table', {}, [
      el('thead', {}, el('tr', {}, colunas.map((c) => el('th', { texto: humaniza(c) })))),
      el('tbody', {}, dados.map((d) => el('tr', {}, colunas.map((c) => (
        c.endsWith('Cent')
          ? celulaNumero(d[c], 'CENT')
          : el('td', { texto: apresenta(d[c]) })
      ))))),
    ]);
  }
  if (dados && typeof dados === 'object') {
    const entradas = Object.entries(dados).filter(([, v]) => typeof v !== 'object' || v === null);
    return el('table', {}, el('tbody', {}, entradas.map(([k, v]) => el('tr', {}, [
      el('td', { texto: humaniza(k) }),
      k.endsWith('Cent') ? celulaNumero(v, 'CENT') : el('td', { classe: 'numero', texto: apresenta(v) }),
    ]))));
  }
  return el('p', { texto: apresenta(dados) });
}

function humaniza(chave) {
  return chave
    .replace(/Cent$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function apresenta(v) {
  if (v == null) return 'n/d';
  if (typeof v === 'boolean') return v ? 'sim' : 'nao';
  if (typeof v === 'number') return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(v);
  return String(v);
}

function renderBloco(bloco) {
  const corpo = el('div', { classe: 'corpo' });
  const fonte = renderFonte(bloco.fonte);
  if (fonte) corpo.append(fonte);

  switch (bloco.tipo) {
    case 'tabela':
      if (bloco.id === 'metricas') corpo.append(tabelaDeLinhasF1(bloco.dados));
      else corpo.append(renderGenerico(bloco.dados));
      break;
    case 'quadrantes':
      corpo.append(renderQuadrantes(bloco.dados));
      break;
    case 'projecao':
      corpo.append(renderProjecao(bloco.dados));
      break;
    case 'lista':
      corpo.append(el('ul', {}, (bloco.dados.pontos ?? []).map((p) => el('li', { texto: p }))));
      if (bloco.dados.limite) corpo.append(el('p', { classe: 'nota', texto: bloco.dados.limite }));
      break;
    case 'testes':
      corpo.append(renderTestes(bloco.dados));
      break;
    case 'memo':
      corpo.append(renderMemo(bloco.dados));
      break;
    default:
      corpo.append(renderGenerico(bloco.dados));
  }

  if (bloco.dados && bloco.dados.nota) {
    corpo.append(el('p', { classe: 'nota', texto: bloco.dados.nota }));
  }

  return el('section', { classe: 'bloco' }, [
    el('header', {}, [
      el('h3', { texto: bloco.titulo }),
      bloco.natureza !== 'ANALITICA'
        ? el('span', { classe: 'selo', 'data-natureza': bloco.natureza, texto: bloco.natureza.toLowerCase() })
        : null,
    ]),
    corpo,
  ]);
}

function renderTestes(dados) {
  const lista = dados.testes ?? dados.porProfissional ?? [];
  return el('div', {}, lista.map((t) => el('div', { classe: 'bloco' }, [
    el('header', {}, [
      el('h4', { texto: t.nome }),
      el('span', { classe: 'selo', texto: t.estado ?? t.nivel ?? '' }),
    ]),
    el('div', { classe: 'corpo' }, [
      ...(t.achados ?? []).map((a) => el('p', { texto: a })),
      ...(t.indiciosAssinalados ?? []).map((i) => el('p', { texto: i.descricao })),
      t.leitura ? el('p', { classe: 'nota', texto: t.leitura }) : null,
      t.nota ? el('p', { classe: 'nota', texto: t.nota }) : null,
      t.contingenciaCent ? el('p', { texto: `Contingencia estimada: ${formata(t.contingenciaCent)}` }) : null,
    ]),
  ])));
}

/**
 * Memo com espacos de julgamento.
 * Fica editavel no ecra e imprime com o que la for escrito, para o relatorio
 * poder sair de uma so pagina com a leitura de quem apresenta.
 */
function renderMemo(dados) {
  return el('div', {}, [
    ...dados.campos.map((c) => {
      const area = el('textarea', {
        rows: '3',
        'aria-label': c.titulo,
        placeholder: 'Escrever aqui antes da reuniao.',
      });
      area.value = c.texto ?? '';
      return el('div', { classe: 'campo-memo' }, [el('label', { texto: c.titulo }), area]);
    }),
    el('p', { classe: 'nota', texto: dados.nota }),
  ]);
}

function renderLacunas(lacunas) {
  const itens = lacunas.itens ?? [];
  const bloco = el('section', { classe: 'bloco lacunas' }, [
    el('header', {}, el('h3', { texto: 'O que nao consegui calcular' })),
  ]);
  const corpo = el('div', { classe: 'corpo' });

  if (itens.length === 0) {
    corpo.append(el('p', { classe: 'nota', texto: 'Nada. Todos os calculos desta ferramenta correram com dados completos.' }));
  } else {
    for (const l of itens) {
      corpo.append(el('div', { classe: 'lacuna', 'data-g': l.gravidade }, [
        el('div', { classe: 'gravidade', texto: l.gravidade.toLowerCase() }),
        el('div', {}, [
          el('div', { texto: l.mensagem }),
          l.comoResolver ? el('div', { classe: 'resolver', texto: `Como resolver: ${l.comoResolver}` }) : null,
          l.pressuposto ? el('div', { classe: 'resolver', texto: `Depende do pressuposto ${l.pressuposto}.` }) : null,
        ]),
      ]));
    }
  }
  bloco.append(corpo);
  return bloco;
}

function renderPressupostos(lista) {
  if (!lista || lista.length === 0) return null;
  const porConfirmar = lista.filter((p) => p.estado !== 'CONFIRMADO');
  if (porConfirmar.length === 0) return null;
  return el('section', { classe: 'bloco' }, [
    el('header', {}, el('h3', { texto: 'Pressupostos por confirmar usados neste calculo' })),
    el('div', { classe: 'corpo' }, porConfirmar.map((p) => el('div', { classe: 'pressuposto', 'data-estado': p.estado }, [
      el('div', {}, [el('span', { classe: 'id', texto: p.id }), ` ${p.assunto}`]),
      el('div', { classe: 'nota', texto: p.nota }),
    ]))),
  ]);
}

/** Ponto de entrada. Recebe o objeto devolvido por Resultado.toJSON(). */
export function renderResultado(resultado, destino) {
  destino.replaceChildren();

  if (!resultado.exportavel) {
    destino.append(el('div', { classe: 'aviso-exportacao', texto: resultado.motivoNaoExportavel }));
  }

  const v = renderVeredito(resultado.veredito);
  if (v) destino.append(v);

  const a = renderAlertas(resultado.alertas, resultado.alertasEmAnexo);
  if (a) destino.append(a);

  for (const bloco of resultado.blocos) destino.append(renderBloco(bloco));

  destino.append(renderLacunas(resultado.lacunas));

  const p = renderPressupostos(resultado.pressupostos);
  if (p) destino.append(p);
}

export { el };
