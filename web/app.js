/**
 * Hub. Uma so pagina, com estado em memoria.
 *
 * Porque uma so pagina e nao sete: o SAF-T e carregado uma vez e usado por todas
 * as ferramentas. Se cada ferramenta fosse uma pagina, ou se pedia o ficheiro
 * sete vezes ou se guardava o conteudo em disco. A primeira opcao mata a
 * utilizacao, a segunda mata a promessa de privacidade.
 *
 * O que persiste no browser: o perfil de cliente, que nao tem dados de pacientes.
 * O que nao persiste: o SAF-T, os pseudonimos e a chave de pseudonimizacao.
 * Fechar o separador apaga tudo isso, e e intencional.
 */

import { Anonimizador } from '../src/core/anonimizacao.js';
import { analisaSaft, receitaPorMes } from '../src/core/saft.js';
import { perfilVazio, valida, completude, requisitosEmFalta, criaCorrespondencia } from '../src/core/perfil.js';
import { horasGabineteDisponiveis, diasUteisClinicos } from '../src/core/capacidade.js';
import { projeta13Semanas, prazoMedioPorEntidade } from '../src/core/tesouraria.js';
import { pressupostos } from '../src/config/pressupostos.js';
import { estadoDados as estadoBenchmark } from '../src/dados/benchmark-financeiro.js';
import { formata } from '../src/core/dinheiro.js';

import { painelMensal, constroiSerie } from '../src/ferramentas/f1-painel-mensal.js';
import { simuladorConvencoes, medeCaudaPrivada } from '../src/ferramentas/f2-convencoes.js';
import { prontidaoParaTransacao } from '../src/ferramentas/f3-prontidao-transacao.js';
import { barometro, calculaIndicadores } from '../src/ferramentas/f4-barometro.js';
import { funilPlanos } from '../src/ferramentas/f5-funil-planos.js';
import { investimentoEquipamento } from '../src/ferramentas/f6-equipamento.js';
import { remuneracao } from '../src/ferramentas/f7-remuneracao.js';

import { renderResultado, el } from './render.js';

const CHAVE_PERFIL = 'vclevel.perfil.v1';

const estado = {
  saft: null,
  anonimizador: null,
  perfil: carregaPerfil(),
};

/**
 * O armazenamento local pode nao existir: numa pagina incorporada, com cookies
 * de terceiros bloqueados ou em navegacao privada, `localStorage` lanca em vez
 * de devolver nulo. O perfil passa a viver so em memoria nesse caso, e o hub
 * continua a funcionar por inteiro. Perder a persistencia e um incomodo, deixar
 * de abrir e que nao pode acontecer.
 */
let persistenciaDisponivel = true;

function carregaPerfil() {
  try {
    const guardado = localStorage.getItem(CHAVE_PERFIL);
    return guardado ? JSON.parse(guardado) : perfilVazio();
  } catch {
    persistenciaDisponivel = false;
    return perfilVazio();
  }
}

function guardaPerfil() {
  try {
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(estado.perfil));
  } catch {
    persistenciaDisponivel = false;
  }
  atualizaEstadoLateral();
}

function apagaPerfilGuardado() {
  try {
    localStorage.removeItem(CHAVE_PERFIL);
  } catch {
    persistenciaDisponivel = false;
  }
}

// ---------------------------------------------------------------------------
// Encaminhamento
// ---------------------------------------------------------------------------

const ROTAS = ['dados', 'perfil', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'privacidade', 'pressupostos'];

function navega() {
  const rota = (location.hash.replace('#', '') || 'dados');
  const alvo = ROTAS.includes(rota) ? rota : 'dados';
  for (const r of ROTAS) {
    document.getElementById(`seccao-${r}`)?.classList.toggle('ativa', r === alvo);
  }
  for (const a of document.querySelectorAll('.menu a')) {
    if (a.dataset.rota === alvo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  desenha(alvo);
  document.querySelector('.conteudo').scrollTop = 0;
}

window.addEventListener('hashchange', navega);

// ---------------------------------------------------------------------------
// Estado lateral
// ---------------------------------------------------------------------------

function atualizaEstadoLateral() {
  const destino = document.getElementById('estado-dados');
  const c = completude(estado.perfil);
  destino.replaceChildren(
    el('strong', { texto: estado.saft ? `${estado.saft.resumo.nValidos} documentos lidos` : 'Sem SAF-T carregado' }),
    el('div', { texto: `Perfil ${Math.round(c.global * 100)}% completo.` }),
    el('div', { texto: 'Nada foi transmitido. Todo o calculo acontece neste browser.' }),
    persistenciaDisponivel
      ? null
      : el('div', { texto: 'Este browser nao deixa guardar o perfil, por isso ele so dura ate fechares a pagina.' }),
  );
}

// ---------------------------------------------------------------------------
// Carregar SAF-T
// ---------------------------------------------------------------------------

async function leFicheiro(ficheiro) {
  const destino = document.getElementById('resumo-saft');
  destino.replaceChildren(el('p', { texto: 'A ler e a pseudonimizar. Nada sai deste browser.' }));

  try {
    const texto = await ficheiro.text();
    estado.anonimizador = await Anonimizador.cria();
    estado.saft = await analisaSaft(texto, { anonimizador: estado.anonimizador });
    mostraResumoSaft();
    atualizaEstadoLateral();
  } catch (erro) {
    destino.replaceChildren(el('div', { classe: 'aviso-exportacao' }, [
      el('strong', { texto: 'Nao consegui ler o ficheiro. ' }),
      erro.message,
    ]));
  }
}

function mostraResumoSaft() {
  const s = estado.saft;
  const destino = document.getElementById('resumo-saft');
  const r = s.resumo;

  destino.replaceChildren(
    el('section', { classe: 'bloco' }, [
      el('header', {}, el('h3', { texto: `${s.cabecalho.empresa ?? 'Clinica'}, exercicio de ${s.cabecalho.ano ?? 'ano desconhecido'}` })),
      el('div', { classe: 'corpo' }, [
        el('table', {}, el('tbody', {}, [
          linha('Documentos validos', String(r.nValidos)),
          linha('Documentos anulados, excluidos', String(r.nAnulados)),
          linha('Receita liquida do periodo', formata(r.receitaCent)),
          linha('Meses cobertos', r.meses.join(', ') || 'nenhum'),
          linha('Pacientes identificados', String(r.nPacientesIdentificados)),
          linha('Receita sem paciente identificado', `${Math.round(r.fracaoConsumidorFinal * 100)}%`),
        ])),
      ]),
    ]),
    blocoLacunas(s.lacunas.toJSON()),
  );
}

function linha(chave, valorTexto) {
  return el('tr', {}, [el('td', { texto: chave }), el('td', { classe: 'numero', texto: valorTexto })]);
}

function blocoLacunas(lacunas) {
  const corpo = el('div', { classe: 'corpo' });
  if (lacunas.itens.length === 0) {
    corpo.append(el('p', { classe: 'nota', texto: 'Sem lacunas na leitura.' }));
  }
  for (const l of lacunas.itens) {
    corpo.append(el('div', { classe: 'lacuna', 'data-g': l.gravidade }, [
      el('div', { classe: 'gravidade', texto: l.gravidade.toLowerCase() }),
      el('div', {}, [
        el('div', { texto: l.mensagem }),
        l.comoResolver ? el('div', { classe: 'resolver', texto: `Como resolver: ${l.comoResolver}` }) : null,
      ]),
    ]));
  }
  return el('section', { classe: 'bloco' }, [
    el('header', {}, el('h3', { texto: 'O que o ficheiro nao permite calcular' })),
    corpo,
  ]);
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

const CAMPOS_PERFIL = [
  { caminho: 'identificacao.nome', etiqueta: 'Nome da clinica', tipo: 'text' },
  { caminho: 'identificacao.cae', etiqueta: 'CAE', tipo: 'text', ajuda: 'Ver pressuposto P-01 quanto a revisao' },
  { caminho: 'identificacao.subsetor', etiqueta: 'Subsetor', tipo: 'text', ajuda: 'Dentaria, psicologia, medicina geral' },
  { caminho: 'identificacao.nutsII', etiqueta: 'NUTS II', tipo: 'text' },
  {
    caminho: 'identificacao.regiao',
    etiqueta: 'Regiao fiscal',
    tipo: 'select',
    opcoes: ['CONTINENTE', 'MADEIRA', 'ACORES'],
    ajuda: 'Determina a taxa normal de IVA usada no F6',
  },
  { caminho: 'capacidade.horasPorDia', etiqueta: 'Horas de abertura por dia', tipo: 'number' },
  { caminho: 'custos.fixosMensaisCent', etiqueta: 'Custos fixos mensais, em euros', tipo: 'euros' },
  {
    caminho: 'custos.variavelFracaoReceita',
    etiqueta: 'Custo variavel, fracao da receita',
    tipo: 'number',
    passo: '0.01',
    ajuda: 'Materiais e laboratorio. 0,2 significa 20%',
  },
  { caminho: 'tesouraria.saldoCent', etiqueta: 'Saldo bancario atual, em euros', tipo: 'euros' },
  {
    caminho: 'fiscal.regimeIva',
    etiqueta: 'Regime de IVA',
    tipo: 'select',
    opcoes: ['ISENTO_ART9', 'MISTO_PRO_RATA', 'MISTO_AFETACAO_REAL', 'TRIBUTADO'],
  },
  { caminho: 'fiscal.proRataDedutivel', etiqueta: 'Pro rata dedutivel', tipo: 'number', passo: '0.01' },
  { caminho: 'fiscal.sociedadeProfissionais', etiqueta: 'Sociedade de profissionais, artigo 6.o do CIRC', tipo: 'checkbox' },
];

function le(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function escreve(obj, caminho, valorNovo) {
  const partes = caminho.split('.');
  const ultima = partes.pop();
  const alvo = partes.reduce((o, k) => { if (o[k] == null) o[k] = {}; return o[k]; }, obj);
  alvo[ultima] = valorNovo;
}

function desenhaPerfil() {
  const destino = document.getElementById('editor-perfil');
  const campos = el('div', { classe: 'campos' });

  for (const c of CAMPOS_PERFIL) {
    const bruto = le(estado.perfil, c.caminho);
    let entrada;
    if (c.tipo === 'select') {
      entrada = el('select', {}, c.opcoes.map((o) => el('option', { value: o, texto: o, selected: bruto === o ? '' : null })));
    } else if (c.tipo === 'checkbox') {
      entrada = el('input', { type: 'checkbox' });
      entrada.checked = Boolean(bruto);
    } else {
      entrada = el('input', {
        type: c.tipo === 'euros' ? 'number' : c.tipo,
        step: c.passo ?? (c.tipo === 'euros' ? '0.01' : null),
        value: c.tipo === 'euros' && bruto != null ? String(bruto / 100) : (bruto ?? ''),
      });
    }

    entrada.addEventListener('change', () => {
      let v;
      if (c.tipo === 'checkbox') v = entrada.checked;
      else if (c.tipo === 'euros') v = entrada.value === '' ? null : Math.round(Number(entrada.value) * 100);
      else if (c.tipo === 'number') v = entrada.value === '' ? null : Number(entrada.value);
      else v = entrada.value;
      escreve(estado.perfil, c.caminho, v);
      guardaPerfil();
      desenhaPerfil();
    });

    campos.append(el('div', {}, [
      el('label', {}, [c.etiqueta, c.ajuda ? el('span', { classe: 'ajuda', texto: c.ajuda }) : null]),
      entrada,
    ]));
  }

  const v = valida(estado.perfil);
  const c = completude(estado.perfil);

  const gabinetes = el('div', {}, [
    el('p', { classe: 'nota', texto: 'Cada gabinete pode ter horario proprio. Um gabinete de cirurgia que so abre as tercas nao pode contar como um gabinete a tempo inteiro.' }),
    el('table', {}, [
      el('thead', {}, el('tr', {}, [el('th', { texto: 'Gabinete' }), el('th', { texto: 'Horas por dia' }), el('th', {})])),
      el('tbody', {}, (estado.perfil.capacidade.gabinetes ?? []).map((g, i) => el('tr', {}, [
        el('td', { texto: g.nome ?? g.id }),
        el('td', { classe: 'numero', texto: String(g.horasPorDia ?? estado.perfil.capacidade.horasPorDia ?? 8) }),
        el('td', {}, botao('Remover', 'secundario', () => {
          estado.perfil.capacidade.gabinetes.splice(i, 1);
          guardaPerfil();
          desenhaPerfil();
        })),
      ]))),
    ]),
    botao('Acrescentar gabinete', 'secundario', () => {
      const n = (estado.perfil.capacidade.gabinetes ?? []).length + 1;
      estado.perfil.capacidade.gabinetes.push({ id: `G${n}`, nome: `Gabinete ${n}` });
      guardaPerfil();
      desenhaPerfil();
    }),
  ]);

  destino.replaceChildren(
    seccaoBloco('Identificacao e economia', campos),
    seccaoBloco('Gabinetes', gabinetes),
    seccaoBloco('Estado do perfil', el('div', {}, [
      el('p', { texto: `Completude global de ${Math.round(c.global * 100)}%.` }),
      ...v.erros.map((e) => el('div', { classe: 'aviso-exportacao', texto: e })),
      ...v.avisos.map((a) => el('p', { classe: 'nota', texto: a })),
      el('table', {}, [
        el('thead', {}, el('tr', {}, [el('th', { texto: 'Ferramenta' }), el('th', { texto: 'Falta' })])),
        el('tbody', {}, Object.keys(c.porFerramenta).map((f) => el('tr', {}, [
          el('td', { texto: f }),
          el('td', { texto: requisitosEmFalta(estado.perfil, f).map((r) => r.campo).join(', ') || 'nada' }),
        ]))),
      ]),
    ])),
  );
}

function seccaoBloco(titulo, corpo) {
  return el('section', { classe: 'bloco' }, [
    el('header', {}, el('h3', { texto: titulo })),
    el('div', { classe: 'corpo' }, corpo),
  ]);
}

function botao(texto, classe, aoClicar) {
  const b = el('button', { classe: classe ?? '', type: 'button', texto });
  b.addEventListener('click', aoClicar);
  return b;
}

function exigeSaft(destinoId) {
  const destino = document.getElementById(destinoId);
  destino.replaceChildren(el('div', { classe: 'vazio-estado' }, [
    el('p', { texto: 'Esta ferramenta precisa do SAF-T.' }),
    el('p', {}, el('a', { href: '#dados', texto: 'Carregar ficheiro' })),
  ]));
}

// ---------------------------------------------------------------------------
// Entradas estruturadas para as ferramentas que nao se alimentam do SAF-T
// ---------------------------------------------------------------------------

const EXEMPLOS = {
  f3: {
    ebitdaDeclaradoCent: 12000000,
    ajustamentos: [
      { id: 'renda', descricao: 'Renda acima de mercado paga a sociedade do socio', valorCent: 600000, defensabilidade: 'SOLIDO' },
      { id: 'dono', descricao: 'Remuneracao de mercado do socio produtor', valorCent: -4000000, defensabilidade: 'SOLIDO' },
      { id: 'viatura', descricao: 'Viatura de uso pessoal', valorCent: 250000, defensabilidade: 'DISCUTIVEL' },
    ],
    equipa: [
      { id: 'p1', nome: 'Socio fundador', producaoCent: 30000000, ficaAposNegocio: false },
      { id: 'p2', nome: 'Dra. B', producaoCent: 18000000, ficaAposNegocio: true, temNaoConcorrencia: true },
    ],
    dadosDiligencia: {
      ers: { licencaValida: true, confirmadaNoPortal: false, mudancaTitularidadeComunicada: false },
      prestadores: {
        lista: [{ id: 'x', nome: 'Dr. C', dependenciaEconomica: 0.85, faturadoAnualCent: 6000000, anosDeRelacao: 4, exclusividade: true, horarioFixo: true, meiosDaClinica: true }],
      },
      iva: { atosSuspeitos: [{ categoria: 'Estetica nao terapeutica', baseAnualCent: 3000000, anos: 4 }] },
      arrendamento: { temClausulaTransmissao: false, mesesRestantes: 18 },
      rgpd: { responsavelTratamentoIdentificado: true, exportacaoCompletaPossivel: false },
    },
    pontuacoes: { 'qualidade-resultados': 4, transferibilidade: 2, conformidade: 2, concentracao: 3, infraestrutura: 3 },
    multiploIntroduzido: null,
  },
  f5: [
    {
      id: 'PL-1', dataProposta: '2026-01-08', dataAceitacao: '2026-01-15', valorCent: 240000, pacientePseudonimo: 'p_a',
      passos: [
        { estado: 'EXECUTADO', valorCent: 60000, dataExecucao: '2026-01-22' },
        { estado: 'EXECUTADO', valorCent: 60000, dataExecucao: '2026-02-19' },
        { estado: 'PENDENTE', valorCent: 120000 },
      ],
    },
    {
      id: 'PL-2', dataProposta: '2026-01-20', dataAceitacao: '2026-02-02', valorCent: 90000, pacientePseudonimo: 'p_b',
      passos: [{ estado: 'EXECUTADO', valorCent: 90000, dataExecucao: '2026-02-10' }],
    },
  ],
  f6: {
    precoSemIvaCent: 4500000,
    vidaUtilAnos: 5,
    margemContribuicaoPorAtoCent: 12000,
    duracaoMinutosPorAto: 30,
    custoFixoMensalAdicionalCent: 15000,
    custoOportunidadeEspacoMensalCent: 40000,
    taxaFinanciamentoAnual: 0.06,
    rendaMensalCent: 95000,
    prazoMesesLeasing: 60,
  },
  f7: [
    {
      id: 'p1', nome: 'Dra. A', producaoCent: 1200000, recebidoCent: 1050000,
      percentagem: 0.45, horasGabinete: 120, dependenciaEconomica: 0.9, anosDeRelacao: 3,
      vinculo: 'INDEPENDENTE', taxaMarginalIrs: 0.35,
      suporta: { materiaisPelaClinica: true, materiaisCent: 90000, laboratorioPelaClinica: true, laboratorioCent: 60000 },
      indicios: { local: true, equipamento: true, horario: true },
    },
  ],
};

function editorJson(id, exemplo, aoCorrer) {
  const area = el('textarea', { rows: '14', spellcheck: 'false' });
  area.value = JSON.stringify(exemplo, null, 2);
  const erro = el('div', {});
  return el('div', {}, [
    el('p', { classe: 'nota', texto: 'A entrada desta ferramenta e um documento estruturado, nao um punhado de campos. Vem preenchida com um exemplo para veres a forma esperada. Substitui pelos dados do cliente.' }),
    area,
    el('p', {}, botao('Correr', null, () => {
      erro.replaceChildren();
      try {
        aoCorrer(JSON.parse(area.value));
      } catch (e) {
        erro.replaceChildren(el('div', { classe: 'aviso-exportacao', texto: `Entrada invalida: ${e.message}` }));
      }
    })),
    erro,
  ]);
}

// ---------------------------------------------------------------------------
// Desenho por rota
// ---------------------------------------------------------------------------

function contextoDoPeriodo() {
  const meses = estado.saft.resumo.meses;
  const ultimo = meses[meses.length - 1] ?? '2026-01';
  const [ano, mes] = ultimo.split('-').map(Number);
  const cap = horasGabineteDisponiveis(estado.perfil, ano, mes);
  const { dias } = diasUteisClinicos({
    ano, mes,
    diasSemanaAbertos: estado.perfil.capacidade?.diasSemanaAbertos,
    encerramentos: estado.perfil.capacidade?.encerramentos ?? [],
  });
  return { ano, mes, ultimo, horasGabinete: cap.horas, diasUteis: dias };
}

function desenha(rota) {
  switch (rota) {
    case 'perfil': desenhaPerfil(); break;
    case 'f1': desenhaF1(); break;
    case 'f2': desenhaF2(); break;
    case 'f3': desenhaF3(); break;
    case 'f4': desenhaF4(); break;
    case 'f5': desenhaF5(); break;
    case 'f6': desenhaF6(); break;
    case 'f7': desenhaF7(); break;
    case 'privacidade': desenhaPrivacidade(); break;
    case 'pressupostos': desenhaPressupostos(); break;
    default: break;
  }
}

function desenhaF1() {
  if (!estado.saft) return exigeSaft('saida-f1');
  const serie = constroiSerie(estado.saft, estado.perfil, {
    saldosPorMes: estado.perfil.tesouraria?.saldoCent
      ? Object.fromEntries(estado.saft.resumo.meses.map((m) => [m, estado.perfil.tesouraria.saldoCent]))
      : {},
  });

  const historico = [...receitaPorMes(estado.saft).entries()].map(([mes, receitaCent]) => ({ mes, receitaCent }));
  const projecao = projeta13Semanas({
    saldoInicialCent: estado.perfil.tesouraria?.saldoCent ?? null,
    historico,
    custosFixosMensaisCent: estado.perfil.custos?.fixosMensaisCent ?? 0,
    custoVariavelFracao: estado.perfil.custos?.variavelFracaoReceita ?? 0,
  });

  const seletor = el('select', {}, serie.map((m) => el('option', { value: m.mes, texto: m.mes })));
  seletor.value = serie[serie.length - 1]?.mes ?? '';

  const correr = () => {
    const r = painelMensal({ serie, perfil: estado.perfil, mesAlvo: seletor.value, projecao });
    renderResultado(r.toJSON(), document.getElementById('saida-f1'));
  };
  seletor.addEventListener('change', correr);

  document.getElementById('controlo-f1').replaceChildren(
    seccaoBloco('Mes a analisar', el('div', { classe: 'campos' }, el('div', {}, [
      el('label', { texto: 'Mes' }),
      seletor,
    ]))),
  );
  correr();
}

function desenhaF2() {
  if (!estado.saft) return exigeSaft('saida-f2');
  const perfil = estado.perfil;
  const controlo = document.getElementById('controlo-f2');

  if (!perfil.convencoes?.length || !perfil.precario?.length) {
    controlo.replaceChildren(editorJson('f2', {
      convencoes: [{
        id: 'MEDIS', nome: 'MEDIS', canibalizacao: 0.15, prazoRecebimentoDias: 60,
        atos: [{ codigo: 'MEDIS-CONS', nome: 'Consulta', precoCent: 2500, custoVariavelCent: 600, duracaoMinutos: 30, volume: 109 }],
      }],
      precario: [{ codigo: 'CONS', nome: 'Consulta privada', precoCent: 6000, custoVariavelCent: 900, duracaoMinutos: 30, volume: 100 }],
      capacidade: { horasDisponiveis: 1000, horasOcupadas: null },
    }, (entrada) => {
      correrF2(entrada.convencoes, entrada.precario, entrada.capacidade);
    }));
    return;
  }
  controlo.replaceChildren();
  correrF2(perfil.convencoes, perfil.precario, { horasDisponiveis: null, horasOcupadas: null });
}

function correrF2(convencoes, precario, capacidade) {
  const corresp = criaCorrespondencia(estado.perfil);
  const caudas = corresp.regras > 0 ? medeCaudaPrivada(estado.saft, corresp) : {};
  const r = simuladorConvencoes({
    convencoes,
    atosPrivadosEquivalentes: precario,
    capacidade,
    caudas: Object.fromEntries(Object.entries(caudas).map(([k, v]) => [k, { porPacienteCent: v.porPacienteCent, pacientesNovos: v.pacientesNovos }])),
  });
  renderResultado(r.toJSON(), document.getElementById('saida-f2'));
}

function desenhaF3() {
  document.getElementById('controlo-f3').replaceChildren(editorJson('f3', EXEMPLOS.f3, (entrada) => {
    const r = prontidaoParaTransacao(entrada);
    renderResultado(r.toJSON(), document.getElementById('saida-f3'));
  }));
}

function desenhaF4() {
  if (!estado.saft) return exigeSaft('saida-f4');
  const ctx = contextoDoPeriodo();
  const consentimento = el('input', { type: 'checkbox', id: 'consentimento-f4' });

  const correr = () => {
    const r = barometro({
      saft: estado.saft,
      perfil: estado.perfil,
      contexto: { horasGabinete: ctx.horasGabinete, diasUteis: ctx.diasUteis },
      observacoesDoEstrato: {},
      consentimento: consentimento.checked,
      periodo: { inicio: estado.saft.cabecalho.dataInicio, fim: estado.saft.cabecalho.dataFim },
    });
    renderResultado(r.toJSON(), document.getElementById('saida-f4'));
  };
  consentimento.addEventListener('change', correr);

  document.getElementById('controlo-f4').replaceChildren(
    seccaoBloco('Contribuir para o barometro', el('div', {}, [
      el('p', { classe: 'nota', texto: 'Sem esta caixa marcada nada sai do browser. Com ela marcada, sobem os agregados que ficam visiveis abaixo, sem uma unica linha de faturacao e sem datas ao dia.' }),
      el('label', {}, [consentimento, ' Autorizo o envio dos agregados anonimizados']),
    ])),
  );
  correr();
}

function desenhaF5() {
  document.getElementById('controlo-f5').replaceChildren(editorJson('f5', EXEMPLOS.f5, (planos) => {
    const receitaTratamentoCent = estado.saft ? estado.saft.resumo.receitaCent : null;
    const r = funilPlanos({ planos, receitaTratamentoCent });
    renderResultado(r.toJSON(), document.getElementById('saida-f5'));
  }));
}

function desenhaF6() {
  document.getElementById('controlo-f6').replaceChildren(editorJson('f6', EXEMPLOS.f6, (equipamento) => {
    const ctx = estado.saft ? contextoDoPeriodo() : null;
    const r = investimentoEquipamento({
      equipamento,
      perfil: estado.perfil,
      procuraObservadaAtosPorMes: equipamento.procuraObservadaAtosPorMes ?? null,
      capacidadeDisponivelHorasMes: ctx ? ctx.horasGabinete : null,
    });
    renderResultado(r.toJSON(), document.getElementById('saida-f6'));
  }));
}

function desenhaF7() {
  document.getElementById('controlo-f7').replaceChildren(editorJson('f7', EXEMPLOS.f7, (profissionais) => {
    const r = remuneracao({ profissionais, perfil: estado.perfil });
    renderResultado(r.toJSON(), document.getElementById('saida-f7'));
  }));
}

function desenhaPrivacidade() {
  const prazos = estado.saft
    ? prazoMedioPorEntidade(estado.saft, criaCorrespondencia(estado.perfil))
    : null;

  document.getElementById('saida-privacidade').replaceChildren(
    seccaoBloco('O que acontece ao ficheiro', el('div', {}, [
      el('ol', {}, [
        el('li', { texto: 'O ficheiro e lido pelo browser. Nao ha upload: nenhum pedido de rede transporta o conteudo.' }),
        el('li', { texto: 'E gerada uma chave aleatoria de 256 bits, dentro da pagina, marcada como nao extraivel. Nem o codigo desta pagina a consegue ler.' }),
        el('li', { texto: 'Cada identificador de paciente e substituido pelo resultado de um HMAC-SHA-256 com essa chave, truncado a 128 bits.' }),
        el('li', { texto: 'O identificador original e descartado antes de qualquer estrutura sair do leitor. Nao existe em memoria depois disso.' }),
        el('li', { texto: 'Fechar o separador destroi a chave. A correspondencia entre pseudonimo e paciente deixa de ser reconstituivel, incluindo por nos.' }),
      ]),
    ])),
    seccaoBloco('Porque nao um hash simples do NIF', el('div', {}, [
      el('p', { texto: 'O espaco de NIF portugues tem menos de mil milhoes de valores. Uma tabela completa de NIF para hash SHA-256 calcula-se num portatil em minutos. Um hash simples de NIF nao e anonimizacao para efeitos do RGPD, e pseudonimizacao, e dados pseudonimizados continuam a ser dados pessoais.' }),
      el('p', { texto: 'Com HMAC e chave aleatoria por sessao nao ha tabela possivel sem a chave, e a chave nunca existe fora desta pagina.' }),
    ])),
    seccaoBloco('O que fica guardado neste browser', el('div', {}, [
      el('p', { texto: 'Fica o perfil de cliente: gabinetes, custos fixos, regime de IVA, tabela de precos. Nao ha ali dados de pacientes, mas ha a economia da clinica, o que num computador partilhado ja e de mais.' }),
      el('p', { texto: 'Nao fica o SAF-T, nao ficam pseudonimos e nao fica a chave. Isso vive so na memoria da pagina e desaparece quando o separador fecha.' }),
      botao('Apagar o perfil guardado neste browser', 'secundario', () => {
        apagaPerfilGuardado();
        estado.perfil = perfilVazio();
        estado.saft = null;
        estado.anonimizador?.esquece();
        estado.anonimizador = null;
        atualizaEstadoLateral();
        desenhaPrivacidade();
      }),
    ])),
    seccaoBloco('O que sobe para o barometro', el('div', {}, [
      el('p', { texto: 'Apenas agregados por clinica, e so com consentimento expresso marcado a cada carregamento. Nenhuma linha de faturacao, nenhum pseudonimo, nenhuma data ao dia. Antes de sair, o agregado passa por um auditor que procura padroes de identificador e bloqueia o envio se encontrar algum.' }),
      el('p', { texto: 'Na publicacao, nenhum estrato com menos de cinco clinicas e divulgado, e publicam-se mediana e quartis, nunca media.' }),
    ])),
    prazos
      ? seccaoBloco('Prazos medios de recebimento calculados', el('div', {}, [
        el('p', { classe: 'nota', texto: 'Calculados a partir dos recibos do ficheiro. As entidades com poucos recibos aparecem como insuficientes em vez de receberem um valor assumido.' }),
        el('table', {}, el('tbody', {}, [
          ...Object.entries(prazos.porEntidade).map(([k, v]) => linha(k, `${v.mediana} dias, n igual a ${v.n}`)),
          ...prazos.insuficientes.map((i) => linha(i.entidade, `dados insuficientes, ${i.nRecibos} recibos`)),
        ])),
      ]))
      : null,
  );
}

function desenhaPressupostos() {
  const lista = Object.values(pressupostos);
  document.getElementById('saida-pressupostos').replaceChildren(
    seccaoBloco('Estado dos dados de referencia', el('div', {}, [
      el('p', { texto: estadoBenchmark.motivo }),
      el('p', { classe: 'nota', texto: `Metricas em falta: ${estadoBenchmark.metricasEmFalta.join(', ')}.` }),
    ])),
    seccaoBloco('As cinco decisoes por confirmar', el('div', {}, lista.filter((p) => ['P-01', 'P-02', 'P-03', 'P-04', 'P-05'].includes(p.id)).map(cartaoPressuposto))),
    seccaoBloco('Pressupostos tecnicos e de dominio', el('div', {}, lista.filter((p) => !['P-01', 'P-02', 'P-03', 'P-04', 'P-05'].includes(p.id)).map(cartaoPressuposto))),
  );
}

function cartaoPressuposto(p) {
  return el('div', { classe: 'pressuposto', 'data-estado': p.estado }, [
    el('div', {}, [el('span', { classe: 'id', texto: p.id }), ` ${p.assunto}`]),
    el('div', { classe: 'nota', texto: p.nota }),
    el('div', { classe: 'nota', texto: `Estado: ${p.estado.toLowerCase().replace(/_/g, ' ')}.` }),
  ]);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

const zona = document.getElementById('zona-ficheiro');
const entradaFicheiro = document.getElementById('ficheiro-saft');

entradaFicheiro.addEventListener('change', () => {
  if (entradaFicheiro.files[0]) leFicheiro(entradaFicheiro.files[0]);
});
for (const evento of ['dragenter', 'dragover']) {
  zona.addEventListener(evento, (e) => { e.preventDefault(); zona.classList.add('sobre'); });
}
for (const evento of ['dragleave', 'drop']) {
  zona.addEventListener(evento, (e) => { e.preventDefault(); zona.classList.remove('sobre'); });
}
zona.addEventListener('drop', (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f) leFicheiro(f);
});

atualizaEstadoLateral();
navega();
