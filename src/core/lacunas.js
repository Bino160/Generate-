/**
 * Registo do que a ferramenta nao conseguiu calcular.
 *
 * Regra transversal de QA da especificacao: "Toda a ferramenta declara o que nao
 * conseguiu calcular. Silencio sobre um calculo em falta e o erro mais caro em
 * consultoria financeira."
 *
 * Isto e infraestrutura, nao documentacao. Todos os motores devolvem
 * { resultado, lacunas } e o teste tests/contrato.test.mjs recusa qualquer motor
 * que nao devolva o campo.
 */

export const GRAVIDADE = Object.freeze({
  /** O numero principal nao pode ser mostrado. */
  BLOQUEIA: 'BLOQUEIA',
  /** O numero sai, mas incompleto ou com margem de erro conhecida. */
  DEGRADA: 'DEGRADA',
  /** Nao afeta o resultado, e contexto que o cliente deve saber. */
  INFORMA: 'INFORMA',
});

export class Lacunas {
  constructor(ferramenta) {
    this.ferramenta = ferramenta;
    /** @type {Array<{codigo:string, gravidade:string, mensagem:string, comoResolver:string|null, pressuposto:string|null}>} */
    this.itens = [];
  }

  declara(codigo, gravidade, mensagem, { comoResolver = null, pressuposto = null } = {}) {
    if (!Object.values(GRAVIDADE).includes(gravidade)) {
      throw new Error(`Gravidade invalida: ${gravidade}`);
    }
    if (!mensagem || mensagem.length < 10) {
      throw new Error(`Lacuna ${codigo} sem mensagem util. Escreve o que falta em portugues corrente.`);
    }
    if (this.itens.some((i) => i.codigo === codigo)) return this;
    this.itens.push({ codigo, gravidade, mensagem, comoResolver, pressuposto });
    return this;
  }

  get bloqueia() {
    return this.itens.some((i) => i.gravidade === GRAVIDADE.BLOQUEIA);
  }

  get vazio() {
    return this.itens.length === 0;
  }

  /** Ordenadas por gravidade, para a UI mostrar as que bloqueiam primeiro. */
  lista() {
    const ordem = { BLOQUEIA: 0, DEGRADA: 1, INFORMA: 2 };
    return [...this.itens].sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);
  }

  toJSON() {
    return { ferramenta: this.ferramenta, itens: this.lista() };
  }
}
