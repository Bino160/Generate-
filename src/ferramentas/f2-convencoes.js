/**
 * F2. Simulador de convencoes.
 *
 * A tese: a resposta certa depende da ocupacao e inverte-se. A mesma convencao e
 * boa a 60% de ocupacao e ma a 92%. Uma ferramenta que de a mesma resposta nos
 * dois cenarios esta errada e nao sai. Esse teste esta em
 * tests/f2-convencoes.test.mjs e e obrigatorio.
 *
 * O modelo, explicado por inteiro porque e o que justifica os honorarios.
 *
 * Seja H o total de horas-gabinete que a convencao consome, mC a margem de
 * contribuicao por hora da convencao e mP a margem de contribuicao por hora do
 * privado que ocuparia essas horas.
 *
 * A pergunta nunca e "a convencao da lucro". E "o que acontece se sair".
 * Se sair, a clinica perde mC * H e recupera as horas. Dessas horas so se
 * enchem as que houver procura privada para encher, que sao duas coisas:
 *
 *   - os pacientes da convencao que teriam vindo na mesma como privados,
 *     H * c, onde c e a canibalizacao
 *   - a procura privada hoje recusada por falta de espaco, D
 *
 * Logo o valor de manter a convencao e
 *
 *   valor = mC * H - mP * min(H, H*c + D)
 *
 * Com gabinetes vazios D e zero e, se nao houver canibalizacao, manter vale
 * mC * H, que e positivo para qualquer convencao acima do custo variavel. Com
 * capacidade esgotada D e grande, o minimo passa a ser H, e manter so vale se
 * mC exceder mP. A inversao sai da formula, nao de uma regra colada por cima.
 *
 * Duas coisas ficam deliberadamente fora da margem:
 *   - o prazo de recebimento, que afeta tesouraria e nao margem, e sai em linha
 *     separada com custo de financiamento explicito
 *   - a cauda de tratamento privado gerada pela convencao, que se mede no SAF-T
 *     e aparece como linha propria, nunca somada a margem
 */

import { Resultado, NATUREZA } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { formata, porUnidade, aplicaTaxa, soma } from '../core/dinheiro.js';

export const QUADRANTE = Object.freeze({
  MANTER: 'MANTER',
  RENEGOCIAR: 'RENEGOCIAR',
  LIMITAR_A_HORARIOS_VAZIOS: 'LIMITAR_A_HORARIOS_VAZIOS',
  SAIR: 'SAIR',
});

/** Acima deste aumento de preco necessario, renegociar deixa de ser realista. */
const UPLIFT_MAXIMO_RENEGOCIAVEL = 0.20;

/**
 * Margem de contribuicao por hora-gabinete de um conjunto de atos.
 * @param {Array<{precoCent:number, custoVariavelCent:number, duracaoMinutos:number, volume:number, glosaFracao?:number}>} atos
 */
export function margemPorHora(atos) {
  let margemCent = 0;
  let horas = 0;
  let receitaEfetivaCent = 0;
  let custoCent = 0;
  const detalhe = [];

  for (const a of atos) {
    if (!a.duracaoMinutos || a.duracaoMinutos <= 0) {
      throw new Error(`Ato ${a.codigo ?? '(sem codigo)'} sem duracao. Sem duracao nao ha hora-gabinete e nao ha analise.`);
    }
    const glosa = a.glosaFracao ?? 0;
    const precoEfetivoCent = a.precoCent - aplicaTaxa(a.precoCent, glosa);
    const margemAtoCent = precoEfetivoCent - a.custoVariavelCent;
    const horasAto = (a.duracaoMinutos / 60) * a.volume;

    margemCent += margemAtoCent * a.volume;
    horas += horasAto;
    receitaEfetivaCent += precoEfetivoCent * a.volume;
    custoCent += a.custoVariavelCent * a.volume;

    detalhe.push({
      codigo: a.codigo,
      nome: a.nome ?? a.codigo,
      precoCent: a.precoCent,
      precoEfetivoCent,
      glosaFracao: glosa,
      custoVariavelCent: a.custoVariavelCent,
      margemAtoCent,
      duracaoMinutos: a.duracaoMinutos,
      volume: a.volume,
      horas: horasAto,
      margemPorHoraCent: porUnidade(margemAtoCent, a.duracaoMinutos / 60),
    });
  }

  return {
    margemCent,
    horas,
    receitaEfetivaCent,
    custoCent,
    porHoraCent: horas > 0 ? porUnidade(margemCent, horas) : null,
    detalhe,
  };
}

/**
 * Procura privada hoje recusada por falta de espaco, em horas.
 * Se nao for medida, deriva-se da ocupacao. Quando ha horas livres, a procura
 * recusada e zero por definicao: ninguem e recusado numa clinica com gabinetes
 * vazios. Quando nao ha, o valor e desconhecido e assume-se que chega para
 * encher o que a convencao liberta, que e a hipotese conservadora do ponto de
 * vista de manter a convencao.
 */
export function procuraPrivadaRecusadaHoras({ horasConvencao, horasLivres, medidaHoras = null }) {
  if (medidaHoras != null) return { horas: medidaHoras, origem: 'MEDIDA' };
  if (horasLivres > 0) {
    return { horas: Math.max(0, horasConvencao - horasLivres), origem: 'DERIVADA_DA_OCUPACAO' };
  }
  return { horas: horasConvencao, origem: 'ASSUMIDA_CAPACIDADE_ESGOTADA' };
}

/**
 * Avalia uma convencao.
 *
 * @param {object} entrada
 * @param {object} entrada.convencao { id, nome, atos, prazoRecebimentoDias, canibalizacao }
 * @param {Array} entrada.atosPrivadosEquivalentes atos que ocupariam as mesmas horas
 * @param {number} entrada.horasLivres horas-gabinete livres no periodo
 * @param {number} [entrada.procuraRecusadaHoras] procura privada medida e recusada
 * @param {number} [entrada.taxaFinanciamentoAnual]
 * @param {number} [entrada.caudaPrivadaPorPacienteCent] medida no SAF-T, nunca estimada
 * @param {number} [entrada.pacientesNovosPorPeriodo]
 */
export function avaliaConvencao({
  convencao,
  atosPrivadosEquivalentes,
  horasLivres,
  procuraRecusadaHoras = null,
  taxaFinanciamentoAnual = 0.06,
  caudaPrivadaPorPacienteCent = null,
  pacientesNovosPorPeriodo = null,
}) {
  const c = Math.min(1, Math.max(0, convencao.canibalizacao ?? 0));
  const conv = margemPorHora(convencao.atos);
  const priv = margemPorHora(atosPrivadosEquivalentes);

  const H = conv.horas;
  const mC = conv.porHoraCent ?? 0;
  const mP = priv.porHoraCent ?? 0;

  const D = procuraPrivadaRecusadaHoras({
    horasConvencao: H,
    horasLivres,
    medidaHoras: procuraRecusadaHoras,
  });

  const horasRecuperaveis = Math.min(H, H * c + D.horas);
  const valorManterCent = Math.round(mC * H - mP * horasRecuperaveis);

  // Ponto de viragem da canibalizacao. Acima deste c, manter deixa de compensar.
  // Resolve mC*H = mP*(H*c + D) em ordem a c, quando o minimo nao esta saturado.
  let canibalizacaoDeViragem = null;
  if (mP > 0 && H > 0) {
    const cEstrela = (mC * H) / mP / H - D.horas / H;
    if (cEstrela >= 0 && cEstrela <= 1 && H * cEstrela + D.horas <= H) {
      canibalizacaoDeViragem = cEstrela;
    } else if (H * 1 + D.horas <= H && mC >= mP) {
      canibalizacaoDeViragem = null;
    }
  }

  // Preco minimo. Multiplicador uniforme sobre a tabela da convencao a que o
  // valor de manter passa a zero. E este numero que vai para a mesa.
  const multiplicadorMinimo = conv.receitaEfetivaCent > 0
    ? (conv.custoCent + mP * horasRecuperaveis) / conv.receitaEfetivaCent
    : null;

  const precosMinimos = conv.detalhe.map((a) => {
    const glosa = a.glosaFracao;
    // Piso por ato isolado: cobre o custo variavel mais o que a hora renderia em privado.
    const pisoEfetivoCent = Math.round(a.custoVariavelCent + mP * (a.duracaoMinutos / 60));
    const pisoFaturadoCent = glosa < 1 ? Math.round(pisoEfetivoCent / (1 - glosa)) : null;
    return {
      codigo: a.codigo,
      nome: a.nome,
      precoAtualCent: a.precoCent,
      precoMinimoIsoladoCent: pisoFaturadoCent,
      precoComMultiplicadorCent: multiplicadorMinimo != null
        ? Math.round(a.precoCent * multiplicadorMinimo)
        : null,
      aumentoNecessario: multiplicadorMinimo != null ? multiplicadorMinimo - 1 : null,
    };
  });

  // Linha de tesouraria, separada da margem por construcao.
  const prazoDias = convencao.prazoRecebimentoDias ?? null;
  const custoFinanciamentoCent = prazoDias != null
    ? Math.round(conv.receitaEfetivaCent * (prazoDias / 365) * taxaFinanciamentoAnual)
    : null;

  // Cauda de tratamento privado. Linha propria, nunca somada a margem.
  const caudaTotalCent = caudaPrivadaPorPacienteCent != null && pacientesNovosPorPeriodo != null
    ? caudaPrivadaPorPacienteCent * pacientesNovosPorPeriodo
    : null;

  const quadrante = classifica({ mC, mP, valorManterCent, multiplicadorMinimo, horasRecuperaveis });

  return {
    id: convencao.id,
    nome: convencao.nome ?? convencao.id,
    horas: H,
    margemPorHoraCent: mC,
    margemPrivadaPorHoraCent: mP,
    margemTotalCent: conv.margemCent,
    receitaEfetivaCent: conv.receitaEfetivaCent,
    canibalizacao: c,
    procuraRecusada: D,
    horasLivres,
    horasRecuperaveis,
    valorManterCent,
    canibalizacaoDeViragem,
    multiplicadorMinimo,
    precosMinimos,
    quadrante,
    tesouraria: {
      prazoRecebimentoDias: prazoDias,
      custoFinanciamentoCent,
      nota: 'O prazo de recebimento nao afeta a margem. Afeta a tesouraria. As duas linhas nunca se somam.',
    },
    portaDeEntrada: {
      caudaPorPacienteCent: caudaPrivadaPorPacienteCent,
      pacientesNovos: pacientesNovosPorPeriodo,
      caudaTotalCent,
      medida: caudaPrivadaPorPacienteCent != null,
    },
    detalheAtos: conv.detalhe,
    // Ordenacao por ato contra ordenacao por hora, o erro mais comum do setor.
    inversaoDoRanking: detetaInversao(conv.detalhe),
  };
}

function classifica({ mC, mP, valorManterCent, multiplicadorMinimo, horasRecuperaveis }) {
  // Abaixo do custo variavel nao ha ocupacao que salve.
  if (mC <= 0) return QUADRANTE.SAIR;

  if (valorManterCent > 0) {
    // Nada e deslocado: as horas da convencao ficariam vazias se ela saisse.
    if (horasRecuperaveis === 0) return QUADRANTE.MANTER;
    // Rende mais por hora do que o privado que desloca. Aguenta a clinica cheia.
    if (mC >= mP) return QUADRANTE.MANTER;
    // Compensa hoje, mas ja desloca algum privado. Se a clinica encher, inverte.
    return QUADRANTE.LIMITAR_A_HORARIOS_VAZIOS;
  }

  if (multiplicadorMinimo != null && multiplicadorMinimo - 1 <= UPLIFT_MAXIMO_RENEGOCIAVEL) {
    return QUADRANTE.RENEGOCIAR;
  }
  return QUADRANTE.SAIR;
}

/**
 * Deteta a inversao entre ordenar por margem do ato e ordenar por margem da hora.
 * Quando existe, e o argumento mais forte da reuniao.
 */
function detetaInversao(detalhe) {
  if (detalhe.length < 2) return null;
  const porAto = [...detalhe].sort((a, b) => b.margemAtoCent - a.margemAtoCent).map((a) => a.codigo);
  const porHora = [...detalhe].sort((a, b) => b.margemPorHoraCent - a.margemPorHoraCent).map((a) => a.codigo);
  const inverteu = porAto.some((c, i) => c !== porHora[i]);
  if (!inverteu) return null;
  const melhorPorAto = detalhe.find((a) => a.codigo === porAto[0]);
  const melhorPorHora = detalhe.find((a) => a.codigo === porHora[0]);
  return {
    porAto,
    porHora,
    exemplo: {
      melhorPorAto: melhorPorAto.nome,
      margemAtoCent: melhorPorAto.margemAtoCent,
      margemPorHoraCent: melhorPorAto.margemPorHoraCent,
      melhorPorHora: melhorPorHora.nome,
      margemAtoDoMelhorPorHoraCent: melhorPorHora.margemAtoCent,
      margemPorHoraDoMelhorPorHoraCent: melhorPorHora.margemPorHoraCent,
    },
  };
}

/**
 * Analise de sensibilidade a canibalizacao.
 * O output util e o ponto de viragem, nao o cenario central.
 */
export function sensibilidadeCanibalizacao(entrada, passos = 21) {
  const pontos = [];
  let anterior = null;
  let viragem = null;
  for (let i = 0; i < passos; i += 1) {
    const c = i / (passos - 1);
    const r = avaliaConvencao({
      ...entrada,
      convencao: { ...entrada.convencao, canibalizacao: c },
    });
    pontos.push({ canibalizacao: c, valorManterCent: r.valorManterCent, quadrante: r.quadrante });
    if (anterior != null && Math.sign(anterior.valorManterCent) !== Math.sign(r.valorManterCent)) {
      viragem = { entre: [anterior.canibalizacao, c] };
    }
    anterior = pontos[pontos.length - 1];
  }
  return { pontos, viragem };
}

/**
 * Analise de sensibilidade a ocupacao, que e onde a resposta se inverte.
 * E o output que mostra ao cliente que a mesma convencao e boa a 60% e ma a 92%.
 */
export function sensibilidadeOcupacao(entrada, horasTotais, passos = 11) {
  const pontos = [];
  for (let i = 0; i < passos; i += 1) {
    const ocupacaoPrivada = i / (passos - 1);
    const horasLivres = Math.max(0, horasTotais * (1 - ocupacaoPrivada));
    const r = avaliaConvencao({ ...entrada, horasLivres });
    pontos.push({
      ocupacao: ocupacaoPrivada,
      horasLivres,
      valorManterCent: r.valorManterCent,
      quadrante: r.quadrante,
    });
  }
  const primeiroNegativo = pontos.find((p) => p.valorManterCent <= 0);
  const primeiroNaoManter = pontos.find((p) => p.quadrante !== QUADRANTE.MANTER);
  return {
    pontos,
    ocupacaoEmQueDeixaDeCompensar: primeiroNegativo ? primeiroNegativo.ocupacao : null,
    ocupacaoEmQueDeixaDeSerManter: primeiroNaoManter ? primeiroNaoManter.ocupacao : null,
  };
}

/**
 * Modulo de alocacao horaria.
 * Em vez de sair, alocar a convencao as faixas historicamente vazias. E quase
 * sempre a resposta correta e praticamente ninguem a da, porque exige cruzar
 * agenda com margem.
 */
export function alocacaoHoraria({ horasNecessarias, faixas, limiarVazio = 0.70 }) {
  const candidatas = Object.entries(faixas)
    .map(([nome, f]) => ({ faixa: nome, ...f }))
    .filter((f) => f.ocupacao != null && f.ocupacao < limiarVazio && f.livre > 0)
    .sort((a, b) => a.ocupacao - b.ocupacao);

  let porColocar = horasNecessarias;
  const plano = [];
  for (const f of candidatas) {
    if (porColocar <= 0) break;
    const usar = Math.min(porColocar, f.livre);
    plano.push({ faixa: f.faixa, horas: usar, ocupacaoAtual: f.ocupacao });
    porColocar -= usar;
  }

  return {
    plano,
    horasColocadas: horasNecessarias - porColocar,
    horasPorColocar: Math.max(0, porColocar),
    cobreTudo: porColocar <= 0.001,
  };
}

/**
 * Ferramenta completa: avalia a carteira de convencoes e produz a matriz.
 */
export function simuladorConvencoes({
  convencoes,
  atosPrivadosEquivalentes,
  capacidade,
  faixas = null,
  taxaFinanciamentoAnual = 0.06,
  caudas = {},
  procuraRecusadaHoras = null,
}) {
  const r = new Resultado('F2', 'Simulador de convencoes');
  r.usaPressuposto('P-14');

  if (!convencoes || convencoes.length === 0) {
    r.lacunas.declara('F2-SEM-CONVENCOES', GRAVIDADE.BLOQUEIA,
      'Nao ha convencoes definidas no perfil de cliente. O F2 nao corre sem elas.');
    return r.defineVeredito('Sem convencoes para analisar.');
  }
  if (!atosPrivadosEquivalentes || atosPrivadosEquivalentes.length === 0) {
    r.lacunas.declara('F2-SEM-PRECARIO', GRAVIDADE.BLOQUEIA,
      'Nao ha tabela de precos privados. Sem ela nao ha custo de oportunidade da hora e ' +
      'toda a analise de capacidade fica sem termo de comparacao.');
    return r.defineVeredito('Falta a tabela de precos privados.');
  }

  const horasLivres = Math.max(0, (capacidade.horasDisponiveis ?? 0) - (capacidade.horasOcupadas ?? 0));

  // O limiar P-14 nao entra no calculo, que usa deslocacao continua. Entra aqui,
  // como aviso: acima dele a resposta desta ferramenta e instavel, porque
  // pequenas variacoes de ocupacao mudam o quadrante.
  const ocupacaoAtual = capacidade.horasDisponiveis
    ? (capacidade.horasOcupadas ?? 0) / capacidade.horasDisponiveis
    : null;
  if (ocupacaoAtual != null && ocupacaoAtual >= valor('P-14').ocupacao) {
    r.lacunas.declara('F2-PERTO-DA-CAPACIDADE', GRAVIDADE.INFORMA,
      `A clinica esta a ${Math.round(ocupacaoAtual * 100)}% de ocupacao, acima do limiar de ` +
      `${Math.round(valor('P-14').ocupacao * 100)}% a partir do qual cada hora de convencao passa a ` +
      'deslocar privado. Nesta zona a resposta muda com pouca variacao de agenda, por isso a leitura ' +
      'correta e a curva de sensibilidade e nao o quadrante de hoje.',
      { pressuposto: 'P-14' });
  }

  if (capacidade.horasOcupadas == null) {
    r.lacunas.declara('F2-SEM-AGENDA', GRAVIDADE.DEGRADA,
      'Sem dados de agenda nao sei quantas horas estao livres, e a ocupacao e o que faz a resposta ' +
      'inverter-se. Corri o cenario para varios niveis de ocupacao em vez de escolher um.',
      { comoResolver: 'Exportar a agenda com horas marcadas por gabinete.' });
  }

  const avaliacoes = convencoes.map((c) => {
    const cauda = caudas[c.id] ?? {};
    if (c.canibalizacao == null) {
      r.lacunas.declara(`F2-CANIB-${c.id}`, GRAVIDADE.DEGRADA,
        `A canibalizacao da convencao ${c.nome ?? c.id} nao foi indicada e a clinica nao a sabe. ` +
        'Corri com zero e a sensibilidade mostra a que percentagem a decisao muda de sinal.');
    }
    if (cauda.porPacienteCent == null) {
      r.lacunas.declara(`F2-CAUDA-${c.id}`, GRAVIDADE.INFORMA,
        `Nao consegui medir no SAF-T a cauda de tratamento privado gerada por ${c.nome ?? c.id}. ` +
        'O efeito porta de entrada mede-se, nao se estima, portanto fica de fora do numero.');
    }
    return avaliaConvencao({
      convencao: c,
      atosPrivadosEquivalentes,
      horasLivres,
      procuraRecusadaHoras,
      taxaFinanciamentoAnual,
      caudaPrivadaPorPacienteCent: cauda.porPacienteCent ?? null,
      pacientesNovosPorPeriodo: cauda.pacientesNovos ?? null,
    });
  });

  const matriz = {};
  for (const q of Object.values(QUADRANTE)) matriz[q] = [];
  for (const a of avaliacoes) matriz[a.quadrante].push(a);

  r.acrescentaBloco({
    id: 'matriz',
    titulo: 'Matriz de decisao',
    tipo: 'quadrantes',
    dados: { matriz, avaliacoes },
  });

  r.acrescentaBloco({
    id: 'precos-minimos',
    titulo: 'Preco minimo por ato',
    tipo: 'tabela',
    dados: {
      nota: 'E este numero que vai para a mesa de negociacao. Abaixo dele a convencao destroi resultado.',
      porConvencao: avaliacoes.map((a) => ({
        convencao: a.nome,
        multiplicador: a.multiplicadorMinimo,
        precos: a.precosMinimos,
      })),
    },
  });

  const comInversao = avaliacoes.filter((a) => a.inversaoDoRanking);
  if (comInversao.length > 0) {
    r.acrescentaBloco({
      id: 'inversao',
      titulo: 'Ordenar por ato inverte-se quando se ordena por hora',
      tipo: 'comparacao',
      dados: comInversao.map((a) => ({ convencao: a.nome, ...a.inversaoDoRanking })),
    });
  }

  if (faixas) {
    const candidatas = avaliacoes.filter(
      (a) => a.quadrante === QUADRANTE.LIMITAR_A_HORARIOS_VAZIOS || a.quadrante === QUADRANTE.SAIR,
    );
    r.acrescentaBloco({
      id: 'alocacao',
      titulo: 'Alocacao a faixas vazias',
      tipo: 'plano',
      dados: candidatas.map((a) => ({
        convencao: a.nome,
        ...alocacaoHoraria({ horasNecessarias: a.horas, faixas }),
      })),
    });
  } else {
    r.lacunas.declara('F2-SEM-FAIXAS', GRAVIDADE.DEGRADA,
      'Sem ocupacao por faixa horaria nao consigo propor alocacao aos horarios vazios, ' +
      'que e quase sempre a alternativa correta a sair da convencao.');
  }

  r.acrescentaBloco({
    id: 'tesouraria',
    titulo: 'Efeito de tesouraria, em linha separada',
    tipo: 'tabela',
    dados: avaliacoes.map((a) => ({
      convencao: a.nome,
      prazoDias: a.tesouraria.prazoRecebimentoDias,
      custoFinanciamentoCent: a.tesouraria.custoFinanciamentoCent,
    })),
  });

  r.acrescentaBloco({
    id: 'aviso-contratual',
    titulo: 'O que tem de acontecer antes de sair de uma convencao',
    tipo: 'lista',
    natureza: NATUREZA.JURIDICA,
    dados: {
      pontos: [
        'Prazo de pre-aviso contratual perante a entidade. Verificar o contrato antes de tomar a decisao, porque condiciona o calendario e nao a conclusao economica.',
        'Deveres de continuidade de cuidados aos pacientes com tratamento em curso. Uma saida abrupta cria um problema clinico e reputacional que nao aparece nesta folha.',
        'Comunicacao as entidades e a ERS quando a alteracao toca elementos essenciais da atividade licenciada.',
        'A modificacao da entidade titular da exploracao tem de ser comunicada a ERS no prazo de 30 dias.',
      ],
      limite: 'A ferramenta assinala. Nao emite parecer juridico.',
    },
  });

  const sair = matriz[QUADRANTE.SAIR].length;
  const renegociar = matriz[QUADRANTE.RENEGOCIAR].length;
  const limitar = matriz[QUADRANTE.LIMITAR_A_HORARIOS_VAZIOS].length;
  const impactoCent = soma(avaliacoes.filter((a) => a.valorManterCent < 0).map((a) => -a.valorManterCent));

  r.defineVeredito(
    sair + renegociar + limitar === 0
      ? 'Toda a carteira de convencoes acrescenta resultado ao nivel de ocupacao atual.'
      : `${sair + renegociar} convencoes a rever e ${limitar} a limitar aos horarios vazios. ` +
        `A carteira negativa custa ${formata(impactoCent, { compacto: true })} no periodo analisado.`,
    { severidade: sair > 0 ? 'MAU' : renegociar + limitar > 0 ? 'ATENCAO' : 'BOM' },
  );

  return r;
}

/**
 * Mede a cauda de tratamento privado a partir do SAF-T.
 * Segue pacientes cujo primeiro documento e da convencao e soma o que faturaram
 * em privado depois disso, dentro da janela. Nao estima nada.
 */
export function medeCaudaPrivada(saft, correspondencia, { janelaMeses = 12 } = {}) {
  const porPaciente = new Map();
  for (const d of saft.documentosValidos) {
    if (!d.pseudonimo || d.consumidorFinal || !d.data) continue;
    const lista = porPaciente.get(d.pseudonimo) ?? [];
    lista.push(d);
    porPaciente.set(d.pseudonimo, lista);
  }

  const porEntidade = new Map();
  for (const [, docs] of porPaciente) {
    docs.sort((a, b) => a.data.localeCompare(b.data));
    const primeiro = docs[0];
    const entidadeEntrada = correspondencia.resolve(primeiro, primeiro.linhas[0] ?? {});
    if (entidadeEntrada == null || entidadeEntrada === 'PRIVADO') continue;

    const limite = new Date(new Date(`${primeiro.data}T00:00:00Z`).getTime() + janelaMeses * 30.44 * 86400000);
    let caudaCent = 0;
    for (const d of docs.slice(1)) {
      if (new Date(`${d.data}T00:00:00Z`) > limite) break;
      for (const l of d.linhas) {
        if (correspondencia.resolve(d, l) === 'PRIVADO') caudaCent += l.creditoCent - l.debitoCent;
      }
    }
    const atual = porEntidade.get(entidadeEntrada) ?? { pacientes: 0, caudaCent: 0 };
    atual.pacientes += 1;
    atual.caudaCent += caudaCent;
    porEntidade.set(entidadeEntrada, atual);
  }

  const resultado = {};
  for (const [ent, v] of porEntidade) {
    resultado[ent] = {
      pacientesNovos: v.pacientes,
      caudaTotalCent: v.caudaCent,
      porPacienteCent: v.pacientes > 0 ? Math.round(v.caudaCent / v.pacientes) : null,
      janelaMeses,
    };
  }
  return resultado;
}
