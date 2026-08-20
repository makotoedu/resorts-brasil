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
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist/', import.meta.url);
const CSS_DIR = new URL('css/', DIST);

/** Paginas esperadas em dist/. Mudou? Confira antes de atualizar o numero. */
const PAGINAS_ESPERADAS = 40;

/**
 * Teto de reducao por arquivo. O purge normal fica entre 84% e 98%; passar
 * disso significa quase sempre que o purge rodou contra nada.
 */
const REDUCAO_MAXIMA = 99.5;

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

  /*
   * A guarda que faltava.
   *
   * O glob do PurgeCSS e resolvido contra o cwd, nao contra a localizacao deste
   * arquivo. Rodar o script de outro diretorio — ou mudar o formato do build —
   * faz o glob casar ZERO arquivos, e nesse caso o PurgeCSS purga contra nada e
   * corta praticamente tudo. O unico sinal e um aviso discreto de uma linha:
   *
   *     No files found from the passed PurgeCSS option 'content'
   *
   * Ja aconteceu: o style.css foi de 452 KB para 11.7 KB e o build passou. Ver
   * docs/decisoes.md, secao "Purga de CSS contra o HTML gerado".
   *
   * Como o resultado e gravado por cima do dist/, o estrago so aparece em
   * producao. Por isso a verificacao e antes, e aborta em vez de avisar.
   */
  const paginas = [];
  for await (const p of glob('**/*.html', { cwd: fileURLToPath(DIST) })) paginas.push(p);

  if (paginas.length !== PAGINAS_ESPERADAS) {
    throw new Error(
      `purga abortada: ${paginas.length} paginas em dist/, esperadas ${PAGINAS_ESPERADAS}. ` +
        `Rode "astro build" antes, e rode este script a partir da raiz do projeto. ` +
        `Se o site mudou de tamanho de proposito, atualize PAGINAS_ESPERADAS.`
    );
  }

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

  // Rodado de fora da raiz, o glob de `css` tambem nao casa nada e o PurgeCSS
  // devolve lista vazia: o script terminava com "TOTAL 0.0 KB" e codigo 0, um
  // sucesso silencioso que um pipeline daria por bom.
  if (results.length !== files.length) {
    throw new Error(
      `purga abortada: ${results.length} de ${files.length} folhas processadas. ` +
        `Rode este script a partir da raiz do projeto — os globs do PurgeCSS sao relativos ao cwd.`
    );
  }

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
    const pctNum = 100 - (code.length / before[name]) * 100;
    if (pctNum > REDUCAO_MAXIMA) {
      throw new Error(
        `purga abortada: ${name} encolheu ${pctNum.toFixed(1)}% (teto ${REDUCAO_MAXIMA}%). ` +
          `Reducao dessa ordem indica purga contra conteudo errado — nada foi gravado.`
      );
    }

    await writeFile(new URL(name, CSS_DIR), code);

    totalBefore += before[name];
    totalAfter += code.length;
    const pct = pctNum.toFixed(1);
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
