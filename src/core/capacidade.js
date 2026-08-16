/**
 * Motor de capacidade.
 *
 * Uma so definicao de dia util clinico, hora-gabinete disponivel e
 * hora-profissional disponivel. Nenhuma ferramenta redefine isto localmente.
 *
 * Porque e que isto e a camada mais importante das quatro: hora-gabinete e o
 * denominador de quase todos os numeros que o cliente ve. Se o F1 disser que ha
 * 1 400 horas em Marco e o F2 disser 1 320, os dois relatorios sao
 * inconciliaveis e a conversa passa a ser sobre a folha de calculo em vez de ser
 * sobre a clinica.
 */

/** Algoritmo gregoriano anonimo. Devolve a data da Pascoa em UTC. */
export function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function maisDias(data, n) {
  return new Date(data.getTime() + n * 86400000);
}

function iso(data) {
  return data.toISOString().slice(0, 10);
}

/**
 * Feriados nacionais obrigatorios em Portugal continental.
 * Carnaval nao entra, ver pressuposto P-20. Feriados municipais nao entram,
 * ver P-19, porque variam por concelho e sao configurados por clinica.
 */
export function feriadosNacionais(ano) {
  const p = pascoa(ano);
  return [
    { data: `${ano}-01-01`, nome: 'Ano Novo' },
    { data: iso(maisDias(p, -2)), nome: 'Sexta-feira Santa' },
    { data: iso(p), nome: 'Pascoa' },
    { data: `${ano}-04-25`, nome: 'Dia da Liberdade' },
    { data: `${ano}-05-01`, nome: 'Dia do Trabalhador' },
    { data: iso(maisDias(p, 60)), nome: 'Corpo de Deus' },
    { data: `${ano}-06-10`, nome: 'Dia de Portugal' },
    { data: `${ano}-08-15`, nome: 'Assuncao de Nossa Senhora' },
    { data: `${ano}-10-05`, nome: 'Implantacao da Republica' },
    { data: `${ano}-11-01`, nome: 'Todos os Santos' },
    { data: `${ano}-12-01`, nome: 'Restauracao da Independencia' },
    { data: `${ano}-12-08`, nome: 'Imaculada Conceicao' },
    { data: `${ano}-12-25`, nome: 'Natal' },
  ];
}

/**
 * Dias uteis clinicos de um mes.
 *
 * Dia util clinico nao e dia util do calendario. E dia em que a clinica abre.
 * Uma clinica que abre ao sabado de manha tem dias uteis a mais e uma que fecha
 * a sexta a tarde tem horas a menos com os mesmos dias. Por isso a funcao
 * devolve dias e horas, e as ferramentas usam horas sempre que podem.
 *
 * @param {object} opcoes
 * @param {number} opcoes.ano
 * @param {number} opcoes.mes 1 a 12
 * @param {number[]} [opcoes.diasSemanaAbertos] 0 domingo a 6 sabado
 * @param {string[]} [opcoes.encerramentos] datas ISO em que a clinica esteve fechada
 * @param {string[]} [opcoes.feriadosMunicipais] datas ISO
 */
export function diasUteisClinicos({
  ano,
  mes,
  diasSemanaAbertos = [1, 2, 3, 4, 5],
  encerramentos = [],
  feriadosMunicipais = [],
}) {
  // Os feriados municipais so chegam aqui se a clinica os tiver configurado.
  // O pressuposto P-19 governa o perfil, nao esta funcao: quem passa a lista ja
  // decidiu que quer descontar esses dias.
  const feriados = new Set(feriadosNacionais(ano).map((f) => f.data));
  for (const f of feriadosMunicipais) feriados.add(f);
  const fechados = new Set(encerramentos);
  const abertos = new Set(diasSemanaAbertos);

  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const detalhe = [];
  let contagem = 0;
  for (let dia = 1; dia <= ultimo; dia += 1) {
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    const chave = iso(d);
    const semana = d.getUTCDay();
    let motivo = null;
    if (!abertos.has(semana)) motivo = 'fora do horario de abertura';
    else if (feriados.has(chave)) motivo = 'feriado';
    else if (fechados.has(chave)) motivo = 'encerramento da clinica';
    if (motivo === null) contagem += 1;
    detalhe.push({ data: chave, aberto: motivo === null, motivo });
  }
  return { dias: contagem, detalhe };
}

/**
 * Horas-gabinete disponiveis num mes.
 *
 * Cada gabinete pode ter horario proprio. Um gabinete de cirurgia que so abre
 * as tercas nao pode ser contado como um gabinete de consulta a tempo inteiro,
 * e contar assim e o que produz taxas de ocupacao de 40% em clinicas cheias.
 */
export function horasGabineteDisponiveis(perfil, ano, mes) {
  const gabinetes = perfil.capacidade?.gabinetes ?? [];
  if (gabinetes.length === 0) return { horas: 0, porGabinete: [], calculado: false };

  const porGabinete = gabinetes.map((g) => {
    const { dias } = diasUteisClinicos({
      ano,
      mes,
      diasSemanaAbertos: g.diasSemanaAbertos ?? perfil.capacidade.diasSemanaAbertos ?? [1, 2, 3, 4, 5],
      encerramentos: [...(perfil.capacidade.encerramentos ?? []), ...(g.encerramentos ?? [])],
      feriadosMunicipais: perfil.capacidade.feriadosMunicipais ?? [],
    });
    const horasDia = g.horasPorDia ?? perfil.capacidade.horasPorDia ?? 8;
    return { id: g.id, nome: g.nome, dias, horasDia, horas: dias * horasDia };
  });

  return {
    horas: porGabinete.reduce((a, g) => a + g.horas, 0),
    porGabinete,
    calculado: true,
  };
}

/**
 * Horas-profissional disponiveis num mes.
 * Ferias e ausencias descontam. Um mes com dois profissionais de ferias tem
 * menos capacidade e comparar receita sem descontar isto e comparar nada.
 */
export function horasProfissionalDisponiveis(perfil, ano, mes) {
  const equipa = perfil.equipa ?? [];
  if (equipa.length === 0) return { horas: 0, porProfissional: [], calculado: false };

  const porProfissional = equipa.map((p) => {
    const { dias } = diasUteisClinicos({
      ano,
      mes,
      diasSemanaAbertos: p.diasSemanaAbertos ?? perfil.capacidade?.diasSemanaAbertos ?? [1, 2, 3, 4, 5],
      encerramentos: [
        ...(perfil.capacidade?.encerramentos ?? []),
        ...(p.ausencias ?? []),
      ],
      feriadosMunicipais: perfil.capacidade?.feriadosMunicipais ?? [],
    });
    const horas = dias * (p.horasPorDia ?? 8);
    return { id: p.id, nome: p.nome, papel: p.papel, dias, horas };
  });

  return {
    horas: porProfissional.reduce((a, p) => a + p.horas, 0),
    porProfissional,
    calculado: true,
  };
}

/**
 * Ocupacao a partir de horas ocupadas conhecidas.
 * Devolve null quando nao ha dados de agenda, e nunca uma estimativa.
 * A especificacao e explicita: nunca estimar ocupacao sem dados de agenda.
 */
export function ocupacao(horasOcupadas, horasDisponiveis) {
  if (horasOcupadas == null || !Number.isFinite(horasOcupadas)) return null;
  if (!horasDisponiveis) return null;
  return horasOcupadas / horasDisponiveis;
}

/** Horas livres por faixa horaria, base do modulo de alocacao do F2. */
export function horasLivresPorFaixa(agendaPorFaixa, capacidadePorFaixa) {
  const faixas = new Set([...Object.keys(agendaPorFaixa), ...Object.keys(capacidadePorFaixa)]);
  const resultado = {};
  for (const f of faixas) {
    const disponivel = capacidadePorFaixa[f] ?? 0;
    const ocupado = agendaPorFaixa[f] ?? 0;
    resultado[f] = {
      disponivel,
      ocupado,
      livre: Math.max(0, disponivel - ocupado),
      ocupacao: disponivel === 0 ? null : ocupado / disponivel,
    };
  }
  return resultado;
}
