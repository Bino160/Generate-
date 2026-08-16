/**
 * Editores de lista.
 *
 * O perfil tem cinco listas com a mesma forma: gabinetes, equipa, precario,
 * convencoes e correspondencia de entidades. Escrever cinco editores a mao
 * produziria cinco maneiras de acrescentar uma linha e cinco sitios onde
 * corrigir o mesmo erro.
 *
 * O que este componente faz e que uma tabela normal nao faz: colunas derivadas.
 * A margem por ato e a margem por hora nao sao campos, sao calculadas a cada
 * tecla. E deliberado. Quem preenche a tabela de precos ve, linha a linha, que
 * o ato mais rentavel por ato nao e o mais rentavel por hora, que e a tese do
 * F2. A ferramenta ensina enquanto se preenche.
 */

import { el } from './render.js';
import { formata, formataPercentagem } from '../src/core/dinheiro.js';

/** Converte o valor do campo conforme o tipo declarado. */
function leValor(entrada, tipo) {
  if (tipo === 'checkbox') return entrada.checked;
  if (tipo === 'euros') return entrada.value === '' ? null : Math.round(Number(entrada.value) * 100);
  if (tipo === 'percentagem') return entrada.value === '' ? null : Number(entrada.value) / 100;
  if (tipo === 'numero') return entrada.value === '' ? null : Number(entrada.value);
  return entrada.value;
}

function escreveValor(entrada, tipo, valor) {
  if (tipo === 'checkbox') { entrada.checked = Boolean(valor); return; }
  if (tipo === 'euros') { entrada.value = valor == null ? '' : String(valor / 100); return; }
  if (tipo === 'percentagem') { entrada.value = valor == null ? '' : String(Math.round(valor * 1000) / 10); return; }
  entrada.value = valor == null ? '' : String(valor);
}

function criaCampo(coluna, item, aoMudar) {
  const tipo = coluna.tipo ?? 'texto';
  let entrada;

  if (tipo === 'select') {
    entrada = el('select', {}, (coluna.opcoes ?? []).map((o) => {
      const id = typeof o === 'string' ? o : o.id;
      const nome = typeof o === 'string' ? o : o.nome;
      return el('option', { value: id, texto: nome });
    }));
    entrada.value = item[coluna.campo] ?? '';
  } else if (tipo === 'checkbox') {
    entrada = el('input', { type: 'checkbox' });
    escreveValor(entrada, tipo, item[coluna.campo]);
  } else {
    entrada = el('input', {
      type: tipo === 'texto' ? 'text' : 'number',
      step: tipo === 'euros' ? '0.01' : tipo === 'percentagem' ? '0.5' : coluna.passo ?? '1',
      min: coluna.min ?? null,
      placeholder: coluna.placeholder ?? null,
      inputmode: tipo === 'texto' ? null : 'decimal',
    });
    escreveValor(entrada, tipo, item[coluna.campo]);
  }

  entrada.setAttribute('aria-label', coluna.etiqueta);
  if (coluna.largura) entrada.style.width = coluna.largura;
  // Nenhum destes dois pede redesenho total. Ver a nota em desenhaPerfil: o
  // change de um campo de texto dispara ao sair do campo, que e exatamente o
  // instante em que o cursor ja vai a caminho do botao seguinte.
  const atualiza = () => {
    item[coluna.campo] = leValor(entrada, tipo);
    aoMudar({ redesenhar: false });
  };
  entrada.addEventListener('input', atualiza);
  entrada.addEventListener('change', atualiza);
  return entrada;
}

/**
 * Selecao de dias da semana. Sete caixas em vez de uma lista de numeros, porque
 * ninguem sabe de cor que 0 e domingo e essa e exatamente a classe de erro que
 * produz uma capacidade errada sem ninguem dar por isso.
 */
export function seletorDeDias(dias, aoMudar, opcoes) {
  const atual = new Set(dias ?? []);
  return el('div', { classe: 'dias' }, opcoes.map((d) => {
    const caixa = el('input', { type: 'checkbox', id: `dia-${Math.random().toString(36).slice(2)}-${d.n}` });
    caixa.checked = atual.has(d.n);
    caixa.addEventListener('change', () => {
      if (caixa.checked) atual.add(d.n); else atual.delete(d.n);
      aoMudar([...atual].sort());
    });
    return el('label', { classe: 'dia', title: d.nome }, [caixa, el('span', { texto: d.curto })]);
  }));
}

/**
 * @param {object} config
 * @param {string} config.titulo
 * @param {string} [config.nota] porque e que esta lista existe
 * @param {Array} config.itens a lista, editada no sitio
 * @param {Array} config.colunas [{campo, etiqueta, tipo, opcoes, largura, ajuda}]
 * @param {Array} [config.derivadas] [{etiqueta, calcula(item), ajuda}]
 * @param {() => object} config.novoItem
 * @param {(alterou: {redesenhar: boolean}) => void} config.aoMudar
 * @param {(item, recalcula: () => void) => Node|null} [config.expandido] detalhe por linha
 * @param {string} [config.textoVazio]
 */
export function editorDeLista(config) {
  const {
    titulo, nota, itens, colunas, derivadas = [], novoItem, aoMudar,
    expandido = null, textoVazio = 'Ainda nao ha nenhuma linha.', textoAcrescentar = 'Acrescentar',
  } = config;

  const corpo = el('div', { classe: 'corpo' });
  if (nota) corpo.append(el('p', { classe: 'nota', texto: nota }));

  if (itens.length === 0) {
    corpo.append(el('p', { classe: 'vazio-lista', texto: textoVazio }));
  } else {
    const cabecalho = el('tr', {}, [
      ...colunas.map((c) => el('th', { classe: c.tipo && c.tipo !== 'texto' && c.tipo !== 'select' ? 'numero' : '' }, [
        c.etiqueta,
        c.ajuda ? el('span', { classe: 'ajuda-coluna', texto: c.ajuda }) : null,
      ])),
      ...derivadas.map((d) => el('th', { classe: 'numero derivada' }, [
        d.etiqueta,
        d.ajuda ? el('span', { classe: 'ajuda-coluna', texto: d.ajuda }) : null,
      ])),
      el('th', { texto: '' }),
    ]);

    const linhas = [];
    for (const [i, item] of itens.entries()) {
      const celulasDerivadas = derivadas.map(() => el('td', { classe: 'numero derivada' }));
      const recalcula = () => {
        derivadas.forEach((d, j) => {
          const v = d.calcula(item);
          celulasDerivadas[j].replaceChildren(
            v == null ? el('span', { classe: 'nulo', texto: 'n/d' }) : document.createTextNode(v),
          );
        });
      };

      const aoMudarLinha = (alterou) => {
        recalcula();
        aoMudar(alterou);
      };

      const linha = el('tr', {}, [
        ...colunas.map((c) => el('td', {}, criaCampo(c, item, aoMudarLinha))),
        ...celulasDerivadas,
        el('td', {}, botaoRemover(() => {
          itens.splice(i, 1);
          aoMudar({ redesenhar: true });
        })),
      ]);
      recalcula();
      linhas.push(linha);

      if (expandido) {
        // O detalhe recebe o recalculo da propria linha, para poder atualizar as
        // colunas derivadas do pai sem pedir um redesenho que lhe arranca o
        // elemento debaixo do cursor.
        const detalhe = expandido(item, recalcula);
        if (detalhe) {
          linhas.push(el('tr', { classe: 'detalhe' }, el('td', {
            colspan: String(colunas.length + derivadas.length + 1),
          }, detalhe)));
        }
      }
    }

    corpo.append(el('div', { classe: 'rolavel' }, el('table', { classe: 'editavel' }, [
      el('thead', {}, cabecalho),
      el('tbody', {}, linhas),
    ])));
  }

  const acrescentar = el('button', { classe: 'secundario', type: 'button', texto: textoAcrescentar });
  acrescentar.addEventListener('click', () => {
    itens.push(novoItem());
    aoMudar({ redesenhar: true });
  });
  corpo.append(acrescentar);

  return el('section', { classe: 'bloco' }, [
    el('header', {}, el('h3', { texto: titulo })),
    corpo,
  ]);
}

function botaoRemover(aoClicar) {
  const b = el('button', { classe: 'remover', type: 'button', title: 'Remover linha', 'aria-label': 'Remover linha', texto: 'Remover' });
  b.addEventListener('click', aoClicar);
  return b;
}

/**
 * Grelha de ocupacao por faixa horaria.
 *
 * Existe porque a ocupacao e a variavel que faz a resposta do F2 inverter-se, e
 * enquanto nao houver importacao de agenda nao havia forma nenhuma de a
 * introduzir. Uma grelha de sete por dois preenche-se em dois minutos com a
 * agenda aberta ao lado, e destranca a taxa de ocupacao, o teste de capacidade
 * e o modulo de alocacao.
 */
export function grelhaDeOcupacao({ disponiveis, ocupacao, dias, faixas, chaveFaixa, aoMudar }) {
  const diasComCapacidade = dias.filter((d) => faixas.some((f) => (disponiveis[chaveFaixa(d.n, f.id)] ?? 0) > 0));

  if (diasComCapacidade.length === 0) {
    return el('p', { classe: 'vazio-lista', texto: 'Define primeiro os gabinetes e os horarios. A capacidade por faixa sai dai.' });
  }

  const cabecalho = el('tr', {}, [
    el('th', { texto: 'Faixa' }),
    ...diasComCapacidade.map((d) => el('th', { classe: 'numero', texto: d.curto })),
    el('th', { classe: 'numero derivada', texto: 'Ocupacao' }),
  ]);

  const linhas = faixas.map((f) => {
    const celulaOcupacao = el('td', { classe: 'numero derivada' });
    const recalcula = () => {
      let disp = 0;
      let ocup = 0;
      let temAlgum = false;
      for (const d of diasComCapacidade) {
        const chave = chaveFaixa(d.n, f.id);
        disp += disponiveis[chave] ?? 0;
        const o = ocupacao[chave];
        if (Number.isFinite(o)) { ocup += o; temAlgum = true; }
      }
      celulaOcupacao.replaceChildren(
        !temAlgum || disp === 0
          ? el('span', { classe: 'nulo', texto: 'n/d' })
          : document.createTextNode(formataPercentagem(ocup / disp, 0)),
      );
    };

    const celulas = diasComCapacidade.map((d) => {
      const chave = chaveFaixa(d.n, f.id);
      const disponivel = disponiveis[chave] ?? 0;
      if (disponivel <= 0) return el('td', { classe: 'numero' }, el('span', { classe: 'nulo', texto: 'fechado' }));

      const entrada = el('input', {
        type: 'number', min: '0', step: '0.5', inputmode: 'decimal',
        'aria-label': `Horas ocupadas, ${d.nome} de ${f.nome.toLowerCase()}`,
        placeholder: String(Math.round(disponivel)),
      });
      entrada.value = Number.isFinite(ocupacao[chave]) ? String(ocupacao[chave]) : '';
      entrada.addEventListener('input', () => {
        const v = entrada.value === '' ? undefined : Number(entrada.value);
        if (v === undefined) delete ocupacao[chave]; else ocupacao[chave] = v;
        entrada.classList.toggle('excede', v !== undefined && v > disponivel);
        recalcula();
        aoMudar();
      });
      entrada.classList.toggle('excede', Number.isFinite(ocupacao[chave]) && ocupacao[chave] > disponivel);
      return el('td', { classe: 'numero' }, [
        entrada,
        el('span', { classe: 'de-quantas', texto: `de ${Math.round(disponivel)}` }),
      ]);
    });

    const linha = el('tr', {}, [el('td', { texto: f.nome }), ...celulas, celulaOcupacao]);
    recalcula();
    return linha;
  });

  return el('div', {}, [
    el('p', { classe: 'nota', texto: 'Horas marcadas por mes, em cada faixa. A capacidade ao lado de cada caixa vem dos horarios dos gabinetes e nao se introduz. Uma faixa em branco fica por saber, e a ferramenta di-lo em vez de assumir zero.' }),
    el('div', { classe: 'rolavel' }, el('table', { classe: 'editavel grelha' }, [
      el('thead', {}, cabecalho),
      el('tbody', {}, linhas),
    ])),
  ]);
}

export { formata };
