/**
 * Dinheiro em centimos inteiros.
 *
 * Motivo: 0.1 + 0.2 !== 0.3. Numa ponte de EBITDA com quarenta ajustamentos o
 * erro de virgula flutuante torna-se visivel no relatorio e destroi a confianca
 * do cliente num documento onde o unico produto e a confianca.
 *
 * Convencao em toda a base de codigo:
 *   - quantidades monetarias sao inteiros em centimos, com sufixo Cent
 *   - taxas e racios sao fracoes 0..1, nunca percentagens
 *   - a conversao acontece so na fronteira: parser a entrar, formatador a sair
 */

/** Converte uma string decimal para centimos sem passar por virgula flutuante. */
export function centDeDecimal(texto) {
  if (typeof texto === 'number') return centDeNumero(texto);
  if (texto == null) return 0;
  const s = String(texto).trim().replace(/\s/g, '');
  if (s === '') return 0;

  const m = /^([+-]?)(\d*)(?:[.,](\d*))?$/.exec(s);
  if (!m) throw new TypeError(`Valor monetario invalido: ${JSON.stringify(texto)}`);

  const sinal = m[1] === '-' ? -1 : 1;
  const inteiro = m[2] || '0';
  const fracao = m[3] || '';

  const centesimos = (fracao + '00').slice(0, 2);
  // Terceira casa decimal arredonda a segunda, meio para cima em valor absoluto.
  const terceira = fracao.length > 2 ? Number(fracao[2]) : 0;
  let total = Number(inteiro) * 100 + Number(centesimos);
  if (terceira >= 5) total += 1;
  return sinal * total;
}

/** Converte um numero em euros para centimos. Usar so quando a origem ja e number. */
export function centDeNumero(euros) {
  if (!Number.isFinite(euros)) throw new TypeError(`Valor monetario nao finito: ${euros}`);
  return Math.round(euros * 100);
}

/** Centimos para euros como number. Usar so para formatar ou para racios. */
export function euros(cent) {
  return cent / 100;
}

/** Aplica uma taxa a um montante, arredondando meio para cima em valor absoluto. */
export function aplicaTaxa(cent, taxa) {
  if (!Number.isFinite(taxa)) throw new TypeError(`Taxa nao finita: ${taxa}`);
  const bruto = cent * taxa;
  return bruto < 0 ? -Math.round(-bruto) : Math.round(bruto);
}

/** Soma segura de centimos. Rejeita nao inteiros para apanhar euros mal convertidos. */
export function soma(lista) {
  let t = 0;
  for (const v of lista) {
    if (!Number.isInteger(v)) {
      throw new TypeError(`Esperava centimos inteiros na soma, recebi ${v}`);
    }
    t += v;
  }
  return t;
}

/**
 * Divide um montante por um denominador nao monetario e devolve centimos.
 * Exemplo: centimos por hora.
 */
export function porUnidade(cent, unidades) {
  if (!Number.isFinite(unidades) || unidades === 0) return null;
  const bruto = cent / unidades;
  return bruto < 0 ? -Math.round(-bruto) : Math.round(bruto);
}

/** Racio entre dois montantes. Devolve null se o denominador for zero. */
export function racio(numeradorCent, denominadorCent) {
  if (denominadorCent === 0) return null;
  return numeradorCent / denominadorCent;
}

const formatador = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatadorCompacto = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formata centimos em euros, pt-PT. */
export function formata(cent, { compacto = false } = {}) {
  if (cent == null || !Number.isFinite(cent)) return 'n/d';
  return compacto ? formatadorCompacto.format(cent / 100) : formatador.format(cent / 100);
}

/** Formata uma fracao 0..1 como percentagem pt-PT. */
export function formataPercentagem(fracao, casas = 1) {
  if (fracao == null || !Number.isFinite(fracao)) return 'n/d';
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(fracao);
}
