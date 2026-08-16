/**
 * Projecao de tesouraria a 13 semanas.
 *
 * Treze semanas porque e o horizonte em que uma clinica ainda consegue agir:
 * renegociar um prazo, adiar um investimento, cobrar uma entidade em atraso. A
 * doze meses a projecao e ficcao e a uma semana ja nao ha decisao.
 *
 * O ponto que distingue isto de uma folha de calculo: o momento de entrada de
 * cada euro depende da entidade que paga. Faturar em Marco a uma seguradora que
 * paga a 90 dias e receita de Marco e tesouraria de Junho. Projetar recebimentos
 * pela receita do mes e o erro que faz clinicas rentaveis ficarem sem dinheiro.
 */

import { aplicaTaxa } from './dinheiro.js';

const MS_SEMANA = 7 * 86400000;

/**
 * @param {object} entrada
 * @param {number} entrada.saldoInicialCent
 * @param {Array<{mes:string, receitaCent:number, porEntidade?:Record<string,number>}>} entrada.historico
 * @param {Record<string, number>} entrada.prazosPorEntidade dias medios de recebimento
 * @param {number} entrada.custosFixosMensaisCent
 * @param {number} entrada.custoVariavelFracao
 * @param {Array<{data:string, valorCent:number, descricao:string}>} [entrada.movimentosConhecidos]
 * @param {Array<{data:string, valorCent:number, entidade:string}>} [entrada.faturasEmAberto]
 *   faturas ja emitidas e por cobrar. Quando existem, as primeiras semanas
 *   deixam de ser projecao e passam a ser calendario.
 * @param {string} [entrada.dataInicio] ISO
 */
export function projeta13Semanas({
  saldoInicialCent,
  historico,
  prazosPorEntidade = {},
  custosFixosMensaisCent,
  custoVariavelFracao = 0,
  movimentosConhecidos = [],
  faturasEmAberto = [],
  dataInicio = new Date().toISOString().slice(0, 10),
}) {
  if (saldoInicialCent == null || !Number.isFinite(saldoInicialCent)) return null;
  if (!historico || historico.length === 0) return null;

  const recentes = historico.slice(-3);
  const receitaMediaCent = Math.round(
    recentes.reduce((a, m) => a + m.receitaCent, 0) / recentes.length,
  );

  // Reparticao da receita media por entidade, para aplicar o prazo de cada uma.
  const pesos = {};
  let totalPesos = 0;
  for (const m of recentes) {
    for (const [ent, v] of Object.entries(m.porEntidade ?? { PRIVADO: m.receitaCent })) {
      pesos[ent] = (pesos[ent] ?? 0) + v;
      totalPesos += v;
    }
  }
  if (totalPesos === 0) return null;

  const receitaSemanalPorEntidade = {};
  for (const [ent, v] of Object.entries(pesos)) {
    receitaSemanalPorEntidade[ent] = Math.round((receitaMediaCent * (v / totalPesos) * 12) / 52);
  }

  const inicio = new Date(`${dataInicio}T00:00:00Z`);
  const semanas = [];
  let saldo = saldoInicialCent;

  /*
   * Achado Fin-002. A versao anterior calculava o desfasamento de cada entidade
   * e depois nao o usava, porque com receita estavel o que entra numa semana e
   * sempre o mesmo valor independentemente do atraso. Isso e verdade em regime
   * permanente e falso exatamente quando interessa: nas primeiras semanas, em
   * que o que entra ja esta faturado e e conhecido.
   *
   * A correcao: se houver faturas em aberto, as primeiras semanas usam-nas em
   * vez da media. So a partir do momento em que a carteira em aberto se esgota e
   * que se passa a projetar pela media. Sem faturas em aberto, a limitacao fica
   * declarada em baseDeEstimativa.
   */
  const agendaDeCobranca = new Map();
  for (const f of faturasEmAberto) {
    const prazo = prazosPorEntidade[f.entidade] ?? 0;
    const previsao = new Date(new Date(`${f.data}T00:00:00Z`).getTime() + prazo * 86400000);
    const semanaPrevista = Math.max(1, Math.ceil((previsao - inicio) / MS_SEMANA));
    if (semanaPrevista > 13) continue;
    agendaDeCobranca.set(semanaPrevista, (agendaDeCobranca.get(semanaPrevista) ?? 0) + f.valorCent);
  }
  const temCarteira = agendaDeCobranca.size > 0;

  const custoFixoSemanalCent = Math.round((custosFixosMensaisCent * 12) / 52);
  const custoVariavelSemanalCent = aplicaTaxa(
    Math.round((receitaMediaCent * 12) / 52),
    custoVariavelFracao,
  );

  for (let s = 1; s <= 13; s += 1) {
    const fim = new Date(inicio.getTime() + s * MS_SEMANA);

    let entradasCent = 0;
    const detalheEntradas = [];
    const daCarteiraCent = agendaDeCobranca.get(s) ?? 0;

    if (temCarteira && daCarteiraCent > 0) {
      entradasCent += daCarteiraCent;
      detalheEntradas.push({ origem: 'CARTEIRA_EM_ABERTO', valorCent: daCarteiraCent });
    }

    for (const [ent, semanalCent] of Object.entries(receitaSemanalPorEntidade)) {
      const prazoDias = prazosPorEntidade[ent] ?? 0;
      const semanasAtraso = Math.max(0, Math.round(prazoDias / 7));
      // O que entra na semana s foi faturado ha semanasAtraso semanas. Se ainda
      // estamos dentro do periodo coberto pela carteira em aberto, essa fatura
      // ja foi contada acima e nao se conta outra vez.
      if (temCarteira && s <= semanasAtraso) continue;
      entradasCent += semanalCent;
      detalheEntradas.push({
        origem: 'PROJETADO', entidade: ent, valorCent: semanalCent, prazoDias, semanasAtraso,
      });
    }

    const conhecidos = movimentosConhecidos.filter((m) => {
      const d = new Date(`${m.data}T00:00:00Z`);
      return d > new Date(fim.getTime() - MS_SEMANA) && d <= fim;
    });
    const extraordinariosCent = conhecidos.reduce((a, m) => a + m.valorCent, 0);

    const saidasCent = custoFixoSemanalCent + custoVariavelSemanalCent;
    saldo = saldo + entradasCent - saidasCent + extraordinariosCent;

    semanas.push({
      semana: s,
      ate: fim.toISOString().slice(0, 10),
      entradasCent,
      saidasCent,
      extraordinariosCent,
      movimentos: conhecidos,
      saldoFinalCent: saldo,
      detalheEntradas,
    });
  }

  const minimo = semanas.reduce((a, b) => (b.saldoFinalCent < a.saldoFinalCent ? b : a));
  const primeiraNegativa = semanas.find((s) => s.saldoFinalCent < 0) ?? null;

  return {
    saldoInicialCent,
    semanas,
    saldoMinimoCent: minimo.saldoFinalCent,
    semanaDoMinimo: minimo.semana,
    primeiraSemanaNegativa: primeiraNegativa ? primeiraNegativa.semana : null,
    usouCarteiraEmAberto: temCarteira,
    baseDeEstimativa: temCarteira
      ? 'As primeiras semanas usam a carteira de faturas em aberto, com a data prevista de cobranca ' +
        'de cada uma. A partir do momento em que a carteira se esgota, o resto e projetado ao nivel ' +
        'medio dos ultimos tres meses, repartido pelo peso historico de cada entidade. Nao incorpora ' +
        'sazonalidade nem alteracoes de agenda ja conhecidas.'
      : 'Nao ha carteira de faturas em aberto carregada, por isso todas as semanas sao projetadas ao ' +
        'nivel medio dos ultimos tres meses. Isto e razoavel em regime estavel e falha exatamente nas ' +
        'primeiras semanas, que sao as que ja estao determinadas pelo que foi faturado. Nao incorpora ' +
        'sazonalidade nem alteracoes de agenda ja conhecidas. Movimentos extraordinarios entram apenas ' +
        'se forem introduzidos a mao.',
    prazosUsados: prazosPorEntidade,
  };
}

/**
 * Prazo medio de recebimento por entidade, a partir dos recibos do SAF-T.
 * Devolve null por entidade quando nao ha recibos suficientes, em vez de assumir
 * trinta dias, que e o valor que toda a gente assume e quase nunca e verdade.
 */
export function prazoMedioPorEntidade(saft, correspondencia, { minimoRecibos = 5 } = {}) {
  const porEntidade = new Map();

  // Achado F-012. A versao anterior procurava o documento de origem com um find
  // linear dentro do ciclo dos recibos, o que e quadratico. Num SAF-T de dois
  // anos de uma clinica media sao dezenas de milhares de documentos por dezenas
  // de milhares de linhas de recibo, e o browser bloqueava. Indexar uma vez
  // resolve, e e o unico sitio da base de codigo onde isto acontecia.
  const porNumero = new Map();
  for (const d of saft.documentosValidos) {
    if (d.numero) porNumero.set(d.numero, d);
  }

  for (const p of saft.pagamentos) {
    if (p.estado === 'A') continue;
    for (const l of p.linhas) {
      const doc = porNumero.get(l.documentoOrigem);
      const dataFatura = l.dataDocumentoOrigem ?? doc?.data;
      if (!dataFatura || !p.data) continue;
      const dias = Math.round(
        (new Date(`${p.data}T00:00:00Z`) - new Date(`${dataFatura}T00:00:00Z`)) / 86400000,
      );
      if (dias < 0 || dias > 720) continue;
      const entidade = doc ? correspondencia.resolve(doc, doc.linhas[0] ?? {}) : 'PRIVADO';
      const lista = porEntidade.get(entidade) ?? [];
      lista.push(dias);
      porEntidade.set(entidade, lista);
    }
  }

  const resultado = {};
  const insuficientes = [];
  for (const [ent, dias] of porEntidade) {
    if (dias.length < minimoRecibos) {
      insuficientes.push({ entidade: ent, nRecibos: dias.length });
      continue;
    }
    dias.sort((a, b) => a - b);
    resultado[ent] = {
      mediana: dias[Math.floor(dias.length / 2)],
      media: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length),
      n: dias.length,
    };
  }
  return { porEntidade: resultado, insuficientes };
}
