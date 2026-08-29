/**
 * Confere que cada icone em SVG desenha o MESMO simbolo que a webfont desenhava.
 *
 * Por que existe. O historico deste projeto com icone e ruim de um jeito
 * especifico: a falha nunca quebra o build. O subset montado a partir das
 * classes do HTML apagou as setas de 6 paginas e ninguem viu — glifo ausente
 * vira tofu, que ocupa exatamente 1em. Trocar a webfont por caminho SVG gerado
 * por script tem exatamente o mesmo modo de falha: um contorno vazio, um
 * codepoint trocado ou um eixo espelhado passa por todos os outros portoes.
 *
 * O metodo compara FORMA, nao pixel absoluto: cada simbolo e renderizado grande,
 * recortado no seu proprio retangulo de tinta e reescalado para 96x96 antes da
 * comparacao. Assim a metrica da fonte (que o navegador resolve com OS/2, nao
 * com o hhea que o gerador leu) nao entra na conta, e o que sobra e o desenho.
 *
 *   npx astro preview --port 4330
 *   node tests/verify-icones.mjs
 */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { glifos } from '../src/icones/glifos.ts';

const BASE = process.env.BASE || 'http://localhost:4330';
const LADO = 96;
/** Fracao de pixels divergentes tolerada entre o SVG e a webfont. */
const LIMIAR = 0.08;
/** Abaixo disto o simbolo esta praticamente vazio — tofu, ou caminho perdido. */
const TINTA_MINIMA = 0.01;

const inventario = JSON.parse(await readFile(new URL('../scripts/glifos.json', import.meta.url), 'utf8'));

/**
 * origem (nome do arquivo em vendor/) -> como pedir a fonte no navegador.
 *
 * A FONTE VEM DE `vendor/webfonts/`, EMBUTIDA COMO data:, e nao de
 * `/webfonts/` pela rede. A diferenca importa duas vezes:
 *
 *   1. e o que o teste sempre quis dizer. A pergunta e "o SVG desenha o mesmo
 *      contorno que a fonte ORIGINAL?", e `public/webfonts/` guarda o subset
 *      gerado — comparar com ele deixaria passar um erro introduzido pelo
 *      proprio pyftsubset;
 *   2. desde a Etapa 10 as duas familias do Font Awesome nao sao mais
 *      publicadas (`saida: null` em glifos.json), porque nenhuma pagina baixa
 *      webfont de icone. Pela rede, `/webfonts/<null>` daria 404, a fonte nao
 *      carregaria e os oito icones dali reprovariam por TOFU — o teste
 *      acusando o desenho quando o defeito seria dele mesmo.
 */
const VENDOR = new URL('../vendor/webfonts/', import.meta.url);
const FORMATO = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

const familias = new Map(
  await Promise.all(
    inventario.familias.map(async (f) => {
      const ext = f.origem.split('.').pop();
      const bytes = await readFile(new URL(f.origem, VENDOR));
      return [
        f.origem,
        {
          familiaCss: f.familia_css.replace(/\s*\(peso \d+\)$/, ''),
          peso: /peso (\d+)/.exec(f.familia_css)?.[1] ?? '400',
          fonte: `data:font/${ext};base64,${bytes.toString('base64')}`,
          formato: FORMATO[ext] ?? ext,
        },
      ];
    })
  )
);

const paraCaractere = (cp) => String.fromCodePoint(parseInt(cp.replace('U+', ''), 16));

const fontFaces = [...familias.values()]
  .map(
    (f) => `@font-face{font-family:'${f.familiaCss}';font-weight:${f.peso};font-display:block;` +
      `src:url('${f.fonte}') format('${f.formato}')}`
  )
  .join('\n');

const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: 900, height: 500 } });

/*
 * A pagina de teste e servida DE DENTRO da origem do preview, por interceptacao,
 * e nao com setContent: em `about:blank` o @font-face com URL relativa nao
 * resolve, a webfont nao carrega e os 16 icones reprovam por tofu — o oposto do
 * que o teste quer dizer. Sem preview no ar o goto falha, e a mensagem e clara.
 */
const html = `<!doctype html><html><head><style>
     ${fontFaces}
     body{margin:0;background:#fff;color:#000}
     .caixa{width:260px;height:260px;display:grid;place-items:center;background:#fff}
     .fonte{font-size:200px;line-height:1}
     svg{width:200px;height:200px;fill:currentColor}
   </style></head><body>
     <div class="caixa"><span id="fonte" class="fonte"></span></div>
     <div class="caixa"><span id="svg"></span></div>
   </body></html>`;

await page.route('**/__icones', (rota) => rota.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
const resposta = await page.goto(`${BASE}/__icones`, { waitUntil: 'load' });
if (!resposta) {
  console.error(`nao consegui abrir ${BASE} — suba o preview: npx astro preview --port 4330`);
  process.exit(1);
}

await page.evaluate(() => document.fonts.ready);

/** Recorta a tinta, reescala e devolve pixels crus comparaveis. */
async function normalizar(png) {
  const img = sharp(png).flatten({ background: '#fff' }).greyscale().negate();
  const { data } = await img
    // `trim` sobre o negativo remove o fundo (agora preto) e sobra so o simbolo.
    .trim({ threshold: 20 })
    .resize(LADO, LADO, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // O sharp entrega um canal depois do greyscale; o pixelmatch quer RGBA.
  const rgba = Buffer.alloc(LADO * LADO * 4);
  let tinta = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = data[i];
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
    if (v > 32) tinta += 1;
  }
  return { data: rgba, tinta: tinta / (LADO * LADO) };
}

const falhas = [];
let comparados = 0;

for (const [nome, g] of Object.entries(glifos)) {
  const familia = familias.get(g.origem);
  if (!familia) {
    falhas.push(`${nome}: origem "${g.origem}" nao esta em scripts/glifos.json`);
    continue;
  }

  await page.evaluate(
    ({ familia, caractere, viewBox, path }) => {
      const alvo = document.getElementById('fonte');
      alvo.style.fontFamily = `'${familia.familiaCss}'`;
      alvo.style.fontWeight = familia.peso;
      alvo.textContent = caractere;
      document.getElementById('svg').innerHTML =
        `<svg viewBox="${viewBox}"><path d="${path}"/></svg>`;
    },
    { familia, caractere: paraCaractere(g.codepoint), viewBox: g.viewBox, path: g.path }
  );

  const [pngFonte, pngSvg] = await Promise.all([
    page.locator('.caixa').first().screenshot(),
    page.locator('.caixa').last().screenshot(),
  ]);

  const [fonte, svg] = await Promise.all([normalizar(pngFonte), normalizar(pngSvg)]);
  comparados += 1;

  if (svg.tinta < TINTA_MINIMA) {
    falhas.push(`${nome}: o SVG saiu praticamente vazio (${(svg.tinta * 100).toFixed(1)}% de tinta)`);
    continue;
  }
  if (fonte.tinta < TINTA_MINIMA) {
    falhas.push(`${nome}: a webfont nao desenhou nada — o preview esta no ar em ${BASE}?`);
    continue;
  }

  const diferentes = pixelmatch(fonte.data, svg.data, null, LADO, LADO, { threshold: 0.25 });
  const fracao = diferentes / (LADO * LADO);
  const marca = fracao > LIMIAR ? 'FALHA' : 'ok   ';
  console.log(`  ${marca}  ${nome.padEnd(22)} ${g.codepoint.padEnd(8)} ${(fracao * 100).toFixed(1)}% divergente`);
  if (fracao > LIMIAR) {
    falhas.push(
      `${nome} (${g.codepoint}, ${g.origem}): ${(fracao * 100).toFixed(1)}% divergente da webfont — ` +
        `codepoint trocado, contorno vazio ou eixo espelhado`
    );
  }
}

await navegador.close();

console.log(`\nicones: ${comparados} comparados com a webfont de origem`);
if (falhas.length) {
  console.error(`\n${falhas.length} divergencia(s):`);
  for (const f of falhas) console.error(`  ${f}`);
  process.exit(1);
}
console.log('ok — todo icone em SVG desenha o simbolo da webfont');
