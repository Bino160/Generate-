/**
 * Motor de benchmark.
 *
 * Dois niveis, e a etiqueta de origem nao e opcional. A regra transversal de QA
 * diz que nenhum benchmark internacional aparece sem etiqueta de origem visivel
 * no ecra, nao so na metodologia. Aqui isso e imposto pelo tipo de retorno: uma
 * referencia sem etiqueta nao chega a existir, porque o construtor rebenta.
 *
 * O verificador qa/lint-fontes.mjs confirma que nenhuma pagina imprime um valor
 * de benchmark sem chamar o renderizador de etiqueta.
 */

import { quartis } from './estatistica.js';
import { valor } from '../config/pressupostos.js';

export const NIVEL = Object.freeze({ FINANCEIRO: 'FINANCEIRO', OPERACIONAL: 'OPERACIONAL' });
export const ORIGEM = Object.freeze({ PT: 'PT', INTERNACIONAL: 'INTERNACIONAL', PROPRIO: 'PROPRIO' });

const AVISO_INTERNACIONAL =
  'Referencia internacional. Nao e o mercado portugues e nao deve ser lida como tal.';

export class Referencia {
  constructor({ metrica, nivel, origem, fonte, ano, unidade, estratos = [], nota = null }) {
    if (!metrica) throw new Error('Referencia sem metrica.');
    if (!Object.values(NIVEL).includes(nivel)) throw new Error(`Nivel invalido: ${nivel}`);
    if (!Object.values(ORIGEM).includes(origem)) throw new Error(`Origem invalida: ${origem}`);
    if (!fonte) throw new Error(`Referencia ${metrica} sem fonte. Uma referencia sem fonte nao entra.`);
    if (!ano) throw new Error(`Referencia ${metrica} sem ano.`);

    this.metrica = metrica;
    this.nivel = nivel;
    this.origem = origem;
    this.fonte = fonte;
    this.ano = ano;
    this.unidade = unidade ?? null;
    this.estratos = estratos;
    this.nota = nota;
  }

  /** Texto que a UI e obrigada a mostrar junto ao valor. */
  get etiqueta() {
    const base = `${this.fonte}, ${this.ano}`;
    if (this.origem === ORIGEM.INTERNACIONAL) {
      return { texto: base, aviso: AVISO_INTERNACIONAL, destaque: true, origem: this.origem };
    }
    if (this.origem === ORIGEM.PROPRIO) {
      return { texto: base, aviso: null, destaque: false, origem: this.origem };
    }
    return { texto: base, aviso: null, destaque: false, origem: this.origem };
  }

  /** Devolve o estrato pedido, ou null se nao existir ou nao for publicavel. */
  estrato(chave) {
    const e = this.estratos.find((x) => x.chave === chave);
    if (!e) return null;
    if (!publicavel(e.n)) return { ...e, publicavel: false, valores: null };
    return { ...e, publicavel: true };
  }
}

/** Regra de cinco. Nenhum estrato com menos de cinco clinicas e publicado. */
export function publicavel(n) {
  return Number.isFinite(n) && n >= valor('P-18').nMinimo;
}

/**
 * Constroi um estrato a partir de observacoes proprias.
 * Mediana e quartis, nunca media, porque com n baixo a media de uma clinica
 * atipica arrasta o estrato inteiro.
 */
export function constroiEstrato(chave, observacoes, { revisaoCae = null, subsetor = null } = {}) {
  const validas = observacoes.filter(Number.isFinite);
  const q = quartis(validas);
  return {
    chave,
    n: validas.length,
    revisaoCae,
    subsetor,
    valores: publicavel(validas.length) ? q : null,
    publicavel: publicavel(validas.length),
  };
}

export class Catalogo {
  constructor(referencias = []) {
    this.referencias = new Map();
    for (const r of referencias) this.acrescenta(r);
  }

  acrescenta(referencia) {
    if (!(referencia instanceof Referencia)) {
      throw new Error('So entram instancias de Referencia no catalogo.');
    }
    this.referencias.set(referencia.metrica, referencia);
    return this;
  }

  obtem(metrica, chaveEstrato) {
    const r = this.referencias.get(metrica);
    if (!r) return { existe: false, motivo: 'METRICA_SEM_REFERENCIA', metrica };
    const e = r.estrato(chaveEstrato);
    if (!e) {
      return { existe: false, motivo: 'ESTRATO_INEXISTENTE', metrica, estrato: chaveEstrato, etiqueta: r.etiqueta };
    }
    if (!e.publicavel) {
      return { existe: false, motivo: 'ESTRATO_ABAIXO_DO_MINIMO', metrica, n: e.n, etiqueta: r.etiqueta };
    }
    return { existe: true, metrica, valores: e.valores, n: e.n, etiqueta: r.etiqueta, unidade: r.unidade };
  }

  /**
   * Impede cruzar estratos classificados em revisoes diferentes da CAE.
   * Ver pressuposto P-01.
   */
  verificaCoerenciaCae() {
    const revisoes = new Set();
    for (const r of this.referencias.values()) {
      for (const e of r.estratos) if (e.revisaoCae) revisoes.add(e.revisaoCae);
    }
    return { coerente: revisoes.size <= 1, revisoes: [...revisoes] };
  }
}
