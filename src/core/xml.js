/**
 * Leitor XML de passagem unica.
 *
 * Nao uso DOMParser por duas razoes. Primeira, os motores tem de correr em Node
 * nos testes e no browser em producao com o mesmo codigo, e um ficheiro SAF-T de
 * uma clinica com dois anos passa dos 200 MB, tamanho a que construir uma arvore
 * completa em memoria e imprudente. Segunda, o SAF-T nao tem conteudo misto, por
 * isso um leitor de eventos chega e gasta memoria constante.
 *
 * Cobre o que o SAF-T-PT usa: elementos, texto, CDATA, comentarios, instrucoes de
 * processamento, entidades predefinidas e numericas, prefixos de espaco de nomes.
 * Nao cobre DTD com entidades personalizadas, e isso e deliberado: e o vetor da
 * expansao de entidades e nao ha ficheiro SAF-T legitimo que precise dela.
 */

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodificaEntidades(texto) {
  if (texto.indexOf('&') === -1) return texto;
  return texto.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (todo, corpo) => {
    if (corpo[0] === '#') {
      const cp = corpo[1] === 'x' || corpo[1] === 'X'
        ? parseInt(corpo.slice(2), 16)
        : parseInt(corpo.slice(1), 10);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : todo;
    }
    return Object.prototype.hasOwnProperty.call(ENTIDADES, corpo) ? ENTIDADES[corpo] : todo;
  });
}

function semPrefixo(nome) {
  const i = nome.indexOf(':');
  return i === -1 ? nome : nome.slice(i + 1);
}

function leAtributos(bruto) {
  const attrs = {};
  const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(bruto)) !== null) {
    attrs[semPrefixo(m[1])] = decodificaEntidades(m[3] !== undefined ? m[3] : m[4]);
  }
  return attrs;
}

/**
 * Percorre o XML chamando os handlers.
 *
 * @param {string} texto
 * @param {{
 *   abre?: (nome: string, atributos: Record<string,string>, caminho: string[]) => void,
 *   fecha?: (nome: string, texto: string, caminho: string[]) => void,
 * }} handlers
 */
export function percorreXml(texto, handlers) {
  const abre = handlers.abre || (() => {});
  const fecha = handlers.fecha || (() => {});

  const caminho = [];
  const textos = [];
  let i = 0;
  const n = texto.length;

  if (/<!ENTITY/i.test(texto.slice(0, 4096))) {
    throw new Error('XML com declaracao de entidades no prologo. Recusado por seguranca.');
  }

  while (i < n) {
    const lt = texto.indexOf('<', i);
    if (lt === -1) break;

    if (lt > i && textos.length > 0) {
      textos[textos.length - 1] += texto.slice(i, lt);
    }

    if (texto.startsWith('<!--', lt)) {
      const fim = texto.indexOf('-->', lt + 4);
      i = fim === -1 ? n : fim + 3;
      continue;
    }
    if (texto.startsWith('<![CDATA[', lt)) {
      const fim = texto.indexOf(']]>', lt + 9);
      const conteudo = texto.slice(lt + 9, fim === -1 ? n : fim);
      if (textos.length > 0) textos[textos.length - 1] += conteudo;
      i = fim === -1 ? n : fim + 3;
      continue;
    }
    if (texto.startsWith('<?', lt)) {
      const fim = texto.indexOf('?>', lt + 2);
      i = fim === -1 ? n : fim + 2;
      continue;
    }
    if (texto.startsWith('<!', lt)) {
      const fim = texto.indexOf('>', lt + 2);
      i = fim === -1 ? n : fim + 1;
      continue;
    }

    const gt = texto.indexOf('>', lt + 1);
    if (gt === -1) break;
    const bruto = texto.slice(lt + 1, gt);
    i = gt + 1;

    if (bruto[0] === '/') {
      const nome = semPrefixo(bruto.slice(1).trim());
      const conteudo = textos.pop() ?? '';
      const aberto = caminho.pop();
      if (aberto !== nome) {
        throw new Error(`XML mal formado: fechou <${nome}> mas estava aberto <${aberto ?? 'nada'}>`);
      }
      caminho.push(nome);
      fecha(nome, decodificaEntidades(conteudo).trim(), caminho);
      caminho.pop();
      continue;
    }

    const autoFecha = bruto.endsWith('/');
    const corpo = autoFecha ? bruto.slice(0, -1) : bruto;
    const espaco = corpo.search(/\s/);
    const nome = semPrefixo((espaco === -1 ? corpo : corpo.slice(0, espaco)).trim());
    const atributos = espaco === -1 ? {} : leAtributos(corpo.slice(espaco));

    caminho.push(nome);
    abre(nome, atributos, caminho);
    if (autoFecha) {
      fecha(nome, '', caminho);
      caminho.pop();
    } else {
      textos.push('');
    }
  }

  if (caminho.length > 0) {
    throw new Error(`XML truncado. Ficaram por fechar: ${caminho.join(' > ')}`);
  }
}
