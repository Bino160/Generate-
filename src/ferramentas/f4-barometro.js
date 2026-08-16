/**
 * F4. Barometro de clinicas privadas.
 *
 * O unico ativo que nao se copia. E a razao de a recolha ter de comecar hoje,
 * mesmo que o relatorio so saia daqui a um ano: se arrancar depois do F1,
 * perde-se um ano de dados que nunca se recupera.
 *
 * Porque nao e um inquerito: a autosselecao destroi o resultado. Respondem as
 * clinicas organizadas, que sao as melhores, e o benchmark sai inflacionado. E
 * pede-se taxa de ocupacao a quem nao sabe calcular taxa de ocupacao. A fonte
 * primaria e o SAF-T e a formula e a nossa, o que elimina o problema de
 * definicao, que e o verdadeiro problema dos benchmarks em saude.
 *
 * O RGPD aqui e requisito de desenho, nao aviso legal. O que sobe sao agregados
 * de uma clinica, nunca linhas, e o auditor de fuga corre sobre o payload antes
 * de qualquer transmissao. Se encontrar um identificador, a contribuicao nao
 * segue.
 */

import { Resultado } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { quartis, percentilDe } from '../core/estatistica.js';
import { porUnidade } from '../core/dinheiro.js';
import { auditaFugaDeIdentificadores } from '../core/anonimizacao.js';
import { publicavel } from '../core/benchmark.js';

/**
 * Indicadores do barometro. Calculados por nos, a partir do SAF-T e do perfil.
 * Nenhum e autorreportado.
 */
export const INDICADORES = [
  { id: 'receita-por-hora-gabinete', nome: 'Receita por hora-gabinete disponivel', unidade: 'CENT_POR_HORA' },
  { id: 'receita-por-dia-util', nome: 'Receita por dia util clinico', unidade: 'CENT_POR_DIA' },
  { id: 'ticket-medio', nome: 'Valor medio por ato', unidade: 'CENT' },
  { id: 'atos-por-hora-gabinete', nome: 'Atos por hora-gabinete disponivel', unidade: 'NUMERO' },
  { id: 'concentracao-entidades', nome: 'Peso da maior entidade pagadora', unidade: 'FRACAO' },
  { id: 'retencao-12m', nome: 'Pacientes com segundo ato em 12 meses', unidade: 'FRACAO' },
  { id: 'peso-consumidor-final', nome: 'Peso de faturacao sem paciente identificado', unidade: 'FRACAO' },
];

/**
 * Calcula os indicadores de uma clinica.
 * @param {object} saft resultado de analisaSaft
 * @param {object} contexto { horasGabineteDisponiveis, diasUteis, receitaPorEntidadeCent }
 */
export function calculaIndicadores(saft, contexto) {
  const { horasGabinete, diasUteis, receitaPorEntidadeCent = {} } = contexto;
  const receitaCent = saft.resumo.receitaCent;
  const nAtos = saft.documentosValidos.reduce((a, d) => a + (d.sinal > 0 ? d.linhas.length : 0), 0);

  const totalEntidades = Object.values(receitaPorEntidadeCent).reduce((a, b) => a + b, 0);
  const maiorEntidade = totalEntidades > 0
    ? Math.max(...Object.values(receitaPorEntidadeCent)) / totalEntidades
    : null;

  // Retencao. Fracao de pacientes identificados com pelo menos dois atos em
  // meses distintos dentro da janela do ficheiro.
  const mesesPorPaciente = new Map();
  for (const d of saft.documentosValidos) {
    if (!d.pseudonimo || d.consumidorFinal || !d.mes) continue;
    const s = mesesPorPaciente.get(d.pseudonimo) ?? new Set();
    s.add(d.mes);
    mesesPorPaciente.set(d.pseudonimo, s);
  }
  const comRetorno = [...mesesPorPaciente.values()].filter((s) => s.size >= 2).length;
  const retencao = mesesPorPaciente.size > 0 ? comRetorno / mesesPorPaciente.size : null;

  return {
    'receita-por-hora-gabinete': horasGabinete ? porUnidade(receitaCent, horasGabinete) : null,
    'receita-por-dia-util': diasUteis ? porUnidade(receitaCent, diasUteis) : null,
    'ticket-medio': nAtos ? porUnidade(receitaCent, nAtos) : null,
    'atos-por-hora-gabinete': horasGabinete ? nAtos / horasGabinete : null,
    'concentracao-entidades': maiorEntidade,
    'retencao-12m': retencao,
    'peso-consumidor-final': saft.resumo.fracaoConsumidorFinal,
  };
}

/** Chave de estrato. Ver pressuposto P-01 quanto a revisao da CAE. */
export function chaveEstrato(perfil) {
  const cae = perfil.identificacao?.cae ?? 'SEM-CAE';
  const gabinetes = (perfil.capacidade?.gabinetes ?? []).length;
  const escalao = gabinetes <= 2 ? '1-2' : gabinetes <= 5 ? '3-5' : gabinetes <= 10 ? '6-10' : '11+';
  const nuts = perfil.identificacao?.nutsII ?? 'SEM-NUTS';
  return `${cae}|${escalao}|${nuts}`;
}

/**
 * Constroi a contribuicao que sobe para o barometro.
 *
 * Sobem agregados, nunca linhas. Sem pseudonimos, sem numeros de documento, sem
 * datas ao dia. A contribuicao passa pelo auditor de fuga antes de existir.
 */
export function constroiContribuicao({ indicadores, perfil, periodo, consentimento }) {
  if (consentimento !== true) {
    return {
      pronta: false,
      motivo: 'Sem consentimento expresso nao ha contribuicao. Nada sai do browser.',
      payload: null,
    };
  }

  const payload = {
    versao: 1,
    periodo: { inicio: periodo.inicio?.slice(0, 7) ?? null, fim: periodo.fim?.slice(0, 7) ?? null },
    estrato: chaveEstrato(perfil),
    revisaoCae: valor('P-01').revisao,
    subsetor: perfil.identificacao?.subsetor || null,
    indicadores: Object.fromEntries(
      INDICADORES.map((i) => [i.id, indicadores[i.id] ?? null]),
    ),
  };

  const fugas = auditaFugaDeIdentificadores(payload);
  if (fugas.length > 0) {
    return {
      pronta: false,
      motivo: 'O auditor encontrou possiveis identificadores no agregado. A contribuicao foi bloqueada.',
      fugas,
      payload: null,
    };
  }

  return { pronta: true, payload, auditado: true };
}

/**
 * Devolucao instantanea. E o que faz o modelo funcionar: sem percentil imediato,
 * ninguem carrega o ficheiro.
 */
export function percentilImediato(indicadores, observacoesDoEstrato) {
  const resultado = {};
  for (const ind of INDICADORES) {
    const valores = (observacoesDoEstrato[ind.id] ?? []).filter(Number.isFinite);
    const meu = indicadores[ind.id];
    if (meu == null) {
      resultado[ind.id] = { disponivel: false, motivo: 'INDICADOR_NAO_CALCULAVEL' };
      continue;
    }
    if (!publicavel(valores.length)) {
      resultado[ind.id] = {
        disponivel: false,
        motivo: 'ESTRATO_ABAIXO_DO_MINIMO',
        n: valores.length,
        nMinimo: valor('P-18').nMinimo,
        meuValor: meu,
      };
      continue;
    }
    resultado[ind.id] = {
      disponivel: true,
      meuValor: meu,
      percentil: percentilDe(meu, valores),
      quartis: quartis(valores),
      n: valores.length,
    };
  }
  return resultado;
}

/**
 * Publica um estrato. Mediana e quartis, nunca media, e nunca abaixo de cinco.
 */
export function publicaEstrato(chave, observacoes, { revisaoCae, subsetor = null } = {}) {
  const saida = { chave, revisaoCae, subsetor, indicadores: {}, publicavel: true };
  for (const ind of INDICADORES) {
    const valores = (observacoes[ind.id] ?? []).filter(Number.isFinite);
    if (!publicavel(valores.length)) {
      saida.indicadores[ind.id] = { publicavel: false, n: valores.length };
      saida.publicavel = false;
      continue;
    }
    saida.indicadores[ind.id] = { publicavel: true, n: valores.length, ...quartis(valores) };
  }
  return saida;
}

/**
 * Ferramenta completa, na perspetiva de quem carrega o ficheiro.
 */
export function barometro({ saft, perfil, contexto, observacoesDoEstrato = {}, consentimento = false, periodo }) {
  const r = new Resultado('F4', 'Barometro de clinicas privadas');
  r.usaPressuposto('P-01').usaPressuposto('P-18');

  const indicadores = calculaIndicadores(saft, contexto);
  const naoCalculaveis = INDICADORES.filter((i) => indicadores[i.id] == null);
  if (naoCalculaveis.length > 0) {
    r.lacunas.declara('F4-INDICADORES-EM-FALTA', GRAVIDADE.DEGRADA,
      `Nao consegui calcular ${naoCalculaveis.length} indicadores: ${naoCalculaveis.map((i) => i.nome).join(', ')}. ` +
      'Ficam de fora da minha posicao e da contribuicao.',
      { comoResolver: 'Completar o perfil, sobretudo gabinetes e correspondencia de entidades.' });
  }

  const estrato = chaveEstrato(perfil);
  const percentis = percentilImediato(indicadores, observacoesDoEstrato);
  const semDimensao = Object.entries(percentis).filter(([, v]) => v.motivo === 'ESTRATO_ABAIXO_DO_MINIMO');
  if (semDimensao.length > 0) {
    const n = semDimensao[0][1].n;
    r.lacunas.declara('F4-ESTRATO-PEQUENO', GRAVIDADE.INFORMA,
      `O estrato ${estrato} tem ${n} clinicas e o minimo para publicar sao ${valor('P-18').nMinimo}. ` +
      'O n aparece sempre a vista. Um barometro com n de catorze e o n visivel vale mais do que um ' +
      'inquerito com n de duzentos e enviesamento escondido.',
      { pressuposto: 'P-18' });
  }

  r.acrescentaBloco({
    id: 'a-minha-posicao',
    titulo: 'A minha posicao',
    tipo: 'percentis',
    dados: { estrato, indicadores, percentis },
  });

  const contribuicao = constroiContribuicao({ indicadores, perfil, periodo, consentimento });
  r.acrescentaBloco({
    id: 'contribuicao',
    titulo: 'O que sai desta pagina',
    tipo: 'privacidade',
    dados: {
      ...contribuicao,
      explicacao:
        'O ficheiro SAF-T e lido dentro do browser. Os identificadores de paciente sao substituidos por ' +
        'um pseudonimo com chave aleatoria que nunca sai da memoria desta pagina. Para o barometro sobem ' +
        'apenas os agregados que estao aqui em cima, sem uma unica linha de faturacao e sem datas ao dia.',
    },
  });

  const disponiveis = Object.values(percentis).filter((p) => p.disponivel).length;
  r.defineVeredito(
    disponiveis === 0
      ? `Ainda nao ha comparacao possivel no estrato ${estrato}. Os indicadores ficam calculados e entram na base assim que o estrato chegar a ${valor('P-18').nMinimo} clinicas.`
      : `${disponiveis} indicadores comparados contra o estrato ${estrato}.`,
    { severidade: 'NEUTRO' },
  );

  return r;
}
