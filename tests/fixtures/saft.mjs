/**
 * Construtor de ficheiros SAF-T sinteticos para teste.
 *
 * Os casos que interessam nao sao as faturas normais, sao as notas de credito,
 * os documentos anulados e o consumidor final. Sao esses que produzem os erros
 * silenciosos, por isso o construtor torna-os faceis de gerar.
 */

function linhaXml(l, i) {
  const valor = l.credito != null
    ? `<CreditAmount>${l.credito.toFixed(2)}</CreditAmount>`
    : `<DebitAmount>${l.debito.toFixed(2)}</DebitAmount>`;
  return `
        <Line>
          <LineNumber>${i + 1}</LineNumber>
          <ProductCode>${l.produto}</ProductCode>
          <ProductDescription>${l.descricao ?? l.produto}</ProductDescription>
          <Quantity>${l.quantidade ?? 1}</Quantity>
          <UnitOfMeasure>UN</UnitOfMeasure>
          <UnitPrice>${(l.precoUnitario ?? l.credito ?? l.debito).toFixed(2)}</UnitPrice>
          <Description>${l.descricao ?? l.produto}</Description>
          ${valor}
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>PT</TaxCountryRegion>
            <TaxCode>${l.codigoTaxa ?? 'ISE'}</TaxCode>
            <TaxPercentage>${l.taxaIva ?? 0}</TaxPercentage>
          </Tax>
          ${l.codigoIsencao ? `<TaxExemptionReason>${l.motivoIsencao ?? 'Artigo 9.o do CIVA'}</TaxExemptionReason><TaxExemptionCode>${l.codigoIsencao}</TaxExemptionCode>` : ''}
        </Line>`;
}

function documentoXml(d) {
  const linhas = d.linhas.map(linhaXml).join('');
  const liquido = d.linhas.reduce((a, l) => a + (l.credito ?? l.debito ?? 0), 0);
  return `
      <Invoice>
        <InvoiceNo>${d.numero}</InvoiceNo>
        <ATCUD>0</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>${d.estado ?? 'N'}</InvoiceStatus>
          <InvoiceStatusDate>${d.data}T10:00:00</InvoiceStatusDate>
          <SourceID>1</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>x</Hash>
        <HashControl>1</HashControl>
        <Period>${Number(d.data.slice(5, 7))}</Period>
        <InvoiceDate>${d.data}</InvoiceDate>
        <InvoiceType>${d.tipo ?? 'FT'}</InvoiceType>
        <SpecialRegimes><SelfBillingIndicator>0</SelfBillingIndicator><CashVATSchemeIndicator>0</CashVATSchemeIndicator><ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator></SpecialRegimes>
        <SourceID>1</SourceID>
        <SystemEntryDate>${d.data}T10:00:00</SystemEntryDate>
        <CustomerID>${d.cliente}</CustomerID>${linhas}
        <DocumentTotals>
          <TaxPayable>0.00</TaxPayable>
          <NetTotal>${liquido.toFixed(2)}</NetTotal>
          <GrossTotal>${liquido.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
}

function pagamentoXml(p) {
  const linhas = p.linhas.map((l, i) => `
        <Line>
          <LineNumber>${i + 1}</LineNumber>
          <SourceDocumentID>
            <OriginatingON>${l.documentoOrigem}</OriginatingON>
            <InvoiceDate>${l.dataDocumentoOrigem}</InvoiceDate>
          </SourceDocumentID>
          <CreditAmount>${l.valor.toFixed(2)}</CreditAmount>
        </Line>`).join('');
  const total = p.linhas.reduce((a, l) => a + l.valor, 0);
  return `
      <Payment>
        <PaymentRefNo>${p.referencia}</PaymentRefNo>
        <ATCUD>0</ATCUD>
        <Period>${Number(p.data.slice(5, 7))}</Period>
        <TransactionDate>${p.data}</TransactionDate>
        <PaymentType>RC</PaymentType>
        <DocumentStatus>
          <PaymentStatus>${p.estado ?? 'N'}</PaymentStatus>
          <PaymentStatusDate>${p.data}T10:00:00</PaymentStatusDate>
          <SourceID>1</SourceID>
          <SourcePayment>P</SourcePayment>
        </DocumentStatus>
        <SourceID>1</SourceID>
        <SystemEntryDate>${p.data}T10:00:00</SystemEntryDate>
        <CustomerID>${p.cliente}</CustomerID>${linhas}
        <DocumentTotals><TaxPayable>0.00</TaxPayable><NetTotal>${total.toFixed(2)}</NetTotal><GrossTotal>${total.toFixed(2)}</GrossTotal></DocumentTotals>
      </Payment>`;
}

export function construirSaft({
  empresa = 'Clinica de Teste, Lda',
  nifEmpresa = '500000000',
  ano = 2025,
  clientes = [],
  produtos = [],
  documentos = [],
  pagamentos = [],
} = {}) {
  const clientesXml = clientes.map((c) => `
      <Customer>
        <CustomerID>${c.id}</CustomerID>
        <AccountID>Desconhecido</AccountID>
        <CustomerTaxID>${c.nif}</CustomerTaxID>
        <CompanyName>${c.nome ?? 'Consumidor final'}</CompanyName>
        <BillingAddress><AddressDetail>Desconhecido</AddressDetail><City>Desconhecido</City><PostalCode>0000-000</PostalCode><Country>PT</Country></BillingAddress>
        <SelfBillingIndicator>0</SelfBillingIndicator>
      </Customer>`).join('');

  const produtosXml = produtos.map((p) => `
      <Product>
        <ProductType>S</ProductType>
        <ProductCode>${p.codigo}</ProductCode>
        <ProductGroup>${p.grupo ?? 'Servicos'}</ProductGroup>
        <ProductDescription>${p.descricao}</ProductDescription>
        <ProductNumberCode>${p.codigo}</ProductNumberCode>
      </Product>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${nifEmpresa}</CompanyID>
    <TaxRegistrationNumber>${nifEmpresa}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${empresa}</CompanyName>
    <CompanyAddress><AddressDetail>Rua Um</AddressDetail><City>Lisboa</City><PostalCode>1000-001</PostalCode><Country>PT</Country></CompanyAddress>
    <FiscalYear>${ano}</FiscalYear>
    <StartDate>${ano}-01-01</StartDate>
    <EndDate>${ano}-12-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${ano}-12-31</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>500000001</ProductCompanyTaxID>
    <SoftwareCertificateNumber>0000</SoftwareCertificateNumber>
    <ProductID>Software/Fornecedor</ProductID>
    <ProductVersion>1.0</ProductVersion>
  </Header>
  <MasterFiles>${clientesXml}${produtosXml}
    <TaxTable>
      <TaxTableEntry>
        <TaxType>IVA</TaxType><TaxCountryRegion>PT</TaxCountryRegion><TaxCode>ISE</TaxCode>
        <Description>Isento artigo 9.o</Description><TaxPercentage>0.00</TaxPercentage>
      </TaxTableEntry>
      <TaxTableEntry>
        <TaxType>IVA</TaxType><TaxCountryRegion>PT</TaxCountryRegion><TaxCode>NOR</TaxCode>
        <Description>Taxa normal</Description><TaxPercentage>23.00</TaxPercentage>
      </TaxTableEntry>
    </TaxTable>
  </MasterFiles>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${documentos.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>0.00</TotalCredit>${documentos.map(documentoXml).join('')}
    </SalesInvoices>
    <Payments>
      <NumberOfEntries>${pagamentos.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>0.00</TotalCredit>${pagamentos.map(pagamentoXml).join('')}
    </Payments>
  </SourceDocuments>
</AuditFile>`;
}

/** Cenario base usado por varios testes. */
export function cenarioBase() {
  return construirSaft({
    clientes: [
      { id: 'C1', nif: '210000001', nome: 'Paciente Um' },
      { id: 'C2', nif: '210000002', nome: 'Paciente Dois' },
      { id: 'CF', nif: '999999990', nome: 'Consumidor final' },
    ],
    produtos: [
      { codigo: 'CONS', descricao: 'Consulta' },
      { codigo: 'MEDIS-CONS', descricao: 'Consulta MEDIS' },
      { codigo: 'DEST', descricao: 'Destartarizacao' },
    ],
    documentos: [
      { numero: 'FT 1/1', data: '2025-01-10', cliente: 'C1', linhas: [{ produto: 'CONS', credito: 60 }] },
      { numero: 'FT 1/2', data: '2025-01-15', cliente: 'C2', linhas: [{ produto: 'MEDIS-CONS', credito: 25 }] },
      { numero: 'FT 1/3', data: '2025-02-10', cliente: 'C1', linhas: [{ produto: 'DEST', credito: 45 }, { produto: 'CONS', credito: 60 }] },
      // Nota de credito. Abate, e traz DebitAmount.
      { numero: 'NC 1/1', data: '2025-02-20', cliente: 'C1', tipo: 'NC', linhas: [{ produto: 'CONS', debito: 60 }] },
      // Anulado. Nao conta para nada.
      { numero: 'FT 1/4', data: '2025-03-01', cliente: 'C2', estado: 'A', linhas: [{ produto: 'CONS', credito: 999 }] },
      // Consumidor final.
      { numero: 'FS 1/1', data: '2025-03-05', cliente: 'CF', tipo: 'FS', linhas: [{ produto: 'CONS', credito: 30 }] },
    ],
    pagamentos: [
      { referencia: 'RC 1/1', data: '2025-01-20', cliente: 'C1', linhas: [{ documentoOrigem: 'FT 1/1', dataDocumentoOrigem: '2025-01-10', valor: 60 }] },
      { referencia: 'RC 1/2', data: '2025-03-16', cliente: 'C2', linhas: [{ documentoOrigem: 'FT 1/2', dataDocumentoOrigem: '2025-01-15', valor: 25 }] },
    ],
  });
}
