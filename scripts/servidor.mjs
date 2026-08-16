/**
 * Servidor estatico minimo para desenvolvimento.
 *
 * O hub nao tem passo de compilacao nem dependencias externas: sao modulos ES
 * servidos como estao. Este servidor existe so porque os modulos ES nao carregam
 * a partir de file:// por causa da politica de mesma origem.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const porta = Number(process.env.PORTA ?? 8080);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const servidor = createServer(async (pedido, resposta) => {
  try {
    const caminho = decodeURIComponent(new URL(pedido.url, 'http://localhost').pathname);
    const relativo = normalize(caminho === '/' ? 'index.html' : caminho.slice(1));
    if (relativo.startsWith('..')) {
      resposta.writeHead(403).end('Fora da raiz');
      return;
    }
    const absoluto = join(raiz, relativo);
    const info = await stat(absoluto);
    if (!info.isFile()) {
      resposta.writeHead(404).end('Nao encontrado');
      return;
    }
    const conteudo = await readFile(absoluto);
    resposta.writeHead(200, {
      'content-type': TIPOS[extname(absoluto)] ?? 'application/octet-stream',
      // O hub nao precisa de nada de fora. Fechar isto e a metade da promessa
      // de privacidade que se pode impor pelo servidor.
      'content-security-policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    });
    resposta.end(conteudo);
  } catch {
    resposta.writeHead(404).end('Nao encontrado');
  }
});

servidor.listen(porta, () => {
  process.stdout.write(`Hub a servir em http://localhost:${porta}\n`);
});
