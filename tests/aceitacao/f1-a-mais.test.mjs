/**
 * Teste de aceitacao do F1 contra doze meses reais da A+.
 *
 * A especificacao e explicita: correr contra 12 meses reais da A+, a ferramenta
 * deve reproduzir os alertas que terias emitido manualmente nesses 12 meses, e
 * se disparar alertas que nao emitirias os limiares estao errados e nao se
 * entrega. Este teste e obrigatorio antes do primeiro cliente.
 *
 * Os dados de cliente nao entram no repositorio. O teste procura-os em
 * dados/aplus/, que esta no .gitignore, e falha de forma ruidosa se nao os
 * encontrar. Falhar e o comportamento correto: um teste obrigatorio que passa
 * por ausencia de dados e um teste que mente.
 *
 * Para correr:
 *   1. dados/aplus/serie.json      serie mensal, formato em README-DADOS.md
 *   2. dados/aplus/perfil.json     perfil de cliente
 *   3. dados/aplus/alertas-manuais.json
 *      { "2025-03": ["receita-por-hora-gabinete"], "2025-08": [], ... }
 *   4. npm run test:aceitacao
 *
 * Enquanto AUTORIZA_ENTREGA_SEM_DADOS_REAIS nao estiver definida, a ausencia
 * dos ficheiros e uma falha. Definir essa variavel e uma decisao consciente de
 * correr sem a rede de seguranca, e fica registada na saida.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { painelMensal, taxaEmpiricaDeAlerta } from '../../src/ferramentas/f1-painel-mensal.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pasta = join(raiz, 'dados/aplus');
const ficheiros = {
  serie: join(pasta, 'serie.json'),
  perfil: join(pasta, 'perfil.json'),
  manuais: join(pasta, 'alertas-manuais.json'),
};

const temDados = Object.values(ficheiros).every(existsSync);
const dispensado = process.env.AUTORIZA_ENTREGA_SEM_DADOS_REAIS === '1';

test('aceitacao F1: os dados reais da A+ estao disponiveis', (t) => {
  if (temDados) return;
  if (dispensado) {
    t.diagnostic(
      'AVISO: a correr sem os dados reais da A+, por AUTORIZA_ENTREGA_SEM_DADOS_REAIS=1. ' +
      'A calibracao do F1 nao esta verificada e a ferramenta nao deve ser entregue a nenhum cliente.',
    );
    return;
  }
  assert.fail(
    'Faltam os doze meses reais da A+ em dados/aplus/. Este teste e obrigatorio antes do primeiro ' +
    'cliente e falhar em falta e o comportamento correto. Ver o cabecalho deste ficheiro para o formato.',
  );
});

test('aceitacao F1: reproduz os alertas que terias emitido a mao', { skip: !temDados }, () => {
  const serie = JSON.parse(readFileSync(ficheiros.serie, 'utf8'));
  const perfil = JSON.parse(readFileSync(ficheiros.perfil, 'utf8'));
  const manuais = JSON.parse(readFileSync(ficheiros.manuais, 'utf8'));

  const falsosPositivos = [];
  const falsosNegativos = [];

  for (const [mes, esperados] of Object.entries(manuais)) {
    const r = painelMensal({ serie, perfil, mesAlvo: mes });
    const emitidos = r.alertas
      .filter((a) => a.classe === 'DESVIO')
      .map((a) => a.codigo.replace(/^F1-/, ''));

    for (const e of emitidos) {
      if (!esperados.includes(e)) falsosPositivos.push({ mes, alerta: e });
    }
    for (const e of esperados) {
      if (!emitidos.includes(e)) falsosNegativos.push({ mes, alerta: e });
    }
  }

  assert.deepEqual(
    falsosPositivos, [],
    'A ferramenta disparou alertas que nao terias emitido. Os limiares estao errados e nao se entrega.\n' +
    JSON.stringify(falsosPositivos, null, 2),
  );
  assert.deepEqual(
    falsosNegativos, [],
    'A ferramenta falhou alertas que terias emitido. Ver se a metrica em falta existe no painel.\n' +
    JSON.stringify(falsosNegativos, null, 2),
  );
});

test('aceitacao F1: a taxa empirica de alerta e aceitavel', { skip: !temDados }, (t) => {
  const serie = JSON.parse(readFileSync(ficheiros.serie, 'utf8'));
  const taxa = taxaEmpiricaDeAlerta(serie);
  t.diagnostic(
    `Com ${taxa.sigma} sigma sobre ${taxa.nMetricas} metricas, ${Math.round((taxa.taxa ?? 0) * 100)}% ` +
    `dos ${taxa.mesesAvaliados} meses avaliados teriam gerado pelo menos um alerta.`,
  );
  assert.ok(
    taxa.taxa == null || taxa.taxa <= 0.5,
    `Mais de metade dos meses gera alerta. Isto e ruido e o cliente aprende a ignorar. Ver P-15 e o achado F-004. ` +
    `Taxa medida: ${taxa.taxa}`,
  );
});
