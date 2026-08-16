/**
 * Contrato de saida comum as sete ferramentas.
 *
 * Existe para que o renderizador da interface seja um so. Sete renderizadores
 * produzem sete maneiras de mostrar um alerta e, ao terceiro relatorio, o
 * cliente ja nao sabe ler nenhum.
 *
 * Impoe tres coisas que a especificacao exige e que sao faceis de esquecer:
 *   - toda a ferramenta declara o que nao conseguiu calcular
 *   - todo o numero derivado de pressuposto por confirmar carrega a marca
 *   - toda a conclusao fiscal ou juridica sai marcada enquanto nao houver cedula
 */

import { Lacunas } from './lacunas.js';
import { valor, etiqueta } from '../config/pressupostos.js';

export const NATUREZA = Object.freeze({
  ANALITICA: 'ANALITICA',
  FISCAL: 'FISCAL',
  JURIDICA: 'JURIDICA',
});

export class Resultado {
  /**
   * @param {string} ferramenta codigo F1 a F7
   * @param {string} titulo
   */
  constructor(ferramenta, titulo) {
    this.ferramenta = ferramenta;
    this.titulo = titulo;
    this.veredito = null;
    /** @type {Array<object>} */
    this.alertas = [];
    /** @type {Array<{id:string, titulo:string, tipo:string, dados:any, natureza:string, fonte:object|null}>} */
    this.blocos = [];
    this.lacunas = new Lacunas(ferramenta);
    /** @type {Set<string>} */
    this.pressupostos = new Set();
    this.exportavel = true;
    this.motivoNaoExportavel = null;
  }

  /** Frase de veredito em portugues corrente. Uma frase, sem jargao. */
  defineVeredito(frase, { severidade = 'NEUTRO' } = {}) {
    if (frase.length > 320) {
      throw new Error('O veredito tem de caber numa frase. Se nao cabe, ainda nao ha veredito.');
    }
    this.veredito = { frase, severidade };
    return this;
  }

  acrescentaAlerta({ codigo, titulo, explicacao, impactoCent = null, accao = null, classe = 'DESVIO' }) {
    this.alertas.push({ codigo, titulo, explicacao, impactoCent, accao, classe });
    return this;
  }

  /**
   * @param {object} bloco
   * @param {string} bloco.natureza ANALITICA, FISCAL ou JURIDICA
   */
  acrescentaBloco({ id, titulo, tipo, dados, natureza = NATUREZA.ANALITICA, fonte = null }) {
    if (!Object.values(NATUREZA).includes(natureza)) {
      throw new Error(`Natureza invalida no bloco ${id}: ${natureza}`);
    }
    this.blocos.push({ id, titulo, tipo, dados, natureza, fonte });
    if (natureza !== NATUREZA.ANALITICA && !valor('P-05').cedulaOCC) {
      this.exportavel = false;
      this.motivoNaoExportavel =
        'Este resultado contem conclusoes de natureza fiscal ou juridica. Sem cedula, a exportacao ' +
        'exige a identificacao do parceiro co-signatario. Ver pressuposto P-05.';
    }
    return this;
  }

  usaPressuposto(id) {
    this.pressupostos.add(id);
    return this;
  }

  /**
   * Limita os alertas ao maximo definido, ordenando por impacto em euros.
   * O resto vai para anexo. Um relatorio com nove prioridades nao tem nenhuma.
   */
  limitaAlertas(maximo = 3) {
    const ordenados = [...this.alertas].sort((a, b) => {
      // Ruturas de nivel nao competem por lugar com desvios.
      if (a.classe !== b.classe) return a.classe === 'RUTURA' ? -1 : 1;
      return Math.abs(b.impactoCent ?? 0) - Math.abs(a.impactoCent ?? 0);
    });
    const ruturas = ordenados.filter((a) => a.classe === 'RUTURA');
    const desvios = ordenados.filter((a) => a.classe !== 'RUTURA');
    this.alertas = [...ruturas, ...desvios.slice(0, maximo)];
    this.alertasEmAnexo = desvios.slice(maximo);
    return this;
  }

  /**
   * Liberta a exportacao mediante identificacao do co-signatario.
   * Nao e um aviso no rodape, e uma porta.
   */
  coAssina({ nome, cedula, entidade }) {
    if (!nome || !cedula) {
      throw new Error('Co-assinatura exige nome e numero de cedula do parceiro.');
    }
    this.coAssinatura = { nome, cedula, entidade: entidade ?? null, data: new Date().toISOString().slice(0, 10) };
    this.exportavel = true;
    this.motivoNaoExportavel = null;
    return this;
  }

  toJSON() {
    return {
      ferramenta: this.ferramenta,
      titulo: this.titulo,
      veredito: this.veredito,
      alertas: this.alertas,
      alertasEmAnexo: this.alertasEmAnexo ?? [],
      blocos: this.blocos,
      lacunas: this.lacunas.toJSON(),
      pressupostos: [...this.pressupostos].map(etiqueta),
      exportavel: this.exportavel,
      motivoNaoExportavel: this.motivoNaoExportavel,
      coAssinatura: this.coAssinatura ?? null,
    };
  }
}
