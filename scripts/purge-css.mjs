/**
 * Purga e minifica o CSS do tema depois do build.
 *
 * Roda sobre o HTML GERADO em dist/, nao sobre o fonte: e o unico lugar onde
 * as classes finais de todas as 40 paginas existem juntas.
 *
 * O CSS do tema Inspiro traz o estilo de dezenas de componentes que este site
 * nao usa (lightbox, portfolio, e-commerce, blog, etc.).
 */
import { PurgeCSS } from 'purgecss';
import { transform } from 'lightningcss';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const DIST = new URL('../dist/', import.meta.url);
const CSS_DIR = new URL('css/', DIST);

/**
 * Classes aplicadas em runtime por src/scripts/site.js, que nao aparecem no
 * HTML estatico e portanto sao invisiveis para o purge.
 */
const runtimeClasses = [
  'toggle-active',
  'mainMenu-open',
  'menu-animate',
  'hover-active',
  'dropdown-active',
  'kenburns-bg',
  'kenburns-bg-animate',
  'polo-carousel-item',
  'modal-active',
  'menu-invert',
  'menu-last',
  'animate__fadeInUp',
  'active',
  'show',
];

async function main() {
  const files = (await readdir(CSS_DIR)).filter((f) => f.endsWith('.css'));

  const before = {};
  for (const file of files) {
    before[file] = (await readFile(new URL(file, CSS_DIR))).length;
  }

  const results = await new PurgeCSS().purge({
    content: ['dist/**/*.html'],
    css: files.map((f) => `dist/css/${f}`),
    // Sem padroes amplos aqui de proposito: os 14 icones em uso aparecem no
    // HTML (class="fab fa-facebook-f", class="icon-globe"), entao o purge os
    // encontra sozinho. Safelistar /^fa-/ reteria o set inteiro do FontAwesome.
    safelist: { standard: runtimeClasses },
    // @font-face e keyframes nao referenciados por regra sobrevivente sao removidos
    fontFace: true,
    keyframes: true,
    variables: true,
  });

  let totalBefore = 0;
  let totalAfter = 0;

  for (const result of results) {
    const name = path.basename(result.file);
    const { code } = transform({
      filename: name,
      code: Buffer.from(result.css),
      minify: true,
      sourceMap: false,
      // Sem alvos, o lightningcss emite a sintaxe de range do Media Queries
      // Level 4 (@media (width<=767px)), que navegador antigo ignora em
      // silencio — e a media query simplesmente nao vale. Fixar os alvos
      // forca a sintaxe classica de min-width/max-width.
      targets: {
        chrome: 80 << 16,
        firefox: 78 << 16,
        safari: (13 << 16) | (1 << 8),
        edge: 80 << 16,
      },
    });
    await writeFile(new URL(name, CSS_DIR), code);

    totalBefore += before[name];
    totalAfter += code.length;
    const pct = (100 - (code.length / before[name]) * 100).toFixed(1);
    console.log(
      `  ${name.padEnd(14)} ${kb(before[name]).padStart(9)} -> ${kb(code.length).padStart(9)}  (-${pct}%)`
    );
  }

  const pct = (100 - (totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`  ${'TOTAL'.padEnd(14)} ${kb(totalBefore).padStart(9)} -> ${kb(totalAfter).padStart(9)}  (-${pct}%)`);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
