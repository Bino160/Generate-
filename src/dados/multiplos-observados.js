/**
 * Multiplos de transacao.
 *
 * Ver pressuposto P-03. So existem referencias internacionais e sao usadas
 * exclusivamente como intervalo de sensibilidade, nunca como avaliacao.
 *
 * Se aparecerem transacoes portuguesas observadas, entram em
 * transacoesPortuguesas. Tres observacoes portuguesas etiquetadas valem mais
 * numa reuniao do que um intervalo americano, e o F3 passa a mostra-las
 * primeiro.
 */

import { Referencia, NIVEL, ORIGEM } from '../core/benchmark.js';

export const referenciaMultiplosInternacional = new Referencia({
  metrica: 'multiplo-ebitda-dentaria',
  nivel: NIVEL.FINANCEIRO,
  origem: ORIGEM.INTERNACIONAL,
  fonte: 'Referencias de mercado de medicina dentaria, Estados Unidos',
  ano: 2026,
  unidade: 'multiplo de EBITDA ajustado',
  nota:
    'Portugal negoceia abaixo destes intervalos, por haver menos compradores e ' +
    'maior dependencia do fundador. Usar como limite superior, nunca como esperado.',
  estratos: [
    {
      chave: 'dentaria-local-unico',
      descricao: 'Clinica de medicina dentaria, local unico',
      n: null,
      publicavel: true,
      valores: { min: 5, max: 8 },
    },
    {
      chave: 'dentaria-multi-local',
      descricao: 'Plataforma de medicina dentaria, multi-local',
      n: null,
      publicavel: true,
      valores: { min: 8, max: 11 },
    },
  ],
});

/**
 * Transacoes portuguesas observadas.
 * Vazio ate haver dados. Formato esperado por entrada:
 * { ano, cae, dimensao, multiploEbitda, fonte, publica: boolean, nota }
 */
export const transacoesPortuguesas = [];

export const estadoMultiplos = {
  temDadosPortugueses: transacoesPortuguesas.length > 0,
  exigeIntroducaoManual: true,
  avisoObrigatorio:
    'Nenhum numero produzido por esta ferramenta e uma avaliacao. E uma analise de ' +
    'sensibilidade em torno de um multiplo introduzido por quem a usa.',
};
