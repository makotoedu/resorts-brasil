"""Reduz as fontes de icone aos glifos que o site realmente usa.

O tema trazia os sets completos do FontAwesome e do Inspiro Icons: 247 KB para
exibir 16 icones. Este script gera subsets contendo so esses glifos.

Subset em vez de trocar por SVG inline: o markup (<i class="fa fa-...">) e o
CSS continuam valendo sem uma linha alterada, entao o risco visual e zero.
Trocar por SVG exigiria editar as 40 paginas.

ORIGEM E DESTINO SAO SEPARADOS. As fontes originais moram em vendor/webfonts/
e nunca sao escritas; public/webfonts/ e inteiramente gerado. A versao anterior
deste script lia e escrevia no mesmo lugar, entao rodar duas vezes subsetava um
subset e mudar a lista de glifos exigia recuperar os originais do git.

A lista de glifos esta em scripts/glifos.json, compartilhada com o
scripts/check-glifos.mjs, que roda no build e falha se o CSS purgado pedir um
codepoint que nao esteja la.

Rodar a partir da raiz do projeto:
    python scripts/subset-fonts.py

Requer: pip install fonttools brotli
"""
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGEM = ROOT / "vendor" / "webfonts"
DESTINO = ROOT / "public" / "webfonts"
GLIFOS = ROOT / "scripts" / "glifos.json"


def kb(n):
    return f"{n / 1024:.1f} KB"


def main():
    if not ORIGEM.is_dir():
        sys.exit(
            f"pasta nao encontrada: {ORIGEM}\n"
            "As fontes originais do tema moram em vendor/webfonts/ e sao a entrada "
            "deste script. Recupere-as do git se tiverem sumido."
        )

    spec = json.loads(GLIFOS.read_text(encoding="utf-8"))
    DESTINO.mkdir(parents=True, exist_ok=True)

    esperados = set()
    total_antes = total_depois = 0

    for familia in spec["familias"]:
        origem = ORIGEM / familia["origem"]

        # `saida: null` = familia que NAO E MAIS PUBLICADA como webfont, mas cujos
        # contornos continuam sendo a origem dos SVG de src/icones/glifos.ts.
        #
        # A distincao existe desde a Etapa 10, quando a ultima pagina do tema
        # migrou e as duas familias do Font Awesome ficaram sem nenhum CSS que as
        # peca. Tirar a entrada de `familias` seria o caminho obvio e o errado:
        # o glifos-para-svg.py le esta MESMA lista para desenhar os oito icones
        # que vinham dali, e o verify-icones.mjs a usa como referencia. Os
        # desenhos sumiriam sem erro de build — que e a forma exata da armadilha
        # que este arquivo ja documenta no `_leia`.
        if familia.get("saida") is None:
            if origem.exists():
                total_antes += origem.stat().st_size
            print(
                f"  {familia['origem']:24} {kb(origem.stat().st_size) if origem.exists() else '?':>9}"
                f" -> nao publicado   (so contorno; ver _saida em glifos.json)"
            )
            continue

        destino = DESTINO / familia["saida"]
        esperados.add(destino.name)

        if not origem.exists():
            sys.exit(f"fonte de origem ausente: {origem}")

        unicodes = ",".join(familia["glifos"])
        # Escreve num temporario e so move depois do sucesso, para uma falha do
        # pyftsubset nao deixar fonte truncada no lugar da boa.
        tmp = destino.with_name(destino.stem + ".subset.tmp")

        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(origem),
                f"--unicodes={unicodes}",
                "--flavor=woff2",
                f"--output-file={tmp}",
                "--no-hinting",
                "--desubroutinize",
                "--drop-tables+=DSIG",
                "--name-IDs=",
                "--layout-features=",
            ],
            check=True,
            capture_output=True,
        )
        shutil.move(str(tmp), str(destino))

        antes = origem.stat().st_size
        depois = destino.stat().st_size
        total_antes += antes
        total_depois += depois
        pct = 100 - (depois / antes * 100)
        print(
            f"  {destino.name:24} {kb(antes):>9} -> {kb(depois):>8}  (-{pct:.1f}%)"
            f"   {len(familia['glifos'])} glifos"
        )

    for nome, motivo in spec["remover"].items():
        origem = ORIGEM / nome
        if origem.exists():
            total_antes += origem.stat().st_size
            print(f"  {nome:24} {kb(origem.stat().st_size):>9} -> nao publicado   ({motivo})")
        # Nao entra na varredura de orfaos abaixo: ja foi explicado aqui.
        (DESTINO / nome).unlink(missing_ok=True)

    # Restos de execucoes anteriores ou de familias que sairam da lista. Sem
    # isso, trocar inspiro-icons.woff por .woff2 deixava o .woff orfao em
    # public/webfonts/, publicado e nunca requisitado.
    for arquivo in sorted(DESTINO.iterdir()):
        if arquivo.is_file() and arquivo.name not in esperados:
            print(f"  {arquivo.name:24} {kb(arquivo.stat().st_size):>9} -> removido   (nao esta em glifos.json)")
            arquivo.unlink()

    pct = 100 - (total_depois / total_antes * 100) if total_antes else 0
    print(f"  {'TOTAL':24} {kb(total_antes):>9} -> {kb(total_depois):>8}  (-{pct:.1f}%)")

    print(
        f"\nA versao declarada em glifos.json e {spec['versao']!r}. Os src: dos @font-face"
        f"\nem public/css/ precisam terminar em ?v={spec['versao']}: /webfonts/ e servido"
        "\ncom Cache-Control immutable de um ano e os nomes de arquivo nao tem hash,"
        "\nentao a query e o unico token de versao. O check-glifos.mjs confere isso no build."
    )


if __name__ == "__main__":
    main()
