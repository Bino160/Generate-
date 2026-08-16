/**
 * Benchmark financeiro. Central de Balancos do Banco de Portugal, por CAE e
 * escalao de dimensao.
 *
 * Estado: DADOS_POR_CARREGAR.
 *
 * Este ficheiro esta deliberadamente vazio. Nao inventei medianas da Central de
 * Balancos, e a alternativa de aproximar de memoria seria pior do que a lacuna,
 * porque um benchmark plausivel mas errado atravessa a revisao e chega ao
 * cliente. Enquanto estiver vazio, o F1 e o F3 declaram a lacuna e entregam o
 * resto da analise.
 *
 * Para carregar: preencher estratos com dados extraidos da Central de Balancos,
 * um estrato por combinacao de CAE e escalao de dimensao, com o n efetivo. O
 * motor recusa publicar estratos com n abaixo de cinco.
 */

import { Referencia, NIVEL, ORIGEM } from '../core/benchmark.js';

export const METRICAS_ESPERADAS = [
  { id: 'margem-ebitda', unidade: 'fracao', descricao: 'EBITDA sobre volume de negocios' },
  { id: 'peso-pessoal', unidade: 'fracao', descricao: 'Gastos com pessoal sobre volume de negocios' },
  { id: 'peso-fse', unidade: 'fracao', descricao: 'Fornecimentos e servicos externos sobre volume de negocios' },
  { id: 'autonomia-financeira', unidade: 'fracao', descricao: 'Capital proprio sobre ativo' },
  { id: 'prazo-recebimento', unidade: 'dias', descricao: 'Prazo medio de recebimento' },
  { id: 'rendibilidade-capital', unidade: 'fracao', descricao: 'Resultado liquido sobre capital proprio' },
];

/** @type {Referencia[]} */
export const referenciasFinanceiras = [];

export const estadoDados = {
  carregado: false,
  fonte: 'Banco de Portugal, Central de Balancos',
  motivo:
    'Dados por carregar. Nenhuma metrica financeira de comparacao esta disponivel ' +
    'e as ferramentas declaram a lacuna em vez de apresentar um valor aproximado.',
  metricasEmFalta: METRICAS_ESPERADAS.map((m) => m.id),
};

void Referencia;
void NIVEL;
void ORIGEM;
