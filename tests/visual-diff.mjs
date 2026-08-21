/**
 * Diff visual entre o site original (antes da refatoracao) e o build atual.
 *
 * Sobe os dois lado a lado e compara screenshots de pagina inteira das 40
 * paginas em 3 viewports. E a rede de seguranca da purga de CSS: a suite
 * comportamental checa estilos pontuais, esta checa o resultado renderizado.
 *
 *   ORIGINAL=http://localhost:4340  NOVO=http://localhost:4330
 */
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { paginasSelecionadas, viewportsSelecionados } from './paginas.mjs';

const ORIGINAL = process.env.ORIGINAL || 'http://localhost:4340';
const NOVO = process.env.NOVO || 'http://localhost:4330';
const OUT = 'tests/visual-diff';

// A lista de paginas e os viewports moram em tests/paginas.mjs, compartilhados
// com a suite de geometria. PAGES=/index.html,/ebook.html e VIEWPORTS=desktop
// limitam a rodada, para reconferir um grupo sem pagar os 15 minutos da
// varredura completa.
const PAGES = paginasSelecionadas();
const VIEWPORTS = viewportsSelecionados().map((v) => ({ name: v.nome, width: v.width, height: v.height }));

/** Neutraliza o que muda entre execucoes e falsearia o diff. */
const FREEZE = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    /*
     * Zerar a duracao nao para uma transicao ja em curso — pela cascata, o
     * valor de uma transicao viva vence ate declaracao !important. Quem cancela
     * e tirar a propriedade da lista transicionada.
     */
    transition-property: none !important;
  }
  /* o aviso de cookies entra por timer e o ano do rodape mudou de proposito */
  .cookie-notify, .copyright-content { visibility: hidden !important; }
  /*
   * O carrossel de logos gira sozinho e nunca para: qual logo esta em qual
   * posicao depende do instante do screenshot, nos dois sites. Pior, o original
   * usa flickity com wrapAround, que reposiciona as celulas em torno da
   * selecionada — um layout interno que um marquee nao tem como reproduzir
   * pixel a pixel nem estando na mesma volta.
   *
   * Fica escondido, e nao removido: visibility preserva a caixa, entao a altura
   * da pagina e tudo o que vem abaixo continuam sendo comparados. A geometria
   * das celulas, que e o que de fato podia regredir, esta coberta pela
   * verificacao "carrossel: geometria das celulas" em verify-behaviors.mjs.
   */
  .carousel.client-logos { visibility: hidden !important; }
  /* as legendas do hero entram em cascata por timer */
  .slide-captions > * { opacity: 1 !important; }
  /*
   * O Ken Burns e uma transition de 14s (scale 1 -> 1.2), nao uma animation, e
   * transition-duration: 0s nao interrompe transicao ja em curso — o valor so
   * vale para a proxima. Os dois sites ficavam parados em pontos diferentes do
   * zoom. Fixar o destino faz cada um saltar para la de imediato.
   */
  .kenburns-bg { transform: translate3d(0, 0, 0) scale(1.2) !important; }
`;

async function shot(page, base, path) {
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  return page.screenshot({ fullPage: true });
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

const rows = [];
for (const vp of VIEWPORTS) {
  const ctxA = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  const ctxB = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });

  for (const p of PAGES) {
    let a, b;
    try {
      a = PNG.sync.read(await shot(ctxA, ORIGINAL, p));
      b = PNG.sync.read(await shot(ctxB, NOVO, p));
    } catch (e) {
      rows.push({ page: p, vp: vp.name, status: 'ERRO', detail: e.message.slice(0, 60) });
      continue;
    }

    const dh = b.height - a.height;
    const deltaPct = (Math.abs(dh) / a.height) * 100;

    // Largura diferente muda o layout inteiro: nao ha regiao comum que valha
    // comparar, entao e reprovacao direta.
    if (a.width !== b.width) {
      rows.push({
        page: p, vp: vp.name, status: 'LARGURA',
        detail: `${a.width}px -> ${b.width}px (overflow horizontal)`,
        pct: 100,
      });
      continue;
    }

    // Altura muito diferente indica conteudo a mais ou a menos.
    if (deltaPct > 2) {
      rows.push({
        page: p, vp: vp.name, status: 'ALTURA',
        detail: `${a.height} -> ${b.height} (${dh > 0 ? '+' : ''}${dh}px, ${deltaPct.toFixed(1)}%)`,
        pct: deltaPct,
      });
      continue;
    }

    // Diferenca pequena de altura: compara a regiao comum em vez de recusar a
    // comparacao. Alguns px de arredondamento nao sao regressao, mas so os
    // pixels dizem se algo de fato mudou.
    const h = Math.min(a.height, b.height);
    const crop = (png) => {
      if (png.height === h) return png.data;
      const out = new PNG({ width: png.width, height: h });
      PNG.bitblt(png, out, 0, 0, png.width, h, 0, 0);
      return out.data;
    };

    const diff = new PNG({ width: a.width, height: h });
    const changed = pixelmatch(crop(a), crop(b), diff.data, a.width, h, { threshold: 0.15 });
    const pct = (changed / (a.width * h)) * 100;
    const nota = dh === 0 ? '' : ` (altura ${dh > 0 ? '+' : ''}${dh}px)`;

    if (pct > 0.5) {
      const name = `${p.replace(/[/.]/g, '_')}-${vp.name}.png`;
      await writeFile(`${OUT}/${name}`, PNG.sync.write(diff));
      rows.push({ page: p, vp: vp.name, status: 'DIFF', detail: `${pct.toFixed(2)}%${nota} -> ${name}`, pct });
    } else {
      rows.push({ page: p, vp: vp.name, status: 'OK', detail: `${pct.toFixed(2)}%${nota}`, pct });
    }
  }
  await ctxA.close();
  await ctxB.close();
}

await browser.close();

const bad = rows.filter((r) => r.status !== 'OK');
for (const r of bad) console.log(`${r.status.padEnd(7)} ${r.vp.padEnd(8)} ${r.page.padEnd(38)} ${r.detail}`);

const byVp = {};
for (const r of rows) (byVp[r.vp] ??= []).push(r);
console.log('\nresumo por viewport:');
for (const [vp, list] of Object.entries(byVp)) {
  const ok = list.filter((r) => r.status === 'OK').length;
  console.log(`  ${vp.padEnd(8)} ${ok}/${list.length} identicas`);
}
console.log(`\n${rows.length - bad.length}/${rows.length} comparacoes identicas`);
process.exit(bad.length ? 1 : 0);
