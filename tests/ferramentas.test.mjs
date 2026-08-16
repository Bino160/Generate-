import test from 'node:test';
import assert from 'node:assert/strict';

import { painelMensal, taxaEmpiricaDeAlerta, METRICAS } from '../src/ferramentas/f1-painel-mensal.js';
import { projeta13Semanas } from '../src/core/tesouraria.js';
import {
  ponteEbitda, transferibilidade, testesDeDiligencia, contingencias, scorecard,
  planoDeDoZeMeses, prontidaoParaTransacao, DEFENSABILIDADE,
} from '../src/ferramentas/f3-prontidao-transacao.js';
import {
  calculaIndicadores, constroiContribuicao, percentilImediato, publicaEstrato, chaveEstrato,
} from '../src/ferramentas/f4-barometro.js';
import {
  detetaNivelDeDados, auditaCompletude, coortes, abandonoAMeio, funilPlanos, NIVEL_DADOS,
} from '../src/ferramentas/f5-funil-planos.js';
import {
  capexReal, comparaMetodosDeDeducao, pontoDeEquilibrio, leasingContraCompra,
  regularizacaoBensInvestimento, investimentoEquipamento, REGIME_IVA,
} from '../src/ferramentas/f6-equipamento.js';
import {
  custoEfetivoParaClinica, liquidoDoProfissional, riscoDeReclassificacao,
  transparenciaFiscal, remuneracao, MODELO,
} from '../src/ferramentas/f7-remuneracao.js';
import { simuladorConvencoes } from '../src/ferramentas/f2-convencoes.js';
import { analisaSaft } from '../src/core/saft.js';
import { Anonimizador } from '../src/core/anonimizacao.js';
import { perfilVazio } from '../src/core/perfil.js';
import { cenarioBase } from './fixtures/saft.mjs';

// ---------------------------------------------------------------------------
// F1
// ---------------------------------------------------------------------------

function serieSintetica(n, { receitaBase = 5000000, ruido = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const ano = 2024 + Math.floor(i / 12);
    const mes = (i % 12) + 1;
    const receitaCent = receitaBase + Math.round(Math.sin(i) * ruido);
    return {
      mes: `${ano}-${String(mes).padStart(2, '0')}`,
      ano,
      receitaCent,
      atos: 600,
      diasUteis: 21,
      horasGabinete: 336,
      horasOcupadas: null,
      custosFixosCent: 3000000,
      custosVariaveisCent: 1000000,
      saldoCent: 8000000,
      ticketMedioCent: Math.round(receitaCent / 600),
      receitaPorHoraOcupadaCent: null,
    };
  });
}

const perfilTeste = {
  ...perfilVazio(),
  capacidade: {
    ...perfilVazio().capacidade,
    gabinetes: [{ id: 'G1', nome: 'Gabinete 1' }, { id: 'G2', nome: 'Gabinete 2' }],
  },
  custos: { fixosMensaisCent: 3000000, variavelFracaoReceita: 0.2, rubricas: [] },
};

test('F1: com menos de doze meses diz que esta a calibrar e nao usa controlo estatistico', () => {
  const r = painelMensal({ serie: serieSintetica(5), perfil: perfilTeste });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F1-A-CALIBRAR'));
  assert.equal(r.alertas.filter((a) => a.codigo === 'F1-receita-por-hora-gabinete').length, 0);
});

test('F1: o mes anterior nunca dispara alerta', () => {
  const serie = serieSintetica(14);
  // Degrau de 12% so no ultimo mes. Contra o mes anterior seria gritante,
  // mas nao pode ser essa a base do alerta.
  const ultimo = serie[serie.length - 1];
  ultimo.receitaCent = Math.round(ultimo.receitaCent * 0.88);
  const r = painelMensal({ serie, perfil: perfilTeste });
  const linhas = r.blocos.find((b) => b.id === 'metricas').dados.linhas;
  assert.ok(linhas.every((l) => l.disparouPorAnterior === false));
  assert.ok(linhas.some((l) => l.variacaoContraAnterior != null),
    'o mes anterior aparece como informacao, so nao dispara');
});

test('F1: um desvio real dispara e traz impacto em euros', () => {
  const serie = serieSintetica(14, { ruido: 20000 });
  const ultimo = serie[serie.length - 1];
  ultimo.receitaCent = Math.round(ultimo.receitaCent * 0.6);
  ultimo.ticketMedioCent = Math.round(ultimo.receitaCent / ultimo.atos);
  const r = painelMensal({ serie, perfil: perfilTeste });
  assert.ok(r.alertas.length > 0, 'uma queda de 40% tem de disparar');
  assert.ok(r.alertas.every((a) => a.impactoCent != null), 'todo o alerta tem impacto em euros');
});

test('F1: nunca mostra mais de tres alertas de desvio', () => {
  const serie = serieSintetica(14, { ruido: 20000 });
  const ultimo = serie[serie.length - 1];
  ultimo.receitaCent = Math.round(ultimo.receitaCent * 0.4);
  ultimo.atos = 200;
  ultimo.ticketMedioCent = Math.round(ultimo.receitaCent / ultimo.atos);
  ultimo.saldoCent = 100000;
  const r = painelMensal({ serie, perfil: perfilTeste });
  const desvios = r.alertas.filter((a) => a.classe === 'DESVIO');
  assert.ok(desvios.length <= 3, `esperava no maximo tres desvios, vieram ${desvios.length}`);
  assert.ok(Array.isArray(r.alertasEmAnexo));
});

test('F1: os alertas saem ordenados por impacto em euros', () => {
  const serie = serieSintetica(14, { ruido: 20000 });
  const ultimo = serie[serie.length - 1];
  ultimo.receitaCent = Math.round(ultimo.receitaCent * 0.5);
  ultimo.atos = 300;
  ultimo.ticketMedioCent = Math.round(ultimo.receitaCent / ultimo.atos);
  const r = painelMensal({ serie, perfil: perfilTeste });
  const desvios = r.alertas.filter((a) => a.classe === 'DESVIO');
  for (let i = 1; i < desvios.length; i += 1) {
    assert.ok(
      Math.abs(desvios[i - 1].impactoCent) >= Math.abs(desvios[i].impactoCent),
      'os alertas tem de vir do maior impacto para o menor',
    );
  }
});

test('F1: dias de tesouraria abaixo de trinta dispara mesmo sem serie calibrada', () => {
  const serie = serieSintetica(3);
  serie[serie.length - 1].saldoCent = 500000; // cerca de quatro dias
  const r = painelMensal({ serie, perfil: perfilTeste });
  assert.ok(r.alertas.some((a) => a.codigo === 'F1-dias-tesouraria'),
    'o limiar absoluto corre sempre, mesmo a calibrar');
});

test('F1: sem agenda declara a lacuna e nao estima ocupacao', () => {
  const r = painelMensal({ serie: serieSintetica(14), perfil: perfilTeste });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F1-SEM-AGENDA'));
  const linhas = r.blocos.find((b) => b.id === 'metricas').dados.linhas;
  assert.ok(!linhas.some((l) => l.metrica === 'ocupacao'), 'nao pode inventar uma linha de ocupacao');
});

test('F1: rutura de nivel e classe separada e nao consome lugar de alerta', () => {
  const serie = serieSintetica(14);
  const ultimo = serie[serie.length - 1];
  ultimo.receitaCent = Math.round(ultimo.receitaCent * 0.5);
  const r = painelMensal({
    serie,
    perfil: perfilTeste,
    componentesPorMetrica: {
      'receita-por-hora-gabinete': [{ nome: 'Dra. A', contribuicao: -0.8 }],
    },
  });
  const ruturas = r.alertas.filter((a) => a.classe === 'RUTURA');
  assert.equal(ruturas.length >= 1, true, 'uma queda de 50% concentrada num profissional e uma rutura');
  assert.match(ruturas[0].explicacao, /Dra\. A/);
  assert.ok(r.alertas.filter((a) => a.classe === 'DESVIO').length <= 3);
});

test('F1: uma queda difusa nao e rutura', () => {
  const serie = serieSintetica(14);
  serie[serie.length - 1].receitaCent = Math.round(serie[serie.length - 1].receitaCent * 0.5);
  const r = painelMensal({
    serie,
    perfil: perfilTeste,
    componentesPorMetrica: {
      'receita-por-hora-gabinete': [
        { nome: 'Dra. A', contribuicao: -0.3 },
        { nome: 'Dr. B', contribuicao: -0.35 },
        { nome: 'Dra. C', contribuicao: -0.35 },
      ],
    },
  });
  assert.equal(r.alertas.filter((a) => a.classe === 'RUTURA').length, 0);
});

test('F1: mede e publica a propria taxa de falsos alertas', () => {
  const serie = serieSintetica(36, { ruido: 300000 });
  const t = taxaEmpiricaDeAlerta(serie);
  assert.ok(t.mesesAvaliados > 0);
  assert.ok(t.taxa >= 0 && t.taxa <= 1);
  const r = painelMensal({ serie, perfil: perfilTeste });
  const cal = r.blocos.find((b) => b.id === 'calibracao');
  assert.ok(cal, 'com serie longa o bloco de calibracao tem de aparecer');
  assert.match(cal.dados.leitura, /sigma|limiar/);
});

test('F1: as metricas primarias sao normalizadas, nunca absolutas', () => {
  const primarias = METRICAS.filter((m) => m.primaria);
  assert.ok(primarias.length >= 2);
  assert.ok(primarias.every((m) => m.unidade.includes('POR_')),
    'uma metrica primaria tem de ter denominador');
});

test('tesouraria: projecao a treze semanas identifica a primeira semana negativa', () => {
  const p = projeta13Semanas({
    saldoInicialCent: 500000,
    historico: [
      { mes: '2026-01', receitaCent: 4000000 },
      { mes: '2026-02', receitaCent: 4000000 },
      { mes: '2026-03', receitaCent: 4000000 },
    ],
    custosFixosMensaisCent: 6000000,
    custoVariavelFracao: 0.2,
    dataInicio: '2026-04-01',
  });
  assert.equal(p.semanas.length, 13);
  assert.ok(p.primeiraSemanaNegativa != null, 'com custos acima da receita tem de ficar negativo');
  assert.ok(p.baseDeEstimativa.includes('Nao incorpora sazonalidade'));
});

test('tesouraria: sem saldo inicial devolve null em vez de assumir zero', () => {
  assert.equal(projeta13Semanas({
    saldoInicialCent: null, historico: [{ mes: '2026-01', receitaCent: 1 }], custosFixosMensaisCent: 0,
  }), null);
});

// ---------------------------------------------------------------------------
// F3
// ---------------------------------------------------------------------------

test('F3: so os ajustamentos solidos entram no EBITDA ajustado', () => {
  const p = ponteEbitda(10000000, [
    { id: 'a', descricao: 'Renda acima de mercado', valorCent: 500000, defensabilidade: DEFENSABILIDADE.SOLIDO },
    { id: 'b', descricao: 'Despesas pessoais', valorCent: 300000, defensabilidade: DEFENSABILIDADE.DISCUTIVEL },
    { id: 'c', descricao: 'Receita que o dono diz que ia ter', valorCent: 900000, defensabilidade: DEFENSABILIDADE.INDEFENSAVEL },
  ]);
  assert.equal(p.ebitdaAjustadoCent, 10500000);
  assert.equal(p.ebitdaComDiscutiveisCent, 10800000);
  assert.equal(p.somaIndefensaveisCent, 900000);
});

test('F3: a normalizacao do dono pode descer o EBITDA', () => {
  const p = ponteEbitda(30000000, [
    {
      id: 'dono',
      descricao: 'Remuneracao de mercado do socio produtor',
      valorCent: -12000000,
      defensabilidade: DEFENSABILIDADE.SOLIDO,
      justificacao: 'Produz 300 mil de atos e remunera-se com 60 mil.',
    },
  ]);
  assert.equal(p.ebitdaAjustadoCent, 18000000);
  assert.equal(p.ajustamentosNegativos, 1);
});

test('F3: uma ponte so com ajustamentos favoraveis e assinalada como lacuna', () => {
  const r = prontidaoParaTransacao({
    ebitdaDeclaradoCent: 10000000,
    ajustamentos: [{ id: 'a', descricao: 'x', valorCent: 500000, defensabilidade: DEFENSABILIDADE.SOLIDO }],
    equipa: [{ id: 'p1', nome: 'A', producaoCent: 1000, ficaAposNegocio: true }],
  });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F3-SO-AJUSTAMENTOS-FAVORAVEIS'));
});

test('F3: transferibilidade separa o que fica do que sai com o fundador', () => {
  const t = transferibilidade([
    { id: '1', nome: 'Fundador', producaoCent: 30000000, ficaAposNegocio: false },
    { id: '2', nome: 'Dra. B', producaoCent: 20000000, ficaAposNegocio: true, temNaoConcorrencia: true },
  ]);
  assert.equal(t.fracaoDependenteDoFundador, 0.6);
  assert.equal(t.fracaoAmarrada, 0.4);
  assert.match(t.leitura, /fracao/);
});

test('F3: contribuicao de entidade contratante usa 7% e 10% conforme a dependencia', () => {
  const testes = testesDeDiligencia({
    prestadores: {
      lista: [
        { id: 'p1', nome: 'A', dependenciaEconomica: 0.6, faturadoAnualCent: 5000000, anosDeRelacao: 1 },
        { id: 'p2', nome: 'B', dependenciaEconomica: 0.9, faturadoAnualCent: 5000000, anosDeRelacao: 1 },
      ],
    },
  });
  const prest = testes.find((t) => t.id === 'prestadores');
  const a = prest.detalhe.find((d) => d.id === 'p1');
  const b = prest.detalhe.find((d) => d.id === 'p2');
  assert.equal(a.taxaAplicavel, 0.07);
  assert.equal(a.contribuicaoAnualCent, 350000);
  assert.equal(b.taxaAplicavel, 0.10);
  assert.equal(b.contribuicaoAnualCent, 500000);
});

test('F3: dependencia abaixo de 50% nao gera contribuicao', () => {
  const testes = testesDeDiligencia({
    prestadores: { lista: [{ id: 'p', nome: 'C', dependenciaEconomica: 0.3, faturadoAnualCent: 5000000 }] },
  });
  const prest = testes.find((t) => t.id === 'prestadores');
  assert.equal(prest.contingenciaCent, 0);
});

test('F3: a contingencia de SS trava na prescricao de cinco anos', () => {
  const testes = testesDeDiligencia({
    prestadores: { lista: [{ id: 'p', nome: 'D', dependenciaEconomica: 0.9, faturadoAnualCent: 1000000, anosDeRelacao: 12 }] },
  });
  const prest = testes.find((t) => t.id === 'prestadores');
  assert.equal(prest.detalhe[0].contingenciaAcumuladaCent, 100000 * 5);
});

test('F3: contingencia de IVA inclui juros', () => {
  const testes = testesDeDiligencia({
    iva: { atosSuspeitos: [{ categoria: 'Estetica nao terapeutica', baseAnualCent: 2000000, anos: 3 }] },
    taxaIvaNormal: 0.23,
  });
  const iva = testes.find((t) => t.id === 'iva');
  assert.equal(iva.detalhe[0].principalCent, 460000 * 3);
  assert.ok(iva.detalhe[0].jurosCent > 0, 'passivo retroativo tem juros');
  assert.equal(iva.contingenciaCent, iva.detalhe[0].totalCent);
});

test('F3: um teste por verificar nao e um teste passado', () => {
  const testes = testesDeDiligencia({});
  assert.ok(testes.every((t) => t.estado === 'POR_VERIFICAR'));
  const r = prontidaoParaTransacao({
    ebitdaDeclaradoCent: 1000000,
    equipa: [{ id: 'p', nome: 'A', producaoCent: 100, ficaAposNegocio: true }],
  });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F3-TESTES-POR-VERIFICAR'));
});

test('F3: nunca apresenta um numero como avaliacao', () => {
  const r = prontidaoParaTransacao({
    ebitdaDeclaradoCent: 20000000,
    equipa: [{ id: 'p', nome: 'A', producaoCent: 100, ficaAposNegocio: true }],
  });
  assert.equal(r.blocos.find((b) => b.id === 'sensibilidade'), undefined,
    'sem multiplo introduzido nao pode haver bloco de valor');
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F3-SEM-MULTIPLO'));
});

test('F3: com multiplo introduzido mostra sensibilidade e a etiqueta da fonte', () => {
  const r = prontidaoParaTransacao({
    ebitdaDeclaradoCent: 20000000,
    equipa: [{ id: 'p', nome: 'A', producaoCent: 100, ficaAposNegocio: true }],
    multiploIntroduzido: 5,
  });
  const s = r.blocos.find((b) => b.id === 'sensibilidade');
  assert.equal(s.dados.cenarios.length, 5);
  assert.ok(s.fonte, 'um numero de mercado sem etiqueta de fonte nao pode sair');
  assert.equal(s.fonte.origem, 'INTERNACIONAL');
  assert.match(s.fonte.aviso, /Nao e o mercado portugues/);
});

test('F3: contingencias sao valor esperado, com a probabilidade a vista', () => {
  const c = contingencias(
    [{ id: 'iva', nome: 'IVA', contingenciaCent: 1000000 }],
    { iva: 0.7 },
  );
  assert.equal(c.totalEsperadoCent, 700000);
  assert.match(c.nota, /julgamento/);
});

test('F3: o scorecard incompleto renormaliza em vez de parecer mau', () => {
  const s = scorecard({ transferibilidade: 5 });
  assert.equal(s.total, 5);
  assert.ok(s.completude < 1);
});

test('F3: o plano ordena por retorno por euro investido', () => {
  const p = planoDeDoZeMeses([
    { id: 'a', accao: 'Cara', custoCent: 1000000, ganhoEstimadoCent: 2000000 },
    { id: 'b', accao: 'Barata', custoCent: 100000, ganhoEstimadoCent: 1000000 },
  ]);
  assert.equal(p[0].id, 'b');
});

test('F3: os blocos fiscais e juridicos fecham a exportacao sem cedula', () => {
  const r = prontidaoParaTransacao({
    ebitdaDeclaradoCent: 1000000,
    equipa: [{ id: 'p', nome: 'A', producaoCent: 100, ficaAposNegocio: true }],
  });
  assert.equal(r.exportavel, false);
  assert.match(r.motivoNaoExportavel, /co-signatario/);
  r.coAssina({ nome: 'Contabilista Certificado', cedula: '00000' });
  assert.equal(r.exportavel, true);
  assert.throws(() => r.coAssina({ nome: 'X' }), /cedula/);
});

// ---------------------------------------------------------------------------
// F4
// ---------------------------------------------------------------------------

test('F4: os indicadores calculam-se do SAF-T, nao se perguntam', async () => {
  const s = await analisaSaft(cenarioBase(), { anonimizador: await Anonimizador.cria() });
  const i = calculaIndicadores(s, { horasGabinete: 100, diasUteis: 20, receitaPorEntidadeCent: { A: 8000, B: 8000 } });
  assert.equal(i['receita-por-hora-gabinete'], 160);
  assert.equal(i['concentracao-entidades'], 0.5);
  assert.ok(i['retencao-12m'] > 0, 'o cenario base tem um paciente com atos em dois meses');
});

test('F4: sem consentimento nada sai do browser', () => {
  const c = constroiContribuicao({
    indicadores: {}, perfil: perfilVazio(), periodo: {}, consentimento: false,
  });
  assert.equal(c.pronta, false);
  assert.equal(c.payload, null);
});

test('F4: a contribuicao passa pelo auditor de fuga antes de existir', () => {
  const c = constroiContribuicao({
    indicadores: { 'ticket-medio': 5000 },
    perfil: { ...perfilVazio(), identificacao: { ...perfilVazio().identificacao, cae: '86230', subsetor: 'dentaria' } },
    periodo: { inicio: '2025-01-01', fim: '2025-12-31' },
    consentimento: true,
  });
  assert.equal(c.pronta, true);
  assert.equal(c.auditado, true);
  assert.equal(c.payload.periodo.inicio, '2025-01', 'a data nao pode descer ao dia');
  assert.equal(JSON.stringify(c.payload).includes('pseudonimo'), false);
});

test('F4: a contribuicao e bloqueada se o auditor encontrar um identificador', () => {
  const c = constroiContribuicao({
    indicadores: { 'ticket-medio': 210000001 },
    perfil: perfilVazio(),
    periodo: {},
    consentimento: true,
  });
  assert.equal(c.pronta, false);
  assert.ok(c.fugas.length > 0);
});

test('F4: nenhum estrato com menos de cinco clinicas e publicado', () => {
  const p = percentilImediato({ 'ticket-medio': 5000 }, { 'ticket-medio': [1000, 2000, 3000, 4000] });
  assert.equal(p['ticket-medio'].disponivel, false);
  assert.equal(p['ticket-medio'].motivo, 'ESTRATO_ABAIXO_DO_MINIMO');
  assert.equal(p['ticket-medio'].n, 4);
});

test('F4: com cinco ou mais devolve percentil e quartis, nunca media', () => {
  const p = percentilImediato({ 'ticket-medio': 3000 }, { 'ticket-medio': [1000, 2000, 3000, 4000, 5000] });
  assert.equal(p['ticket-medio'].disponivel, true);
  assert.equal(p['ticket-medio'].percentil, 0.5);
  assert.ok('mediana' in p['ticket-medio'].quartis);
  assert.equal('media' in p['ticket-medio'].quartis, false);
});

test('F4: publicar um estrato mostra sempre o n', () => {
  const e = publicaEstrato('86230|3-5|PT17', { 'ticket-medio': [1, 2, 3, 4, 5, 6] }, { revisaoCae: 'CAE-Rev.3' });
  assert.equal(e.indicadores['ticket-medio'].n, 6);
  assert.equal(e.publicavel, false, 'basta um indicador abaixo do minimo para o estrato nao ser publicavel');
});

test('F4: a chave de estrato inclui CAE, escalao de gabinetes e NUTS', () => {
  const perfil = {
    ...perfilVazio(),
    identificacao: { ...perfilVazio().identificacao, cae: '86230', nutsII: 'PT17' },
    capacidade: { ...perfilVazio().capacidade, gabinetes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
  };
  assert.equal(chaveEstrato(perfil), '86230|3-5|PT17');
});

// ---------------------------------------------------------------------------
// F5
// ---------------------------------------------------------------------------

const planoCompleto = (id, mes, valorCent, passos) => ({
  id,
  dataProposta: `${mes}-05`,
  dataAceitacao: `${mes}-08`,
  valorCent,
  pacientePseudonimo: `p_${id}`,
  passos,
});

test('F5: deteta o nivel de dados do ficheiro em vez de assumir formato', () => {
  assert.equal(detetaNivelDeDados([]), NIVEL_DADOS.INSUFICIENTE);
  assert.equal(detetaNivelDeDados([{ id: 1, estado: 'ACEITE' }]), NIVEL_DADOS.PARCIAL);
  assert.equal(detetaNivelDeDados([{ id: 1, dataAceitacao: '2025-01-01' }]), NIVEL_DADOS.PARCIAL);
  assert.equal(detetaNivelDeDados([{ id: 1 }]), NIVEL_DADOS.MINIMO);
  assert.equal(
    detetaNivelDeDados([{ id: 1, dataAceitacao: '2025-01-01', passos: [{ estado: 'EXECUTADO', dataExecucao: '2025-02-01' }] }]),
    NIVEL_DADOS.COMPLETO,
  );
});

test('F5: recusa mostrar taxa de aceitacao com registo incompleto', () => {
  const planos = [planoCompleto('1', '2025-01', 100000, [{ estado: 'EXECUTADO', dataExecucao: '2025-02-01', valorCent: 50000 }])];
  const r = funilPlanos({ planos, receitaTratamentoCent: 10000000 });
  assert.ok(r.lacunas.bloqueia);
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F5-REGISTO-INCOMPLETO'));
  assert.equal(r.blocos.find((b) => b.id === 'coortes'), undefined,
    'nao pode mostrar coortes sobre um registo que nao cobre a atividade');
  assert.match(r.veredito.frase, /registar/);
});

test('F5: a auditoria de completude mede cobertura contra receita faturada', () => {
  const a = auditaCompletude({
    planos: [planoCompleto('1', '2025-01', 100000, [{ estado: 'EXECUTADO', valorCent: 90000, dataExecucao: '2025-02-01' }])],
    receitaTratamentoCent: 100000,
    periodo: {},
  });
  assert.equal(a.cobertura, 0.9);
  assert.equal(a.suficiente, true);
});

test('F5: coortes agrupam por mes de proposta e produzem curva de maturacao', () => {
  const planos = [
    planoCompleto('1', '2025-01', 100000, [
      { estado: 'EXECUTADO', valorCent: 50000, dataExecucao: '2025-02-01' },
      { estado: 'EXECUTADO', valorCent: 50000, dataExecucao: '2025-06-01' },
    ]),
    planoCompleto('2', '2025-02', 200000, [{ estado: 'EXECUTADO', valorCent: 200000, dataExecucao: '2025-03-01' }]),
  ];
  const c = coortes(planos);
  assert.equal(c.length, 2);
  const jan = c.find((x) => x.mes === '2025-01');
  assert.equal(jan.curva[1].executadoCent, 50000, 'ao fim de um mes so meio plano estava feito');
  assert.equal(jan.curva[5].executadoCent, 100000, 'ao fim de cinco meses estava tudo');
});

test('F5: o abandono a meio e onde esta o dinheiro e sai ordenado por valor', () => {
  const planos = [
    planoCompleto('pequeno', '2025-01', 100000, [
      { estado: 'EXECUTADO', valorCent: 50000, dataExecucao: '2025-02-01' },
      { estado: 'PENDENTE', valorCent: 50000 },
    ]),
    planoCompleto('grande', '2025-01', 900000, [
      { estado: 'EXECUTADO', valorCent: 100000, dataExecucao: '2025-02-01' },
      { estado: 'PENDENTE', valorCent: 800000 },
    ]),
  ];
  const a = abandonoAMeio(planos);
  assert.equal(a.parados.length, 2);
  assert.equal(a.parados[0].planoId, 'grande', 'o maior valor parado vem primeiro');
  assert.equal(a.totalParadoCent, 850000);
});

test('F5: um plano concluido nao conta como abandonado', () => {
  const a = abandonoAMeio([
    planoCompleto('feito', '2025-01', 100000, [{ estado: 'EXECUTADO', valorCent: 100000, dataExecucao: '2025-02-01' }]),
  ]);
  assert.equal(a.parados.length, 0);
});

test('F5: com export parcial declara que nao mede abandono a meio', () => {
  const planos = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`, dataProposta: '2025-01-05', dataAceitacao: '2025-01-08', valorCent: 100000,
  }));
  const r = funilPlanos({ planos, receitaTratamentoCent: 1 });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F5-SEM-PASSOS'));
});

// ---------------------------------------------------------------------------
// F6
// ---------------------------------------------------------------------------

test('F6: com isencao do artigo 9.o o IVA entra no custo', () => {
  const c = capexReal({ precoSemIvaCent: 5000000, taxaIva: 0.23, regime: REGIME_IVA.ISENTO_ART9 });
  assert.equal(c.capexRealCent, 6150000);
  assert.equal(c.ivaNoCustoCent, 1150000);
  assert.ok(Math.abs(c.sobrecustoIvaFracao - 0.23) < 1e-9);
});

test('F6: com atividade tributada ha deducao parcial', () => {
  const c = capexReal({ precoSemIvaCent: 5000000, taxaIva: 0.23, regime: REGIME_IVA.MISTO_PRO_RATA, proRata: 0.3 });
  assert.equal(c.ivaDedutivelCent, 345000);
  assert.equal(c.capexRealCent, 5805000);
});

test('F6: pro rata sem pro rata indicado rebenta em vez de assumir zero', () => {
  assert.throws(() => capexReal({ precoSemIvaCent: 1, taxaIva: 0.23, regime: REGIME_IVA.MISTO_PRO_RATA }), /pro rata/);
});

test('F6: para equipamento identificavel a afetacao real costuma ganhar ao pro rata geral', () => {
  const c = comparaMetodosDeDeducao({
    precoSemIvaCent: 5000000, taxaIva: 0.23, proRata: 0.2, usoTributado: 0.8,
  });
  assert.equal(c.recomendado, 'AFETACAO_REAL');
  assert.ok(c.diferencaCent > 0);
  assert.match(c.aviso, /nao e livre caso a caso/);
});

test('F6: regularizacao de bens de investimento ao longo de cinco anos', () => {
  const r = regularizacaoBensInvestimento({
    ivaCent: 1150000, fracaoInicial: 0.8, fracoesPorAno: { 1: 0.2, 2: 0.2 },
  });
  assert.equal(r.periodoAnos, 5);
  assert.equal(r.linhas.length, 2);
  assert.ok(r.linhas.every((l) => l.sentido === 'A_ENTREGAR'), 'se o uso tributado cai, ha imposto a devolver');
});

test('F6: a primeira pergunta e o ponto de equilibrio em atos', () => {
  const e = pontoDeEquilibrio({
    capexRealCent: 6150000,
    vidaUtilAnos: 5,
    margemContribuicaoPorAtoCent: 5000,
    custoOportunidadeEspacoMensalCent: 30000,
  });
  assert.equal(e.amortizacaoMensalCent, 102500);
  assert.equal(e.atosPorMes, Math.ceil(132500 / 5000));
});

test('F6: se a procura nao chega ao equilibrio a analise financeira acaba ai', () => {
  const r = investimentoEquipamento({
    equipamento: {
      precoSemIvaCent: 5000000,
      vidaUtilAnos: 5,
      margemContribuicaoPorAtoCent: 5000,
      custoOportunidadeEspacoMensalCent: 0,
    },
    perfil: perfilVazio(),
    procuraObservadaAtosPorMes: 5,
  });
  assert.ok(r.alertas.some((a) => a.codigo === 'F6-PROCURA-INSUFICIENTE'));
  assert.match(r.veredito.frase, /nao compra/);
  assert.match(
    r.alertas.find((a) => a.codigo === 'F6-PROCURA-INSUFICIENTE').explicacao,
    /utilizacao, nao o juro/,
  );
});

test('F6: sem procura observada bloqueia em vez de adivinhar', () => {
  const r = investimentoEquipamento({
    equipamento: { precoSemIvaCent: 5000000, vidaUtilAnos: 5, margemContribuicaoPorAtoCent: 5000 },
    perfil: perfilVazio(),
  });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F6-SEM-PROCURA'));
  assert.ok(r.lacunas.bloqueia);
});

test('F6: leasing e compra tem o mesmo IVA no cenario isento', () => {
  const l = leasingContraCompra({
    capexRealCent: 6150000, vidaUtilAnos: 4, rendaMensalCent: 140000, prazoMesesLeasing: 48,
  });
  assert.match(l.ivaNota, /o mesmo nas duas vias/);
  assert.equal(l.leasing.sobrecustoFaceACompraCent, 140000 * 48 - 6150000);
  assert.equal(l.compra.depreciacaoAnualCent, Math.round(6150000 * 0.25));
  assert.equal(l.compra.depreciacaoAnualMinimaCent, Math.round(6150000 * 0.125));
});

test('F6: o payback usa caixa e nao desconta o investimento duas vezes', () => {
  const r = investimentoEquipamento({
    equipamento: {
      precoSemIvaCent: 5000000, vidaUtilAnos: 5, margemContribuicaoPorAtoCent: 20000,
      custoOportunidadeEspacoMensalCent: 0,
    },
    perfil: perfilVazio(),
    procuraObservadaAtosPorMes: 30,
  });
  const central = r.blocos.find((b) => b.id === 'cenarios').dados.find((c) => c.nome === 'Central');
  assert.ok(central.paybackMeses > 0);
  assert.ok(central.caixaMensalCent > central.resultadoMensalCent,
    'a amortizacao nao sai de caixa e por isso o fluxo tem de ser maior que o resultado');
});

// ---------------------------------------------------------------------------
// F7
// ---------------------------------------------------------------------------

test('F7: comparar percentagens nominais e comparar nada', () => {
  const base = {
    producaoCent: 10000000, recebidoCent: 10000000, horasGabinete: 100, dependenciaEconomica: null,
  };
  const a = custoEfetivoParaClinica({
    ...base, modelo: MODELO.PERCENTAGEM, percentagem: 0.40,
    suporta: { materiaisPelaClinica: true, materiaisCent: 1500000 },
  });
  const b = custoEfetivoParaClinica({
    ...base, modelo: MODELO.PERCENTAGEM, percentagem: 0.50,
    suporta: { materiaisPelaClinica: false, materiaisCent: 1500000 },
  });
  assert.ok(a.custoTotalCent > b.custoTotalCent,
    '40% com materiais a cargo da clinica custa mais do que 50% com materiais a cargo do profissional');
  assert.ok(a.percentagemEfetiva > 0.5);
});

test('F7: a contribuicao de entidade contratante entra no custo por hora, nao em rodape', () => {
  const semDependencia = custoEfetivoParaClinica({
    producaoCent: 10000000, recebidoCent: 10000000, modelo: MODELO.PERCENTAGEM,
    percentagem: 0.5, horasGabinete: 100, dependenciaEconomica: 0.3,
  });
  const comDependencia = custoEfetivoParaClinica({
    producaoCent: 10000000, recebidoCent: 10000000, modelo: MODELO.PERCENTAGEM,
    percentagem: 0.5, horasGabinete: 100, dependenciaEconomica: 0.9, anosDeRelacao: 3,
  });
  assert.equal(semDependencia.contribuicaoEntidadeContratante.aplicavel, false);
  assert.equal(comDependencia.contribuicaoEntidadeContratante.taxa, 0.10);
  assert.equal(comDependencia.contribuicaoEntidadeContratante.valorMensalCent, 500000);
  assert.ok(comDependencia.custoPorHoraGabineteCent > semDependencia.custoPorHoraGabineteCent);
  assert.equal(comDependencia.contribuicaoEntidadeContratante.exposicaoAcumuladaCent, 500000 * 12 * 3);
});

test('F7: pagar sobre producao custa mais do que sobre recebido quando ha glosa e atraso', () => {
  const comum = { modelo: MODELO.PERCENTAGEM, percentagem: 0.45, horasGabinete: 100, dependenciaEconomica: null };
  const sobreProducao = custoEfetivoParaClinica({ ...comum, producaoCent: 10000000, recebidoCent: 8500000, baseDeCalculo: 'PRODUCAO' });
  const sobreRecebido = custoEfetivoParaClinica({ ...comum, producaoCent: 10000000, recebidoCent: 8500000, baseDeCalculo: 'RECEBIDO' });
  assert.ok(sobreProducao.remuneracaoCent > sobreRecebido.remuneracaoCent);
  assert.equal(sobreProducao.remuneracaoCent - sobreRecebido.remuneracaoCent, 675000);
});

test('F7: o modelo misto respeita o minimo garantido', () => {
  const r = custoEfetivoParaClinica({
    producaoCent: 1000000, recebidoCent: 1000000, modelo: MODELO.MISTO_COM_MINIMO,
    percentagem: 0.3, fixoMensalCent: 100000, minimoGarantidoCent: 500000, horasGabinete: 100,
  });
  assert.equal(r.remuneracaoCent, 500000, 'o minimo garantido tem de ganhar quando a producao e baixa');
});

test('F7: o indice de risco mostra os indicios, nao uma pontuacao opaca', () => {
  const r = riscoDeReclassificacao({ local: true, equipamento: true, horario: true });
  assert.equal(r.nivel, 'ALTO');
  assert.equal(r.nIndicios, 3);
  assert.equal(r.indiciosAssinalados.length, 3);
  assert.ok(r.indiciosAssinalados.every((i) => i.descricao.length > 20),
    'cada indicio tem de vir com a descricao, para o cliente poder discordar');
  assert.match(r.limite, /nao se faz numa folha de calculo/);
});

test('F7: transparencia fiscal muda a conclusao sobre reter resultado', () => {
  const t = transparenciaFiscal({ sociedadeProfissionais: true, resultadoCent: 10000000, nSocios: 2 });
  assert.equal(t.aplicavel, true);
  assert.equal(t.imputacaoPorSocioCent, 5000000);
  assert.match(t.leitura, /deixa de ser um diferimento/);
  assert.equal(transparenciaFiscal({ sociedadeProfissionais: false }).aplicavel, false);
});

test('F7: o liquido do profissional declara a aproximacao que faz', () => {
  const l = liquidoDoProfissional({ remuneracaoAnualCent: 6000000, taxaMarginalIrs: 0.35 });
  assert.ok(l.liquidoAnualCent < l.brutoAnualCent);
  assert.match(l.aproximacao, /Nao substitui simulacao de IRS/);
  assert.equal(l.baseContributivaCent, 4200000);
  assert.equal(l.contribuicoesCent, Math.round(4200000 * 0.214));
});

test('F7: a ferramenta completa entrega as duas vistas lado a lado', () => {
  const r = remuneracao({
    profissionais: [{
      id: 'p1', nome: 'Dra. A', producaoCent: 10000000, recebidoCent: 9000000,
      percentagem: 0.45, horasGabinete: 120, dependenciaEconomica: 0.9, anosDeRelacao: 2,
      indicios: { local: true, equipamento: true, horario: true, retribuicao: true },
      suporta: { materiaisPelaClinica: true, materiaisCent: 800000 },
    }],
    perfil: { fiscal: { sociedadeProfissionais: true, resultadoCent: 5000000, nSocios: 2 } },
  });
  const bloco = r.blocos.find((b) => b.id === 'duas-vistas');
  assert.ok(bloco.dados[0].cenarios[0].clinica.custoPorHoraGabineteCent > 0);
  assert.ok(bloco.dados[0].cenarios[0].profissional.liquidoAnualCent > 0);
  assert.equal(bloco.dados[0].risco.nivel, 'ALTO');
  assert.match(r.veredito.frase, /entidade contratante/);
  assert.equal(r.exportavel, false, 'o bloco juridico fecha a exportacao sem cedula');
});

// ---------------------------------------------------------------------------
// Correcoes saidas da revisao por area. Ver qa/09-registo-de-achados.md
// ---------------------------------------------------------------------------

test('achado Fis-001: o F3 mostra as duas leituras da base do IVA em falta', () => {
  const testes = testesDeDiligencia({
    iva: { atosSuspeitos: [{ categoria: 'Estetica', baseAnualCent: 3000000, anos: 5 }] },
    taxaIvaNormal: 0.23,
  });
  const d = testes.find((t) => t.id === 'iva').detalhe[0];
  assert.equal(d.principalSeImpostoPorForaCent, 690000 * 5);
  assert.equal(d.principalSeImpostoIncluidoCent, Math.round(3000000 * (0.23 / 1.23)) * 5);
  assert.ok(d.diferencaEntreLeiturasCent > 0, 'as duas leituras tem de dar valores diferentes');
  assert.equal(d.principalCent, d.principalSeImpostoPorForaCent, 'por defeito usa a leitura conservadora');
});

test('achado C-003: o F1 declara que os custos vem do perfil e nao da contabilidade', () => {
  const r = painelMensal({ serie: serieSintetica(14), perfil: perfilTeste });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F1-CUSTOS-CONSTANTES'),
    'uma serie de custos constante tem de ser declarada, senao o peso dos custos e a receita disfarcada');
});

test('achado Fin-002: com carteira em aberto as primeiras semanas deixam de ser projecao', () => {
  const comum = {
    saldoInicialCent: 10000000,
    historico: [
      { mes: '2026-01', receitaCent: 4000000 },
      { mes: '2026-02', receitaCent: 4000000 },
      { mes: '2026-03', receitaCent: 4000000 },
    ],
    prazosPorEntidade: { PRIVADO: 60 },
    custosFixosMensaisCent: 3000000,
    dataInicio: '2026-04-01',
  };
  const sem = projeta13Semanas(comum);
  const com = projeta13Semanas({
    ...comum,
    faturasEmAberto: [{ data: '2026-03-01', valorCent: 2000000, entidade: 'PRIVADO' }],
  });
  assert.equal(sem.usouCarteiraEmAberto, false);
  assert.equal(com.usouCarteiraEmAberto, true);
  assert.match(sem.baseDeEstimativa, /falha exatamente nas/,
    'sem carteira, a limitacao tem de estar declarada');
  assert.notEqual(sem.semanas[0].entradasCent, com.semanas[0].entradasCent,
    'a carteira em aberto tem de mudar a primeira semana, que e a que ja esta determinada');
});

test('achado Fin-003: o F2 avisa quando a ocupacao esta na zona instavel', () => {
  const r = simuladorConvencoes({
    convencoes: [{
      id: 'X', nome: 'X', canibalizacao: 0,
      atos: [{ codigo: 'C', precoCent: 2500, custoVariavelCent: 500, duracaoMinutos: 30, volume: 10 }],
    }],
    atosPrivadosEquivalentes: [{ codigo: 'P', precoCent: 6000, custoVariavelCent: 1000, duracaoMinutos: 30, volume: 10 }],
    capacidade: { horasDisponiveis: 100, horasOcupadas: 95 },
  });
  assert.ok(r.lacunas.itens.some((l) => l.codigo === 'F2-PERTO-DA-CAPACIDADE'));
});
