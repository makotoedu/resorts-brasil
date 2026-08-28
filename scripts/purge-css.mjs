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
/* 40 paginas de conteudo + o catalogo do design system em /design. */
const PAGINAS_ESPERADAS = 41;

/**
 * Teto de reducao por arquivo. O purge normal fica entre 84% e 98%; passar
 * disso significa quase sempre que o purge rodou contra nada.
 */
const REDUCAO_MAXIMA = 99.5;

/**
 * Seletores que so existem em runtime, aplicados por src/scripts/site.js, e
 * portanto invisiveis para o purge — que so enxerga o HTML estatico.
 */
const runtimeClasses = [
  /*
   * `iframe` e um seletor de TAG, nao uma classe, e entrou aqui quando os
   * videos viraram fachada de clique-para-carregar: depois disso nao ha um
   * unico <iframe> nas 40 paginas, entao o purge levaria embora o
   * `iframe{width:100%}` do tema e o `.yt-facade iframe{height:100%}` do
   * ajustes.css. O <iframe> nasce no clique, e sem essas duas regras nasceria
   * com os 300x150 do padrao do navegador.
   *
   * Nao aparece no diff visual: em repouso a pagina mostra a fachada, e o
   * estrago so existe depois de um clique.
   */
  'iframe',
  'toggle-active',
  'mainMenu-open',
  'menu-animate',
  'hover-active',
  'dropdown-active',
  'modal-active',
  'menu-invert',
  'menu-last',
  /*
   * SAIRAM NA ETAPA 9, com as funcoes que as aplicavam:
   *
   *   kenburns-bg, kenburns-bg-animate, animate__fadeInUp   hero()
   *   polo-carousel-item                                    logoCarousel()
   *   active, show                                          tabs()
   *
   * As tres funcoes so serviam a home e a /associados, e as duas migraram. Uma
   * entrada a mais aqui nao quebra nada — so segura CSS que ninguem usa —, e por
   * isso a lista precisa encolher junto com o script: senao ela vira o inverso do
   * que existe para ser, uma lista de classes que o JavaScript NAO aplica.
   */
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

  /*
   * So as paginas que AINDA CARREGAM o tema alimentam a purga.
   *
   * Antes o glob pegava dist/ inteiro, e o catalogo do design system — que nao
   * tem uma linha do tema — segurava regras vivas para as 40 paginas que tem.
   * Medido: 1,1 KB a mais em plugins.css + style.css so por causa do /design.
   *
   * Escrito assim, o efeito e o contrario e automatico: cada pagina migrada sai
   * da lista e leva junto as regras que so ela mantinha. O CSS do tema encolhe
   * sozinho ao longo da migracao, ate a Etapa 11 apagar os arquivos.
   */
  const doTema = [];
  for (const p of paginas) {
    const html = await readFile(new URL(p, DIST), 'utf8');
    if (/\/css\/(plugins|style|ajustes)\.css/.test(html)) doTema.push(`dist/${p}`);
  }

  if (doTema.length === 0) {
    console.log('  purga dispensada: nenhuma pagina carrega mais o CSS do tema.');
    return;
  }

  const before = {};
  for (const file of files) {
    before[file] = (await readFile(new URL(file, CSS_DIR))).length;
  }

  const results = await new PurgeCSS().purge({
    content: doTema,
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
