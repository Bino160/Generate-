# Projeto Dra. Júlia Best — trabalho interno

**Cliente faturável:** Gerir Saúde · **Cliente final:** Dra. Júlia Best (NIF 272180610), fisioterapeuta, ENI em regime simplificado
**Origem:** ata de reunião de 18/08/2026 (MOD COO 007/1) — primeira e única interação com a cliente até à data
**Fase:** produção dos entregáveis internos que sustentam E1, E2 e E3

---

## Estado

| Peça | Ficheiro | Estado |
|---|---|---|
| M1 — modelo comparativo das 4 vias | `01-modelo/M1_modelo_comparativo.xlsx` | Motor construído e validado por recálculo independente. **A correr com placeholders** |
| M1 — gerador | `01-modelo/build_m1.py` | Reproduz o ficheiro do zero |
| N1 — nota técnica de composição societária | `02-nota-tecnica/N1_composicao_societaria.md` | Completa. 6 pendentes de Fiscalidade |
| P1 — plano de implementação | `03-plano/P1_plano_implementacao.md` | Completo |
| R1 — registo de pressupostos e riscos | `04-riscos/R1_registo_pressupostos_riscos.md` | Aberto e em manutenção |
| Pedido de inputs à cliente | `00-inputs/pedido_inputs_cliente.md` | **Minuta, não enviada** |
| E1 — estrutura do relatório | `05-relatorio/E1_relatorio_estrutura.md` | Cap. 2 redigido, cap. 5 com a regra de decisão fechada, restantes em esqueleto |

**Nada disto sai para a cliente.** Os entregáveis são o relatório E1, o anexo E2 e a reunião E3. A entrega do ficheiro do modelo está expressamente fora de âmbito.

---

## O que bloqueia a entrega

Dois bloqueios, e nenhum deles é falta de trabalho nosso.

**1. Nenhum dos oito inputs da secção 4 do brief foi recebido.** A ata é de 18/08 e foi a primeira interação com a cliente. Os valores da folha `Inputs` do M1 são placeholders para testar o motor de cálculo, não estimativas do caso. Estão todos registados em R1, secção A.

**2. Os parâmetros normativos de 2026 não estão confirmados** — escalões de IRS, taxas de IRC, regras de Segurança Social. R1, secção C. Este bloqueio não depende da cliente e pode ser levantado esta semana.

---

## Três coisas que este trabalho acrescenta à ata

**1. A premissa em que assenta toda a hipótese do cônjuge nunca foi verificada.** O afastamento da transparência fiscal depende de a atividade de Personal Trainer não constar da tabela do art. 151.º CIRS. Se constar — por enquadramento como desportista ou pelo código residual —, a entrada do cônjuge não produz o efeito pretendido, com qualquer percentagem de capital. É o maior risco isolado do projeto (R1-14) e resolve-se com um pedido de dois minutos à cliente.

**2. Há uma via alternativa para afastar a transparência que não exige ceder capital.** Fazer com que 25% ou mais dos rendimentos provenham de atividades não previstas na lista — designadamente cedência de espaço — falha o teste de rendimentos do art. 6.º n.º 4 al. b) ii) CIRC. Liga o ponto 4 da ata (modelo de colaboração) ao ponto 6 (composição societária), que até aqui foram tratados como independentes. N1, secção 5.

**3. A Segurança Social, ausente da ata, é provavelmente o maior diferencial entre as vias.** No simplificado a base de incidência é uma percentagem da faturação bruta; com contabilidade organizada é o lucro tributável; em sociedade incide apenas sobre a remuneração de gerência. O efeito excede com frequência o diferencial de IRS.

---

## Próximos passos, por ordem

1. **Pedir hoje o código de atividade do cônjuge**, isoladamente, sem esperar pelo pacote completo de inputs. Desbloqueia o capítulo mais incerto do relatório.
2. **Fiscalidade confirma a folha `Parametros`** do M1 para 2026 e fecha os pendentes N1-01 a N1-06.
3. **Rui revê e envia a minuta** de pedido de inputs, e regista a data de início da contagem dos 60 dias.
4. Chegando os inputs: substituir os placeholders, assinar a folha `Validacao`, correr os cenários de E2.6 e E2.7.
5. Redigir os capítulos 3 a 5, depois 6 e 7, e por fim o capítulo 1.

---

## Notas técnicas

O M1 é gerado por script para ser reprodutível e auditável:

```bash
pip install openpyxl
python3 01-modelo/build_m1.py
```

Alterações **estruturais** fazem-se no script e regenera-se o ficheiro. Alterações de **valores** fazem-se nas células amarelas do Excel — e nesse caso o ficheiro passa a divergir do script, o que é aceitável enquanto durar o projeto.

A folha `Validacao` confronta os resultados do Excel com um recálculo independente, escrito em Python a partir das mesmas normas sem reutilizar nenhuma fórmula do modelo. Valida a aritmética, não a leitura normativa — duas implementações da mesma leitura errada concordam perfeitamente. A validação normativa assina-se na folha.

A conversão do M1 em ferramenta reutilizável (simulador ENI vs. sociedade para clínicas) é projeto separado e não deve atrasar a entrega à Gerir Saúde. Este script é a semente natural desse trabalho.
