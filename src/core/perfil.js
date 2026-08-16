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

// ---------------------------------------------------------------------------
// Vocabulario da equipa e da agenda
// ---------------------------------------------------------------------------

export const PAPEIS = [
  'Medico', 'Medico dentista', 'Enfermeiro', 'Psicologo', 'Nutricionista',
  'Higienista oral', 'Assistente clinico', 'Rececao', 'Administracao',
];

/**
 * O vinculo nao e um detalhe administrativo. Determina quem suporta a
 * contribuicao, se ha risco de reclassificacao, e como se calcula o liquido do
 * profissional. E a primeira pergunta do F7.
 */
export const VINCULOS = [
  { id: 'DEPENDENTE', nome: 'Contrato de trabalho' },
  { id: 'INDEPENDENTE', nome: 'Prestador de servicos' },
  { id: 'SOCIO', nome: 'Socio' },
];

export const MODELOS_REMUNERACAO = [
  { id: 'FIXO', nome: 'Fixo mensal' },
  { id: 'PERCENTAGEM', nome: 'Percentagem sobre producao' },
  { id: 'MISTO_COM_MINIMO', nome: 'Misto com minimo garantido' },
];

export const BASES_REMUNERACAO = [
  { id: 'PRODUCAO', nome: 'Sobre producao faturada' },
  { id: 'RECEBIDO', nome: 'Sobre valor recebido' },
];

export const DIAS_SEMANA = [
  { n: 1, nome: 'Segunda', curto: 'seg' },
  { n: 2, nome: 'Terca', curto: 'ter' },
  { n: 3, nome: 'Quarta', curto: 'qua' },
  { n: 4, nome: 'Quinta', curto: 'qui' },
  { n: 5, nome: 'Sexta', curto: 'sex' },
  { n: 6, nome: 'Sabado', curto: 'sab' },
  { n: 0, nome: 'Domingo', curto: 'dom' },
];

export const FAIXAS = [
  { id: 'manha', nome: 'Manha' },
  { id: 'tarde', nome: 'Tarde' },
];

export function chaveFaixa(dia, faixa) {
  return `${dia}-${faixa}`;
}

// ---------------------------------------------------------------------------
// Precario e convencoes
// ---------------------------------------------------------------------------

/**
 * Margem de um ato do precario privado.
 *
 * Devolve as duas leituras lado a lado de proposito. E a tese do F2 e o sitio
 * onde ela se aprende: quem preencher esta tabela ve, linha a linha, que o ato
 * mais rentavel por ato nao e o mais rentavel por hora.
 */
export function margensDoAto(ato) {
  const preco = ato.precoCent ?? 0;
  const custo = ato.custoVariavelCent ?? 0;
  const minutos = ato.duracaoMinutos ?? 0;
  const margemCent = preco - custo;
  return {
    margemCent,
    margemFracao: preco > 0 ? margemCent / preco : null,
    margemPorHoraCent: minutos > 0 ? Math.round(margemCent / (minutos / 60)) : null,
  };
}

/**
 * Constroi a lista de atos que o F2 espera para uma convencao.
 *
 * O catalogo de atos vive num sitio so, o precario, que e quem sabe a duracao e
 * o custo variavel. A convencao so acrescenta o que e dela: o preco que paga e o
 * volume. Duplicar a duracao em cada convencao era garantir que, ao fim de tres
 * convencoes, a mesma consulta tinha tres duracoes diferentes.
 */
export function atosDaConvencao(perfil, convencaoId) {
  const convencao = (perfil.convencoes ?? []).find((c) => c.id === convencaoId);
  if (!convencao) return [];
  const catalogo = new Map((perfil.precario ?? []).map((a) => [a.codigo, a]));

  return Object.entries(convencao.precos ?? {})
    .map(([codigo, linha]) => {
      const base = catalogo.get(codigo);
      if (!base || !linha || !linha.volumeMes) return null;
      return {
        codigo,
        nome: base.nome ?? codigo,
        precoCent: linha.precoCent ?? 0,
        custoVariavelCent: base.custoVariavelCent ?? 0,
        duracaoMinutos: base.duracaoMinutos ?? 0,
        volume: linha.volumeMes,
        glosaFracao: convencao.glosaFracao ?? 0,
      };
    })
    .filter(Boolean);
}

/** Atos privados equivalentes, ponderados pelo volume privado declarado. */
export function atosPrivados(perfil) {
  return (perfil.precario ?? [])
    .filter((a) => (a.volumeMes ?? 0) > 0 && (a.duracaoMinutos ?? 0) > 0)
    .map((a) => ({
      codigo: a.codigo,
      nome: a.nome ?? a.codigo,
      precoCent: a.precoCent ?? 0,
      custoVariavelCent: a.custoVariavelCent ?? 0,
      duracaoMinutos: a.duracaoMinutos,
      volume: a.volumeMes,
    }));
}

// ---------------------------------------------------------------------------
// Faixas horarias
// ---------------------------------------------------------------------------

/**
 * Horas-gabinete disponiveis por faixa horaria num mes.
 *
 * Deriva dos horarios dos gabinetes, nao se pergunta. Uma clinica que abre tres
 * gabinetes de manha e um a tarde tem duas capacidades diferentes no mesmo dia,
 * e e isso que torna a alocacao do F2 possivel.
 */
export function faixasDisponiveis(perfil, ano, mes, contaDias) {
  const gabinetes = perfil.capacidade?.gabinetes ?? [];
  const resultado = {};

  for (const dia of DIAS_SEMANA) {
    for (const faixa of FAIXAS) {
      resultado[chaveFaixa(dia.n, faixa.id)] = 0;
    }
  }

  for (const g of gabinetes) {
    const dias = g.diasSemanaAbertos ?? perfil.capacidade?.diasSemanaAbertos ?? [1, 2, 3, 4, 5];
    const horasDia = g.horasPorDia ?? perfil.capacidade?.horasPorDia ?? 8;
    const horasManha = g.horasManha ?? horasDia / 2;
    const horasTarde = Math.max(0, horasDia - horasManha);

    for (const dia of dias) {
      const ocorrencias = contaDias(ano, mes, dia);
      resultado[chaveFaixa(dia, 'manha')] += ocorrencias * horasManha;
      resultado[chaveFaixa(dia, 'tarde')] += ocorrencias * horasTarde;
    }
  }
  return resultado;
}

/**
 * Junta a capacidade derivada dos horarios com a ocupacao introduzida.
 * A ocupacao nao se estima. Ou vem da agenda, ou vem introduzida a mao, ou fica
 * por saber, e nesse caso a faixa devolve ocupacao nula.
 */
export function faixasComOcupacao(disponiveis, ocupacaoPorFaixa = {}) {
  const saida = {};
  for (const [chave, disponivel] of Object.entries(disponiveis)) {
    if (disponivel <= 0) continue;
    const ocupado = ocupacaoPorFaixa[chave];
    saida[chave] = {
      disponivel,
      ocupado: ocupado ?? null,
      livre: ocupado == null ? null : Math.max(0, disponivel - ocupado),
      ocupacao: ocupado == null ? null : ocupado / disponivel,
    };
  }
  return saida;
}

/** Total de horas ocupadas declaradas. Devolve null se nenhuma faixa foi preenchida. */
export function horasOcupadasDeclaradas(ocupacaoPorFaixa = {}) {
  const valores = Object.values(ocupacaoPorFaixa).filter((v) => Number.isFinite(v));
  return valores.length === 0 ? null : valores.reduce((a, b) => a + b, 0);
}

/**
 * Converte a equipa do perfil para o formato que o F7 consome.
 * A producao por profissional nao esta no perfil, chega a parte, porque muda
 * todos os meses e o perfil e o que nao muda.
 */
export function equipaParaRemuneracao(perfil, producaoPorProfissional = {}) {
  return (perfil.equipa ?? [])
    .filter((p) => p.vinculo !== 'DEPENDENTE' || p.modeloRemuneracao)
    .map((p) => {
      const producao = producaoPorProfissional[p.id] ?? {};
      return {
        id: p.id,
        nome: p.nome ?? p.id,
        vinculo: p.vinculo ?? 'INDEPENDENTE',
        producaoCent: producao.producaoCent ?? p.producaoMensalCent ?? 0,
        recebidoCent: producao.recebidoCent ?? null,
        percentagem: p.percentagem ?? 0,
        fixoMensalCent: p.fixoMensalCent ?? 0,
        minimoGarantidoCent: p.minimoGarantidoCent ?? 0,
        horasGabinete: p.horasGabineteMes ?? null,
        dependenciaEconomica: p.dependenciaEconomica ?? null,
        anosDeRelacao: p.anosDeRelacao ?? 1,
        taxaMarginalIrs: p.taxaMarginalIrs ?? 0.35,
        suporta: p.suporta ?? {},
        indicios: p.indicios ?? {},
      };
    });
}
