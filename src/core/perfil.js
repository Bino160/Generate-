/**
 * Perfil de cliente.
 *
 * E isto que torna o retainer viavel. O modo de falha real de um retainer nao e
 * analitico, e logistico: ao terceiro mes o cliente deixa de enviar os dados. O
 * perfil e preenchido uma vez e consumido pelas sete ferramentas, e o que se
 * pede todos os meses reduz-se a tres coisas: SAF-T, agenda e saldo bancario.
 *
 * O validador nao rejeita perfis incompletos. Devolve o que falta e o que fica
 * por calcular por causa disso, porque um perfil incompleto e o estado normal
 * no primeiro mes e bloquear a ferramenta ai perde o cliente.
 */

import { valor } from '../config/pressupostos.js';

export const VERSAO_PERFIL = 1;

export const REGIOES = ['CONTINENTE', 'MADEIRA', 'ACORES'];

export function perfilVazio() {
  return {
    versaoPerfil: VERSAO_PERFIL,
    identificacao: { nome: '', cae: '', subsetor: '', regiao: 'CONTINENTE', nGabinetes: null },
    capacidade: {
      gabinetes: [],
      diasSemanaAbertos: [1, 2, 3, 4, 5],
      horasPorDia: 8,
      encerramentos: [],
      feriadosMunicipais: [],
    },
    custos: { fixosMensaisCent: null, rubricas: [] },
    equipa: [],
    precario: [],
    convencoes: [],
    correspondenciaEntidades: [],
    fiscal: {
      regimeIva: 'ISENTO_ART9',
      proRataDedutivel: null,
      temAtividadeTributada: false,
      sociedadeProfissionais: false,
    },
    tesouraria: { saldoCent: null, diasTesourariaAlvo: valor('P-16').diasTesourariaMinimos },
    integracoes: { mapeamentoOrcamentos: null },
  };
}

/**
 * Campos obrigatorios por ferramenta.
 * A chave e o codigo da ferramenta, o valor e a lista de caminhos necessarios
 * e o que deixa de ser calculavel sem eles.
 */
export const REQUISITOS = {
  F1: [
    { caminho: 'capacidade.gabinetes', perdeSe: 'metricas por hora-gabinete e taxa de ocupacao' },
    { caminho: 'custos.fixosMensaisCent', perdeSe: 'ponto critico e dias de tesouraria' },
    { caminho: 'tesouraria.saldoCent', perdeSe: 'projecao de tesouraria a 13 semanas' },
  ],
  F2: [
    { caminho: 'convencoes', perdeSe: 'toda a analise. O F2 nao corre sem convencoes definidas' },
    { caminho: 'correspondenciaEntidades', perdeSe: 'ligacao entre linhas de SAF-T e entidade pagadora' },
    { caminho: 'precario', perdeSe: 'comparacao com o preco privado deslocado' },
  ],
  F3: [
    { caminho: 'equipa', perdeSe: 'indice de transferibilidade, que e o indicador que move o multiplo' },
    { caminho: 'fiscal', perdeSe: 'testes de conformidade fiscal' },
  ],
  F5: [
    { caminho: 'integracoes.mapeamentoOrcamentos', perdeSe: 'leitura do ficheiro de orcamentos' },
  ],
  F6: [
    { caminho: 'fiscal.regimeIva', perdeSe: 'tratamento do IVA do investimento, que e a alavanca da ferramenta' },
    { caminho: 'capacidade.gabinetes', perdeSe: 'custo de oportunidade do espaco' },
  ],
  F7: [
    { caminho: 'equipa', perdeSe: 'custo efetivo por hora-gabinete' },
    { caminho: 'fiscal.sociedadeProfissionais', perdeSe: 'conclusao sobre distribuicao de resultados' },
  ],
};

function le(objeto, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), objeto);
}

function preenchido(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

/** Valida a estrutura. Erros bloqueiam, avisos nao. */
export function valida(perfil) {
  const erros = [];
  const avisos = [];

  if (!perfil || typeof perfil !== 'object') {
    return { valido: false, erros: ['O perfil nao e um objeto.'], avisos: [] };
  }
  if (perfil.versaoPerfil !== VERSAO_PERFIL) {
    erros.push(`Versao de perfil ${perfil.versaoPerfil} nao suportada. Esperada ${VERSAO_PERFIL}.`);
  }
  if (!REGIOES.includes(perfil.identificacao?.regiao)) {
    erros.push(`Regiao invalida. Tem de ser uma de ${REGIOES.join(', ')}.`);
  }

  const ids = new Set();
  for (const g of perfil.capacidade?.gabinetes ?? []) {
    if (!g.id) erros.push('Ha um gabinete sem identificador.');
    else if (ids.has(g.id)) erros.push(`Gabinete com identificador repetido: ${g.id}.`);
    else ids.add(g.id);
    if (g.horasPorDia != null && (g.horasPorDia <= 0 || g.horasPorDia > 24)) {
      erros.push(`Gabinete ${g.id} com horas por dia fora do intervalo plausivel.`);
    }
  }

  const nDeclarado = perfil.identificacao?.nGabinetes;
  const nReal = (perfil.capacidade?.gabinetes ?? []).length;
  if (nDeclarado != null && nReal > 0 && nDeclarado !== nReal) {
    avisos.push(
      `A identificacao declara ${nDeclarado} gabinetes mas so ${nReal} estao detalhados. ` +
      'A capacidade usa os detalhados, portanto esta subavaliada.',
    );
  }

  for (const c of perfil.convencoes ?? []) {
    if (!c.id) erros.push('Ha uma convencao sem identificador.');
    if (c.prazoRecebimentoDias != null && c.prazoRecebimentoDias < 0) {
      erros.push(`Convencao ${c.id} com prazo de recebimento negativo.`);
    }
  }

  if (perfil.fiscal?.regimeIva === 'MISTO' && perfil.fiscal.proRataDedutivel == null) {
    avisos.push('Regime de IVA misto sem pro rata indicado. O F6 vai pedir o valor ou usar afetacao real.');
  }
  if (perfil.fiscal?.temAtividadeTributada && perfil.fiscal.regimeIva === 'ISENTO_ART9') {
    avisos.push(
      'O perfil diz que ha atividade tributada mas o regime esta como isento pelo artigo 9.o. ' +
      'Uma das duas coisas esta errada e o tratamento do IVA no F6 depende disto.',
    );
  }

  return { valido: erros.length === 0, erros, avisos };
}

/** O que falta para uma ferramenta correr por inteiro. */
export function requisitosEmFalta(perfil, ferramenta) {
  const reqs = REQUISITOS[ferramenta] ?? [];
  return reqs
    .filter((r) => !preenchido(le(perfil, r.caminho)))
    .map((r) => ({ campo: r.caminho, perdeSe: r.perdeSe }));
}

/** Percentagem de completude do perfil, por ferramenta e global. */
export function completude(perfil) {
  const porFerramenta = {};
  let total = 0;
  let cheios = 0;
  for (const [f, reqs] of Object.entries(REQUISITOS)) {
    const ok = reqs.filter((r) => preenchido(le(perfil, r.caminho))).length;
    porFerramenta[f] = reqs.length === 0 ? 1 : ok / reqs.length;
    total += reqs.length;
    cheios += ok;
  }
  return { global: total === 0 ? 1 : cheios / total, porFerramenta };
}

/**
 * Resolve a entidade pagadora de uma linha de documento.
 * Ver a limitacao estrutural documentada em saft.js: o SAF-T nao tem este campo.
 */
export function criaCorrespondencia(perfil) {
  const regras = perfil.correspondenciaEntidades ?? [];
  const compiladas = regras.map((r) => ({
    entidade: r.entidade,
    campo: r.campo ?? 'produto',
    padrao: new RegExp(r.padrao, 'i'),
  }));

  return {
    regras: compiladas.length,
    resolve(documento, linha) {
      for (const r of compiladas) {
        const alvo = r.campo === 'produto'
          ? (linha.produto ?? '')
          : r.campo === 'descricao'
            ? (linha.descricao ?? '')
            : String(documento[r.campo] ?? '');
        if (r.padrao.test(alvo)) return r.entidade;
      }
      return compiladas.length === 0 ? null : 'PRIVADO';
    },
  };
}

/** Taxa normal de IVA aplicavel a regiao do perfil. */
export function taxaIvaNormal(perfil) {
  const regiao = perfil.identificacao?.regiao ?? 'CONTINENTE';
  return valor('P-09')[regiao] ?? valor('P-09').CONTINENTE;
}
