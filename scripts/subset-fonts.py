"""Reduz as fontes de icone aos glifos que o site realmente usa.

O tema trazia os sets completos do FontAwesome e do Inspiro Icons: 240 KB
para exibir 14 icones. Este script gera subsets contendo so esses glifos.

Subset em vez de trocar por SVG inline: o markup (<i class="fa fa-...">) e o
CSS continuam valendo sem uma linha alterada, entao o risco visual e zero.
Trocar por SVG exigiria editar as 40 paginas.

Rodar a partir da raiz do projeto:
    python scripts/subset-fonts.py

Requer: pip install fonttools brotli
"""
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEBFONTS = ROOT / "public" / "webfonts"

# Codepoints extraidos das regras content: "\fXXX" em public/css/.
# .fab -> Brands | .fa e .fas -> Free weight 900 (solid) | .far (regular) sem uso.
SUBSETS = [
    {
        "arquivo": "fa-brands-400.woff2",
        "icones": "facebook-f instagram linkedin whatsapp youtube",
        "unicodes": "U+F39E,U+F16D,U+F08C,U+F232,U+F167",
        "saida_woff2": True,
    },
    {
        "arquivo": "fa-solid-900.woff2",
        "icones": "info-circle",
        "unicodes": "U+F05A",
        "saida_woff2": True,
    },
    {
        "arquivo": "inspiro-icons.woff",
        "icones": "box check-circle chevron-right chevron-up globe mail map-pin message-square",
        "unicodes": "U+E925,U+E92B,U+E930,U+E931,U+E978,U+E992,U+E993,U+E99A",
        # o tema so trazia woff/ttf; gerar woff2 aqui, que comprime bem melhor
        "saida_woff2": True,
    },
]

# Nenhum icone .far e usado em nenhuma das 40 paginas.
REMOVER = ["fa-regular-400.woff2"]


def kb(n):
    return f"{n / 1024:.1f} KB"


def main():
    if not WEBFONTS.is_dir():
        sys.exit(f"pasta nao encontrada: {WEBFONTS}")

    total_antes = total_depois = 0

    for spec in SUBSETS:
        origem = WEBFONTS / spec["arquivo"]
        if not origem.exists():
            print(f"  ignorado (nao existe): {spec['arquivo']}")
            continue

        antes = origem.stat().st_size
        destino = origem.with_suffix(".woff2") if spec["saida_woff2"] else origem
        tmp = destino.with_name(destino.stem + ".subset.woff2")

        cmd = [
            sys.executable, "-m", "fontTools.subset", str(origem),
            f"--unicodes={spec['unicodes']}",
            "--flavor=woff2",
            f"--output-file={tmp}",
            "--no-hinting",
            "--desubroutinize",
            "--drop-tables+=DSIG",
            "--name-IDs=",
            "--layout-features=",
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        # substitui so depois do sucesso, para nao deixar fonte quebrada no lugar
        if origem != destino and origem.exists():
            origem.unlink()
        shutil.move(str(tmp), str(destino))

        depois = destino.stat().st_size
        total_antes += antes
        total_depois += depois
        pct = 100 - (depois / antes * 100)
        print(f"  {destino.name:24} {kb(antes):>9} -> {kb(depois):>8}  (-{pct:.1f}%)   {spec['icones']}")

    for nome in REMOVER:
        alvo = WEBFONTS / nome
        if alvo.exists():
            total_antes += alvo.stat().st_size
            print(f"  {nome:24} {kb(alvo.stat().st_size):>9} -> removido   (nenhum icone .far em uso)")
            alvo.unlink()

    pct = 100 - (total_depois / total_antes * 100) if total_antes else 0
    print(f"  {'TOTAL':24} {kb(total_antes):>9} -> {kb(total_depois):>8}  (-{pct:.1f}%)")
    print("\nLembre de conferir os @font-face em public/css/ apontando para .woff2.")


if __name__ == "__main__":
    main()
