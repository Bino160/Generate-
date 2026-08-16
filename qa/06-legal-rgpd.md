# QA legal e RGPD

A especificação diz que o RGPD é requisito de desenho e não aviso legal. Esta
frente verifica se isso é verdade no código ou só na frase.

---

## L-001. O achado crítico. Um hash de NIF não é anonimização

A especificação pede "NIF de paciente convertido em hash irreversível". Escrito
literalmente, isso é um SHA-256 do NIF. **E isso não é irreversível na prática.**

O espaço de NIF português tem menos de mil milhões de valores e a estrutura
reduz o espaço útil a uma ordem de grandeza abaixo disso. Uma tabela completa de
NIF para hash calcula-se num portátil em minutos. Quem tiver o hash tem o NIF.

Consequência jurídica: publicar agregados construídos sobre um hash simples de
NIF **não é anonimização para efeitos do RGPD**. É pseudonimização, e dados
pseudonimizados continuam a ser dados pessoais, com tudo o que isso implica em
base legal, direitos do titular e responsabilidade.

**O que está construído em vez disso:**

1. HMAC-SHA-256 com chave aleatória de 256 bits, gerada dentro da página.
2. A chave é importada como não extraível. Nem o código da própria página a
   consegue ler.
3. A chave é por sessão. Fechar o separador destrói a correspondência, incluindo
   para nós.
4. O identificador original é descartado antes de qualquer estrutura sair do
   leitor. O teste `saft: nenhum NIF sobrevive a leitura` corre o auditor sobre a
   saída completa.
5. Para o barómetro não sobem pseudónimos. Sobem agregados.

O que isto **não** resolve, e está escrito na página de arquitetura: um agregado
sobre uma clínica com um único paciente numa categoria continua reidentificável.
Por isso a regra de cinco está no motor do barómetro e não na anonimização.

---

## L-010. O auditor gritava em falso. Corrigido

Um pseudónimo é 32 caracteres hexadecimais e pode, por acaso, conter nove dígitos
seguidos rodeados de letras. O auditor lia isso como NIF e disparava em falso
cerca de uma vez em cada algumas centenas de execuções.

Um auditor de privacidade intermitente é pior do que nenhum, porque ensina quem o
usa a ignorar o aviso. Corrigido, com teste que usa uma armadilha construída de
propósito.

---

## Os quatro controlos que impedem fuga, e onde estão

| Controlo | Onde | O que impede |
| --- | --- | --- |
| Pseudonimização obrigatória | `analisaSaft` recusa correr sem anonimizador | Ler SAF-T em claro por atalho |
| Auditor de fuga | `auditaFugaDeIdentificadores` | Um identificador chegar a uma saída ou a um agregado |
| Consentimento expresso | `constroiContribuicao` | Envio sem autorização por carregamento |
| Regra de cinco | `publicavel` no motor de benchmark | Reidentificação por estrato pequeno |

O consentimento não é uma caixa marcada por defeito e não é um aviso: sem ele a
contribuição **nem chega a ser construída**, devolve `pronta: false` e o payload
é nulo.

O auditor corre sobre o payload antes de o payload existir. Se encontrar alguma
coisa, a contribuição é bloqueada e devolve as posições suspeitas com o valor
ocultado, para se poder corrigir sem o reimprimir.

---

## L-005. Sem cédula, é uma porta e não um rodapé

Enquanto P-05 for `false`:

- Qualquer bloco de natureza fiscal ou jurídica marca o resultado como não
  exportável.
- A mensagem diz porquê e aponta o pressuposto.
- `coAssina` exige nome e número de cédula do parceiro, e rebenta sem eles.
- Só depois da co-assinatura é que a exportação produz ficheiro.

Verificado por teste. Uma ferramenta nova que acrescente um bloco fiscal herda
este comportamento sem ter de se lembrar dele.

---

## L-006. Obrigações que as ferramentas fazem aparecer

**ERS.** A modificação da entidade titular da exploração tem de ser comunicada no
prazo de 30 dias. Aparece no F3, como teste de diligência, e no F2, no aviso que
precede qualquer decisão de sair de uma convenção. É uma pendência clássica em
clínicas com licença antiga e não aparece em nenhuma calculadora de mercado.

**Saída de convenção.** Pré-aviso contratual, deveres de continuidade de cuidados
aos pacientes com tratamento em curso, e comunicação às entidades. A ferramenta
assinala, não emite parecer, e diz isso na própria saída.

**Artigo 12.º do Código do Trabalho.** O F7 lista os cinco indícios e mostra os
que foram efetivamente assinalados, com a descrição de cada um, em vez de uma
pontuação opaca. O cliente tem de poder discordar de um indício concreto.

E o ponto que apanha clínicas de surpresa: **independentemente da
reclassificação**, há contribuição de entidade contratante devida pela
dependência económica, apurada oficiosamente a partir do anexo SS no ano
seguinte. Está no custo por hora desde o início.

---

## L-008. A lista nominativa que não é nominativa

A especificação do F5 pede "lista nominativa de planos a recuperar, ordenada por
valor".

Uma lista nominativa exige o nome do paciente. O nome do paciente nunca entra
nesta ferramenta e não deve entrar: aumentaria a superfície de dados pessoais
sem nenhum ganho analítico.

A lista sai ordenada por valor, identificada por pseudónimo, e diz explicitamente
que a identificação se faz no software clínico da clínica. Quem vai ligar ao
paciente tem o software aberto à frente.

**Desvio consciente da especificação, registado aqui para ser discutido.**

---

## L-009. O que fica guardado no browser

Fica o perfil de cliente: gabinetes, custos fixos, regime de IVA, tabela de
preços, convenções. Não tem dados de pacientes, mas tem a economia da clínica,
o que num computador partilhado já é de mais.

Não fica o SAF-T, não ficam pseudónimos, não fica a chave.

Corrigido com botão para apagar, na página de arquitetura, e a página diz
exatamente o que fica e o que não fica.

---

## Rede

O servidor de desenvolvimento envia uma política de segurança de conteúdo com
`connect-src 'none'`. O teste de fumo verifica que o percurso completo, incluindo
carregar um SAF-T e correr as sete ferramentas, **não gera um único pedido para
fora da origem**. Está a zero.

---

## O que esta frente exige antes de qualquer entrega

1. Base legal para o tratamento no F4, documentada, mesmo com agregados.
2. Publicação da arquitetura de dados numa página acessível a quem não usa a
   ferramenta. É a objeção número um de qualquer diretor clínico e a página já
   existe dentro do hub, falta expô-la.
3. Contrato de subcontratação com cada clínica, se e quando houver qualquer
   tratamento fora do browser.
4. Revisão de tudo o que está classificado como jurídico por quem pode assinar.
