/**
 * Leitor de SAF-T-PT.
 *
 * Camada partilhada. Nenhuma ferramenta pode ler SAF-T por sua conta, porque foi
 * exatamente assim que se chegou a sete definicoes diferentes de receita.
 *
 * Decisoes que valem a pena explicar:
 *
 * 1. Receita calcula-se a partir das linhas, CreditAmount menos DebitAmount, e
 *    nao a partir de DocumentTotals. Em SAF-T uma nota de credito traz totais
 *    positivos e so o tipo de documento diz que abate. Somar GrossTotal de tudo
 *    e o erro classico que inflaciona a receita pelo dobro das notas de credito.
 *    Os DocumentTotals sao usados como verificacao, e a divergencia vira lacuna.
 *
 * 2. Documentos com InvoiceStatus igual a A estao anulados e nao entram em nada.
 *
 * 3. Consumidor final. O NIF 999999990 e partilhado por todos os clientes sem
 *    identificacao. Se for pseudonimizado como qualquer outro, todos colapsam num
 *    unico paciente e o F2 e o F5 passam a medir um paciente ficticio com
 *    centenas de atos. Sao marcados e excluidos de qualquer analise ao nivel do
 *    paciente, e a fracao de receita que representam e declarada.
 *
 * 4. O NIF em claro existe apenas dentro da funcao de leitura das entidades e e
 *    descartado antes de qualquer estrutura sobreviver a chamada.
 */

import { percorreXml } from './xml.js';
import { centDeDecimal, soma } from './dinheiro.js';
import { Lacunas, GRAVIDADE } from './lacunas.js';

export const NIF_CONSUMIDOR_FINAL = '999999990';

/** Tipos que abatem a receita. */
const TIPOS_ABATEM = new Set(['NC']);

/** Tipos de documento de venda reconhecidos. */
const TIPOS_VENDA = new Set(['FT', 'FS', 'FR', 'ND', 'NC', 'VD', 'TV', 'TD', 'AA', 'DA']);

export function sinalDoTipo(tipo) {
  return TIPOS_ABATEM.has(tipo) ? -1 : 1;
}

function mesDe(dataIso) {
  return typeof dataIso === 'string' && dataIso.length >= 7 ? dataIso.slice(0, 7) : null;
}

/**
 * @param {string} texto conteudo do ficheiro SAF-T
 * @param {{anonimizador: import('./anonimizacao.js').Anonimizador}} opcoes
 */
export async function analisaSaft(texto, { anonimizador } = {}) {
  if (!anonimizador) {
    throw new Error(
      'analisaSaft exige um anonimizador. Ler SAF-T sem pseudonimizar e uma violacao de desenho, nao um atalho.',
    );
  }

  const lacunas = new Lacunas('SAF-T');
  const cabecalho = {};
  /** @type {Map<string, {id:string, nifBruto:string|null, consumidorFinal:boolean, pseudonimo:string|null}>} */
  const clientesBrutos = new Map();
  const produtos = new Map();
  const taxas = new Map();
  const documentos = [];
  const pagamentos = [];

  let doc = null;
  let linha = null;
  let pagamento = null;
  let linhaPag = null;
  let cliente = null;
  let produto = null;
  let entradaTaxa = null;
  let seccao = null;

  percorreXml(texto, {
    abre(nome, _attrs, caminho) {
      const em = (p) => caminho.includes(p);
      if (nome === 'Header') seccao = 'Header';
      else if (nome === 'MasterFiles') seccao = 'MasterFiles';
      else if (nome === 'SourceDocuments') seccao = 'SourceDocuments';

      if (nome === 'Customer' && seccao === 'MasterFiles') {
        cliente = { id: null, nifBruto: null, temNome: false };
      } else if (nome === 'Product' && seccao === 'MasterFiles') {
        produto = { codigo: null, descricao: null, tipo: null, grupo: null };
      } else if (nome === 'TaxTableEntry') {
        entradaTaxa = { codigo: null, tipo: null, percentagem: null, descricao: null };
      } else if (nome === 'Invoice') {
        doc = {
          numero: null, atcud: null, estado: null, data: null, tipo: null,
          clienteId: null, pseudonimo: null, consumidorFinal: false,
          linhas: [], totais: { liquidoCent: 0, ivaCent: 0, brutoCent: 0 },
          sistemaData: null, periodo: null,
        };
      } else if (nome === 'Line' && doc && !pagamento) {
        linha = {
          numero: null, produto: null, descricao: null, quantidade: null,
          precoUnitarioCent: 0, creditoCent: 0, debitoCent: 0,
          taxaIva: null, codigoTaxa: null, codigoIsencao: null, motivoIsencao: null,
        };
      } else if (nome === 'Payment') {
        pagamento = {
          referencia: null, data: null, clienteId: null, pseudonimo: null,
          estado: null, linhas: [], totalCent: 0,
        };
      } else if (nome === 'Line' && pagamento) {
        linhaPag = { documentoOrigem: null, dataDocumentoOrigem: null, valorCent: 0 };
      } else if (nome === 'SourceDocumentID' && linhaPag) {
        linhaPag.emOrigem = true;
      }
      void em;
    },

    fecha(nome, conteudo, caminho) {
      const dentro = (p) => caminho.includes(p);

      // Cabecalho
      if (seccao === 'Header' && dentro('Header') && !dentro('CompanyAddress')) {
        switch (nome) {
          case 'AuditFileVersion': cabecalho.versao = conteudo; break;
          case 'TaxRegistrationNumber': cabecalho.nifEmpresa = conteudo; break;
          case 'CompanyName': cabecalho.empresa = conteudo; break;
          case 'FiscalYear': cabecalho.ano = Number(conteudo) || null; break;
          case 'StartDate': cabecalho.dataInicio = conteudo; break;
          case 'EndDate': cabecalho.dataFim = conteudo; break;
          case 'CurrencyCode': cabecalho.moeda = conteudo; break;
          case 'TaxAccountingBasis': cabecalho.base = conteudo; break;
          case 'ProductID': cabecalho.software = conteudo; break;
          case 'ProductVersion': cabecalho.versaoSoftware = conteudo; break;
          default: break;
        }
      }

      // Entidades
      if (cliente) {
        if (nome === 'CustomerID' && !dentro('Invoice') && !dentro('Payment')) cliente.id = conteudo;
        else if (nome === 'CustomerTaxID') cliente.nifBruto = conteudo;
        else if (nome === 'CompanyName') cliente.temNome = conteudo !== '';
        else if (nome === 'Customer') {
          if (cliente.id) {
            const nif = (cliente.nifBruto || '').trim();
            clientesBrutos.set(cliente.id, {
              id: cliente.id,
              nifBruto: nif || null,
              consumidorFinal: nif === NIF_CONSUMIDOR_FINAL || nif === '',
              pseudonimo: null,
            });
          }
          cliente = null;
        }
      }

      if (produto) {
        if (nome === 'ProductCode') produto.codigo = conteudo;
        else if (nome === 'ProductDescription') produto.descricao = conteudo;
        else if (nome === 'ProductType') produto.tipo = conteudo;
        else if (nome === 'ProductGroup') produto.grupo = conteudo;
        else if (nome === 'Product') {
          if (produto.codigo) produtos.set(produto.codigo, { ...produto });
          produto = null;
        }
      }

      if (entradaTaxa) {
        if (nome === 'TaxCode') entradaTaxa.codigo = conteudo;
        else if (nome === 'TaxType') entradaTaxa.tipo = conteudo;
        else if (nome === 'TaxPercentage') entradaTaxa.percentagem = Number(conteudo);
        else if (nome === 'Description') entradaTaxa.descricao = conteudo;
        else if (nome === 'TaxTableEntry') {
          if (entradaTaxa.codigo) taxas.set(entradaTaxa.codigo, { ...entradaTaxa });
          entradaTaxa = null;
        }
      }

      // Linhas de fatura
      if (linha) {
        switch (nome) {
          case 'LineNumber': linha.numero = Number(conteudo) || null; break;
          case 'ProductCode': linha.produto = conteudo; break;
          case 'ProductDescription': linha.descricao = conteudo; break;
          case 'Quantity': linha.quantidade = Number(conteudo); break;
          case 'UnitPrice': linha.precoUnitarioCent = centDeDecimal(conteudo); break;
          case 'CreditAmount': linha.creditoCent = centDeDecimal(conteudo); break;
          case 'DebitAmount': linha.debitoCent = centDeDecimal(conteudo); break;
          case 'TaxPercentage': linha.taxaIva = Number(conteudo); break;
          case 'TaxCode': linha.codigoTaxa = conteudo; break;
          case 'TaxExemptionCode': linha.codigoIsencao = conteudo; break;
          case 'TaxExemptionReason': linha.motivoIsencao = conteudo; break;
          case 'Line':
            doc.linhas.push({ ...linha });
            linha = null;
            break;
          default: break;
        }
      }

      // Documento de venda
      if (doc && !linha) {
        switch (nome) {
          case 'InvoiceNo': doc.numero = conteudo; break;
          case 'ATCUD': doc.atcud = conteudo; break;
          case 'InvoiceStatus': doc.estado = conteudo; break;
          case 'InvoiceDate': doc.data = conteudo; break;
          case 'InvoiceType': doc.tipo = conteudo; break;
          case 'Period': doc.periodo = Number(conteudo) || null; break;
          case 'SystemEntryDate': doc.sistemaData = conteudo; break;
          case 'CustomerID': if (dentro('Invoice')) doc.clienteId = conteudo; break;
          case 'TaxPayable': if (dentro('DocumentTotals')) doc.totais.ivaCent = centDeDecimal(conteudo); break;
          case 'NetTotal': if (dentro('DocumentTotals')) doc.totais.liquidoCent = centDeDecimal(conteudo); break;
          case 'GrossTotal': if (dentro('DocumentTotals')) doc.totais.brutoCent = centDeDecimal(conteudo); break;
          case 'Invoice':
            documentos.push(doc);
            doc = null;
            break;
          default: break;
        }
      }

      // Recebimentos
      if (linhaPag) {
        if (nome === 'OriginatingON') linhaPag.documentoOrigem = conteudo;
        else if (nome === 'InvoiceDate' && linhaPag.emOrigem) linhaPag.dataDocumentoOrigem = conteudo;
        else if (nome === 'CreditAmount') linhaPag.valorCent = centDeDecimal(conteudo);
        else if (nome === 'DebitAmount') linhaPag.valorCent = -centDeDecimal(conteudo);
        else if (nome === 'SourceDocumentID') linhaPag.emOrigem = false;
        else if (nome === 'Line') {
          delete linhaPag.emOrigem;
          pagamento.linhas.push({ ...linhaPag });
          linhaPag = null;
        }
      }

      if (pagamento && !linhaPag) {
        switch (nome) {
          case 'PaymentRefNo': pagamento.referencia = conteudo; break;
          case 'TransactionDate': pagamento.data = conteudo; break;
          case 'PaymentStatus': pagamento.estado = conteudo; break;
          case 'CustomerID': if (dentro('Payment')) pagamento.clienteId = conteudo; break;
          case 'GrossTotal': if (dentro('DocumentTotals')) pagamento.totalCent = centDeDecimal(conteudo); break;
          case 'Payment':
            pagamentos.push(pagamento);
            pagamento = null;
            break;
          default: break;
        }
      }
    },
  });

  // Pseudonimizacao. Acontece antes de qualquer estrutura sair desta funcao.
  const clientes = new Map();
  for (const c of clientesBrutos.values()) {
    const pseudonimo = c.consumidorFinal
      ? null
      : await anonimizador.pseudonimo(c.nifBruto ?? c.id, 'paciente');
    clientes.set(c.id, {
      id: c.id,
      pseudonimo,
      consumidorFinal: c.consumidorFinal,
      identificavel: !c.consumidorFinal && Boolean(c.nifBruto),
    });
    c.nifBruto = null;
  }
  clientesBrutos.clear();

  // Ligacao documento para cliente e validacao linha a linha.
  let divergencias = 0;
  let semCliente = 0;
  for (const d of documentos) {
    const c = d.clienteId ? clientes.get(d.clienteId) : null;
    if (!c) {
      semCliente += 1;
      d.consumidorFinal = true;
    } else {
      d.pseudonimo = c.pseudonimo;
      d.consumidorFinal = c.consumidorFinal;
    }
    d.clienteId = null; // identificador interno do software nao sobrevive a leitura

    d.anulado = d.estado === 'A';
    d.mes = mesDe(d.data);
    d.sinal = sinalDoTipo(d.tipo);
    d.liquidoLinhasCent = soma(d.linhas.map((l) => l.creditoCent - l.debitoCent));

    const esperado = d.totais.liquidoCent * d.sinal;
    if (!d.anulado && Math.abs(d.liquidoLinhasCent - esperado) > 2) divergencias += 1;
  }

  const validos = documentos.filter((d) => !d.anulado && TIPOS_VENDA.has(d.tipo));
  const receitaCent = soma(validos.map((d) => d.liquidoLinhasCent));
  const receitaConsumidorFinalCent = soma(
    validos.filter((d) => d.consumidorFinal).map((d) => d.liquidoLinhasCent),
  );

  // Lacunas
  if (documentos.length === 0) {
    lacunas.declara('SAFT-VAZIO', GRAVIDADE.BLOQUEIA,
      'O ficheiro nao tem documentos de venda. Verifica se exportaste o SAF-T de faturacao e nao o de contabilidade.',
      { comoResolver: 'Exportar novamente com o tipo de ficheiro de faturacao.' });
  }
  if (divergencias > 0) {
    lacunas.declara('SAFT-DIVERGENCIA', GRAVIDADE.DEGRADA,
      `${divergencias} documentos em que a soma das linhas nao bate com os totais declarados. Usei as linhas.`,
      { comoResolver: 'Pedir ao fornecedor do software uma reexportacao. Divergencia sistematica indica bug no exportador.' });
  }
  if (semCliente > 0) {
    lacunas.declara('SAFT-SEM-CLIENTE', GRAVIDADE.INFORMA,
      `${semCliente} documentos referem um cliente que nao consta das entidades. Tratados como consumidor final.`);
  }
  const fracaoConsumidorFinal = receitaCent === 0 ? 0 : receitaConsumidorFinalCent / receitaCent;
  if (fracaoConsumidorFinal > 0.15) {
    lacunas.declara('SAFT-CONSUMIDOR-FINAL', GRAVIDADE.DEGRADA,
      `${Math.round(fracaoConsumidorFinal * 100)}% da receita esta em documentos sem paciente identificado. ` +
      'Toda a analise por paciente, incluindo valor de ciclo de vida e coortes, cobre apenas a parte restante.',
      { comoResolver: 'Passar a recolher NIF na faturacao, ou usar o numero de processo clinico como identificador na exportacao.' });
  }
  if (pagamentos.length === 0) {
    lacunas.declara('SAFT-SEM-RECEBIMENTOS', GRAVIDADE.DEGRADA,
      'O ficheiro nao inclui recebimentos. Nao consigo calcular prazo medio de recebimento por entidade.',
      { comoResolver: 'Exportar o SAF-T com a seccao de recibos, se o software a suportar.' });
  }

  return {
    cabecalho,
    clientes,
    produtos,
    taxas,
    documentos,
    documentosValidos: validos,
    pagamentos,
    resumo: {
      nDocumentos: documentos.length,
      nValidos: validos.length,
      nAnulados: documentos.filter((d) => d.anulado).length,
      receitaCent,
      receitaConsumidorFinalCent,
      fracaoConsumidorFinal,
      meses: [...new Set(validos.map((d) => d.mes).filter(Boolean))].sort(),
      nPacientesIdentificados: new Set(
        validos.map((d) => d.pseudonimo).filter(Boolean),
      ).size,
    },
    lacunas,
  };
}

/** Agrega receita liquida por mes, ja com sinal correto. */
export function receitaPorMes(saft) {
  const mapa = new Map();
  for (const d of saft.documentosValidos) {
    if (!d.mes) continue;
    mapa.set(d.mes, (mapa.get(d.mes) || 0) + d.liquidoLinhasCent);
  }
  return mapa;
}

/** Numero de atos por mes. Um ato e uma linha de documento que nao abate. */
export function atosPorMes(saft) {
  const mapa = new Map();
  for (const d of saft.documentosValidos) {
    if (!d.mes || d.sinal < 0) continue;
    mapa.set(d.mes, (mapa.get(d.mes) || 0) + d.linhas.length);
  }
  return mapa;
}

/**
 * Agrupa receita por entidade pagadora.
 *
 * Limitacao estrutural, e nao ha volta a dar: o SAF-T nao tem campo de entidade
 * pagadora nem de convencao. A ligacao faz-se por uma tabela de correspondencia
 * no perfil de cliente, tipicamente do nome ou do numero de entidade que a
 * clinica usa na faturacao. Sem essa tabela, o F2 nao corre.
 */
export function receitaPorEntidade(saft, correspondencia) {
  const mapa = new Map();
  const naoMapeados = new Set();
  for (const d of saft.documentosValidos) {
    for (const l of d.linhas) {
      const chave = correspondencia.resolve(d, l);
      if (chave == null) {
        naoMapeados.add(l.produto || '(sem codigo)');
        continue;
      }
      const atual = mapa.get(chave) || { receitaCent: 0, atos: 0 };
      atual.receitaCent += l.creditoCent - l.debitoCent;
      atual.atos += d.sinal > 0 ? 1 : -1;
      mapa.set(chave, atual);
    }
  }
  return { mapa, naoMapeados: [...naoMapeados] };
}
