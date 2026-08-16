/**
 * F3. Prontidao para transacao.
 *
 * O que esta ferramenta nao faz: nao multiplica EBITDA por um numero. Isso nao e
 * uma ferramenta, e uma multiplicacao, e o resultado nao sobrevive a uma
 * diligencia.
 *
 * Tres coisas que a distinguem:
 *
 * 1. A normalizacao do EBITDA e a analise inteira, nao um ajustamento. E desce
 *    frequentemente o EBITDA. Se o dono produz 300 mil de atos clinicos e se
 *    remunera com 60 mil, substitui-lo por remuneracao de mercado retira lucro.
 *    Uma ferramenta que so soma ajustamentos favoraveis produz um numero que o
 *    comprador rasga. Por isso cada ajustamento e classificado quanto a
 *    defensabilidade e so os solidos entram no numero que se apresenta.
 *
 * 2. O comprador nao compra lucro, compra transferibilidade. O indicador que
 *    move o multiplo e a percentagem de producao feita por quem fica.
 *
 * 3. O que mata negocios em Portugal nao e o preco, e a diligencia legal e
 *    fiscal. Os cinco testes correm antes de se falar de valor, e se algum falhar
 *    de forma grave a ferramenta di-lo no veredito em vez de o esconder num anexo.
 */

import { Resultado, NATUREZA } from '../core/contrato.js';
import { GRAVIDADE } from '../core/lacunas.js';
import { valor } from '../config/pressupostos.js';
import { formata, aplicaTaxa, soma } from '../core/dinheiro.js';
import { referenciaMultiplosInternacional, transacoesPortuguesas, estadoMultiplos } from '../dados/multiplos-observados.js';

export const DEFENSABILIDADE = Object.freeze({
  SOLIDO: 'SOLIDO',
  DISCUTIVEL: 'DISCUTIVEL',
  INDEFENSAVEL: 'INDEFENSAVEL',
});

export const DIMENSOES = [
  { id: 'qualidade-resultados', nome: 'Qualidade dos resultados', peso: 0.25 },
  { id: 'transferibilidade', nome: 'Transferibilidade', peso: 0.30 },
  { id: 'conformidade', nome: 'Conformidade', peso: 0.20 },
  { id: 'concentracao', nome: 'Concentracao', peso: 0.15 },
  { id: 'infraestrutura', nome: 'Infraestrutura', peso: 0.10 },
];

/**
 * Ponte do EBITDA declarado ao ajustado.
 * @param {number} ebitdaDeclaradoCent
 * @param {Array<{id:string, descricao:string, valorCent:number, defensabilidade:string, justificacao:string}>} ajustamentos
 */
export function ponteEbitda(ebitdaDeclaradoCent, ajustamentos) {
  const validos = ajustamentos.filter((a) => Object.values(DEFENSABILIDADE).includes(a.defensabilidade));
  const desconhecidos = ajustamentos.filter((a) => !Object.values(DEFENSABILIDADE).includes(a.defensabilidade));

  const solidos = validos.filter((a) => a.defensabilidade === DEFENSABILIDADE.SOLIDO);
  const discutiveis = validos.filter((a) => a.defensabilidade === DEFENSABILIDADE.DISCUTIVEL);
  const indefensaveis = validos.filter((a) => a.defensabilidade === DEFENSABILIDADE.INDEFENSAVEL);

  const somaSolidosCent = soma(solidos.map((a) => a.valorCent));
  const somaDiscutiveisCent = soma(discutiveis.map((a) => a.valorCent));
  const somaIndefensaveisCent = soma(indefensaveis.map((a) => a.valorCent));

  return {
    ebitdaDeclaradoCent,
    // Este e o unico numero que se apresenta.
    ebitdaAjustadoCent: ebitdaDeclaradoCent + somaSolidosCent,
    ebitdaComDiscutiveisCent: ebitdaDeclaradoCent + somaSolidosCent + somaDiscutiveisCent,
    somaSolidosCent,
    somaDiscutiveisCent,
    somaIndefensaveisCent,
    ajustamentos: validos,
    desconhecidos,
    // Um ajustamento negativo grande e sinal de que a normalizacao foi feita a serio.
    ajustamentosNegativos: validos.filter((a) => a.valorCent < 0).length,
    nota:
      'So os ajustamentos classificados como solidos entram no EBITDA ajustado. Os discutiveis ' +
      'aparecem em separado para preparar a negociacao, e os indefensaveis ficam registados para ' +
      'que ninguem os proponha na diligencia.',
  };
}

/**
 * Transferibilidade. O indicador que move o multiplo.
 * @param {Array<{id:string, nome:string, producaoCent:number, ficaAposNegocio:boolean, temContratoPosVenda?:boolean, temNaoConcorrencia?:boolean}>} equipa
 */
export function transferibilidade(equipa) {
  const totalCent = soma(equipa.map((p) => p.producaoCent));
  if (totalCent === 0) return { calculavel: false };

  const ficam = equipa.filter((p) => p.ficaAposNegocio);
  const producaoQueFicaCent = soma(ficam.map((p) => p.producaoCent));
  const comAmarra = ficam.filter((p) => p.temContratoPosVenda || p.temNaoConcorrencia);
  const producaoAmarradaCent = soma(comAmarra.map((p) => p.producaoCent));

  const fundador = equipa.filter((p) => !p.ficaAposNegocio);
  const producaoDoFundadorCent = soma(fundador.map((p) => p.producaoCent));

  return {
    calculavel: true,
    totalCent,
    fracaoQueFica: producaoQueFicaCent / totalCent,
    fracaoAmarrada: producaoAmarradaCent / totalCent,
    fracaoDependenteDoFundador: producaoDoFundadorCent / totalCent,
    producaoQueFicaCent,
    producaoDoFundadorCent,
    leitura:
      producaoDoFundadorCent / totalCent > 0.4
        ? 'Mais de 40% da producao sai com quem vende. Receita agarrada as maos do fundador vale uma fracao.'
        : 'A maior parte da producao fica depois do negocio.',
  };
}

/**
 * Concentracao de receita. Um cliente institucional a 45% e um risco de preco.
 */
export function concentracao({ porEntidadeCent, porProfissionalCent }) {
  const total = (m) => soma(Object.values(m));
  const maior = (m) => {
    const t = total(m);
    if (t === 0) return null;
    return Math.max(...Object.values(m)) / t;
  };
  const hhi = (m) => {
    const t = total(m);
    if (t === 0) return null;
    return Object.values(m).reduce((a, v) => a + (v / t) ** 2, 0);
  };
  return {
    maiorEntidade: maior(porEntidadeCent),
    hhiEntidades: hhi(porEntidadeCent),
    maiorProfissional: maior(porProfissionalCent),
    hhiProfissionais: hhi(porProfissionalCent),
  };
}

/**
 * Os cinco testes de diligencia. Correm antes de se falar de valor.
 *
 * Cada teste devolve estado e, quando aplicavel, uma contingencia quantificada.
 * Nenhum destes testes e um parecer. Sao pendencias a resolver com quem tem
 * cedula, e sao classificados como tal na natureza do bloco.
 */
export function testesDeDiligencia(dados) {
  const testes = [];

  // 1. Licenciamento ERS
  const ers = dados.ers ?? {};
  testes.push({
    id: 'ers',
    nome: 'Licenciamento ERS',
    estado: ers.licencaValida === true && ers.confirmadaNoPortal === true
      ? 'CONFORME'
      : ers.licencaValida === false ? 'FALHA' : 'POR_VERIFICAR',
    achados: [
      ers.confirmadaNoPortal === false
        ? 'Licenca nao confirmada no Portal do Licenciamento. Pendencia classica em clinicas com licenca antiga.'
        : null,
      ers.tipologiasDesalinhadas
        ? 'Ha atos praticados fora das tipologias autorizadas.'
        : null,
      ers.mudancaTitularidadeComunicada === false
        ? 'A modificacao da entidade titular da exploracao tem de ser comunicada a ERS no prazo de 30 dias. Nao ha registo de comunicacao.'
        : null,
    ].filter(Boolean),
    contingenciaCent: null,
    bloqueiaNegocio: ers.licencaValida === false,
  });

  // 2. Prestadores de servicos e entidade contratante
  const prest = dados.prestadores ?? { lista: [] };
  const escaloes = valor('P-06').escaloes;
  const anosPrescricao = valor('P-07').anos;
  let contingenciaSsCent = 0;
  const detalhePrestadores = [];
  for (const p of prest.lista ?? []) {
    const dep = p.dependenciaEconomica;
    const escalao = escaloes.find((e) => dep != null && dep >= e.dependenciaMin && dep < e.dependenciaMax);
    const indicios = [
      p.exclusividade && 'exclusividade',
      p.horarioFixo && 'horario fixo',
      p.meiosDaClinica && 'meios da clinica',
      p.subordinacao && 'subordinacao',
    ].filter(Boolean);

    const anualCent = escalao ? aplicaTaxa(p.faturadoAnualCent ?? 0, escalao.taxa) : 0;
    const acumuladoCent = anualCent * Math.min(anosPrescricao, p.anosDeRelacao ?? anosPrescricao);
    contingenciaSsCent += acumuladoCent;

    detalhePrestadores.push({
      id: p.id,
      nome: p.nome,
      dependenciaEconomica: dep,
      taxaAplicavel: escalao ? escalao.taxa : 0,
      contribuicaoAnualCent: anualCent,
      contingenciaAcumuladaCent: acumuladoCent,
      indiciosLaboralidade: indicios,
      nIndicios: indicios.length,
      nota: indicios.length >= 3
        ? 'Preenche varios indicios do artigo 12.o do Codigo do Trabalho. Independentemente da reclassificacao, a contribuicao de entidade contratante e devida.'
        : 'Contribuicao de entidade contratante devida pela dependencia economica, mesmo sem indicios de laboralidade.',
    });
  }
  testes.push({
    id: 'prestadores',
    nome: 'Prestadores de servicos',
    estado: contingenciaSsCent > 0 ? 'FALHA' : (prest.lista ?? []).length === 0 ? 'POR_VERIFICAR' : 'CONFORME',
    achados: detalhePrestadores.filter((d) => d.contingenciaAcumuladaCent > 0).map(
      (d) => `${d.nome}: dependencia de ${Math.round((d.dependenciaEconomica ?? 0) * 100)}%, taxa de ${Math.round(d.taxaAplicavel * 100)}%, contingencia acumulada de ${formata(d.contingenciaAcumuladaCent)}.`,
    ),
    contingenciaCent: contingenciaSsCent,
    detalhe: detalhePrestadores,
    bloqueiaNegocio: false,
    nota: 'Apurada oficiosamente pela Seguranca Social a partir do anexo SS. Nao depende de a clinica declarar.',
  });

  // 3. IVA
  const iva = dados.iva ?? { atosSuspeitos: [] };
  const taxaIva = dados.taxaIvaNormal ?? valor('P-09').CONTINENTE;
  const jurosAnual = valor('P-08').taxaAnual;
  let contingenciaIvaCent = 0;
  const detalheIva = [];
  const cfgBase = valor('P-21');
  for (const a of iva.atosSuspeitos ?? []) {
    const baseCent = a.baseAnualCent ?? 0;
    const anos = Math.min(anosPrescricao, a.anos ?? anosPrescricao);

    // Ver pressuposto P-21. As duas leituras dao numeros muito diferentes e a
    // escolha nao e do modelo, e de quem assina.
    const porForaCent = aplicaTaxa(baseCent, taxaIva) * anos;
    const incluidoCent = aplicaTaxa(baseCent, taxaIva / (1 + taxaIva)) * anos;
    const principalCent = cfgBase.modo === 'INCLUIDO_NO_PRECO' ? incluidoCent : porForaCent;

    // Juros sobre o valor medio em divida ao longo do periodo.
    const jurosCent = Math.round(principalCent * jurosAnual * ((anos + 1) / 2));
    contingenciaIvaCent += principalCent + jurosCent;
    detalheIva.push({
      categoria: a.categoria,
      baseAnualCent: baseCent,
      anos,
      modoDeCalculo: cfgBase.modo,
      principalCent,
      principalSeImpostoPorForaCent: porForaCent,
      principalSeImpostoIncluidoCent: incluidoCent,
      diferencaEntreLeiturasCent: porForaCent - incluidoCent,
      jurosCent,
      totalCent: principalCent + jurosCent,
    });
  }
  testes.push({
    id: 'iva',
    nome: 'IVA sobre atos nao terapeuticos',
    estado: contingenciaIvaCent > 0 ? 'FALHA' : (iva.atosSuspeitos ?? []).length === 0 ? 'POR_VERIFICAR' : 'CONFORME',
    achados: detalheIva.map(
      (d) => `${d.categoria}: tratado como isento pelo artigo 9.o do CIVA sem ser ato terapeutico. Passivo retroativo de ${formata(d.totalCent)} com juros.`,
    ),
    contingenciaCent: contingenciaIvaCent,
    detalhe: detalheIva,
    bloqueiaNegocio: false,
    nota: detalheIva.length === 0 ? null
      : 'Calculado com o imposto a acrescer ao preco cobrado, que e a leitura conservadora. ' +
        'Se o preco for tratado como ja incluindo imposto, o principal desce para ' +
        `${formata(soma(detalheIva.map((d) => d.principalSeImpostoIncluidoCent)))}. ` +
        'A escolha entre as duas leituras e de quem assina, nao do modelo. Ver P-21.',
  });

  // 4. Arrendamento
  const arr = dados.arrendamento ?? {};
  const mesesRestantes = arr.mesesRestantes ?? null;
  testes.push({
    id: 'arrendamento',
    nome: 'Arrendamento',
    estado: arr.temClausulaTransmissao === true && (mesesRestantes ?? 0) >= 36
      ? 'CONFORME'
      : mesesRestantes != null && mesesRestantes < 24 ? 'FALHA' : 'POR_VERIFICAR',
    achados: [
      arr.temClausulaTransmissao === false
        ? 'O contrato nao tem clausula de transmissao. A operacao pode exigir acordo do senhorio.'
        : null,
      arr.direitoOposicaoSenhorio ? 'O senhorio tem direito de oposicao a transmissao.' : null,
      mesesRestantes != null && mesesRestantes < 24
        ? `Faltam ${mesesRestantes} meses de contrato. Uma clinica com contrato a terminar vale menos, e o desconto e proporcional ao risco de ter de sair.`
        : null,
    ].filter(Boolean),
    contingenciaCent: null,
    bloqueiaNegocio: false,
  });

  // 5. Registos clinicos e RGPD
  const rgpd = dados.rgpd ?? {};
  testes.push({
    id: 'rgpd',
    nome: 'Registos clinicos e RGPD',
    estado: rgpd.responsavelTratamentoIdentificado === true && rgpd.exportacaoCompletaPossivel === true
      ? 'CONFORME'
      : rgpd.exportacaoCompletaPossivel === false ? 'FALHA' : 'POR_VERIFICAR',
    achados: [
      rgpd.responsavelTratamentoIdentificado === false
        ? 'Nao esta claro quem e o responsavel pelo tratamento dos dados clinicos. Numa transmissao isto tem de estar resolvido antes do fecho.'
        : null,
      rgpd.exportacaoCompletaPossivel === false
        ? 'O software clinico nao permite exportacao completa. Sistema fechado e desconto no preco, nao detalhe tecnico: o comprador fica refem do fornecedor.'
        : null,
      rgpd.temEncarregadoProtecaoDados === false
        ? 'Sem encarregado de protecao de dados designado, quando o tratamento de dados de saude em larga escala o exige.'
        : null,
    ].filter(Boolean),
    contingenciaCent: null,
    bloqueiaNegocio: false,
  });

  return testes;
}

/** Contingencias com probabilidade, para valor esperado. */
export function contingencias(testes, probabilidades = {}) {
  const itens = testes
    .filter((t) => t.contingenciaCent != null && t.contingenciaCent > 0)
    .map((t) => {
      const p = probabilidades[t.id] ?? 0.5;
      return {
        id: t.id,
        nome: t.nome,
        montanteCent: t.contingenciaCent,
        probabilidade: p,
        valorEsperadoCent: Math.round(t.contingenciaCent * p),
      };
    });
  return {
    itens,
    totalMontanteCent: soma(itens.map((i) => i.montanteCent)),
    totalEsperadoCent: soma(itens.map((i) => i.valorEsperadoCent)),
    nota: 'A probabilidade e um julgamento, nao um calculo. Aparece a vista para poder ser discutida.',
  };
}

/** Scorecard de cinco dimensoes, traduzido em impacto sobre o multiplo. */
export function scorecard(pontuacoes) {
  const linhas = DIMENSOES.map((d) => {
    const p = pontuacoes[d.id];
    return {
      ...d,
      pontuacao: p ?? null,
      contribuicao: p == null ? null : p * d.peso,
    };
  });
  const avaliadas = linhas.filter((l) => l.pontuacao != null);
  // Renormaliza pelo peso efetivamente avaliado, para que um scorecard
  // incompleto nao seja lido como um scorecard mau.
  const pesoAvaliado = avaliadas.reduce((a, l) => a + l.peso, 0);
  const total = pesoAvaliado === 0
    ? null
    : avaliadas.reduce((a, l) => a + l.contribuicao, 0) / pesoAvaliado;

  return {
    linhas,
    total,
    completude: avaliadas.length / DIMENSOES.length,
    // Traducao para impacto no multiplo. Deliberadamente grosseira e declarada
    // como tal: uma pontuacao de 1 a 5 nao produz precisao decimal num multiplo.
    impactoNoMultiplo: total == null ? null : {
      direcao: total >= 4 ? 'ACIMA' : total <= 2.5 ? 'ABAIXO' : 'NEUTRO',
      leitura: total >= 4
        ? 'O perfil suporta o topo do intervalo de referencia.'
        : total <= 2.5
          ? 'O perfil nao suporta o intervalo de referencia. Trabalhar o scorecard antes de ir ao mercado vale mais do que negociar melhor.'
          : 'O perfil suporta a zona central do intervalo.',
    },
  };
}

/** Plano de 12 meses, ordenado pelo que aumenta valor por euro investido. */
export function planoDeDoZeMeses(accoes) {
  return [...accoes]
    .map((a) => ({
      ...a,
      retornoPorEuro: a.custoCent > 0 ? a.ganhoEstimadoCent / a.custoCent : Infinity,
    }))
    .sort((a, b) => b.retornoPorEuro - a.retornoPorEuro)
    .map((a, i) => ({ ordem: i + 1, ...a }));
}

/**
 * Ferramenta completa.
 * Nunca apresenta um numero como avaliacao. Se o multiplo nao for introduzido,
 * corre na mesma e entrega tudo menos a sensibilidade de valor.
 */
export function prontidaoParaTransacao({
  ebitdaDeclaradoCent,
  ajustamentos = [],
  equipa = [],
  receitaPorEntidadeCent = {},
  receitaPorProfissionalCent = {},
  dadosDiligencia = {},
  pontuacoes = {},
  probabilidadesContingencia = {},
  accoes = [],
  multiploIntroduzido = null,
  tipologia = 'dentaria-local-unico',
}) {
  const r = new Resultado('F3', 'Prontidao para transacao');
  r.usaPressuposto('P-03').usaPressuposto('P-05').usaPressuposto('P-06')
    .usaPressuposto('P-07').usaPressuposto('P-08').usaPressuposto('P-21');

  const ponte = ponteEbitda(ebitdaDeclaradoCent, ajustamentos);
  if (ponte.desconhecidos.length > 0) {
    r.lacunas.declara('F3-AJUSTAMENTO-SEM-CLASSE', GRAVIDADE.DEGRADA,
      `${ponte.desconhecidos.length} ajustamentos sem classificacao de defensabilidade. Ficaram de fora do numero.`,
      { comoResolver: 'Classificar cada ajustamento como solido, discutivel ou indefensavel.' });
  }
  if (ponte.ajustamentosNegativos === 0 && ajustamentos.length > 0) {
    r.lacunas.declara('F3-SO-AJUSTAMENTOS-FAVORAVEIS', GRAVIDADE.DEGRADA,
      'Todos os ajustamentos sobem o EBITDA. Numa clinica de dono-operador isto quase nunca e verdade: ' +
      'substituir o dono por remuneracao de mercado costuma retirar lucro. Uma ponte so com ajustamentos ' +
      'favoraveis e a primeira coisa que o comprador ataca.',
      { comoResolver: 'Verificar a remuneracao de mercado do dono contra a producao clinica que faz.' });
  }

  const transf = transferibilidade(equipa);
  if (!transf.calculavel) {
    r.lacunas.declara('F3-SEM-TRANSFERIBILIDADE', GRAVIDADE.BLOQUEIA,
      'Sem producao por profissional nao consigo calcular transferibilidade, que e o indicador que ' +
      'move o multiplo. O resto da analise sai, este numero nao.');
  }

  const conc = concentracao({
    porEntidadeCent: receitaPorEntidadeCent,
    porProfissionalCent: receitaPorProfissionalCent,
  });

  const testes = testesDeDiligencia(dadosDiligencia);
  const porVerificar = testes.filter((t) => t.estado === 'POR_VERIFICAR');
  if (porVerificar.length > 0) {
    r.lacunas.declara('F3-TESTES-POR-VERIFICAR', GRAVIDADE.DEGRADA,
      `${porVerificar.length} dos cinco testes de diligencia estao por verificar: ${porVerificar.map((t) => t.nome).join(', ')}. ` +
      'Um teste por verificar nao e um teste passado.',
      { comoResolver: 'Recolher os documentos em falta antes de qualquer contacto com comprador.' });
  }

  const cont = contingencias(testes, probabilidadesContingencia);
  const sc = scorecard(pontuacoes);
  const plano = planoDeDoZeMeses(accoes);

  r.acrescentaBloco({ id: 'ponte-ebitda', titulo: 'Ponte do EBITDA declarado ao ajustado', tipo: 'ponte', dados: ponte });
  r.acrescentaBloco({ id: 'transferibilidade', titulo: 'Transferibilidade', tipo: 'indicador', dados: transf });
  r.acrescentaBloco({ id: 'concentracao', titulo: 'Concentracao', tipo: 'indicador', dados: conc });
  r.acrescentaBloco({ id: 'scorecard', titulo: 'Scorecard de cinco dimensoes', tipo: 'scorecard', dados: sc });

  r.acrescentaBloco({
    id: 'diligencia',
    titulo: 'Cinco testes de diligencia',
    tipo: 'testes',
    natureza: NATUREZA.JURIDICA,
    dados: { testes },
  });
  r.acrescentaBloco({
    id: 'contingencias',
    titulo: 'Contingencias quantificadas',
    tipo: 'tabela',
    natureza: NATUREZA.FISCAL,
    dados: cont,
  });
  r.acrescentaBloco({ id: 'plano', titulo: 'Plano de doze meses', tipo: 'plano', dados: plano });

  // Sensibilidade de valor. Nunca uma avaliacao.
  const refEstrato = referenciaMultiplosInternacional.estratos.find((e) => e.chave === tipologia);
  if (multiploIntroduzido == null) {
    r.lacunas.declara('F3-SEM-MULTIPLO', GRAVIDADE.DEGRADA,
      'Nao foi introduzido nenhum multiplo. Nao existe multiplo por defeito porque nao ha referencias ' +
      'portuguesas observadas e usar as internacionais como esperado seria apresentar o mercado errado.',
      { pressuposto: 'P-03', comoResolver: 'Introduzir o multiplo a testar, ou carregar transacoes portuguesas observadas.' });
  } else {
    const base = ponte.ebitdaAjustadoCent;
    const cenarios = [-1, -0.5, 0, 0.5, 1].map((d) => {
      const m = multiploIntroduzido + d;
      const brutoCent = Math.round(base * m);
      return {
        multiplo: m,
        valorBrutoCent: brutoCent,
        liquidoDeContingenciasCent: brutoCent - cont.totalEsperadoCent,
      };
    });
    r.acrescentaBloco({
      id: 'sensibilidade',
      titulo: 'Sensibilidade ao multiplo',
      tipo: 'sensibilidade',
      fonte: referenciaMultiplosInternacional.etiqueta,
      dados: {
        multiploIntroduzido,
        cenarios,
        referenciaInternacional: refEstrato ? refEstrato.valores : null,
        temTransacoesPortuguesas: transacoesPortuguesas.length > 0,
        aviso: estadoMultiplos.avisoObrigatorio,
      },
    });
  }

  const bloqueadores = testes.filter((t) => t.bloqueiaNegocio);
  const contTotal = cont.totalEsperadoCent;

  r.defineVeredito(
    bloqueadores.length > 0
      ? `Ha ${bloqueadores.length} pendencia que impede a operacao antes de qualquer conversa de preco: ${bloqueadores.map((b) => b.nome).join(', ')}.`
      : contTotal > 0
        ? `Contingencias de ${formata(contTotal, { compacto: true })} em valor esperado, e ${Math.round((transf.fracaoDependenteDoFundador ?? 0) * 100)}% da producao depende de quem vende.`
        : `Sem contingencias quantificadas. ${Math.round((transf.fracaoDependenteDoFundador ?? 0) * 100)}% da producao depende de quem vende, e e ai que esta o trabalho.`,
    { severidade: bloqueadores.length > 0 ? 'MAU' : contTotal > 0 ? 'ATENCAO' : 'NEUTRO' },
  );

  r.limiteDeResponsabilidade =
    'Isto nao e uma avaliacao nem um parecer juridico. E um modelo quantitativo de prontidao. ' +
    'As conclusoes fiscais e juridicas exigem co-assinatura de quem tem cedula.';

  return r;
}
