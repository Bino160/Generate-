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
import {
  perfilVazio, valida, completude, requisitosEmFalta, criaCorrespondencia,
  PAPEIS, VINCULOS, MODELOS_REMUNERACAO, BASES_REMUNERACAO, DIAS_SEMANA, FAIXAS,
  chaveFaixa, margensDoAto, atosDaConvencao, atosPrivados,
  faixasDisponiveis, faixasComOcupacao, horasOcupadasDeclaradas, equipaParaRemuneracao,
} from '../src/core/perfil.js';
import { horasGabineteDisponiveis, diasUteisClinicos } from '../src/core/capacidade.js';
import { projeta13Semanas, prazoMedioPorEntidade } from '../src/core/tesouraria.js';
import { pressupostos } from '../src/config/pressupostos.js';
import { estadoDados as estadoBenchmark } from '../src/dados/benchmark-financeiro.js';
import { formata, formataPercentagem } from '../src/core/dinheiro.js';
import { INDICIOS_ARTIGO_12 } from '../src/ferramentas/f7-remuneracao.js';

import { painelMensal, constroiSerie } from '../src/ferramentas/f1-painel-mensal.js';
import { simuladorConvencoes, medeCaudaPrivada } from '../src/ferramentas/f2-convencoes.js';
import { prontidaoParaTransacao } from '../src/ferramentas/f3-prontidao-transacao.js';
import { barometro, calculaIndicadores } from '../src/ferramentas/f4-barometro.js';
import { funilPlanos } from '../src/ferramentas/f5-funil-planos.js';
import { investimentoEquipamento } from '../src/ferramentas/f6-equipamento.js';
import { remuneracao } from '../src/ferramentas/f7-remuneracao.js';

import { renderResultado, el } from './render.js';
import { editorDeLista, seletorDeDias, grelhaDeOcupacao } from './editores.js';

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
  // replaceChildren converte null no texto "null". Filtrar e obrigatorio.
  destino.replaceChildren(...[
    el('strong', { texto: estado.saft ? `${estado.saft.resumo.nValidos} documentos lidos` : 'Sem SAF-T carregado' }),
    el('div', { texto: `Perfil ${Math.round(c.global * 100)}% completo.` }),
    el('div', { texto: 'Nada foi transmitido. Todo o calculo acontece neste browser.' }),
    persistenciaDisponivel
      ? null
      : el('div', { texto: 'Este browser nao deixa guardar o perfil, por isso ele so dura ate fechares a pagina.' }),
  ].filter(Boolean));
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

/**
 * Cada seccao vive no seu contentor e sabe redesenhar-se sozinha.
 *
 * A primeira versao redesenhava o editor inteiro a cada alteracao de campo, e
 * isso tinha um erro que so aparece com maos humanas: o evento change de um
 * campo de texto dispara ao sair do campo, ou seja no instante em que se carrega
 * no botao seguinte. O redesenho arrancava o botao debaixo do cursor e o clique
 * perdia-se. Quem escrevesse um nome e clicasse logo a seguir em acrescentar via
 * o clique nao fazer nada.
 *
 * Agora so ha redesenho total quando a estrutura muda, ou seja quando se
 * acrescenta ou remove uma linha, que sao cliques deliberados. Editar um campo
 * atualiza as colunas derivadas no sitio e redesenha apenas as seccoes que
 * dependem dele.
 */
const CONTENTORES = new Map();

function desenhaPerfil() {
  const destino = document.getElementById('editor-perfil');
  const perfil = estado.perfil;
  perfil.capacidade.gabinetes ??= [];
  perfil.equipa ??= [];
  perfil.precario ??= [];
  perfil.convencoes ??= [];
  perfil.correspondenciaEntidades ??= [];
  perfil.agenda ??= { ocupacaoPorFaixa: {} };

  const guarda = ({ redesenhar = false, dependentes = [] } = {}) => {
    guardaPerfil();
    if (redesenhar) desenhaPerfil();
    else refrescaSeccoes(...dependentes, 'estado');
  };

  const construtores = {
    simples: () => seccaoCamposSimples(),
    gabinetes: () => seccaoGabinetes(perfil, comDependentes(guarda, ['ocupacao'])),
    ocupacao: () => seccaoOcupacao(perfil, guarda),
    equipa: () => seccaoEquipa(perfil, guarda),
    precario: () => seccaoPrecario(perfil, comDependentes(guarda, ['convencoes'])),
    convencoes: () => seccaoConvencoes(perfil, guarda),
    entidades: () => seccaoEntidades(perfil, guarda),
    estado: () => seccaoEstado(perfil),
  };

  CONTENTORES.clear();
  destino.replaceChildren(...Object.entries(construtores).map(([nome, constroi]) => {
    const contentor = el('div', { classe: 'seccao-perfil' }, constroi());
    CONTENTORES.set(nome, { contentor, constroi });
    return contentor;
  }));
}

function comDependentes(guarda, dependentes) {
  return (alteracao = {}) => guarda({ ...alteracao, dependentes });
}

/*
 * Redesenho adiado das seccoes dependentes.
 *
 * Editar a duracao de um ato muda o que a seccao das convencoes mostra, e essa
 * seccao tem botoes. Reconstrui-la a cada tecla arranca esses botoes debaixo do
 * cursor, que e o mesmo erro de antes um andar acima.
 *
 * A regra: o redesenho acontece 200 ms depois da ultima alteracao, e qualquer
 * toque no rato empurra-o mais 400 ms. Assim nunca cai entre carregar e largar
 * o botao, que e a janela em que o clique se perderia. Quem escreve ve a
 * atualizacao quando para de escrever, e quem clica clica sempre no que ve.
 */
const seccoesPendentes = new Set();
let temporizadorDeRefresco = null;

function agendaRefresco(atraso) {
  clearTimeout(temporizadorDeRefresco);
  temporizadorDeRefresco = setTimeout(esvaziaPendentes, atraso);
}

function esvaziaPendentes() {
  for (const nome of seccoesPendentes) {
    const entrada = CONTENTORES.get(nome);
    // Nunca redesenhar a seccao que tem o cursor la dentro.
    if (!entrada || entrada.contentor.contains(document.activeElement)) continue;
    entrada.contentor.replaceChildren(entrada.constroi());
  }
  seccoesPendentes.clear();
}

function refrescaSeccoes(...nomes) {
  for (const nome of nomes) seccoesPendentes.add(nome);
  agendaRefresco(200);
}

document.addEventListener('pointerdown', () => {
  if (seccoesPendentes.size > 0) agendaRefresco(400);
}, true);

/** Campos avulsos, que nao sao listas. */
function seccaoCamposSimples() {
  const campos = el('div', { classe: 'campos' });
  for (const c of CAMPOS_PERFIL) {
    const bruto = le(estado.perfil, c.caminho);
    let entrada;
    if (c.tipo === 'select') {
      entrada = el('select', {}, c.opcoes.map((o) => el('option', { value: o, texto: o })));
      entrada.value = bruto ?? c.opcoes[0];
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
  return seccaoBloco('Identificacao e economia', campos);
}

function seccaoGabinetes(perfil, guarda) {
  return editorDeLista({
    titulo: 'Gabinetes e horarios',
    nota: 'Cada gabinete tem o seu horario. Um gabinete de cirurgia que so abre as tercas nao pode contar '
      + 'como um gabinete a tempo inteiro, e contar assim e o que produz taxas de ocupacao de 40% em clinicas cheias. '
      + 'As horas da manha servem para separar as faixas na grelha de ocupacao.',
    itens: perfil.capacidade.gabinetes,
    colunas: [
      { campo: 'nome', etiqueta: 'Gabinete', tipo: 'texto', largura: '11rem' },
      {
        campo: 'horasPorDia', etiqueta: 'Horas por dia', tipo: 'numero', passo: '0.5', min: '0',
        largura: '5rem', placeholder: String(perfil.capacidade.horasPorDia ?? 8),
        ajuda: 'Vazio herda da clinica',
      },
      {
        campo: 'horasManha', etiqueta: 'Das quais de manha', tipo: 'numero', passo: '0.5', min: '0',
        largura: '5rem', placeholder: String((perfil.capacidade.horasPorDia ?? 8) / 2),
        ajuda: 'Vazio divide a meio',
      },
    ],
    derivadas: [
      {
        etiqueta: 'Dias abertos',
        calcula: (g) => (g.diasSemanaAbertos ?? perfil.capacidade.diasSemanaAbertos ?? []).length + ' por semana',
      },
    ],
    novoItem: () => {
      const n = perfil.capacidade.gabinetes.length + 1;
      return { id: `G${n}`, nome: `Gabinete ${n}`, diasSemanaAbertos: [...(perfil.capacidade.diasSemanaAbertos ?? [1, 2, 3, 4, 5])] };
    },
    aoMudar: guarda,
    textoAcrescentar: 'Acrescentar gabinete',
    textoVazio: 'Sem gabinetes nao ha hora-gabinete disponivel, que e o denominador de metade do painel.',
    expandido: (g, recalcula) => el('div', { classe: 'linha-dias' }, [
      el('span', { classe: 'etiqueta-dias', texto: `Dias em que ${g.nome ?? g.id} abre` }),
      seletorDeDias(
        g.diasSemanaAbertos ?? perfil.capacidade.diasSemanaAbertos,
        (dias) => { g.diasSemanaAbertos = dias; recalcula(); guarda({ redesenhar: false }); },
        DIAS_SEMANA,
      ),
    ]),
  });
}

function seccaoOcupacao(perfil, guarda) {
  const ctx = mesDeReferencia();
  const disponiveis = faixasDisponiveis(perfil, ctx.ano, ctx.mes, contaDiasDaSemanaNoMes);
  return seccaoBloco(
    `Ocupacao por faixa horaria, ${ctx.ano}-${String(ctx.mes).padStart(2, '0')}`,
    grelhaDeOcupacao({
      disponiveis,
      ocupacao: perfil.agenda.ocupacaoPorFaixa,
      dias: DIAS_SEMANA,
      faixas: FAIXAS,
      chaveFaixa,
      aoMudar: () => guarda({ redesenhar: false }),
    }),
  );
}

function seccaoEquipa(perfil, guarda) {
  return editorDeLista({
    titulo: 'Colaboradores e prestadores de servicos',
    nota: 'O vinculo nao e detalhe administrativo. Determina quem suporta a contribuicao de entidade '
      + 'contratante, se ha risco de reclassificacao pelo artigo 12.o do Codigo do Trabalho, e como se '
      + 'calcula o liquido do profissional. Percentagens nominais nao comparam nada sem se saber quem '
      + 'suporta materiais, laboratorio e assistente.',
    itens: perfil.equipa,
    colunas: [
      { campo: 'nome', etiqueta: 'Nome', tipo: 'texto', largura: '10rem' },
      { campo: 'papel', etiqueta: 'Papel', tipo: 'select', opcoes: PAPEIS },
      { campo: 'vinculo', etiqueta: 'Vinculo', tipo: 'select', opcoes: VINCULOS },
      { campo: 'modeloRemuneracao', etiqueta: 'Remuneracao', tipo: 'select', opcoes: MODELOS_REMUNERACAO },
      { campo: 'baseRemuneracao', etiqueta: 'Base', tipo: 'select', opcoes: BASES_REMUNERACAO, ajuda: 'Producao ou recebido' },
      { campo: 'percentagem', etiqueta: '%', tipo: 'percentagem', largura: '4.5rem' },
      { campo: 'fixoMensalCent', etiqueta: 'Fixo por mes', tipo: 'euros', largura: '6rem' },
      { campo: 'minimoGarantidoCent', etiqueta: 'Minimo', tipo: 'euros', largura: '6rem' },
      { campo: 'horasPorDia', etiqueta: 'Horas por dia', tipo: 'numero', passo: '0.5', largura: '4.5rem' },
    ],
    derivadas: [
      {
        etiqueta: 'Dias',
        calcula: (p) => (p.diasSemanaAbertos ?? []).length || null,
      },
      {
        etiqueta: 'Risco art. 12.o',
        ajuda: 'Indicios assinalados',
        calcula: (p) => {
          const n = Object.values(p.indicios ?? {}).filter(Boolean).length;
          return n === 0 ? 'nenhum' : `${n} de 5`;
        },
      },
    ],
    novoItem: () => ({
      id: `P${perfil.equipa.length + 1}`,
      nome: '',
      papel: PAPEIS[0],
      vinculo: 'INDEPENDENTE',
      modeloRemuneracao: 'PERCENTAGEM',
      baseRemuneracao: 'PRODUCAO',
      diasSemanaAbertos: [1, 2, 3, 4, 5],
      horasPorDia: 8,
      suporta: {},
      indicios: {},
    }),
    aoMudar: guarda,
    textoAcrescentar: 'Acrescentar pessoa',
    textoVazio: 'Sem equipa nao ha custo efetivo por hora-gabinete nem indice de transferibilidade.',
    expandido: (p, recalcula) => detalheDaPessoa(p, guarda, recalcula),
  });
}

function detalheDaPessoa(p, guarda, recalcula) {
  p.suporta ??= {};
  p.indicios ??= {};

  const caixa = (objeto, chave, etiqueta) => {
    const c = el('input', { type: 'checkbox' });
    c.checked = Boolean(objeto[chave]);
    c.addEventListener('change', () => {
      objeto[chave] = c.checked;
      recalcula();
      guarda({ redesenhar: false });
    });
    return el('label', { classe: 'caixa' }, [c, el('span', { texto: etiqueta })]);
  };

  const numero = (chave, etiqueta, opcoes = {}) => {
    const entrada = el('input', {
      type: 'number', step: opcoes.passo ?? '1', min: '0',
      'aria-label': etiqueta,
    });
    entrada.value = opcoes.percentagem
      ? (p[chave] == null ? '' : String(Math.round(p[chave] * 1000) / 10))
      : (p[chave] ?? '');
    const atualiza = () => {
      const bruto = entrada.value === '' ? null : Number(entrada.value);
      p[chave] = opcoes.percentagem && bruto != null ? bruto / 100 : bruto;
      recalcula();
      guarda({ redesenhar: false });
    };
    entrada.addEventListener('input', atualiza);
    entrada.addEventListener('change', atualiza);
    return el('div', {}, [el('label', { texto: etiqueta }), entrada]);
  };

  return el('div', { classe: 'detalhe-pessoa' }, [
    el('div', { classe: 'linha-dias' }, [
      el('span', { classe: 'etiqueta-dias', texto: 'Dias de disponibilidade' }),
      seletorDeDias(p.diasSemanaAbertos, (dias) => { p.diasSemanaAbertos = dias; guarda({ redesenhar: true }); }, DIAS_SEMANA),
    ]),
    el('div', { classe: 'grupo-caixas' }, [
      el('span', { classe: 'etiqueta-dias', texto: 'Quem suporta' }),
      caixa(p.suporta, 'materiaisPelaClinica', 'Materiais a cargo da clinica'),
      caixa(p.suporta, 'laboratorioPelaClinica', 'Laboratorio a cargo da clinica'),
      caixa(p.suporta, 'assistentePelaClinica', 'Assistente a cargo da clinica'),
    ]),
    el('div', { classe: 'campos compactos' }, [
      numero('materiaisCent', 'Materiais por mes, em euros'),
      numero('dependenciaEconomica', 'Dependencia economica, %', { percentagem: true, passo: '1' }),
      numero('anosDeRelacao', 'Anos de relacao'),
      numero('taxaMarginalIrs', 'Taxa marginal de IRS, %', { percentagem: true, passo: '0.5' }),
      numero('horasGabineteMes', 'Horas-gabinete por mes'),
      numero('producaoMensalCent', 'Producao por mes, em euros'),
    ]),
    el('div', { classe: 'grupo-caixas' }, [
      el('span', { classe: 'etiqueta-dias', texto: 'Indicios do artigo 12.o do Codigo do Trabalho' }),
      ...INDICIOS_ARTIGO_12.map((i) => caixa(p.indicios, i.id, i.descricao)),
    ]),
  ]);
}

function seccaoPrecario(perfil, guarda) {
  return editorDeLista({
    titulo: 'Tabela de precos e margem',
    nota: 'A duracao nao e opcional. Sem ela nao ha margem por hora-gabinete, e a margem por hora e a '
      + 'unidade de decisao. Repara nas duas ultimas colunas enquanto preenches: o ato com mais margem '
      + 'nao e, quase nunca, o ato com mais margem por hora.',
    itens: perfil.precario,
    colunas: [
      { campo: 'codigo', etiqueta: 'Codigo', tipo: 'texto', largura: '7rem' },
      { campo: 'nome', etiqueta: 'Ato', tipo: 'texto', largura: '12rem' },
      { campo: 'precoCent', etiqueta: 'Preco', tipo: 'euros', largura: '6rem' },
      { campo: 'custoVariavelCent', etiqueta: 'Custo variavel', tipo: 'euros', largura: '6rem', ajuda: 'Materiais e laboratorio' },
      { campo: 'duracaoMinutos', etiqueta: 'Minutos', tipo: 'numero', min: '1', largura: '4.5rem' },
      { campo: 'volumeMes', etiqueta: 'Volume por mes', tipo: 'numero', min: '0', largura: '5rem' },
    ],
    derivadas: [
      { etiqueta: 'Margem', calcula: (a) => { const m = margensDoAto(a); return m.margemCent ? formata(m.margemCent) : null; } },
      { etiqueta: 'Margem %', calcula: (a) => formataPercentagem(margensDoAto(a).margemFracao, 0) },
      { etiqueta: 'Margem por hora', ajuda: 'E esta que decide', calcula: (a) => { const m = margensDoAto(a); return m.margemPorHoraCent == null ? null : `${formata(m.margemPorHoraCent)}/h`; } },
    ],
    novoItem: () => ({ codigo: '', nome: '', precoCent: null, custoVariavelCent: null, duracaoMinutos: 30, volumeMes: null }),
    aoMudar: guarda,
    textoAcrescentar: 'Acrescentar ato',
    textoVazio: 'Sem tabela de precos privados nao ha custo de oportunidade da hora, e o F2 nao corre.',
  });
}

function seccaoConvencoes(perfil, guarda) {
  return editorDeLista({
    titulo: 'Convencoes',
    nota: 'A convencao so acrescenta o que e dela: o preco que paga e o volume. A duracao e o custo '
      + 'variavel vem do catalogo de atos, para que a mesma consulta nao acabe com tres duracoes '
      + 'diferentes em tres convencoes. O prazo de recebimento nao afeta a margem, afeta a tesouraria, '
      + 'e sai em linha separada.',
    itens: perfil.convencoes,
    colunas: [
      { campo: 'nome', etiqueta: 'Entidade', tipo: 'texto', largura: '10rem' },
      { campo: 'prazoRecebimentoDias', etiqueta: 'Prazo, dias', tipo: 'numero', min: '0', largura: '5rem' },
      { campo: 'glosaFracao', etiqueta: 'Glosa %', tipo: 'percentagem', largura: '4.5rem', ajuda: 'Do que e recusado' },
      { campo: 'canibalizacao', etiqueta: 'Canibalizacao %', tipo: 'percentagem', largura: '5.5rem', ajuda: 'Viriam na mesma' },
    ],
    derivadas: [
      {
        etiqueta: 'Atos com preco',
        calcula: (c) => Object.values(c.precos ?? {}).filter((l) => l && l.volumeMes).length || null,
      },
    ],
    novoItem: () => ({ id: `C${perfil.convencoes.length + 1}`, nome: '', prazoRecebimentoDias: 60, glosaFracao: 0, canibalizacao: null, precos: {} }),
    aoMudar: guarda,
    textoAcrescentar: 'Acrescentar convencao',
    textoVazio: 'Sem convencoes o F2 nao corre.',
    expandido: (c, recalcula) => precosDaConvencao(perfil, c, guarda, recalcula),
  });
}

function precosDaConvencao(perfil, convencao, guarda, recalcula) {
  convencao.precos ??= {};
  if (perfil.precario.length === 0) {
    return el('p', { classe: 'nota', texto: 'Preenche primeiro a tabela de precos. E de la que vem a duracao e o custo variavel de cada ato.' });
  }

  const linhas = perfil.precario.map((ato) => {
    convencao.precos[ato.codigo] ??= { precoCent: null, volumeMes: null };
    const linha = convencao.precos[ato.codigo];
    const celulaMargem = el('td', { classe: 'numero derivada' });

    const recalculaLinha = () => {
      const glosa = convencao.glosaFracao ?? 0;
      const efetivo = (linha.precoCent ?? 0) * (1 - glosa);
      const margem = efetivo - (ato.custoVariavelCent ?? 0);
      const porHora = ato.duracaoMinutos ? Math.round(margem / (ato.duracaoMinutos / 60)) : null;
      const privadoPorHora = margensDoAto(ato).margemPorHoraCent;
      celulaMargem.replaceChildren(
        porHora == null || !linha.precoCent
          ? el('span', { classe: 'nulo', texto: 'n/d' })
          : el('span', {
            classe: privadoPorHora != null && porHora < privadoPorHora ? 'abaixo-do-privado' : '',
            texto: `${formata(porHora)}/h`,
          }),
      );
    };

    const campo = (chave, tipo, largura) => {
      const entrada = el('input', {
        type: 'number', step: tipo === 'euros' ? '0.01' : '1', min: '0',
        'aria-label': `${chave} de ${ato.nome || ato.codigo}`,
      });
      entrada.style.width = largura;
      entrada.value = tipo === 'euros'
        ? (linha[chave] == null ? '' : String(linha[chave] / 100))
        : (linha[chave] ?? '');
      entrada.addEventListener('input', () => {
        const bruto = entrada.value === '' ? null : Number(entrada.value);
        linha[chave] = tipo === 'euros' && bruto != null ? Math.round(bruto * 100) : bruto;
        recalculaLinha();
        recalcula();
        guarda({ redesenhar: false });
      });
      return entrada;
    };

    const l = el('tr', {}, [
      el('td', { texto: ato.nome || ato.codigo }),
      el('td', { classe: 'numero', texto: formata(ato.precoCent) }),
      el('td', { classe: 'numero' }, campo('precoCent', 'euros', '6rem')),
      el('td', { classe: 'numero' }, campo('volumeMes', 'numero', '5rem')),
      celulaMargem,
      el('td', { classe: 'numero derivada' }, (() => {
        const v = margensDoAto(ato).margemPorHoraCent;
        return v == null ? el('span', { classe: 'nulo', texto: 'n/d' }) : document.createTextNode(`${formata(v)}/h`);
      })()),
    ]);
    recalculaLinha();
    return l;
  });

  return el('div', {}, [
    el('p', { classe: 'nota', texto: `Precos de ${convencao.nome || convencao.id}. A ultima coluna e o que a mesma hora renderia em privado. Quando a margem da convencao fica abaixo dela, aparece marcada.` }),
    el('div', { classe: 'rolavel' }, el('table', { classe: 'editavel' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { texto: 'Ato' }),
        el('th', { classe: 'numero', texto: 'Preco privado' }),
        el('th', { classe: 'numero', texto: 'Preco da convencao' }),
        el('th', { classe: 'numero', texto: 'Volume por mes' }),
        el('th', { classe: 'numero derivada', texto: 'Margem por hora' }),
        el('th', { classe: 'numero derivada', texto: 'Privado por hora' }),
      ])),
      el('tbody', {}, linhas),
    ])),
  ]);
}

function seccaoEntidades(perfil, guarda) {
  return editorDeLista({
    titulo: 'Correspondencia de entidades pagadoras',
    nota: 'O SAF-T nao tem campo de entidade pagadora nem de convencao. E uma limitacao do formato e nao '
      + 'ha volta a dar: a ligacao faz-se por um padrao no codigo ou na descricao do produto. Sem estas '
      + 'regras, tudo o que esta no SAF-T conta como privado.',
    itens: perfil.correspondenciaEntidades,
    colunas: [
      { campo: 'entidade', etiqueta: 'Entidade', tipo: 'texto', largura: '9rem' },
      { campo: 'campo', etiqueta: 'Procurar em', tipo: 'select', opcoes: [{ id: 'produto', nome: 'Codigo do produto' }, { id: 'descricao', nome: 'Descricao' }] },
      { campo: 'padrao', etiqueta: 'Padrao', tipo: 'texto', largura: '12rem', ajuda: 'Exemplo: ^MEDIS-' },
    ],
    derivadas: [
      {
        etiqueta: 'Linhas que apanha',
        calcula: (r) => {
          if (!estado.saft || !r.padrao) return null;
          try {
            const re = new RegExp(r.padrao, 'i');
            let n = 0;
            for (const d of estado.saft.documentosValidos) {
              for (const linhaDoc of d.linhas) {
                const alvo = r.campo === 'descricao' ? (linhaDoc.descricao ?? '') : (linhaDoc.produto ?? '');
                if (re.test(alvo)) n += 1;
              }
            }
            return String(n);
          } catch {
            return 'padrao invalido';
          }
        },
      },
    ],
    novoItem: () => ({ entidade: '', campo: 'produto', padrao: '' }),
    aoMudar: guarda,
    textoAcrescentar: 'Acrescentar regra',
    textoVazio: 'Sem regras, o F2 nao consegue separar convencao de privado.',
  });
}

function seccaoEstado(perfil) {
  const v = valida(perfil);
  const c = completude(perfil);
  return seccaoBloco('Estado do perfil', el('div', {}, [
    el('p', { texto: `Completude global de ${Math.round(c.global * 100)}%.` }),
    ...v.erros.map((e) => el('div', { classe: 'aviso-exportacao', texto: e })),
    ...v.avisos.map((a) => el('p', { classe: 'nota', texto: a })),
    el('div', { classe: 'rolavel' }, el('table', {}, [
      el('thead', {}, el('tr', {}, [el('th', { texto: 'Ferramenta' }), el('th', { texto: 'O que ainda falta' })])),
      el('tbody', {}, Object.keys(c.porFerramenta).map((f) => el('tr', {}, [
        el('td', { texto: f }),
        el('td', { texto: requisitosEmFalta(perfil, f).map((r) => r.campo).join(', ') || 'nada' }),
      ]))),
    ])),
  ]));
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
  // A ocupacao vem da grelha do perfil. Nao e estimada em lado nenhum: se as
  // faixas estiverem em branco, o F1 declara que nao tem agenda e segue sem ela.
  const horasOcupadas = horasOcupadasDeclaradas(estado.perfil.agenda?.ocupacaoPorFaixa ?? {});
  const agendaPorMes = horasOcupadas == null
    ? {}
    : Object.fromEntries(estado.saft.resumo.meses.map((m) => [m, horasOcupadas]));

  const serie = constroiSerie(estado.saft, estado.perfil, {
    agendaPorMes,
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
    const r = painelMensal({
      serie,
      perfil: estado.perfil,
      mesAlvo: seletor.value,
      projecao,
      componentesPorMetrica: componentesDeRutura(serie, seletor.value),
    });
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

  const convencoes = (perfil.convencoes ?? [])
    .map((c) => ({
      id: c.id,
      nome: c.nome || c.id,
      canibalizacao: c.canibalizacao,
      prazoRecebimentoDias: c.prazoRecebimentoDias,
      atos: atosDaConvencao(perfil, c.id),
    }))
    .filter((c) => c.atos.length > 0);

  const precario = atosPrivados(perfil);

  if (convencoes.length === 0 || precario.length === 0) {
    controlo.replaceChildren(el('div', { classe: 'vazio-estado' }, [
      el('p', { texto: 'O F2 alimenta-se do perfil: a tabela de precos da a duracao e o custo variavel, e cada convencao da o preco e o volume.' }),
      el('p', { texto: convencoes.length === 0
        ? 'Ainda nao ha nenhuma convencao com precos e volumes preenchidos.'
        : 'Ainda nao ha nenhum ato privado com volume mensal preenchido.' }),
      el('p', {}, el('a', { href: '#perfil', texto: 'Ir ao perfil de cliente' })),
    ]));
    document.getElementById('saida-f2').replaceChildren();
    return;
  }

  const faixas = faixasDoPerfil();
  const comOcupacao = Object.values(faixas).filter((f) => f.ocupado != null);
  const horasDisponiveis = Object.values(faixas).reduce((a, f) => a + f.disponivel, 0);
  const horasOcupadas = comOcupacao.length === 0
    ? null
    : comOcupacao.reduce((a, f) => a + f.ocupado, 0);

  controlo.replaceChildren(seccaoBloco('De onde vem cada numero', el('div', {}, [
    el('div', { classe: 'rolavel' }, el('table', {}, el('tbody', {}, [
      linha('Convencoes com precos preenchidos', String(convencoes.length)),
      linha('Atos privados com volume', String(precario.length)),
      linha('Horas-gabinete disponiveis no mes', String(Math.round(horasDisponiveis))),
      linha('Horas ocupadas declaradas', horasOcupadas == null ? 'por preencher' : String(Math.round(horasOcupadas))),
      linha('Faixas horarias com ocupacao', `${comOcupacao.length} de ${Object.keys(faixas).length}`),
    ]))),
    el('p', { classe: 'nota', texto: 'A ocupacao e o que faz a resposta inverter-se. Preenche a grelha no perfil para o teste de capacidade e a alocacao a faixas vazias correrem.' }),
  ])));

  const corresp = criaCorrespondencia(perfil);
  const caudas = corresp.regras > 0 ? medeCaudaPrivada(estado.saft, corresp) : {};

  const r = simuladorConvencoes({
    convencoes,
    atosPrivadosEquivalentes: precario,
    capacidade: { horasDisponiveis, horasOcupadas },
    faixas: comOcupacao.length > 0 ? faixas : null,
    caudas: Object.fromEntries(Object.entries(caudas).map(([k, v]) => [
      k, { porPacienteCent: v.porPacienteCent, pacientesNovos: v.pacientesNovos },
    ])),
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
  const doPerfil = equipaParaRemuneracao(estado.perfil);
  const comProducao = doPerfil.filter((p) => p.producaoCent > 0);
  const controlo = document.getElementById('controlo-f7');

  if (comProducao.length === 0) {
    controlo.replaceChildren(
      el('div', { classe: 'vazio-estado' }, [
        el('p', { texto: 'O F7 alimenta-se da equipa do perfil. Falta preencher a producao mensal de pelo menos uma pessoa.' }),
        el('p', {}, el('a', { href: '#perfil', texto: 'Ir aos colaboradores e prestadores' })),
      ]),
      seccaoBloco('Ou correr com um exemplo', editorJson('f7', EXEMPLOS.f7, (profissionais) => {
        const r = remuneracao({ profissionais, perfil: estado.perfil });
        renderResultado(r.toJSON(), document.getElementById('saida-f7'));
      })),
    );
    document.getElementById('saida-f7').replaceChildren();
    return;
  }

  controlo.replaceChildren(seccaoBloco('De onde vem cada numero', el('div', {}, [
    el('p', { classe: 'nota', texto: `${comProducao.length} pessoas do perfil com producao preenchida. A producao muda todos os meses e por isso vive no perfil como valor de trabalho, nao como facto.` }),
  ])));

  const r = remuneracao({ profissionais: comProducao, perfil: estado.perfil });
  renderResultado(r.toJSON(), document.getElementById('saida-f7'));
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

// ---------------------------------------------------------------------------
// Utilitarios de calendario usados pelo editor de perfil
// ---------------------------------------------------------------------------

/**
 * Mes a que a grelha de ocupacao se refere. Usa o ultimo mes do SAF-T carregado
 * e, sem SAF-T, o mes corrente. A capacidade por faixa depende de quantas
 * segundas-feiras o mes tem, por isso o mes tem de estar a vista e nao implicito.
 */
function mesDeReferencia() {
  const meses = estado.saft?.resumo?.meses ?? [];
  const ultimo = meses[meses.length - 1];
  if (ultimo) {
    const [ano, mes] = ultimo.split('-').map(Number);
    return { ano, mes };
  }
  const hoje = new Date();
  return { ano: hoje.getUTCFullYear(), mes: hoje.getUTCMonth() + 1 };
}

/** Quantas vezes um dia da semana ocorre num mes. */
function contaDiasDaSemanaNoMes(ano, mes, diaDaSemana) {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= ultimo; d += 1) {
    if (new Date(Date.UTC(ano, mes - 1, d)).getUTCDay() === diaDaSemana) n += 1;
  }
  return n;
}

/** Faixas do perfil, prontas para o modulo de alocacao do F2. */
function faixasDoPerfil() {
  const { ano, mes } = mesDeReferencia();
  const disponiveis = faixasDisponiveis(estado.perfil, ano, mes, contaDiasDaSemanaNoMes);
  return faixasComOcupacao(disponiveis, estado.perfil.agenda?.ocupacaoPorFaixa ?? {});
}

/**
 * Decomposicao da variacao por entidade pagadora.
 *
 * E o que faltava para a rutura de nivel do P-04 poder disparar. Uma queda so e
 * rutura se estiver concentrada num componente identificavel, e sem esta
 * decomposicao o motor nunca recebia componente nenhum, portanto a classe que
 * construi para a tua objecao ao mes anterior nunca chegava a existir no ecra.
 *
 * A decomposicao possivel com um SAF-T e por entidade pagadora, porque e a unica
 * dimensao que a correspondencia do perfil consegue reconstruir. Por profissional
 * seria melhor e o SAF-T nao o permite.
 */
function componentesDeRutura(serie, mesAlvo) {
  if (!estado.saft) return {};
  const corresp = criaCorrespondencia(estado.perfil);
  if (corresp.regras === 0) return {};

  const indice = serie.findIndex((m) => m.mes === mesAlvo);
  if (indice < 3) return {};
  const mesesBase = serie.slice(indice - 3, indice).map((m) => m.mes);

  const porMesEntidade = new Map();
  for (const d of estado.saft.documentosValidos) {
    if (!d.mes) continue;
    for (const l of d.linhas) {
      const entidade = corresp.resolve(d, l) ?? 'PRIVADO';
      const chave = `${d.mes}|${entidade}`;
      porMesEntidade.set(chave, (porMesEntidade.get(chave) ?? 0) + (l.creditoCent - l.debitoCent));
    }
  }

  const entidades = new Set([...porMesEntidade.keys()].map((k) => k.split('|')[1]));
  const variacoes = [];
  let totalVariacao = 0;

  for (const entidade of entidades) {
    const base = mesesBase.reduce((a, m) => a + (porMesEntidade.get(`${m}|${entidade}`) ?? 0), 0) / mesesBase.length;
    const atual = porMesEntidade.get(`${mesAlvo}|${entidade}`) ?? 0;
    const delta = atual - base;
    variacoes.push({ nome: entidade, delta });
    totalVariacao += delta;
  }

  if (totalVariacao === 0) return {};

  const componentes = variacoes
    .map((v) => ({ nome: v.nome, contribuicao: v.delta / totalVariacao }))
    .sort((a, b) => Math.abs(b.contribuicao) - Math.abs(a.contribuicao));

  // As mesmas componentes servem qualquer metrica de receita.
  return {
    'receita-por-hora-gabinete': componentes,
    'receita-por-dia-util': componentes,
    'ticket-medio': componentes,
  };
}
