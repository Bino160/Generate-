/**
 * Raio-X do SAF-T. O que o ficheiro sabe, e o que nao sabe.
 *
 * Esta camada existe para responder a quatro perguntas que qualquer clinica faz
 * assim que ve um SAF-T carregado. Tres delas tem resposta e uma nao tem, e a
 * distincao entre as duas coisas e o conteudo deste modulo.
 *
 * **Servicos mais vendidos.** Resposta direta. O SAF-T tem codigo de produto,
 * descricao, quantidade e valor em cada linha. E o unico dos quatro que sai sem
 * pressupostos.
 *
 * **Melhores clientes.** Resposta com duas leituras diferentes, e confundi-las e
 * um erro caro. Por paciente, e a receita agrupada por pseudonimo, e cobre
 * apenas a parte da faturacao em que o paciente foi identificado. Por entidade
 * pagadora, e quem paga, e ai a cobertura e total mas depende da tabela de
 * correspondencia do perfil.
 *
 * **Vendas por medico.** O SAF-T nao tem campo de profissional. Nenhum. Um ato
 * faturado nao diz quem o fez, e nao ha versao do formato que diga. O que existe
 * sao tres pistas indiretas, todas imperfeitas, e este modulo usa-as por
 * mapeamento explicito em vez de adivinhar. Ver atribuicaoPorProfissional.
 *
 * **Faltas, desmarcacoes e realizadas.** O SAF-T nao sabe nada disto e nunca
 * saberá. Uma falta e, por definicao, a ausencia de uma fatura: nao ha documento
 * nenhum a gerar. Procurar faltas num ficheiro de faturacao e procurar o que la
 * nao esta por construcao. Isto precisa da agenda, e o modulo diz isso em vez de
 * mostrar um numero parecido.
 */

import { soma, porUnidade } from './dinheiro.js';

// ---------------------------------------------------------------------------
// Servicos
// ---------------------------------------------------------------------------

/**
 * Servicos vendidos, ordenados por receita.
 *
 * Um ato e uma linha de documento. As notas de credito abatem, tanto na receita
 * como na contagem, porque um ato faturado e depois creditado nao foi vendido.
 *
 * @param {object} saft
 * @param {object} [opcoes]
 * @param {Map<string, object>} [opcoes.precario] catalogo do perfil, por codigo
 * @param {number} [opcoes.limite]
 */
export function servicosVendidos(saft, { precario = new Map(), limite = 10 } = {}) {
  const porCodigo = new Map();

  for (const d of saft.documentosValidos) {
    for (const l of d.linhas) {
      const codigo = l.produto || '(sem codigo)';
      const atual = porCodigo.get(codigo) ?? {
        codigo,
        descricao: l.descricao || saft.produtos.get(codigo)?.descricao || codigo,
        receitaCent: 0,
        quantidade: 0,
        atos: 0,
      };
      atual.receitaCent += l.creditoCent - l.debitoCent;
      atual.quantidade += (l.quantidade ?? 1) * d.sinal;
      atual.atos += d.sinal;
      porCodigo.set(codigo, atual);
    }
  }

  const receitaTotalCent = soma([...porCodigo.values()].map((s) => s.receitaCent));

  const linhas = [...porCodigo.values()]
    .map((s) => {
      const noPrecario = precario.get(s.codigo);
      const duracao = noPrecario?.duracaoMinutos ?? null;
      const custoUnitario = noPrecario?.custoVariavelCent ?? null;
      const margemCent = custoUnitario == null ? null : s.receitaCent - custoUnitario * Math.max(0, s.atos);
      const horas = duracao == null ? null : (duracao / 60) * Math.max(0, s.atos);
      return {
        ...s,
        precoMedioCent: s.atos > 0 ? porUnidade(s.receitaCent, s.atos) : null,
        pesoNaReceita: receitaTotalCent === 0 ? null : s.receitaCent / receitaTotalCent,
        duracaoMinutos: duracao,
        margemCent,
        horas,
        margemPorHoraCent: margemCent != null && horas ? porUnidade(margemCent, horas) : null,
        noPrecario: Boolean(noPrecario),
      };
    })
    .sort((a, b) => b.receitaCent - a.receitaCent);

  const semPrecario = linhas.filter((l) => !l.noPrecario);

  return {
    porReceita: linhas.slice(0, limite),
    porVolume: [...linhas].sort((a, b) => b.atos - a.atos).slice(0, limite),
    // A ordenacao que interessa quando ha duracao, e a que quase nunca se ve.
    porMargemHora: linhas
      .filter((l) => l.margemPorHoraCent != null)
      .sort((a, b) => b.margemPorHoraCent - a.margemPorHoraCent)
      .slice(0, limite),
    nDistintos: linhas.length,
    receitaTotalCent,
    codigosSemPrecario: semPrecario.map((l) => l.codigo),
    coberturaDoPrecario: linhas.length === 0
      ? null
      : soma(linhas.filter((l) => l.noPrecario).map((l) => l.receitaCent)) / (receitaTotalCent || 1),
  };
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

/**
 * Pacientes por receita, identificados por pseudonimo.
 *
 * A concentracao interessa mais do que a lista. Uma clinica em que dez pacientes
 * valem 30% da receita tem um risco que uma clinica com 3% nao tem, e e um risco
 * que ninguem mede porque toda a gente olha para o topo da tabela em vez de
 * olhar para o peso do topo.
 */
export function pacientesPorReceita(saft, { limite = 10 } = {}) {
  const porPaciente = new Map();
  let receitaIdentificadaCent = 0;

  for (const d of saft.documentosValidos) {
    if (!d.pseudonimo || d.consumidorFinal) continue;
    const atual = porPaciente.get(d.pseudonimo) ?? {
      pseudonimo: d.pseudonimo, receitaCent: 0, documentos: 0, primeiro: d.data, ultimo: d.data,
    };
    atual.receitaCent += d.liquidoLinhasCent;
    atual.documentos += 1;
    if (d.data && d.data < atual.primeiro) atual.primeiro = d.data;
    if (d.data && d.data > atual.ultimo) atual.ultimo = d.data;
    receitaIdentificadaCent += d.liquidoLinhasCent;
    porPaciente.set(d.pseudonimo, atual);
  }

  const ordenados = [...porPaciente.values()].sort((a, b) => b.receitaCent - a.receitaCent);
  const topo = ordenados.slice(0, limite);
  const receitaDoTopoCent = soma(topo.map((p) => p.receitaCent));

  return {
    topo,
    nPacientes: ordenados.length,
    receitaIdentificadaCent,
    receitaConsumidorFinalCent: saft.resumo.receitaConsumidorFinalCent,
    pesoDoTopo: receitaIdentificadaCent === 0 ? null : receitaDoTopoCent / receitaIdentificadaCent,
    cobertura: saft.resumo.receitaCent === 0 ? null : receitaIdentificadaCent / saft.resumo.receitaCent,
  };
}

/** Receita por entidade pagadora, com o peso da maior. */
export function entidadesPorReceita(saft, correspondencia) {
  const porEntidade = new Map();

  for (const d of saft.documentosValidos) {
    for (const l of d.linhas) {
      const entidade = correspondencia.resolve(d, l) ?? 'NAO MAPEADO';
      const atual = porEntidade.get(entidade) ?? { entidade, receitaCent: 0, atos: 0 };
      atual.receitaCent += l.creditoCent - l.debitoCent;
      atual.atos += d.sinal;
      porEntidade.set(entidade, atual);
    }
  }

  const linhas = [...porEntidade.values()].sort((a, b) => b.receitaCent - a.receitaCent);
  const total = soma(linhas.map((l) => l.receitaCent));

  return {
    linhas: linhas.map((l) => ({
      ...l,
      peso: total === 0 ? null : l.receitaCent / total,
      ticketMedioCent: l.atos > 0 ? porUnidade(l.receitaCent, l.atos) : null,
    })),
    totalCent: total,
    pesoDaMaior: total === 0 || linhas.length === 0 ? null : linhas[0].receitaCent / total,
    temRegras: correspondencia.regras > 0,
  };
}

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------

export const PISTAS_DE_AUTORIA = [
  {
    id: 'serie',
    nome: 'Serie do documento',
    descricao: 'Muitas clinicas usam uma serie de faturacao por profissional ou por posto.',
    fiabilidade: 'Boa quando existe, e verificavel: cada serie deve ter um so profissional.',
    extrai: (d) => d.serie,
  },
  {
    id: 'origem',
    nome: 'Utilizador que emitiu',
    descricao: 'O campo SourceID do documento identifica quem o criou no software de faturacao.',
    fiabilidade: 'Fraca. Em clinicas com rececao, e sempre a mesma pessoa e nao diz nada sobre quem tratou.',
    extrai: (d) => d.origemId,
  },
  {
    id: 'produto',
    nome: 'Codigo ou descricao do ato',
    descricao: 'Algumas clinicas incluem as iniciais do profissional no codigo do ato.',
    fiabilidade: 'Depende inteiramente da disciplina de quem cria os codigos.',
    extrai: (d, l) => l.produto,
  },
];

/**
 * Cria um resolvedor de profissional a partir das regras do perfil.
 * Mesma mecanica da correspondencia de entidades, e pela mesma razao: nao ha
 * campo no formato, portanto a ligacao e declarada e verificavel, nunca adivinhada.
 */
export function criaAtribuicao(regras = []) {
  const compiladas = regras
    .filter((r) => r.profissional && r.padrao)
    .map((r) => {
      const pista = PISTAS_DE_AUTORIA.find((p) => p.id === (r.pista ?? 'serie'));
      return { profissional: r.profissional, pista, expressao: new RegExp(r.padrao, 'i') };
    });

  return {
    regras: compiladas.length,
    pistasUsadas: [...new Set(compiladas.map((r) => r.pista?.id).filter(Boolean))],
    resolve(documento, linha) {
      for (const r of compiladas) {
        const alvo = r.pista?.extrai(documento, linha);
        if (alvo && r.expressao.test(String(alvo))) return r.profissional;
      }
      return null;
    },
  };
}

/**
 * Receita por profissional.
 *
 * Devolve sempre a fracao nao atribuida. Um relatorio de producao por medico que
 * some 60% da receita e que nao diga que sao 60% e pior do que nenhum, porque
 * quem o le compara profissionais sobre bases diferentes.
 */
export function producaoPorProfissional(saft, atribuicao) {
  const porProfissional = new Map();
  let naoAtribuidoCent = 0;
  let naoAtribuidoAtos = 0;
  const chavesVistas = new Map();

  for (const d of saft.documentosValidos) {
    for (const l of d.linhas) {
      const valor = l.creditoCent - l.debitoCent;
      const quem = atribuicao.resolve(d, l);
      if (!quem) {
        naoAtribuidoCent += valor;
        naoAtribuidoAtos += d.sinal;
        // Guarda as pistas disponiveis, para se poder escrever a regra em falta.
        for (const pista of PISTAS_DE_AUTORIA) {
          const bruto = pista.extrai(d, l);
          if (!bruto) continue;
          const chave = `${pista.id}|${bruto}`;
          chavesVistas.set(chave, (chavesVistas.get(chave) ?? 0) + 1);
        }
        continue;
      }
      const atual = porProfissional.get(quem) ?? { profissional: quem, receitaCent: 0, atos: 0 };
      atual.receitaCent += valor;
      atual.atos += d.sinal;
      porProfissional.set(quem, atual);
    }
  }

  const linhas = [...porProfissional.values()].sort((a, b) => b.receitaCent - a.receitaCent);
  const atribuidoCent = soma(linhas.map((l) => l.receitaCent));
  const totalCent = atribuidoCent + naoAtribuidoCent;

  return {
    linhas: linhas.map((l) => ({
      ...l,
      peso: atribuidoCent === 0 ? null : l.receitaCent / atribuidoCent,
      ticketMedioCent: l.atos > 0 ? porUnidade(l.receitaCent, l.atos) : null,
    })),
    atribuidoCent,
    naoAtribuidoCent,
    naoAtribuidoAtos,
    totalCent,
    cobertura: totalCent === 0 ? null : atribuidoCent / totalCent,
    temRegras: atribuicao.regras > 0,
    // As pistas mais frequentes que ficaram por mapear, para nao ser preciso
    // abrir o ficheiro para descobrir o que la esta.
    pistasPorMapear: [...chavesVistas.entries()]
      .map(([chave, n]) => {
        const [pista, valorBruto] = chave.split('|');
        return { pista, valor: valorBruto, linhas: n };
      })
      .sort((a, b) => b.linhas - a.linhas)
      .slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// O que o SAF-T diz sobre atos desfeitos, e o que nao diz
// ---------------------------------------------------------------------------

/**
 * Documentos anulados e creditados.
 *
 * Isto nao sao desmarcacoes. E o que acontece depois de uma fatura existir: foi
 * anulada, ou foi creditada. Uma consulta desmarcada na vespera nunca chega a
 * ser faturada e por isso nao aparece aqui nem em lado nenhum do ficheiro.
 *
 * Vale a pena olhar na mesma, por duas razoes. Uma taxa de anulacao alta indica
 * problemas de faturacao, e um volume de notas de credito concentrado num
 * servico ou num mes costuma ter uma causa que a clinica desconhece.
 */
export function atosDesfeitos(saft) {
  const anulados = saft.documentos.filter((d) => d.anulado);
  const notasCredito = saft.documentosValidos.filter((d) => d.sinal < 0);

  const porMes = new Map();
  for (const d of notasCredito) {
    if (!d.mes) continue;
    porMes.set(d.mes, (porMes.get(d.mes) ?? 0) - d.liquidoLinhasCent);
  }

  const valorCreditadoCent = -soma(notasCredito.map((d) => d.liquidoLinhasCent));
  const receitaBrutaCent = soma(
    saft.documentosValidos.filter((d) => d.sinal > 0).map((d) => d.liquidoLinhasCent),
  );

  return {
    nAnulados: anulados.length,
    nDocumentos: saft.documentos.length,
    taxaDeAnulacao: saft.documentos.length === 0 ? null : anulados.length / saft.documentos.length,
    nNotasCredito: notasCredito.length,
    valorCreditadoCent,
    taxaDeCredito: receitaBrutaCent === 0 ? null : valorCreditadoCent / receitaBrutaCent,
    creditadoPorMes: [...porMes.entries()].sort().map(([mes, valorCent]) => ({ mes, valorCent })),
    naoSaoDesmarcacoes:
      'Isto sao documentos desfeitos depois de emitidos. Uma consulta desmarcada antes de ser '
      + 'faturada nao gera documento nenhum e por isso nao esta neste ficheiro.',
  };
}

/**
 * O que faz falta para responder a faltas, desmarcacoes e realizadas.
 *
 * Devolve sempre a mesma coisa e nao olha para o SAF-T de proposito. Existe para
 * que a pergunta tenha uma resposta escrita no ecra em vez de um espaco vazio
 * que se lê como avaria.
 */
export function porqueNaoHaFaltas() {
  return {
    respondivelComSaft: false,
    razao:
      'Uma falta e a ausencia de uma fatura. Um paciente que nao aparece nao gera documento, '
      + 'e uma desmarcacao feita na vespera tambem nao. Procurar isto num ficheiro de faturacao '
      + 'e procurar o que la nao esta por construcao, nao por limitacao do formato.',
    oQuePrecisa: [
      { campo: 'Marcacao', porque: 'E o denominador. Sem ele nao ha taxa de nada' },
      { campo: 'Estado da marcacao', porque: 'Realizada, faltou, desmarcada pelo paciente, desmarcada pela clinica' },
      { campo: 'Data e hora da marcacao', porque: 'Distingue desmarcacao com aviso de falta sem aviso' },
      { campo: 'Data e hora da desmarcacao', porque: 'A antecedencia e o que determina se a hora foi recuperavel' },
      { campo: 'Profissional e gabinete', porque: 'Sem isto nao se sabe que capacidade ficou por usar' },
      { campo: 'Identificador de paciente', porque: 'Para ligar a faturacao e medir reincidencia' },
    ],
    oQueSeMedeDepois: [
      'Taxa de falta e de desmarcacao, por profissional, por faixa horaria e por dia da semana',
      'Horas-gabinete perdidas por mes, e o que valiam a margem por hora do ato marcado',
      'Antecedencia mediana da desmarcacao, que separa a hora recuperavel da hora perdida',
      'Reincidencia por paciente, que e o que torna acionavel a politica de confirmacao',
      'Efeito da confirmacao previa, comparando faixas com e sem confirmacao',
    ],
    entretanto:
      'A grelha de ocupacao do perfil ja recolhe horas marcadas por faixa. Isso da a taxa de '
      + 'ocupacao e o teste de capacidade do F2, mas nao separa o que foi realizado do que faltou.',
  };
}
