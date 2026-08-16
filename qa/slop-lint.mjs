/**
 * Verificador de texto gerado sem cuidado.
 *
 * A especificacao tem uma voz: portugues corrente, afirmativo, sem entusiasmo
 * comercial, sem jargao, sem emoji. Um relatorio de consultoria financeira em
 * que aparece uma frase de brochura perde a autoridade que e o unico produto.
 *
 * Este verificador corre sobre tudo o que um cliente pode ler: HTML, markdown e
 * as cadeias de texto do codigo. Nao e um corretor de estilo generico, e uma
 * lista fechada de padroes que ja vi degradarem documentos deste tipo.
 *
 * Corre com: npm run qa:slop
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
// dist e produto da fonte, nao fonte. Verificar o gerado duplicaria cada achado
// e apanharia codigo empacotado como se fosse prosa para o cliente.
const IGNORAR = new Set(['node_modules', '.git', 'dados', 'dist', 'qa']);
const EXTENSOES = new Set(['.js', '.mjs', '.html', '.css', '.md', '.json']);

const REGRAS = [
  {
    id: 'emoji',
    descricao: 'Emoji. Um relatorio financeiro nao leva emoji.',
    padrao: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,
  },
  {
    id: 'exclamacao',
    descricao: 'Ponto de exclamacao em texto para o cliente.',
    // Exclui marcacao, que nao e prosa: <!doctype, <!--, <![CDATA[, e os
    // operadores de negacao e desigualdade do codigo.
    padrao: /(?<!<)!(?![=)[\-])/g,
    soEmTextoVisivel: true,
  },
  {
    id: 'travessao-longo',
    descricao: 'Travessao longo. O documento de origem usa virgulas e dois pontos.',
    padrao: /—/g,
  },
  {
    id: 'marketing',
    descricao: 'Vocabulario de brochura.',
    padrao: new RegExp([
      'revolucion[aá]ri', 'poderos[oa]', 'incr[ií]vel', 'inovador[a]?\\b', 'de ponta\\b',
      'solu[çc][ãa]o completa', 'transformador', 'game.?changer', 'seamless', 'leverage',
      'unlock', 'cutting.?edge', 'best.?in.?class', 'robusto e escal[aá]vel',
      'insights? acion[aá]ve', 'de forma inteligente', 'intelig[êe]ncia artificial de ponta',
      'no mundo de hoje', 'na era d[oa]', 'mergulhar fundo', 'deep dive',
    ].join('|'), 'gi'),
  },
  {
    id: 'construcao-nao-e-apenas',
    descricao: 'A construcao "nao e apenas X, e Y". Enche e nao afirma nada.',
    padrao: /n[ãa]o (?:é|e) (?:apenas|só|so|somente)[^.;]{0,60},\s*(?:é|e)\s/gi,
  },
  {
    id: 'hedge-duplo',
    descricao: 'Hedge a dobrar. Ou se afirma, ou nao se escreve.',
    padrao: /\b(pode potencialmente|talvez possa|geralmente costuma|normalmente tende a|poderá eventualmente)\b/gi,
  },
  {
    id: 'apelo-vago-a-autoridade',
    descricao: 'Apelo a uma fonte que nao existe.',
    padrao: /\b(v[aá]rios estudos|est[aá] provado que|todos sabem que|é consensual que|a maioria dos especialistas)\b/gi,
  },
  {
    id: 'placeholder',
    descricao: 'Texto de preenchimento que nao devia ter chegado aqui.',
    // Exclui nomes de atributo e de propriedade, que sao codigo e nao texto para
    // o cliente: placeholder:, placeholder= e coluna.placeholder.
    padrao: /(?<![.\w])(lorem ipsum|coming soon|em breve|TBD|placeholder|XXX)\b(?![:=])/gi,
  },
  {
    id: 'marca-de-trabalho',
    descricao: 'Marca de trabalho por fazer sem dono nem prazo.',
    padrao: /\b(TODO|FIXME|HACK)\b(?!\s*\()/g,
  },
  {
    id: 'superlativo-sem-numero',
    descricao: 'Superlativo sem numero por tras.',
    padrao: /\b(o melhor|a melhor|o mais avan[çc]ado|lider de mercado|[uú]nico no mercado)\b/gi,
    excecoes: [/o melhor por ato/i, /a melhor e a pior/i],
  },
];

function ficheiros(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) ficheiros(caminho, saida);
    else if (EXTENSOES.has(extname(caminho))) saida.push(caminho);
  }
  return saida;
}

/**
 * Extrai as linhas que um cliente pode ler: texto em HTML e markdown, cadeias
 * de texto em ficheiros de codigo. Excluir o codigo evita apanhar o operador de
 * negacao como se fosse uma exclamacao.
 */
function linhasVisiveis(caminho, conteudo) {
  const ext = extname(caminho);
  const linhas = conteudo.split('\n');
  if (ext === '.md' || ext === '.html') {
    return linhas.map((texto, i) => ({ n: i + 1, texto }));
  }
  return linhas
    .map((linha, i) => {
      const cadeias = [...linha.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g)]
        .map((m) => m[1] ?? m[2] ?? m[3])
        .join(' ');
      const comentario = /^\s*(\*|\/\/)/.test(linha) ? linha : '';
      return { n: i + 1, texto: `${cadeias} ${comentario}`.trim() };
    })
    .filter((l) => l.texto !== '');
}

const achados = [];

for (const caminho of ficheiros(raiz)) {
  const conteudo = readFileSync(caminho, 'utf8');
  const rel = relative(raiz, caminho);
  const todasAsLinhas = conteudo.split('\n').map((texto, i) => ({ n: i + 1, texto }));
  const visiveis = linhasVisiveis(caminho, conteudo);

  for (const regra of REGRAS) {
    const alvo = regra.soEmTextoVisivel ? visiveis : todasAsLinhas;
    for (const { n, texto } of alvo) {
      regra.padrao.lastIndex = 0;
      const encontrados = texto.match(regra.padrao);
      if (!encontrados) continue;
      if (regra.excecoes?.some((e) => e.test(texto))) continue;
      achados.push({
        ficheiro: rel,
        linha: n,
        regra: regra.id,
        descricao: regra.descricao,
        trecho: texto.trim().slice(0, 110),
        ocorrencias: encontrados.length,
      });
    }
  }
}

if (achados.length === 0) {
  process.stdout.write('slop-lint: limpo.\n');
  process.exit(0);
}

process.stdout.write(`slop-lint: ${achados.length} achados.\n\n`);
for (const a of achados) {
  process.stdout.write(`${a.ficheiro}:${a.linha}  [${a.regra}]\n  ${a.descricao}\n  ${a.trecho}\n\n`);
}
process.exit(1);
