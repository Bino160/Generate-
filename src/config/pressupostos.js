/**
 * Ponto unico de verdade para tudo o que ainda nao esta confirmado.
 *
 * Regra: nenhum motor pode ter um numero magico de dominio. Se um valor
 * precisa de decisao humana, entra aqui com um identificador P-nn e uma nota.
 * O teste tests/pressupostos.test.mjs falha se um pressuposto ficar sem nota
 * ou sem estado.
 *
 * Documentacao completa: docs/PRESSUPOSTOS.md
 */

export const ESTADO = Object.freeze({
  POR_CONFIRMAR: 'POR_CONFIRMAR',
  CONFIRMADO: 'CONFIRMADO',
  DADOS_POR_CARREGAR: 'DADOS_POR_CARREGAR',
});

/** @type {Record<string, {id:string, assunto:string, estado:string, nota:string, valor:any}>} */
export const pressupostos = {
  'P-01': {
    id: 'P-01',
    assunto: 'Codigos CAE dos estratos do barometro',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Codigos da CAE-Rev.3. Confirmar a revisao aplicavel ao exercicio em analise. ' +
      'O estrato 86905 e heterogeneo e deve ser segmentado pelo campo subsetor.',
    valor: {
      revisao: 'CAE-Rev.3',
      codigos: [
        { cae: '86210', designacao: 'Pratica medica de clinica geral, em ambulatorio' },
        { cae: '86220', designacao: 'Pratica medica de clinica especializada, em ambulatorio' },
        { cae: '86230', designacao: 'Medicina dentaria e odontologia' },
        { cae: '86903', designacao: 'Atividades de enfermagem' },
        { cae: '86905', designacao: 'Outras atividades de saude humana, n.e.', heterogeneo: true },
        { cae: '96040', designacao: 'Atividades de bem-estar fisico', saude: false },
      ],
    },
  },

  'P-02': {
    id: 'P-02',
    assunto: 'Exports de orcamentos do software clinico',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Nenhum dos quatro softwares foi confirmado contra fonte. O F5 deteta a ' +
      'capacidade do ficheiro em vez de assumir formato. Confirmar o iMED.',
    valor: {
      softwaresPorConfirmar: ['iMED', 'Doctusware', 'OrisDent', 'Gestrato'],
      niveis: ['COMPLETO', 'PARCIAL', 'MINIMO'],
    },
  },

  'P-03': {
    id: 'P-03',
    assunto: 'Multiplos de transacao',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'So existem referencias internacionais. Nunca apresentar como avaliacao. ' +
      'Se houver transacoes portuguesas observadas, carregar em src/dados/multiplos-observados.js',
    valor: {
      multiploPorDefeito: null,
      exigeIntroducaoManual: true,
    },
  },

  'P-04': {
    id: 'P-04',
    assunto: 'F1, o mes anterior nunca dispara alerta',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Principio aceite. Adicionei a classe rutura de nivel para o caso em que o ' +
      'mes anterior e o unico sinal disponivel. Ver docs/PRESSUPOSTOS.md P-04.',
    valor: {
      mesAnteriorDisparaAlerta: false,
      detetaRuturaDeNivel: true,
      quedaMinimaRutura: 0.25,
    },
  },

  'P-05': {
    id: 'P-05',
    assunto: 'Cedula OCC e co-assinatura de conclusoes fiscais',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Assumido sem cedula. Com false, exportar conclusoes fiscais ou juridicas do ' +
      'F3 e do F7 exige identificacao do parceiro co-signatario.',
    valor: { cedulaOCC: false },
  },

  'P-06': {
    id: 'P-06',
    assunto: 'Taxa de contribuicao de entidade contratante',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Artigos 140.o e 168.o n.o 7 do Codigo Contributivo. Confirmar vigencia em 2026.',
    valor: { escaloes: [
      { dependenciaMin: 0.50, dependenciaMax: 0.80, taxa: 0.07 },
      { dependenciaMin: 0.80, dependenciaMax: 1.01, taxa: 0.10 },
    ] },
  },

  'P-07': {
    id: 'P-07',
    assunto: 'Prescricao de contribuicoes a Seguranca Social',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Usado para dimensionar contingencia no F3 e no F7. Confirmar com o parceiro.',
    valor: { anos: 5 },
  },

  'P-08': {
    id: 'P-08',
    assunto: 'Juros compensatorios em IVA',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Taxa de juro legal. Confirmar valor em vigor e eventual acumulacao com juros de mora.',
    valor: { taxaAnual: 0.04 },
  },

  'P-21': {
    id: 'P-21',
    assunto: 'Base de calculo do IVA em falta sobre atos indevidamente isentos',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Se um ato nao terapeutico foi faturado como isento, o imposto em falta pode ser liquidado por ' +
      'fora do preco cobrado, base vezes 23%, ou considerado ja incluido nesse preco, base vezes ' +
      '23/123. A diferenca e de 23% para 18,7% da base e num passivo de cinco anos e material. ' +
      'Assumi o cenario conservador, imposto por fora, e o F3 mostra os dois.',
    valor: { modo: 'ACRESCE_AO_PRECO', mostraAlternativa: true },
  },

  'P-09': {
    id: 'P-09',
    assunto: 'Taxa normal de IVA por regiao',
    estado: ESTADO.CONFIRMADO,
    nota: 'Continente 23%, Madeira 22%, Acores 16%. O perfil de cliente indica a regiao.',
    valor: { CONTINENTE: 0.23, MADEIRA: 0.22, ACORES: 0.16 },
  },

  'P-10': {
    id: 'P-10',
    assunto: 'Periodo de regularizacao de bens de investimento',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Artigos 24.o e 25.o do CIVA. O F6 so trata bens moveis. Confirmar.',
    valor: { moveis: 5, imoveis: 20 },
  },

  'P-11': {
    id: 'P-11',
    assunto: 'Quotas de depreciacao para vida util de 4 anos',
    estado: ESTADO.CONFIRMADO,
    nota: 'DR 25/2009. Quota maxima 25%, quota minima 12,5%.',
    valor: { maxima: 0.25, minima: 0.125 },
  },

  'P-12': {
    id: 'P-12',
    assunto: 'Contribuicao de trabalhador independente',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Taxa de 21,4% sobre 70% do rendimento de prestacao de servicos. Confirmar base relevante.',
    valor: { taxa: 0.214, coeficienteBase: 0.70 },
  },

  'P-13': {
    id: 'P-13',
    assunto: 'Coeficiente do regime simplificado, categoria B',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Coeficiente 0,75 para servicos profissionais. Nao e universal, confirmar caso a caso.',
    valor: { coeficiente: 0.75 },
  },

  'P-14': {
    id: 'P-14',
    assunto: 'Limiar de ocupacao a partir do qual ha deslocacao de privado',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Escolhido por mim. E o parametro mais sensivel do F2. O motor usa deslocacao ' +
      'continua por faixa horaria, nao um degrau, mas este valor governa o aviso.',
    valor: { ocupacao: 0.85 },
  },

  'P-15': {
    id: 'P-15',
    assunto: 'Limiar de alerta estatistico do F1',
    estado: ESTADO.POR_CONFIRMAR,
    nota:
      'Vem da especificacao. Ver achado F-004: com 1,5 sigma e oito metricas, a taxa ' +
      'esperada de meses com pelo menos um falso alerta e alta. O motor mede-a e reporta.',
    valor: { sigma: 1.5, mesesMinimosParaCalibrar: 12 },
  },

  'P-16': {
    id: 'P-16',
    assunto: 'Limiares absolutos de risco',
    estado: ESTADO.CONFIRMADO,
    nota: 'Dias de tesouraria abaixo de 30 dispara sempre, mesmo sem serie calibrada.',
    valor: { diasTesourariaMinimos: 30 },
  },

  'P-17': {
    id: 'P-17',
    assunto: 'Completude minima do registo de orcamentos',
    estado: ESTADO.POR_CONFIRMAR,
    nota: 'Abaixo de 80% o F5 recusa mostrar taxa de aceitacao. Escolhido por mim.',
    valor: { completudeMinima: 0.80 },
  },

  'P-18': {
    id: 'P-18',
    assunto: 'Dimensao minima de estrato publicavel no barometro',
    estado: ESTADO.CONFIRMADO,
    nota: 'Nenhum estrato com menos de cinco clinicas. Mediana e quartis, nunca media.',
    valor: { nMinimo: 5 },
  },

  'P-19': {
    id: 'P-19',
    assunto: 'Feriados municipais',
    estado: ESTADO.CONFIRMADO,
    nota: 'Nao considerados por defeito. Entram por configuracao de cada clinica.',
    valor: { incluirPorDefeito: false },
  },

  'P-20': {
    id: 'P-20',
    assunto: 'Carnaval como dia de encerramento',
    estado: ESTADO.CONFIRMADO,
    nota: 'Nao e feriado obrigatorio. Tratado como encerramento opcional por clinica.',
    valor: { feriadoObrigatorio: false },
  },
};

/** Devolve o valor de um pressuposto, rebentando se o id nao existir. */
export function valor(id) {
  const p = pressupostos[id];
  if (!p) throw new Error(`Pressuposto desconhecido: ${id}`);
  return p.valor;
}

/** Lista dos pressupostos que ainda precisam de decisao humana. */
export function porConfirmar() {
  return Object.values(pressupostos).filter((p) => p.estado !== ESTADO.CONFIRMADO);
}

/** Referencia curta para mostrar no ecra junto a um numero derivado de pressuposto. */
export function etiqueta(id) {
  const p = pressupostos[id];
  if (!p) throw new Error(`Pressuposto desconhecido: ${id}`);
  return { id: p.id, assunto: p.assunto, estado: p.estado, nota: p.nota };
}
