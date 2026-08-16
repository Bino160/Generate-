# Dados de cliente

Nada nesta pasta entra no repositório, com a exceção deste ficheiro.

## Portão de aceitação do F1

O teste `tests/aceitacao/f1-a-mais.test.mjs` procura três ficheiros em
`dados/aplus/` e falha se não os encontrar. Falhar em falta é o comportamento
correto: um teste obrigatório que passa por ausência de dados é um teste que
mente.

| Ficheiro | Conteúdo |
| --- | --- |
| `serie.json` | Série mensal, o formato devolvido por `constroiSerie` do F1 |
| `perfil.json` | Perfil de cliente, o formato de `perfilVazio` |
| `alertas-manuais.json` | Objeto que mapeia mês para a lista de métricas em que terias emitido alerta |

Exemplo de `alertas-manuais.json`:

```json
{
  "2025-03": ["receita-por-hora-gabinete"],
  "2025-04": [],
  "2025-08": ["ticket-medio", "atos-por-dia-util"]
}
```

Uma lista vazia significa um mês em que não terias emitido nenhum alerta, e é
tão importante como um mês com alertas: é o que apanha os falsos positivos.

Correr com `npm run test:aceitacao`.

## Regra

Estes ficheiros contêm dados de um cliente real. Ficam na máquina de quem corre
o teste e não são partilhados, nem por correio, nem em anexo a um relatório.
