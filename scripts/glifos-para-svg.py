#!/usr/bin/env python3
"""
Converte os 16 glifos de icone em caminhos SVG.

POR QUE. Hoje um icone custa tres webfonts subsetadas, um script Python de
subset, uma guarda de build (check-glifos.mjs) e um FOIT — para 16 desenhos. Em
SVG inline eles viram markup: nada para baixar, nada para versionar com `?v=`,
nada que possa virar tofu porque o subset esqueceu um codepoint. E o que a
Etapa 11 do plano remove depende de existir primeiro.

A ENTRADA E scripts/glifos.json, nao o inventario de <i class> do HTML — pela
mesma razao de sempre: dois glifos entram por pseudo-elemento e nao tem classe.
O JSON continua sendo a fonte unica; este script apenas o materializa.

A SAIDA E GERADA. Nao edite src/icones/glifos.ts a mao; rode:

    python scripts/glifos-para-svg.py

Geometria: coordenada de fonte tem y para cima e origem na linha de base; SVG
tem y para baixo. O pen aplica y' = ascent - y, e o viewBox fica
`0 0 largura (ascent - descent)` — que e como as proprias Font Awesome sao
publicadas (0 0 448 512).
"""
import json
import re
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'scripts' / 'glifos.json'
ORIGEM = RAIZ / 'vendor' / 'webfonts'
SAIDA = RAIZ / 'src' / 'icones' / 'glifos.ts'

# O mesmo desenho existe nas duas fontes com o mesmo nome: U+F054 na Font
# Awesome solid (usado no `li:before` das listas) e U+E930 na inspiro-icons
# (usado no menu e nos 15 `.icon-chevron-right` do markup). Sao formas
# diferentes e as duas estao em uso, entao a chave da FA ganha sufixo em vez de
# uma delas desaparecer em silencio.
DESAMBIGUACAO = {
    ('fa-solid-900.woff2', 'U+F054'): 'chevron-right-solido',
}


def nome_da_descricao(descricao: str) -> str:
    """`"chevron-right — tambem #mainMenu..."` -> `chevron-right`."""
    return re.split(r'\s+[—-]\s+|\s+', descricao.strip())[0]


def caminho_do_glifo(fonte: TTFont, codepoint: int) -> tuple[str, str]:
    cmap = fonte.getBestCmap()
    if codepoint not in cmap:
        raise SystemExit(f'glifo U+{codepoint:04X} ausente em {fonte.reader.file.name}')
    nome_glifo = cmap[codepoint]

    glyphset = fonte.getGlyphSet()
    ascent, descent = fonte['hhea'].ascent, fonte['hhea'].descent
    altura = ascent - descent

    pen = SVGPathPen(glyphset, ntos=lambda v: str(int(v)) if v == int(v) else str(round(v, 1)))
    # y' = ascent - y: espelha o eixo vertical e coloca a origem no topo.
    glyphset[nome_glifo].draw(TransformPen(pen, (1, 0, 0, -1, 0, ascent)))

    largura = glyphset[nome_glifo].width
    return f'0 0 {largura} {altura}', pen.getCommands()


def main() -> None:
    dados = json.loads(ENTRADA.read_text(encoding='utf8'))
    saida: dict[str, dict[str, str]] = {}

    for familia in dados['familias']:
        arquivo = ORIGEM / familia['origem']
        fonte = TTFont(arquivo)
        for cp_texto, descricao in familia['glifos'].items():
            codepoint = int(cp_texto.removeprefix('U+'), 16)
            nome = DESAMBIGUACAO.get((familia['origem'], cp_texto)) or nome_da_descricao(descricao)
            if nome in saida:
                raise SystemExit(
                    f'nome duplicado "{nome}" ({cp_texto} de {familia["origem"]}). '
                    f'Acrescente uma entrada em DESAMBIGUACAO.'
                )
            view_box, path = caminho_do_glifo(fonte, codepoint)
            if not path:
                raise SystemExit(f'{nome} ({cp_texto}) saiu com caminho vazio')
            saida[nome] = {
                'viewBox': view_box,
                'path': path,
                'origem': familia['origem'],
                'codepoint': cp_texto,
            }
        print(f'{familia["origem"]:24} {len(familia["glifos"])} glifos')

    linhas = [
        '/*',
        ' * GERADO por scripts/glifos-para-svg.py a partir de scripts/glifos.json e das',
        ' * fontes em vendor/webfonts/. NAO EDITE A MAO — rode o script.',
        ' *',
        ' * Os caminhos sao os contornos reais das fontes que o site usa hoje, entao o',
        ' * <Icone> desenha o mesmo simbolo que a webfont desenhava. tests/verify-icones.mjs',
        ' * compara os dois lado a lado e reprova divergencia de forma.',
        ' */',
        '',
        'export interface Glifo {',
        '  /** `0 0 largura altura`, em unidades da fonte de origem. */',
        '  viewBox: string;',
        '  /** O atributo `d` do <path>. */',
        '  path: string;',
        '  /** De qual webfont o contorno saiu — rastreia ate scripts/glifos.json. */',
        '  origem: string;',
        '  /** O codepoint que a webfont usava. */',
        '  codepoint: string;',
        '}',
        '',
        'export const glifos = {',
    ]
    for nome, g in saida.items():
        linhas.append(f"  '{nome}': {{")
        linhas.append(f"    viewBox: '{g['viewBox']}',")
        linhas.append(f"    path: '{g['path']}',")
        linhas.append(f"    origem: '{g['origem']}',")
        linhas.append(f"    codepoint: '{g['codepoint']}',")
        linhas.append('  },')
    linhas += [
        '} as const satisfies Record<string, Glifo>;',
        '',
        '/** Os nomes validos do <Icone>. Nome invalido vira erro de `astro check`. */',
        'export type NomeIcone = keyof typeof glifos;',
        '',
        'export const nomesDeIcone = Object.keys(glifos) as NomeIcone[];',
        '',
    ]

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text('\n'.join(linhas), encoding='utf8')
    print(f'\n{len(saida)} icones -> {SAIDA.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
