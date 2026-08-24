#!/usr/bin/env python3
"""Verifica a densidade dos tiques de escrita no corpus do projeto.

Existe porque «escrever melhor» não é acionável e «menos de seis travessões por
mil palavras» é. Corre-se antes de qualquer peça sair para a cliente.

    python3 08-auditoria/verifica_prosa.py

Sai com código 1 se algum ficheiro exceder os limites.
"""
import re, sys, glob

LIMITE_TRAVESSAO = 8.0   # por mil palavras
LIMITE_NEGRITO = 22.0    # por mil palavras
MIN_PALAVRAS = 400       # abaixo disto a densidade é ruído

TIQUES = [
    ("«não é X, é Y»", r"[Nn]ão é [^.,;]{3,60}[,.] (?:é|mas sim|passa a ser) "),
    ("«é por isso que»", r"\bÉ por isso que\b"),
    ("«o que separa X de Y»", r"o que (?:separa|distingue) [^.]{5,60} d[eoa]"),
    ("«não é zelo/detalhe/acaso»", r"não é (?:zelo|um detalhe|detalhe|acaso|timidez)"),
]


def limpa(t):
    t = re.sub(r"<style>.*?</style>", "", t, flags=re.S)
    t = re.sub(r"<script>.*?</script>", "", t, flags=re.S)
    t = re.sub(r"```.*?```", "", t, flags=re.S)
    return re.sub(r"<[^>]+>", " ", t)


def main():
    ficheiros = sorted(glob.glob("*.md") + glob.glob("*/*.md") + glob.glob("*/*.html"))
    falhas, tw, td, tb = [], 0, 0, 0
    print(f"{'ficheiro':46}{'palavras':>9}{'—/mil':>8}{'neg/mil':>9}")
    for f in ficheiros:
        bruto = open(f, encoding="utf-8").read()
        texto = limpa(bruto)
        w = len(texto.split())
        if w < MIN_PALAVRAS:
            continue
        d = len(re.findall("—", texto))
        b = len(re.findall(r"\*\*[^*]+\*\*", bruto)) + len(re.findall(r"<strong>", bruto))
        tw, td, tb = tw + w, td + d, tb + b
        dm, bm = d / w * 1000, b / w * 1000
        mau = dm > LIMITE_TRAVESSAO or bm > LIMITE_NEGRITO
        if mau:
            falhas.append(f)
        print(f"  {f:44}{w:>9,}{dm:>8.1f}{bm:>9.1f}{'  EXCEDE' if mau else ''}")
    print(f"\n  corpus: {tw:,} palavras · {td / tw * 1000:.2f} travessões/mil · "
          f"{tb / tw * 1000:.2f} negrito/mil")

    todo = "\n".join(limpa(open(f, encoding="utf-8").read()) for f in ficheiros)
    print("\n  tiques retóricos:")
    for nome, rx in TIQUES:
        n = len(re.findall(rx, todo))
        print(f"    {nome:32}{n:>4}  ({n / tw * 1000:.2f} por mil)")

    print("\n  danos de transformação automática:")
    dano = 0
    for f in ficheiros:
        for i, l in enumerate(open(f, encoding="utf-8").read().split("\n"), 1):
            if l.strip().startswith(("|", "```")):
                continue
            # um travessao de fecho de parentese seguido de virgula e pontuacao correta:
            # so e dano se nao houver um travessao de abertura antes dele na mesma frase
            suspeito = re.search(r",\s*,|,\s+e\s*,", l) or (
                re.search(r"\s—\s*[,;:]", l) and l.count("—") < 2)
            if suspeito:
                dano += 1
                print(f"    {f}:{i}  {l.strip()[:90]}")
    if not dano:
        print("    nenhum")

    if falhas:
        print(f"\n  {len(falhas)} ficheiro(s) acima do limite: {', '.join(falhas)}")
        return 1
    print("\n  todos os ficheiros dentro dos limites")
    return 0


if __name__ == "__main__":
    sys.exit(main())
