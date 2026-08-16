/**
 * Estatistica minima, escrita para series curtas.
 *
 * Uma clinica tem 12 pontos de serie mensal, nao 12 mil. Todas as decisoes aqui
 * assumem n pequeno: desvio-padrao amostral com n-1, quantis por interpolacao
 * linear, e z-score deixando o proprio ponto de fora.
 */

export function media(xs) {
  const v = xs.filter(Number.isFinite);
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/** Desvio-padrao amostral, denominador n-1. Devolve null com menos de dois pontos. */
export function desvioPadrao(xs) {
  const v = xs.filter(Number.isFinite);
  if (v.length < 2) return null;
  const m = media(v);
  const soma = v.reduce((a, b) => a + (b - m) ** 2, 0);
  return Math.sqrt(soma / (v.length - 1));
}

export function mediana(xs) {
  return quantil(xs, 0.5);
}

/**
 * Quantil por interpolacao linear entre pontos da ordem, o metodo 7 do R.
 * Escolhido por ser o mais comum em relatorios financeiros e o que a Central de
 * Balancos usa na apresentacao de quartis.
 */
export function quantil(xs, p) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0];
  if (p <= 0) return v[0];
  if (p >= 1) return v[v.length - 1];
  const h = (v.length - 1) * p;
  const baixo = Math.floor(h);
  const alto = Math.ceil(h);
  if (baixo === alto) return v[baixo];
  return v[baixo] + (h - baixo) * (v[alto] - v[baixo]);
}

export function quartis(xs) {
  return { p25: quantil(xs, 0.25), mediana: quantil(xs, 0.5), p75: quantil(xs, 0.75) };
}

/**
 * Percentil em que um valor cai dentro de uma distribuicao de referencia.
 * Devolve fracao 0..1.
 */
export function percentilDe(valor, distribuicao) {
  const v = distribuicao.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0 || !Number.isFinite(valor)) return null;
  let abaixo = 0;
  let iguais = 0;
  for (const x of v) {
    if (x < valor) abaixo += 1;
    else if (x === valor) iguais += 1;
  }
  return (abaixo + iguais / 2) / v.length;
}

/**
 * Z-score de um ponto contra a propria serie, excluindo o ponto do calculo da
 * media e do desvio.
 *
 * Porque leave-one-out: com 12 pontos, incluir o proprio ponto puxa a media na
 * sua direcao e comprime o z, exatamente no caso em que o ponto e anomalo. O
 * efeito nao e residual a este n, chega a esconder desvios reais de 1,5 sigma.
 */
export function zScoreExcluindoProprio(valor, serieCompleta, indice) {
  const resto = serieCompleta.filter((_, i) => i !== indice).filter(Number.isFinite);
  if (resto.length < 2) return null;
  const m = media(resto);
  const s = desvioPadrao(resto);
  if (s == null || s === 0) return null;
  return (valor - m) / s;
}

/** Media movel simples dos ultimos n pontos antes do indice, exclusive. */
export function mediaMovelAnterior(serie, indice, n) {
  const inicio = Math.max(0, indice - n);
  const janela = serie.slice(inicio, indice).filter(Number.isFinite);
  if (janela.length < n) return null;
  return media(janela);
}

/** Variacao relativa entre dois valores. Devolve null se a base for zero ou nula. */
export function variacao(atual, base) {
  if (!Number.isFinite(atual) || !Number.isFinite(base) || base === 0) return null;
  return (atual - base) / Math.abs(base);
}
