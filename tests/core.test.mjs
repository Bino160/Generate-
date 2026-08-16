import test from 'node:test';
import assert from 'node:assert/strict';

import { centDeDecimal, centDeNumero, aplicaTaxa, soma, porUnidade, formata } from '../src/core/dinheiro.js';
import { media, desvioPadrao, quantil, quartis, percentilDe, zScoreExcluindoProprio, mediaMovelAnterior, variacao } from '../src/core/estatistica.js';
import { percorreXml, decodificaEntidades } from '../src/core/xml.js';
import { pascoa, feriadosNacionais, diasUteisClinicos, horasGabineteDisponiveis, ocupacao } from '../src/core/capacidade.js';
import { Anonimizador, contemPossivelNif, auditaFugaDeIdentificadores } from '../src/core/anonimizacao.js';
import { Lacunas, GRAVIDADE } from '../src/core/lacunas.js';
import { Referencia, publicavel, constroiEstrato, NIVEL, ORIGEM } from '../src/core/benchmark.js';

test('dinheiro: converte decimais sem erro de virgula flutuante', () => {
  assert.equal(centDeDecimal('1234.56'), 123456);
  assert.equal(centDeDecimal('0.1'), 10);
  assert.equal(centDeDecimal('0.005'), 1);
  assert.equal(centDeDecimal('-45.00'), -4500);
  assert.equal(centDeDecimal('19,99'), 1999);
  assert.equal(centDeDecimal(''), 0);
  assert.equal(centDeDecimal('100'), 10000);
});

test('dinheiro: soma de muitos decimais nao acumula erro', () => {
  // 0.1 + 0.2 !== 0.3 em virgula flutuante. Em centimos tem de bater sempre.
  const cents = Array.from({ length: 1000 }, () => centDeDecimal('0.07'));
  assert.equal(soma(cents), 7000);
  const emFloat = Array.from({ length: 1000 }, () => 0.07).reduce((a, b) => a + b, 0);
  assert.notEqual(emFloat, 70);
});

test('dinheiro: soma recusa euros disfarcados de centimos', () => {
  assert.throws(() => soma([100, 12.5]), /centimos inteiros/);
});

test('dinheiro: aplicaTaxa arredonda simetricamente', () => {
  assert.equal(aplicaTaxa(10000, 0.23), 2300);
  assert.equal(aplicaTaxa(-10000, 0.23), -2300);
  assert.equal(aplicaTaxa(101, 0.5), 51);
  assert.equal(aplicaTaxa(-101, 0.5), -51);
});

test('dinheiro: porUnidade devolve null em vez de infinito', () => {
  assert.equal(porUnidade(10000, 0), null);
  assert.equal(porUnidade(10000, 4), 2500);
});

test('dinheiro: formata em pt-PT', () => {
  assert.match(formata(123456), /1[\s .]?234,56/);
  assert.equal(formata(null), 'n/d');
});

test('estatistica: desvio-padrao e amostral', () => {
  // Com n-1 o desvio de [2,4,4,4,5,5,7,9] e 2,138. Com n seria 2.
  const s = desvioPadrao([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.ok(Math.abs(s - 2.138) < 0.01, `esperava 2,138 e veio ${s}`);
  assert.equal(desvioPadrao([5]), null);
});

test('estatistica: quantis por interpolacao linear', () => {
  assert.equal(quantil([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantil([1, 2, 3, 4, 5], 0.5), 3);
  const q = quartis([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(q.mediana, 4.5);
  assert.equal(q.p25, 2.75);
  assert.equal(q.p75, 6.25);
});

test('estatistica: z-score exclui o proprio ponto', () => {
  const serie = [10, 12, 9, 11, 20];
  const comExclusao = zScoreExcluindoProprio(20, serie, 4);
  // Sem exclusao o desvio seria inflacionado pelo proprio ponto e o z sairia menor.
  const m = media(serie);
  const s = desvioPadrao(serie);
  const comInclusao = (20 - m) / s;
  assert.ok(comExclusao > comInclusao, 'a exclusao tem de aumentar o z de um ponto anomalo');
  assert.equal(zScoreExcluindoProprio(20, [10, 10], 1), null, 'serie curta devolve null');
});

test('estatistica: z-score devolve null com serie constante', () => {
  assert.equal(zScoreExcluindoProprio(10, [10, 10, 10, 10], 3), null);
});

test('estatistica: media movel exige janela cheia', () => {
  assert.equal(mediaMovelAnterior([1, 2, 3, 4], 2, 3), null);
  assert.equal(mediaMovelAnterior([1, 2, 3, 4], 3, 3), 2);
});

test('estatistica: variacao protege denominador zero', () => {
  assert.equal(variacao(10, 0), null);
  assert.equal(variacao(110, 100), 0.1);
});

test('estatistica: percentil com empates', () => {
  assert.equal(percentilDe(3, [1, 2, 3, 4, 5]), 0.5);
});

test('xml: le elementos, texto, cdata e entidades', () => {
  const eventos = [];
  percorreXml(
    '<a><b>x &amp; y</b><c><![CDATA[bruto <tag>]]></c><d/></a>',
    { fecha: (nome, texto) => eventos.push([nome, texto]) },
  );
  assert.deepEqual(eventos, [['b', 'x & y'], ['c', 'bruto <tag>'], ['d', ''], ['a', '']]);
});

test('xml: ignora prefixos de espaco de nomes', () => {
  const nomes = [];
  percorreXml('<ns:a xmlns:ns="u"><ns:b>1</ns:b></ns:a>', { fecha: (n) => nomes.push(n) });
  assert.deepEqual(nomes, ['b', 'a']);
});

test('xml: rejeita declaracao de entidades', () => {
  assert.throws(
    () => percorreXml('<?xml version="1.0"?><!DOCTYPE a [<!ENTITY x "y">]><a/>', {}),
    /entidades/,
  );
});

test('xml: deteta ficheiro truncado em vez de devolver dados parciais em silencio', () => {
  assert.throws(() => percorreXml('<a><b>1</b>', {}), /truncado/);
});

test('xml: deteta fecho trocado', () => {
  assert.throws(() => percorreXml('<a><b></a></b>', {}), /mal formado/);
});

test('xml: decodifica referencias numericas', () => {
  assert.equal(decodificaEntidades('&#65;&#x42;'), 'AB');
});

test('capacidade: Pascoa em anos conhecidos', () => {
  assert.equal(pascoa(2024).toISOString().slice(0, 10), '2024-03-31');
  assert.equal(pascoa(2025).toISOString().slice(0, 10), '2025-04-20');
  assert.equal(pascoa(2026).toISOString().slice(0, 10), '2026-04-05');
});

test('capacidade: feriados moveis derivam da Pascoa', () => {
  const f = feriadosNacionais(2026);
  const porNome = Object.fromEntries(f.map((x) => [x.nome, x.data]));
  assert.equal(porNome['Sexta-feira Santa'], '2026-04-03');
  assert.equal(porNome['Corpo de Deus'], '2026-06-04');
  assert.equal(f.length, 13);
});

test('capacidade: dias uteis clinicos descontam feriados e encerramentos', () => {
  // Abril de 2026 tem 22 dias uteis de calendario. 3 de Abril e Sexta-feira
  // Santa e 25 de Abril cai a sabado, portanto so desconta um.
  const semNada = diasUteisClinicos({ ano: 2026, mes: 4 });
  assert.equal(semNada.dias, 21);

  const comEncerramento = diasUteisClinicos({
    ano: 2026, mes: 4, encerramentos: ['2026-04-06', '2026-04-07'],
  });
  assert.equal(comEncerramento.dias, 19);
});

test('capacidade: clinica aberta ao sabado tem mais dias uteis', () => {
  const semSabado = diasUteisClinicos({ ano: 2026, mes: 4 });
  const comSabado = diasUteisClinicos({ ano: 2026, mes: 4, diasSemanaAbertos: [1, 2, 3, 4, 5, 6] });
  assert.ok(comSabado.dias > semSabado.dias);
});

test('capacidade: gabinetes com horarios diferentes nao contam como iguais', () => {
  const perfil = {
    capacidade: {
      diasSemanaAbertos: [1, 2, 3, 4, 5],
      horasPorDia: 8,
      encerramentos: [],
      gabinetes: [
        { id: 'G1', nome: 'Consulta 1' },
        { id: 'G2', nome: 'Cirurgia', diasSemanaAbertos: [2], horasPorDia: 6 },
      ],
    },
  };
  const cap = horasGabineteDisponiveis(perfil, 2026, 4);
  const g1 = cap.porGabinete.find((g) => g.id === 'G1');
  const g2 = cap.porGabinete.find((g) => g.id === 'G2');
  assert.equal(g1.horas, 21 * 8);
  assert.ok(g2.horas < g1.horas / 3, 'um gabinete de um dia por semana nao pode contar como tempo inteiro');
  assert.equal(cap.horas, g1.horas + g2.horas);
});

test('capacidade: ocupacao devolve null sem agenda, nunca uma estimativa', () => {
  assert.equal(ocupacao(null, 100), null);
  assert.equal(ocupacao(80, 0), null);
  assert.equal(ocupacao(80, 100), 0.8);
});

test('anonimizacao: pseudonimo e estavel na sessao e diferente entre sessoes', async () => {
  const a1 = await Anonimizador.cria();
  const a2 = await Anonimizador.cria();
  const p1 = await a1.pseudonimo('210000001');
  const p1bis = await a1.pseudonimo('210000001');
  const p2 = await a2.pseudonimo('210000001');

  assert.equal(p1, p1bis, 'tem de ser estavel dentro da sessao');
  assert.notEqual(p1, p2, 'nao pode ser reproduzivel entre sessoes, senao ha tabela de correspondencia');
  assert.match(p1, /^p_[0-9a-f]{32}$/);
});

test('anonimizacao: o mesmo numero em dominios diferentes nao colide', async () => {
  const a = await Anonimizador.cria();
  assert.notEqual(await a.pseudonimo('123', 'paciente'), await a.pseudonimo('123', 'entidade'));
});

test('anonimizacao: entradas vazias devolvem null em vez de um pseudonimo falso', async () => {
  const a = await Anonimizador.cria();
  assert.equal(await a.pseudonimo(null), null);
  assert.equal(await a.pseudonimo('   '), null);
});

test('anonimizacao: o auditor apanha NIF em claro', () => {
  assert.ok(contemPossivelNif('o nif e 210000001'));
  assert.ok(!contemPossivelNif('numero 12345'));
  const fugas = auditaFugaDeIdentificadores({ a: { b: ['ok', 'nif 234567890'] }, c: 219000009 });
  assert.equal(fugas.length, 2);
  assert.ok(fugas.every((f) => f.valor === '[ocultado]'), 'o auditor nao pode repetir o valor que encontrou');
});

test('lacunas: exige mensagem util e nao duplica', () => {
  const l = new Lacunas('T');
  assert.throws(() => l.declara('X', GRAVIDADE.DEGRADA, 'curta'), /mensagem util/);
  assert.throws(() => l.declara('X', 'INVENTADA', 'uma mensagem suficientemente longa'), /Gravidade invalida/);
  l.declara('X', GRAVIDADE.DEGRADA, 'uma mensagem suficientemente longa');
  l.declara('X', GRAVIDADE.BLOQUEIA, 'outra mensagem suficientemente longa');
  assert.equal(l.itens.length, 1);
});

test('lacunas: ordena as que bloqueiam primeiro', () => {
  const l = new Lacunas('T');
  l.declara('A', GRAVIDADE.INFORMA, 'mensagem informativa suficientemente longa');
  l.declara('B', GRAVIDADE.BLOQUEIA, 'mensagem bloqueante suficientemente longa');
  assert.equal(l.lista()[0].codigo, 'B');
  assert.ok(l.bloqueia);
});

test('benchmark: uma referencia sem fonte nao chega a existir', () => {
  assert.throws(() => new Referencia({ metrica: 'x', nivel: NIVEL.FINANCEIRO, origem: ORIGEM.PT, ano: 2026 }), /sem fonte/);
  assert.throws(() => new Referencia({ metrica: 'x', nivel: 'INVENTADO', origem: ORIGEM.PT, fonte: 'f', ano: 2026 }), /Nivel invalido/);
});

test('benchmark: referencia internacional traz aviso obrigatorio', () => {
  const r = new Referencia({
    metrica: 'm', nivel: NIVEL.FINANCEIRO, origem: ORIGEM.INTERNACIONAL, fonte: 'EUA', ano: 2026,
  });
  assert.ok(r.etiqueta.aviso.includes('Nao e o mercado portugues'));
  assert.equal(r.etiqueta.destaque, true);
});

test('benchmark: regra de cinco', () => {
  assert.equal(publicavel(4), false);
  assert.equal(publicavel(5), true);
  const e = constroiEstrato('k', [1, 2, 3, 4]);
  assert.equal(e.publicavel, false);
  assert.equal(e.valores, null, 'um estrato pequeno nao pode devolver valores');
});

test('achado L-010: o auditor nao confunde um pseudonimo hexadecimal com um NIF', () => {
  // Um pseudonimo de 32 caracteres hexadecimais pode conter nove digitos
  // seguidos entre letras. Isto disparava em falso de forma intermitente.
  const armadilha = 'p_ab123456789cdefcdefcdefcdefcdefc';
  assert.equal(contemPossivelNif(armadilha), false);
  assert.deepEqual(auditaFugaDeIdentificadores({ pseudonimo: armadilha }), []);
  // Um NIF a serio continua a ser apanhado, e um pseudonimo mal formado tambem.
  assert.equal(contemPossivelNif('210000001'), true);
  assert.equal(contemPossivelNif('p_ZZ 210000001'), true);
});

test('achado L-010: o auditor continua a apanhar NIF em qualquer profundidade', () => {
  const fugas = auditaFugaDeIdentificadores({ a: [{ b: { c: 'contacto 234567890' } }] });
  assert.equal(fugas.length, 1);
  assert.equal(fugas[0].caminho, '$.a[0].b.c');
});
